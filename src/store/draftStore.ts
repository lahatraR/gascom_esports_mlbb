'use client';

import { create } from 'zustand';
import { HERO_STATS, getDefaultsForRoles, FALLBACK_HERO_NAMES } from '@/data/heroes';
import type { HeroData, DraftAnalysis, GameMode, DraftTeam, SeriesMode, SeriesGame, DraftArchetype } from '@/types/draft';
import { fetchHeroDetailStats, fetchHeroFullData, fetchHeroWinRateTimeline } from '@/lib/mlbbApi';
import type { LaneKey } from '@/data/tierList';
import { getDraftSequence, getBanCount } from '@/types/draft';
import { runDraftAnalysis } from '@/engine/teamComparison';
import { getHeroDifficulty } from '@/data/executionDifficulty';

// ─── Offline fallback hero list ───────────────────────────────────────────────

function buildFallbackPool(): HeroData[] {
  return FALLBACK_HERO_NAMES.map((name, idx) => {
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
      phaseEarly:   defs.early,
      phaseMid:     defs.mid,
      phaseLate:    defs.late,
      synergyBoost: 5.0,
    };
  });
}

function makeSlots(n: number): null[] { return Array(n).fill(null); }

// ─── URL sync helpers ─────────────────────────────────────────────────────────

function pushDraftUrl(
  gameMode: GameMode,
  blueBans:  (HeroData | null)[],
  redBans:   (HeroData | null)[],
  bluePicks: (HeroData | null)[],
  redPicks:  (HeroData | null)[],
  step: number
) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams();
  p.set('m',  gameMode.charAt(0));
  p.set('bb', blueBans.map( (h) => h?.id ?? 0).join(','));
  p.set('rb', redBans.map(  (h) => h?.id ?? 0).join(','));
  p.set('bp', bluePicks.map((h) => h?.id ?? 0).join(','));
  p.set('rp', redPicks.map( (h) => h?.id ?? 0).join(','));
  p.set('s',  String(step));
  window.history.replaceState(null, '', `?${p.toString()}`);
}

// ─── Background detail-stats enrichment ───────────────────────────────────────

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

  if (detailMap.size === 0) return;

  const enriched = pool.map((h) => {
    const d = detailMap.get(h.id);
    if (!d) return h;
    const bakedWR  = h.winRate ?? 0.50;
    const wrDelta  = parseFloat((d.winRate - bakedWR).toFixed(4));
    const wrTrend: 'rising' | 'stable' | 'falling' =
      wrDelta >= 0.015 ? 'rising' : wrDelta <= -0.015 ? 'falling' : 'stable';
    return {
      ...h,
      winRate:     d.winRate,
      banRate:     d.banRate,
      pickRate:    d.pickRate,
      synergyPairs: d.synergyPairs,
      synergyBoost: d.synergyBoost,
      wrDelta,
      wrTrend,
    };
  });

  onDone(enriched);
}

// ─── Background full-data enrichment ──────────────────────────────────────────

const ROLE_TO_LANE_KEY: Record<string, LaneKey> = {
  Tank: 'Roam', Support: 'Roam', Fighter: 'EXP',
  Mage: 'Mid', Assassin: 'Jungle', Marksman: 'Gold',
};

async function enrichWithFullData(
  pool:   HeroData[],
  onDone: (enriched: HeroData[]) => void,
): Promise<void> {
  const BATCH  = 5;
  const fullMap = new Map<number, {
    speciality: string[];
    skillTags:  string[];
    powerCurve: HeroData['powerCurve'];
  }>();

  for (let i = 0; i < pool.length; i += BATCH) {
    const batch = pool.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(async (h) => {
        const primaryLane = ROLE_TO_LANE_KEY[h.roles[0] ?? 'Fighter'] ?? 'EXP';
        const [fullRes, timelineRes] = await Promise.allSettled([
          fetchHeroFullData(h.name),
          fetchHeroWinRateTimeline(h.name, primaryLane),
        ]);
        const full     = fullRes.status     === 'fulfilled' ? fullRes.value     : null;
        const timeline = timelineRes.status === 'fulfilled' ? timelineRes.value : null;
        if (!full && !timeline) return;
        fullMap.set(h.id, {
          speciality: full?.speciality ?? [],
          skillTags:  full?.skillTags  ?? [],
          powerCurve: timeline ?? undefined,
        });
      }),
    );
  }

  if (fullMap.size === 0) return;

  const enriched = pool.map((h) => {
    const d = fullMap.get(h.id);
    return d ? { ...h, ...d } : h;
  });

  onDone(enriched);
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface DraftStore {
  heroPool:       HeroData[];
  isLoadingPool:  boolean;
  poolError:      string | null;
  // 'build'  → data from heroes.json (no live enrichment yet)
  // 'live'   → at least one live enrichment pass succeeded
  dataFreshness:  'build' | 'live';

  blueBans:    (HeroData | null)[];
  redBans:     (HeroData | null)[];
  bluePicks:   (HeroData | null)[];
  redPicks:    (HeroData | null)[];
  currentStep: number;
  gameMode:    GameMode;

  analysis:    DraftAnalysis | null;
  search:      string;
  roleFilter:  string;

  seriesMode:    SeriesMode;
  currentGame:   number;
  gamesHistory:  SeriesGame[];

  restrictedEnemyIds: number[];

  mySide:           'blue' | 'red' | null;
  plannedArchetype: DraftArchetype | null;
  uiMode:           'simple' | 'advanced';

  loadHeroPool:           () => Promise<void>;
  loadFromUrl:            () => void;
  selectHero:             (hero: HeroData) => void;
  undoLastAction:         () => void;
  resetDraft:             () => void;
  setGameMode:            (mode: GameMode) => void;
  setSearch:              (q: string) => void;
  setRoleFilter:          (role: string) => void;

  setSeriesMode:          (mode: SeriesMode) => void;
  recordGameWinner:       (winner: 'blue' | 'red') => void;

  toggleRestrictedEnemy:  (id: number) => void;
  clearRestrictedEnemies: () => void;

  getFilteredHeroes:      () => HeroData[];

  setMySide:           (side: 'blue' | 'red') => void;
  setPlannedArchetype: (arch: DraftArchetype | null) => void;
  setUiMode:           (mode: 'simple' | 'advanced') => void;
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
  const seq          = getDraftSequence(gameMode);
  const stepData     = nextStep < seq.length ? seq[nextStep] : null;
  const currentTeam: DraftTeam  = stepData?.team   ?? 'blue';
  const currentAction            = stepData?.action ?? 'pick';

  return runDraftAnalysis(heroPool, bPicks, rPicks, bBans, rBans, currentTeam, gameMode, currentAction);
}

// ─── Store ────────────────────────────────────────────────────────────────────

// ─── Lightweight localStorage helpers (SSR-safe) ─────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  heroPool:       [],
  isLoadingPool:  false,
  poolError:      null,
  dataFreshness:  'build',

  blueBans:    makeSlots(getBanCount(lsGet<GameMode>('ges_gameMode', 'ranked'))),
  redBans:     makeSlots(getBanCount(lsGet<GameMode>('ges_gameMode', 'ranked'))),
  bluePicks:   makeSlots(5),
  redPicks:    makeSlots(5),
  currentStep: 0,
  gameMode:    lsGet<GameMode>('ges_gameMode', 'ranked'),

  analysis:    null,
  search:      '',
  roleFilter:  'All',

  seriesMode:    'none',
  currentGame:   1,
  gamesHistory:  [],

  restrictedEnemyIds: [],

  mySide:           null,
  plannedArchetype: lsGet<DraftArchetype | null>('ges_plannedArchetype', null),
  uiMode:           lsGet<'simple' | 'advanced'>('ges_uiMode', 'simple'),

  // ── Load hero pool ────────────────────────────────────────────────────────
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

          // Enrich difficulty rating into every hero
          pool = pool.map(h => ({ ...h, difficulty: h.difficulty ?? getHeroDifficulty(h.name) }));

          set({ heroPool: pool, isLoadingPool: false });

          // Background enrichment pass 1: real stats + synergy pairs
          // Background enrichment pass 2 (chained): speciality, skill tags, power curve
          // On first success → mark dataFreshness as 'live'
          enrichWithDetailStats(pool, (enriched1) => {
            set({ heroPool: enriched1, dataFreshness: 'live' });
            enrichWithFullData(enriched1, (enriched2) => {
              set({ heroPool: enriched2 });
            }).catch(() => { /* ignore */ });
          }).catch(() => { /* ignore — enrichment is best-effort */ });

          return;
        }
      }
    } catch { /* fall through to offline */ }

    const fallback = buildFallbackPool();
    set({ heroPool: fallback, isLoadingPool: false, poolError: 'API unavailable — using offline data' });
  },

  // ── Restore draft from URL ────────────────────────────────────────────────
  loadFromUrl: () => {
    if (typeof window === 'undefined') return;
    const params  = new URLSearchParams(window.location.search);
    const m       = params.get('m');
    if (!m) return;

    const modeMap: Record<string, GameMode> = { r: 'ranked', t: 'tournament', c: 'custom' };
    const gameMode = modeMap[m];
    if (!gameMode) return;

    const { heroPool } = get();
    if (heroPool.length === 0) return;

    const heroById  = new Map(heroPool.map((h) => [h.id, h]));
    const banCount  = getBanCount(gameMode);

    const decodeSlots = (key: string, len: number): (HeroData | null)[] => {
      const str = params.get(key);
      if (!str) return makeSlots(len);
      const ids = str.split(',').map(Number);
      return ids.slice(0, len).map((id) => id > 0 ? (heroById.get(id) ?? null) : null);
    };

    const blueBans  = decodeSlots('bb', banCount);
    const redBans   = decodeSlots('rb', banCount);
    const bluePicks = decodeSlots('bp', 5);
    const redPicks  = decodeSlots('rp', 5);
    const currentStep = parseInt(params.get('s') ?? '0', 10) || 0;

    const analysis = reanalyze(heroPool, bluePicks, redPicks, blueBans, redBans, currentStep, gameMode);

    set({ gameMode, blueBans, redBans, bluePicks, redPicks, currentStep, analysis });
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

    pushDraftUrl(state.gameMode, blueBans, redBans, bluePicks, redPicks, nextStep);
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

    pushDraftUrl(state.gameMode, blueBans, redBans, bluePicks, redPicks, prevIdx);
    set({ blueBans, redBans, bluePicks, redPicks, currentStep: prevIdx, analysis });
  },

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetDraft: () => {
    const { gameMode } = get();
    const bans = getBanCount(gameMode);
    pushDraftUrl(gameMode, makeSlots(bans), makeSlots(bans), makeSlots(5), makeSlots(5), 0);
    lsSet('ges_plannedArchetype', null);
    set({
      blueBans:    makeSlots(bans),
      redBans:     makeSlots(bans),
      bluePicks:   makeSlots(5),
      redPicks:    makeSlots(5),
      currentStep: 0,
      analysis:    null,
      mySide:      null,
      plannedArchetype: null,
    });
  },

  setGameMode: (mode) => {
    const bans = getBanCount(mode);
    pushDraftUrl(mode, makeSlots(bans), makeSlots(bans), makeSlots(5), makeSlots(5), 0);
    lsSet('ges_gameMode', mode);
    set({
      gameMode:    mode,
      blueBans:    makeSlots(bans),
      redBans:     makeSlots(bans),
      bluePicks:   makeSlots(5),
      redPicks:    makeSlots(5),
      currentStep: 0,
      analysis:    null,
    });
  },

  setSearch:     (q)    => set({ search: q }),
  setRoleFilter: (role) => set({ roleFilter: role }),

  setSeriesMode: (mode) => set({ seriesMode: mode }),

  recordGameWinner: (winner) => {
    const state = get();
    const gameRecord: SeriesGame = {
      gameNumber: state.currentGame,
      winner,
      bluePicks: state.bluePicks.filter(Boolean).map((h) => h!.id),
      redPicks:  state.redPicks.filter(Boolean).map((h) => h!.id),
      blueBans:  state.blueBans.filter(Boolean).map((h) => h!.id),
      redBans:   state.redBans.filter(Boolean).map((h) => h!.id),
    };

    const gamesHistory  = [...state.gamesHistory, gameRecord];
    const nextGame      = state.currentGame + 1;
    const bans          = getBanCount(state.gameMode);

    set({
      gamesHistory,
      currentGame:  nextGame,
      blueBans:     makeSlots(bans),
      redBans:      makeSlots(bans),
      bluePicks:    makeSlots(5),
      redPicks:     makeSlots(5),
      currentStep:  0,
      analysis:     null,
    });
  },

  toggleRestrictedEnemy: (id) => {
    const { restrictedEnemyIds } = get();
    if (restrictedEnemyIds.includes(id)) {
      set({ restrictedEnemyIds: restrictedEnemyIds.filter((x) => x !== id) });
    } else {
      set({ restrictedEnemyIds: [...restrictedEnemyIds, id] });
    }
  },

  clearRestrictedEnemies: () => set({ restrictedEnemyIds: [] }),

  getFilteredHeroes: () => {
    const { heroPool, search, roleFilter, blueBans, redBans, bluePicks, redPicks } = get();
    const usedIds = new Set<number>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => h && usedIds.add(h.id));
    const q = search.toLowerCase();
    return heroPool.filter((h) => {
      if (usedIds.has(h.id)) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'All' && !h.roles.includes(roleFilter)) return false;
      return true;
    });
  },

  setMySide:           (side) => set({ mySide: side }),
  setPlannedArchetype: (arch) => { lsSet('ges_plannedArchetype', arch); set({ plannedArchetype: arch }); },
  setUiMode:           (mode) => { lsSet('ges_uiMode', mode);           set({ uiMode: mode }); },
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
