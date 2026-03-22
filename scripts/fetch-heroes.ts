#!/usr/bin/env tsx
/**
 * Prebuild script — generates public/heroes.json for static (GitHub Pages) export.
 * Run via:  npx tsx scripts/fetch-heroes.ts
 *
 * NOTE: The /hero-list API is hard-capped at 20 heroes per request (no working
 * pagination). We therefore build the full hero roster from FALLBACK_HERO_NAMES
 * (idx + 1 = hero_id, matching the mlbb-stats.rone.dev ID scheme) and overlay
 * whatever real API data we can obtain.
 *
 * Data sources (mlbb-stats.rone.dev):
 *  /hero-list       → names, images, counter/synergy relations (20 most recent heroes)
 *  /hero-rank       → win/ban/pick rates (~20 top-ranked heroes)
 *  /academy/guide/{id}/time-win-rate/1  → phase win rates for ALL hero IDs
 *  /academy/guide/{id}/teammates        → synergy win rate boost for ALL hero IDs
 *
 * Coverage per hero:
 *  IDs in /hero-list  → real name, image URL, counter/synergy/counteredBy arrays
 *  IDs in /hero-rank  → real winRate, banRate, pickRate
 *  All IDs            → phaseEarly/Mid/Late from academy (if data exists)
 *  All IDs            → synergyBoost from academy teammates (if data exists)
 *  All IDs            → combat stats from HERO_STATS static table
 *
 * Phase win rates are normalized from 0.42–0.58 → 0–10 to match the M7/MPL broadcast scale.
 * (RORA earlyMid=3.60 corresponds to win_rate ≈ 0.478, formula: (wr-0.42)/0.16×10)
 */

import fs   from 'fs';
import path from 'path';
import { HERO_STATS, getDefaultsForRoles, FALLBACK_HERO_NAMES } from '../src/data/heroes';

// ─── API response shapes ──────────────────────────────────────────────────────

interface RawHeroListResponse {
  data: {
    records: Array<{
      data: {
        hero_id: number;
        hero: { data: { name: string; head: string } };
        relation: {
          assist: { target_hero_id: number[] };
          strong: { target_hero_id: number[] };
          weak:   { target_hero_id: number[] };
        };
      };
    }>;
  };
}

interface RawHeroRankResponse {
  data: {
    records: Array<{
      data: {
        main_heroid:               number;
        main_hero_win_rate:        number;
        main_hero_ban_rate:        number;
        main_hero_appearance_rate: number;
      };
    }>;
  };
}

interface RawTimeWinRate {
  code: number;
  data: {
    records: Array<{
      data: {
        heroid:    number;
        real_road: number;
        time_win_rate: Array<{
          time_min: number;
          time_max: number;
          win_rate: number;
        }>;
        total_win_rate: number;
      };
    }>;
    total: number;
  };
}

interface RawTeammates {
  code: number;
  data: {
    records: Array<{
      data: {
        main_heroid:         number;
        main_hero_win_rate:  number;
        sub_hero: Array<{
          heroid:            number;
          hero_win_rate:     number;
          increase_win_rate: number;
        }>;
      };
    }>;
    total: number;
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE_URL   = 'https://mlbb-stats.rone.dev/api';
const TIMEOUT_MS = 12_000;

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Run at most `concurrency` async tasks at a time */
async function batchedAll<T>(
  tasks:       (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency).map((t) => t());
    results.push(...await Promise.all(chunk));
  }
  return results;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a win rate (0.0–1.0) to the 0–10 broadcast scale.
 * Formula matches MPL/M-Series overlay: 0.42 → 0, 0.50 → 5, 0.58 → 10.
 */
function normalizeWR(wr: number): number {
  return Math.max(0, Math.min(10, ((wr - 0.42) / 0.16) * 10));
}

/**
 * Normalize a synergy boost (increase_win_rate, likely 0.0–0.08 decimal)
 * to a 0–10 coordination score. 0% boost → 5, +5% → ~8.
 */
function normalizeSynergyBoost(boost: number): number {
  const dec = boost > 1 ? boost / 100 : boost;
  return Math.max(0, Math.min(10, 5 + dec * 100));
}

// ─── Phase win-rate extraction ────────────────────────────────────────────────

function extractPhases(brackets: Array<{ time_min: number; time_max: number; win_rate: number }>) {
  const early = brackets.filter((b) => b.time_max <= 12);
  const mid   = brackets.filter((b) => b.time_max > 12 && b.time_max <= 20);
  const late  = brackets.filter((b) => b.time_min >= 18);

  const avg = (arr: typeof brackets) =>
    arr.length > 0 ? arr.reduce((s, b) => s + b.win_rate, 0) / arr.length : null;

  return { phaseEarly: avg(early), phaseMid: avg(mid), phaseLate: avg(late) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[fetch-heroes] Fetching hero data from mlbb-stats.rone.dev…');
  console.log(`[fetch-heroes] Base roster: ${FALLBACK_HERO_NAMES.length} heroes from FALLBACK_HERO_NAMES`);

  // ── Step 1: Core endpoints (parallel) ──────────────────────────────────────
  const [rawList, rawRank] = await Promise.all([
    apiFetch<RawHeroListResponse>('/hero-list/').catch(() => null),
    apiFetch<RawHeroRankResponse>('/hero-rank/').catch(() => null),
  ]);

  // API hero data map: hero_id → { name, image, relations }
  // The /hero-list/ endpoint returns ~20 heroes; we enrich those we can.
  const apiHeroMap = new Map<number, {
    name:        string;
    image:       string;
    counters:    number[];
    counteredBy: number[];
    synergies:   number[];
  }>();

  if (rawList) {
    for (const rec of rawList.data.records) {
      const d = rec.data;
      apiHeroMap.set(d.hero_id, {
        name:        d.hero.data.name,
        image:       d.hero.data.head,
        counters:    (d.relation.weak.target_hero_id   ?? []).filter((x: number) => x > 0),
        counteredBy: (d.relation.strong.target_hero_id ?? []).filter((x: number) => x > 0),
        synergies:   (d.relation.assist.target_hero_id ?? []).filter((x: number) => x > 0),
      });
    }
    console.log(`[fetch-heroes] → ${apiHeroMap.size} heroes enriched from /hero-list`);
  } else {
    console.warn('[fetch-heroes] ⚠ /hero-list unavailable — using static names only');
  }

  // Rank map: hero_id → { winRate, banRate, pickRate }
  const rankMap = new Map<number, { winRate: number; banRate: number; pickRate: number }>(
    (rawRank?.data.records ?? []).map((rec) => [
      rec.data.main_heroid,
      {
        winRate:  rec.data.main_hero_win_rate,
        banRate:  rec.data.main_hero_ban_rate,
        pickRate: rec.data.main_hero_appearance_rate,
      },
    ])
  );
  console.log(`[fetch-heroes] → ${rankMap.size} heroes with rank data from /hero-rank`);

  // ── Step 2: Per-hero Academy data for ALL heroes (batched, 8 concurrent) ───
  console.log(`[fetch-heroes] → Fetching academy data for all ${FALLBACK_HERO_NAMES.length} heroes…`);

  // All hero IDs: idx + 1  (FALLBACK_HERO_NAMES[0] = Miya = id 1, etc.)
  const allHeroIds = FALLBACK_HERO_NAMES.map((_, idx) => idx + 1);

  const timeWRTasks   = allHeroIds.map((id) => () =>
    apiFetch<RawTimeWinRate>(`/academy/guide/${id}/time-win-rate/1`)
  );
  const teammateTasks = allHeroIds.map((id) => () =>
    apiFetch<RawTeammates>(`/academy/guide/${id}/teammates`)
  );

  const [timeWRResults, teammateResults] = await Promise.all([
    batchedAll(timeWRTasks,   8),
    batchedAll(teammateTasks, 8),
  ]);

  const timeWRMap  = new Map<number, { phaseEarly: number | null; phaseMid: number | null; phaseLate: number | null }>();
  const synergyMap = new Map<number, number>();

  for (let i = 0; i < allHeroIds.length; i++) {
    const id    = allHeroIds[i];
    const twr   = timeWRResults[i];
    const mates = teammateResults[i];

    const rec = twr?.data?.records?.[0]?.data;
    if (rec?.time_win_rate?.length) {
      timeWRMap.set(id, extractPhases(rec.time_win_rate));
    }

    const subHeroes = mates?.data?.records?.[0]?.data?.sub_hero ?? [];
    if (subHeroes.length > 0) {
      const avgBoost = subHeroes.reduce((s, h) => s + h.increase_win_rate, 0) / subHeroes.length;
      synergyMap.set(id, normalizeSynergyBoost(avgBoost));
    }
  }

  console.log(`[fetch-heroes] → Phase data:   ${timeWRMap.size}/${allHeroIds.length} heroes`);
  console.log(`[fetch-heroes] → Synergy data: ${synergyMap.size}/${allHeroIds.length} heroes`);

  // ── Step 3: Build full hero objects ────────────────────────────────────────
  const heroes = FALLBACK_HERO_NAMES.map((fallbackName, idx) => {
    const id  = idx + 1;
    const api = apiHeroMap.get(id);   // present for ~20 heroes

    const stats = HERO_STATS[id];
    const roles = stats?.roles ?? ['Fighter'];
    const defs  = stats ?? { roles, ...getDefaultsForRoles(roles) };
    const rank  = rankMap.get(id);
    const phases = timeWRMap.get(id);

    const phaseEarly = phases?.phaseEarly != null
      ? parseFloat(normalizeWR(phases.phaseEarly).toFixed(2))
      : defs.early;
    const phaseMid = phases?.phaseMid != null
      ? parseFloat(normalizeWR(phases.phaseMid).toFixed(2))
      : defs.mid;
    const phaseLate = phases?.phaseLate != null
      ? parseFloat(normalizeWR(phases.phaseLate).toFixed(2))
      : defs.late;

    const synergyBoost = synergyMap.get(id) ?? 5.0;

    return {
      id,
      name:  api?.name  ?? fallbackName,   // real API name if available, else static
      image: api?.image ?? '',             // image only for ~20 API heroes

      roles,
      early:     defs.early,
      mid:       defs.mid,
      late:      defs.late,
      damage:    defs.damage,
      tankiness: defs.tankiness,
      cc:        defs.cc,
      mobility:  defs.mobility,
      push:      defs.push,
      pressure:  defs.pressure,

      phaseEarly,
      phaseMid,
      phaseLate,
      synergyBoost,

      counters:    api?.counters    ?? [],
      counteredBy: api?.counteredBy ?? [],
      synergies:   api?.synergies   ?? [],

      winRate:  rank?.winRate  ?? (defs as { winRate?:  number }).winRate  ?? 0.500,
      pickRate: rank?.pickRate ?? (defs as { pickRate?: number }).pickRate ?? 0.050,
      banRate:  rank?.banRate  ?? (defs as { banRate?:  number }).banRate  ?? 0.010,
    };
  });

  const withImage   = heroes.filter((h) => h.image).length;
  const withPhases  = heroes.filter((h) => timeWRMap.has(h.id)).length;
  const withSynergy = heroes.filter((h) => synergyMap.has(h.id)).length;
  const withRank    = heroes.filter((h) => rankMap.has(h.id)).length;
  const withRelations = heroes.filter((h) => h.counters.length > 0 || h.counteredBy.length > 0).length;

  const outPath = path.join(process.cwd(), 'public', 'heroes.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(heroes));
  console.log(`[fetch-heroes] ✓ Wrote ${heroes.length} heroes:`);
  console.log(`  → ${withImage}     with image`);
  console.log(`  → ${withRank}      with live win/ban/pick rates`);
  console.log(`  → ${withPhases}   with phase win-rate data`);
  console.log(`  → ${withSynergy}  with synergy boost data`);
  console.log(`  → ${withRelations} with counter/synergy relations`);
}

main().catch((err) => {
  console.error('[fetch-heroes] ✗ Failed:', err.message);
  console.error('[fetch-heroes]   The app will use offline fallback data.');
  process.exit(0);
});
