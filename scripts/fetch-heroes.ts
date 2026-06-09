#!/usr/bin/env tsx
/**
 * Prebuild script — generates public/heroes.json for static (GitHub Pages) export.
 * Run via:  npx tsx scripts/fetch-heroes.ts
 *
 * Data sources (mlbb-stats.rone.dev):
 *  /hero-list?size=200                                      → names, images, counter/synergy relations
 *  /hero-rank?size=200                                      → win/ban/pick rates
 *  /academy/guide/{id}/time-win-rate/1                      → phase win rates (Early/Mid/Late)
 *  /academy/guide/{id}/teammates                            → synergyBoost + synergyPairs
 *  /heroes/{name}                                           → speciality tags + skill type tags
 *  /academy/heroes/{name}/win-rate/timeline?lane={lane}     → real power curve per phase
 *
 * All data is baked into heroes.json at build time so the app works for every user,
 * including first-time visitors, even when the API is unavailable at runtime.
 * A data-status.json file records the build timestamp for the freshness indicator.
 */

import fs   from 'fs';
import path from 'path';
import { HERO_STATS, getDefaultsForRoles } from '../src/data/heroes';

// ─── Snapshot (local API backup) ─────────────────────────────────────────────

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'api-snapshot.json');

interface ApiSnapshot {
  savedAt: string;
  rankMap:        Record<string, { winRate: number; banRate: number; pickRate: number }>;
  timeWRMap:      Record<string, { phaseEarly: number | null; phaseMid: number | null; phaseLate: number | null }>;
  synergyMap:     Record<string, number>;
  synergyPairsMap: Record<string, Record<number, number>>;
  specialityMap:  Record<string, string[]>;
  skillTagsMap:   Record<string, string[]>;
  powerCurveMap:  Record<string, { early: number; mid: number; late: number; peak: string }>;
}

function loadSnapshot(): ApiSnapshot | null {
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) return null;
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
    const snap = JSON.parse(raw) as ApiSnapshot;
    console.log(`[fetch-heroes] ↩ Loaded api-snapshot.json (saved ${snap.savedAt})`);
    return snap;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: Omit<ApiSnapshot, 'savedAt'>) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({ savedAt: new Date().toISOString(), ...snap }, null, 2));
  console.log('[fetch-heroes] ✓ Saved api-snapshot.json (local backup updated)');
}

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
        main_heroid:        number;
        main_hero_win_rate: number;
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

// New API shapes
interface RawSkillTag  { tagname?: string }
interface RawSkill     { skilltag?: RawSkillTag[] }
interface RawSkillList { skilllist?: RawSkill[] }

interface RawHeroFullResponse {
  data: {
    records: Array<{
      data: {
        hero_id: number;
        hero: {
          data: {
            speciality?:    string[];
            heroskilllist?: RawSkillList[];
          };
        };
      };
    }>;
  };
}

interface RawTimelineEntry { time_min: number; time_max?: number; win_rate: number }

interface RawWinRateTimelineResponse {
  data: {
    records: Array<{
      data: {
        time_win_rate:  RawTimelineEntry[];
        total_win_rate: number;
      };
    }>;
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
 * Normalize power curve win rate to 0–10.
 * 0.40 → 0, 0.50 → 5, 0.60 → 10.
 */
function normalizePowerWR(wr: number): number {
  return Math.max(0, Math.min(10, ((wr - 0.40) / 0.20) * 10));
}

function normalizeSynergyBoost(boost: number): number {
  const dec = boost > 1 ? boost / 100 : boost;
  return Math.max(0, Math.min(10, 5 + dec * 100));
}

// ─── Phase win-rate extraction (old endpoint) ─────────────────────────────────

function extractPhases(brackets: Array<{ time_min: number; time_max: number; win_rate: number }>) {
  const early = brackets.filter((b) => b.time_max <= 12);
  const mid   = brackets.filter((b) => b.time_max > 12 && b.time_max <= 20);
  const late  = brackets.filter((b) => b.time_min >= 18);

  const avg = (arr: typeof brackets) =>
    arr.length > 0 ? arr.reduce((s, b) => s + b.win_rate, 0) / arr.length : null;

  return { phaseEarly: avg(early), phaseMid: avg(mid), phaseLate: avg(late) };
}

// ─── Lane parameter mapping (for win-rate/timeline endpoint) ─────────────────

const ROLE_TO_LANE_PARAM: Record<string, string> = {
  Tank: 'roam', Support: 'roam', Fighter: 'exp',
  Mage: 'mid',  Assassin: 'jungle', Marksman: 'gold',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[fetch-heroes] Fetching hero data from mlbb-stats.rone.dev…');

  // Load local snapshot as fallback (used when API is unavailable)
  const snapshot = loadSnapshot();

  // ── Step 1: Core endpoints (parallel) ──────────────────────────────────────
  const [rawList, rawRank] = await Promise.all([
    apiFetch<RawHeroListResponse>('/hero-list/?size=200'),
    apiFetch<RawHeroRankResponse>('/hero-rank/?size=200').catch(() => null),
  ]);

  if (!rawList) {
    console.error('[fetch-heroes] ✗ /hero-list failed — cannot continue.');
    process.exit(0);
  }

  const records = rawList.data.records;
  console.log(`[fetch-heroes] → ${records.length} heroes from /hero-list`);

  const rankMap = new Map(
    (rawRank?.data.records ?? []).map((rec) => [
      rec.data.main_heroid,
      {
        winRate:  rec.data.main_hero_win_rate,
        banRate:  rec.data.main_hero_ban_rate,
        pickRate: rec.data.main_hero_appearance_rate,
      },
    ])
  );
  // Fallback: fill missing rank entries from snapshot
  if (snapshot) {
    for (const [key, val] of Object.entries(snapshot.rankMap)) {
      const id = parseInt(key, 10);
      if (!rankMap.has(id)) rankMap.set(id, val);
    }
  }
  console.log(`[fetch-heroes] → ${rankMap.size} heroes with rank data`);

  // ── Step 2: Per-hero Academy data (batched, 8 concurrent) ──────────────────
  console.log('[fetch-heroes] → Fetching phase win-rates and synergy data…');

  const heroIds = records.map((r) => r.data.hero_id);

  const timeWRTasks = heroIds.map((id) => () =>
    apiFetch<RawTimeWinRate>(`/academy/guide/${id}/time-win-rate/1`)
  );
  const teammateTasks = heroIds.map((id) => () =>
    apiFetch<RawTeammates>(`/academy/guide/${id}/teammates`)
  );

  const [timeWRResults, teammateResults] = await Promise.all([
    batchedAll(timeWRTasks,   8),
    batchedAll(teammateTasks, 8),
  ]);

  const timeWRMap      = new Map<number, { phaseEarly: number | null; phaseMid: number | null; phaseLate: number | null }>();
  const synergyMap     = new Map<number, number>();
  const synergyPairsMap = new Map<number, Record<number, number>>();

  for (let i = 0; i < heroIds.length; i++) {
    const id    = heroIds[i];
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

      // Also store individual synergyPairs (positive boosts only)
      const pairs: Record<number, number> = {};
      for (const h of subHeroes) {
        if (h.increase_win_rate > 0) pairs[h.heroid] = h.increase_win_rate;
      }
      if (Object.keys(pairs).length > 0) synergyPairsMap.set(id, pairs);
    }
  }

  // Fallback from snapshot for phase/synergy (endpoints often unavailable)
  if (snapshot) {
    for (const [key, val] of Object.entries(snapshot.timeWRMap)) {
      const id = parseInt(key, 10);
      if (!timeWRMap.has(id)) timeWRMap.set(id, val);
    }
    for (const [key, val] of Object.entries(snapshot.synergyMap)) {
      const id = parseInt(key, 10);
      if (!synergyMap.has(id)) synergyMap.set(id, val);
    }
    for (const [key, val] of Object.entries(snapshot.synergyPairsMap)) {
      const id = parseInt(key, 10);
      if (!synergyPairsMap.has(id)) synergyPairsMap.set(id, val as Record<number, number>);
    }
  }

  console.log(`[fetch-heroes] → Phase data:    ${timeWRMap.size}/${heroIds.length} heroes`);
  console.log(`[fetch-heroes] → Synergy data:  ${synergyMap.size}/${heroIds.length} heroes`);
  console.log(`[fetch-heroes] → SynergyPairs:  ${synergyPairsMap.size}/${heroIds.length} heroes`);

  // ── Step 3: Speciality + skill tags + power curve (new API, batched 5) ──────
  console.log('[fetch-heroes] → Fetching speciality, skill tags, and power curves (new API)…');

  const idToName = new Map(records.map((r) => [r.data.hero_id, r.data.hero.data.name]));
  const idToLane = new Map(heroIds.map((id) => {
    const role = HERO_STATS[id]?.roles?.[0] ?? 'Fighter';
    return [id, ROLE_TO_LANE_PARAM[role] ?? 'exp'];
  }));

  const fullDataTasks = heroIds.map((id) => () => {
    const name = idToName.get(id) ?? '';
    return apiFetch<RawHeroFullResponse>(`/heroes/${encodeURIComponent(name)}`);
  });

  const timelineTasks = heroIds.map((id) => () => {
    const name = idToName.get(id) ?? '';
    const lane = idToLane.get(id) ?? 'exp';
    return apiFetch<RawWinRateTimelineResponse>(
      `/academy/heroes/${encodeURIComponent(name)}/win-rate/timeline?lane=${lane}`
    );
  });

  // Smaller batches — 2 new API calls per hero
  const [fullDataResults, timelineResults] = await Promise.all([
    batchedAll(fullDataTasks,  5),
    batchedAll(timelineTasks,  5),
  ]);

  const specialityMap  = new Map<number, string[]>();
  const skillTagsMap   = new Map<number, string[]>();
  const powerCurveMap  = new Map<number, { early: number; mid: number; late: number; peak: string }>();

  for (let i = 0; i < heroIds.length; i++) {
    const id   = heroIds[i];
    const full = fullDataResults[i];
    const tl   = timelineResults[i];

    // Speciality + skill tags
    const heroData = full?.data?.records?.[0]?.data?.hero?.data;
    if (heroData) {
      specialityMap.set(id, heroData.speciality ?? []);
      const tagSet = new Set<string>();
      for (const sl of heroData.heroskilllist ?? []) {
        for (const skill of sl.skilllist ?? []) {
          for (const tag of skill.skilltag ?? []) {
            if (tag.tagname) tagSet.add(tag.tagname);
          }
        }
      }
      skillTagsMap.set(id, Array.from(tagSet));
    }

    // Power curve
    const entries = tl?.data?.records?.[0]?.data?.time_win_rate;
    if (entries?.length) {
      const avgWR = (minMin: number, maxMin: number) => {
        const relevant = entries.filter((t) => t.time_min >= minMin && t.time_min < maxMin);
        return relevant.length > 0
          ? relevant.reduce((s, t) => s + t.win_rate, 0) / relevant.length
          : 0.50;
      };
      const early = parseFloat(normalizePowerWR(avgWR(0,  10)).toFixed(2));
      const mid   = parseFloat(normalizePowerWR(avgWR(10, 16)).toFixed(2));
      const late  = parseFloat(normalizePowerWR(avgWR(16, 99)).toFixed(2));
      const peak  = early >= mid && early >= late ? 'early' : mid >= late ? 'mid' : 'late';
      powerCurveMap.set(id, { early, mid, late, peak });
    }
  }

  // Fallback from snapshot for speciality/skillTags/powerCurve
  if (snapshot) {
    for (const [key, val] of Object.entries(snapshot.specialityMap)) {
      const id = parseInt(key, 10);
      if (!specialityMap.has(id)) specialityMap.set(id, val);
    }
    for (const [key, val] of Object.entries(snapshot.skillTagsMap)) {
      const id = parseInt(key, 10);
      if (!skillTagsMap.has(id)) skillTagsMap.set(id, val);
    }
    for (const [key, val] of Object.entries(snapshot.powerCurveMap)) {
      const id = parseInt(key, 10);
      if (!powerCurveMap.has(id)) powerCurveMap.set(id, val);
    }
  }

  console.log(`[fetch-heroes] → Speciality:    ${specialityMap.size}/${heroIds.length} heroes`);
  console.log(`[fetch-heroes] → Skill tags:    ${skillTagsMap.size}/${heroIds.length} heroes`);
  console.log(`[fetch-heroes] → Power curves:  ${powerCurveMap.size}/${heroIds.length} heroes`);

  // ── Step 4: Build hero objects ──────────────────────────────────────────────
  const heroes = records.map((rec) => {
    const d      = rec.data;
    const id     = d.hero_id;
    const stats  = HERO_STATS[id];
    const roles  = stats?.roles ?? ['Fighter'];
    const defs   = stats ?? { roles, ...getDefaultsForRoles(roles) };
    const rank   = rankMap.get(id);
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

    return {
      id,
      name:  d.hero.data.name,
      image: d.hero.data.head,
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

      synergyBoost: synergyMap.get(id) ?? 5.0,

      // Pairwise synergy boosts (baked from teammates API)
      synergyPairs: synergyPairsMap.get(id) ?? {},

      counters:    (d.relation.weak.target_hero_id   ?? []).filter((x: number) => x > 0),
      counteredBy: (d.relation.strong.target_hero_id ?? []).filter((x: number) => x > 0),
      synergies:   (d.relation.assist.target_hero_id ?? []).filter((x: number) => x > 0),

      winRate:  rank?.winRate  ?? (defs as { winRate?: number }).winRate  ?? 0.500,
      pickRate: rank?.pickRate ?? (defs as { pickRate?: number }).pickRate ?? 0.050,
      banRate:  rank?.banRate  ?? (defs as { banRate?: number }).banRate  ?? 0.010,

      // New enriched fields — baked at build time for offline resilience
      speciality: specialityMap.get(id) ?? [],
      skillTags:  skillTagsMap.get(id)  ?? [],
      powerCurve: powerCurveMap.get(id),
    };
  });

  // ── Step 5: Write output files ──────────────────────────────────────────────
  const outDir = path.join(process.cwd(), 'public');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'heroes.json'), JSON.stringify(heroes));

  const withPhases    = heroes.filter((h) => timeWRMap.has(h.id)).length;
  const withSynergy   = heroes.filter((h) => synergyMap.has(h.id)).length;
  const withSpeciality = heroes.filter((h) => (specialityMap.get(h.id)?.length ?? 0) > 0).length;
  const withCurve     = heroes.filter((h) => powerCurveMap.has(h.id)).length;

  console.log(`[fetch-heroes] ✓ Wrote ${heroes.length} heroes`);
  console.log(`  Phase data:    ${withPhases}/${heroes.length}`);
  console.log(`  Synergy data:  ${withSynergy}/${heroes.length}`);
  console.log(`  Speciality:    ${withSpeciality}/${heroes.length}`);
  console.log(`  Power curves:  ${withCurve}/${heroes.length}`);

  // Write data-status.json — used by the UI freshness indicator
  const status = {
    buildTime:   new Date().toISOString(),
    heroCount:   heroes.length,
    enriched: {
      phase:       withPhases,
      synergy:     withSynergy,
      speciality:  withSpeciality,
      powerCurve:  withCurve,
    },
  };
  fs.writeFileSync(path.join(outDir, 'data-status.json'), JSON.stringify(status));
  console.log(`[fetch-heroes] ✓ Wrote data-status.json (buildTime: ${status.buildTime})`);

  // ── Step 6: Save api-snapshot.json (local backup for next offline build) ────
  // Only update entries that we actually fetched from the live API this run,
  // so the snapshot always holds the union of all successful fetches over time.
  const mergedRank:         ApiSnapshot['rankMap']         = { ...snapshot?.rankMap };
  const mergedTimeWR:       ApiSnapshot['timeWRMap']       = { ...snapshot?.timeWRMap };
  const mergedSynergy:      ApiSnapshot['synergyMap']      = { ...snapshot?.synergyMap };
  const mergedSynergyPairs: ApiSnapshot['synergyPairsMap'] = { ...snapshot?.synergyPairsMap };
  const mergedSpeciality:   ApiSnapshot['specialityMap']   = { ...snapshot?.specialityMap };
  const mergedSkillTags:    ApiSnapshot['skillTagsMap']    = { ...snapshot?.skillTagsMap };
  const mergedPowerCurve:   ApiSnapshot['powerCurveMap']   = { ...snapshot?.powerCurveMap };

  for (const [id, val] of rankMap)        mergedRank[id]         = val;
  for (const [id, val] of timeWRMap)      mergedTimeWR[id]       = val;
  for (const [id, val] of synergyMap)     mergedSynergy[id]      = val;
  for (const [id, val] of synergyPairsMap) mergedSynergyPairs[id] = val;
  for (const [id, val] of specialityMap)  mergedSpeciality[id]   = val;
  for (const [id, val] of skillTagsMap)   mergedSkillTags[id]    = val;
  for (const [id, val] of powerCurveMap)  mergedPowerCurve[id]   = val;

  saveSnapshot({
    rankMap:         mergedRank,
    timeWRMap:       mergedTimeWR,
    synergyMap:      mergedSynergy,
    synergyPairsMap: mergedSynergyPairs,
    specialityMap:   mergedSpeciality,
    skillTagsMap:    mergedSkillTags,
    powerCurveMap:   mergedPowerCurve,
  });
}

main().catch((err) => {
  console.error('[fetch-heroes] ✗ Failed:', err.message);
  console.error('[fetch-heroes]   The app will use offline fallback data.');
  process.exit(0);
});
