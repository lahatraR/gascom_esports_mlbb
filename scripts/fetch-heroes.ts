#!/usr/bin/env tsx
/**
 * Prebuild script — generates public/heroes.json for static (GitHub Pages) export.
 * Run via:  npx tsx scripts/fetch-heroes.ts
 * Automatically called by the "prebuild" npm script in CI.
 *
 * Replicates the same transformation as /api/heroes/route.ts but runs at build time,
 * embedding the data into a static file that the client can fetch on GitHub Pages.
 */

import fs   from 'fs';
import path from 'path';
import { HERO_STATS, getDefaultsForRoles } from '../src/data/heroes';

// ─── Raw API shapes (mirrors src/lib/mlbbApi.ts) ─────────────────────────────

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

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE_URL   = 'https://mlbb-stats.rone.dev/api';
const TIMEOUT_MS = 15_000;

async function apiFetch<T>(path: string): Promise<T> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return await res.json() as T;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[fetch-heroes] Fetching hero data from mlbb-stats.rone.dev…');

  const [rawList, rawRank] = await Promise.all([
    apiFetch<RawHeroListResponse>('/hero-list/'),
    apiFetch<RawHeroRankResponse>('/hero-rank/').catch(() => ({ data: { records: [] } } as RawHeroRankResponse)),
  ]);

  // Build rank lookup
  const rankMap = new Map(
    rawRank.data.records.map((rec) => [
      rec.data.main_heroid,
      {
        winRate:  rec.data.main_hero_win_rate,
        banRate:  rec.data.main_hero_ban_rate,
        pickRate: rec.data.main_hero_appearance_rate,
      },
    ])
  );

  // Transform hero-list
  const heroes = rawList.data.records.map((rec) => {
    const d      = rec.data;
    const id     = d.hero_id;
    const stats  = HERO_STATS[id];
    const roles  = stats?.roles ?? ['Fighter'];
    const defs   = stats ?? { roles, ...getDefaultsForRoles(roles) };
    const rank   = rankMap.get(id);

    return {
      id,
      name:  d.hero.data.name,
      image: d.hero.data.head,
      roles,
      early:       defs.early,
      mid:         defs.mid,
      late:        defs.late,
      damage:      defs.damage,
      tankiness:   defs.tankiness,
      cc:          defs.cc,
      mobility:    defs.mobility,
      push:        defs.push,
      pressure:    defs.pressure,
      counters:    (d.relation.weak.target_hero_id   ?? []).filter((x: number) => x > 0),
      counteredBy: (d.relation.strong.target_hero_id ?? []).filter((x: number) => x > 0),
      synergies:   (d.relation.assist.target_hero_id ?? []).filter((x: number) => x > 0),
      winRate:  rank?.winRate  ?? (defs as { winRate?: number }).winRate  ?? 0.500,
      pickRate: rank?.pickRate ?? (defs as { pickRate?: number }).pickRate ?? 0.050,
      banRate:  rank?.banRate  ?? (defs as { banRate?: number }).banRate  ?? 0.010,
    };
  });

  // Write output
  const outPath = path.join(process.cwd(), 'public', 'heroes.json');
  fs.writeFileSync(outPath, JSON.stringify(heroes));
  console.log(`[fetch-heroes] ✓ Wrote ${heroes.length} heroes to public/heroes.json`);
}

main().catch((err) => {
  console.error('[fetch-heroes] ✗ Failed:', err.message);
  console.error('[fetch-heroes]   The app will use offline fallback data on GitHub Pages.');
  process.exit(0); // Don't block the build — store has offline fallback
});
