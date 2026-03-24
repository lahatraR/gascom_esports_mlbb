'use client';

import { create } from 'zustand';
import { HERO_STATS, getDefaultsForRoles, FALLBACK_HERO_NAMES } from '@/data/heroes';
import type { HeroData, DraftAnalysis, GameMode, DraftTeam, DraftArchetype } from '@/types/draft';
import { fetchHeroDetailStats } from '@/lib/mlbbApi';
import { getDraftSequence, getBanCount } from '@/types/draft';
import { runDraftAnalysis } from '@/engine/teamComparison';

// ─── Offline fallback hero list ───────────────────────────────────────────────
// Used only if the API is completely unavailable.

function buildFallbackPool(): HeroData[] {
  return FALLBACK_HERO_NAMES.map((name, idx) => {
    // Find the hero_id that has this name in HERO_STATS
    const idEntry = Object.entries(HERO_STATS).find(
      ([, s]) => s.roles.length > 0 && idx < 133
    );
    const id    = idx + 1;
    const stats = HERO_STATS[id];
    const roles = stats?.roles ?? ['Fighter'];
    const defs  = stats ?? { roles, ...getDefaultsForRoles(roles) };

    return {
      id, name,
      image:       '',
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
      counters:    [],
      counteredBy: [],
      synergies:   [],
      winRate:  defs.winRate  ?? 0.500,
      pickRate: defs.pickRate ?? 0.050,
      banRate:  defs.banRate  ?? 0.010,
      // Phase win rates — no API data in offline mode, use static attributes as fallback
      phaseEarly:   defs.early,
      phaseMid:     defs.mid,
      phaseLate:    defs.late,
      synergyBoost: 5.0,  // neutral — no synergy data in offline fallback
    };
  });
}

function makeSlots(n: number): null[] { return Array(n).fill(null); }

// ─── Background detail-stats enrichment ───────────────────────────────────────
// Fetches hero-detail-stats/{name} for each hero in batches of 10.
// Overwrites winRate/banRate/pickRate with real API values and populates
// synergyPairs (used by draft generator for pair synergy scoring).
// Runs after initial pool load so the UI is never blocked.

async function enrichWithDetailStats(
  pool: HeroData[],
  onDone: (enriched: HeroData[]) => void,
): Promise<void> {
  const BATCH = 10;
  const detailMap = new Map<number, { winRate: number; banRate: number; pickRate: number; synergyPairs: Record<number, number>; synergyBoost: number }>();

  for (let i = 0; i < pool.length; i += BATCH) {
    const batch   = pool.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((h) => fetchHeroDetailStats(h.name)),
    );
    results.forEach((r, idx) => {
      if (r.status !== 'fulfilled' || !r.value) return;
      const detail = r.value;
      const pairs: Record<number, number> = {};
      for (const p of detail.synergyPairs) pairs[p.heroId] = p.boost;

      // synergyBoost: 5 (neutral) + average boost of top-3 partners × 0.5
      // e.g. avg boost 6% → synergyBoost = 5 + 3 = 8
      const top3 = detail.synergyPairs.slice(0, 3).map((p) => p.boost);
      const avgBoost = top3.length > 0 ? top3.reduce((a, b) => a + b, 0) / top3.length : 0;
      const synergyBoost = Math.min(10, 5 + avgBoost * 0.5);

      detailMap.set(batch[idx].id, {
        winRate:      detail.winRate,
        banRate:      detail.banRate,
        pickRate:     detail.pickRate,
        synergyPairs: pairs,
        synergyBoost,
      });
    });
  }

  if (detailMap.size === 0) return; // nothing fetched — keep existing data

  const enriched = pool.map((h) => {
    const d = detailMap.get(h.id);
    if (!d) return h;
    return { ...h, winRate: d.winRate, banRate: d.banRate, pickRate: d.pickRate, synergyPairs: d.synergyPairs, synergyBoost: d.synergyBoost };
  });

  onDone(enriched);
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface DraftStore {
  heroPool:       HeroData[];
  isLoadingPool:  boolean;
  poolError:      string | null;

  blueBans:    (HeroData | null)[];
  redBans:     (HeroData | null)[];
  bluePicks:   (HeroData | null)[];
  redPicks:    (HeroData | null)[];
  currentStep: number;
  gameMode:    GameMode;

  analysis:    DraftAnalysis | null;
  search:      string;
  roleFilter:  string;

  mySide:           'blue' | 'red' | null;
  plannedArchetype: DraftArchetype | null;

  loadHeroPool:        () => Promise<void>;
  selectHero:          (hero: HeroData) => void;
  undoLastAction:      () => void;
  resetDraft:          () => void;
  setGameMode:         (mode: GameMode) => void;
  setSearch:           (q: string) => void;
  setRoleFilter:       (role: string) => void;
  setMySide:           (side: 'blue' | 'red') => void;
  setPlannedArchetype: (arch: DraftArchetype | null) => void;
}

// ─── Analysis helper ──────────────────────────────────────────────────────────

function reanalyze(
  heroPool: HeroData[],
  bluePicks: (HeroData | null)[],
  redPicks:  (HeroData | null)[],
  blueBans:  (HeroData | null)[],
  redBans:   (HeroData | null)[],
  nextStep:  number,
  gameMode:  GameMode
): DraftAnalysis {
  const bPicks = bluePicks.filter(Boolean) as HeroData[];
  const rPicks = redPicks.filter(Boolean)  as HeroData[];
  const bBans  = blueBans.filter(Boolean)  as HeroData[];
  const rBans  = redBans.filter(Boolean)   as HeroData[];
  const seq         = getDraftSequence(gameMode);
  const currentTeam: DraftTeam = nextStep < seq.length ? seq[nextStep].team : 'blue';

  return runDraftAnalysis(heroPool, bPicks, rPicks, bBans, rBans, currentTeam, gameMode);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDraftStore = create<DraftStore>((set, get) => ({
  heroPool:       [],
  isLoadingPool:  false,
  poolError:      null,

  blueBans:    makeSlots(getBanCount('ranked')),
  redBans:     makeSlots(getBanCount('ranked')),
  bluePicks:   makeSlots(5),
  redPicks:    makeSlots(5),
  currentStep: 0,
  gameMode:    'ranked',

  analysis:    null,
  search:      '',
  roleFilter:  'All',

  mySide:           null,
  plannedArchetype: null,

  // ── Load hero pool ────────────────────────────────────────────────────────
  // Fetches heroes.json (generated at prebuild time by scripts/fetch-heroes.ts).
  // Falls back to offline static data if the file is unavailable.
  loadHeroPool: async () => {
    set({ isLoadingPool: true, poolError: null });

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

    try {
      const res = await fetch(`${basePath}/heroes.json`);
      if (res.ok) {
        let pool: HeroData[] = await res.json();
        if (Array.isArray(pool) && pool.length > 0) {
          // Enrich with official positions from the hero-position API
          try {
            const posRes = await fetch('https://mlbb-stats.rone.dev/api/hero-position');
            if (posRes.ok) {
              const posJson = await posRes.json();
              const posMap = new Map<number, { lanes: string[]; roles: string[] }>();
              for (const rec of posJson?.data?.records ?? []) {
                const d    = rec.data;
                const hero = d?.hero?.data;
                if (!hero || !d.hero_id) continue;
                const LANE_MAP: Record<string, string> = {
                  'Exp Lane': 'EXP', 'Gold Lane': 'Gold', 'Mid Lane': 'Mid',
                  'Jungle': 'Jungle', 'Roam': 'Roam',
                };
                const ROLE_NORM: Record<string, string> = {
                  fighter: 'Fighter', assassin: 'Assassin', marksman: 'Marksman',
                  mage: 'Mage', tank: 'Tank', support: 'Support',
                };
                const lanes = (hero.roadsort ?? [])
                  .filter((r: unknown) => r && typeof r === 'object' && (r as Record<string, unknown>).data)
                  .map((r: unknown) => LANE_MAP[((r as Record<string, Record<string, string>>).data).road_sort_title])
                  .filter(Boolean);
                const roles = (hero.sortid ?? [])
                  .filter((r: unknown) => r && typeof r === 'object' && (r as Record<string, unknown>).data)
                  .map((r: unknown) => {
                    const t = ((r as Record<string, Record<string, string>>).data).sort_title ?? '';
                    return ROLE_NORM[t.toLowerCase()] ?? t;
                  })
                  .filter(Boolean);
                posMap.set(d.hero_id, { lanes, roles });
              }
              // Merge: update roles for heroes that have API position data
              pool = pool.map((h) => {
                const pos = posMap.get(h.id);
                if (!pos || pos.roles.length === 0) return h;
                return { ...h, roles: pos.roles };
              });
            }
          } catch { /* ignore — use heroes.json roles as-is */ }

          set({ heroPool: pool, isLoadingPool: false });

          // Background enrichment: fetch real stats + synergy pairs without blocking UI
          enrichWithDetailStats(pool, (enriched) => {
            set({ heroPool: enriched });
          }).catch(() => { /* ignore — enrichment is best-effort */ });

          return;
        }
      }
    } catch { /* fall through to offline */ }

    // heroes.json unavailable — offline fallback
    const fallback = buildFallbackPool();
    set({ heroPool: fallback, isLoadingPool: false, poolError: 'API unavailable — using offline data' });
  },

  // ── Select hero for current draft step ───────────────────────────────────
  selectHero: (hero: HeroData) => {
    const state = get();
    const seq   = getDraftSequence(state.gameMode);
    if (state.currentStep >= seq.length) return;

    const step = seq[state.currentStep];
    let blueBans  = [...state.blueBans];
    let redBans   = [...state.redBans];
    let bluePicks = [...state.bluePicks];
    let redPicks  = [...state.redPicks];

    if (step.action === 'ban') {
      if (step.team === 'blue') {
        const slot = blueBans.findIndex((s) => s === null);
        if (slot !== -1) blueBans[slot] = hero;
      } else {
        const slot = redBans.findIndex((s) => s === null);
        if (slot !== -1) redBans[slot] = hero;
      }
    } else {
      if (step.team === 'blue') {
        const slot = bluePicks.findIndex((s) => s === null);
        if (slot !== -1) bluePicks[slot] = hero;
      } else {
        const slot = redPicks.findIndex((s) => s === null);
        if (slot !== -1) redPicks[slot] = hero;
      }
    }

    const nextStep = state.currentStep + 1;
    const analysis = reanalyze(
      state.heroPool, bluePicks, redPicks, blueBans, redBans, nextStep, state.gameMode
    );

    set({ blueBans, redBans, bluePicks, redPicks, currentStep: nextStep, analysis });
  },

  // ── Undo last action ─────────────────────────────────────────────────────
  undoLastAction: () => {
    const state = get();
    if (state.currentStep <= 0) return;

    const prevIdx = state.currentStep - 1;
    const step    = getDraftSequence(state.gameMode)[prevIdx];

    let blueBans  = [...state.blueBans];
    let redBans   = [...state.redBans];
    let bluePicks = [...state.bluePicks];
    let redPicks  = [...state.redPicks];

    const clearLast = (arr: (HeroData | null)[]): (HeroData | null)[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i] !== null) { copy[i] = null; break; }
      }
      return copy;
    };

    if (step.action === 'ban') {
      if (step.team === 'blue') blueBans  = clearLast(blueBans);
      else                      redBans   = clearLast(redBans);
    } else {
      if (step.team === 'blue') bluePicks = clearLast(bluePicks);
      else                      redPicks  = clearLast(redPicks);
    }

    const analysis = reanalyze(
      state.heroPool, bluePicks, redPicks, blueBans, redBans, prevIdx, state.gameMode
    );

    set({ blueBans, redBans, bluePicks, redPicks, currentStep: prevIdx, analysis });
  },

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetDraft: () => {
    const bans = getBanCount(get().gameMode);
    set({ blueBans: makeSlots(bans), redBans: makeSlots(bans), bluePicks: makeSlots(5), redPicks: makeSlots(5), currentStep: 0, analysis: null, mySide: null, plannedArchetype: null });
  },

  setGameMode:         (mode) => set({ gameMode: mode }),
  setSearch:           (q)    => set({ search: q }),
  setRoleFilter:       (role) => set({ roleFilter: role }),
  setMySide:           (side) => set({ mySide: side }),
  setPlannedArchetype: (arch) => set({ plannedArchetype: arch }),
}));

// ─── Derived selectors ────────────────────────────────────────────────────────

export function selectFilteredHeroes(store: DraftStore): HeroData[] {
  const { heroPool, search, roleFilter } = store;
  const usedIds = new Set<number>();
  [...store.blueBans, ...store.redBans, ...store.bluePicks, ...store.redPicks]
    .forEach((h) => h && usedIds.add(h.id));

  return heroPool.filter((h) => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === 'All' || h.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });
}

export function selectUsedIds(store: DraftStore): Set<number> {
  const ids = new Set<number>();
  [...store.blueBans, ...store.redBans, ...store.bluePicks, ...store.redPicks]
    .forEach((h) => h && ids.add(h.id));
  return ids;
}
