'use client';

import { create } from 'zustand';
import { HERO_STATS, getDefaultsForRoles, FALLBACK_HERO_NAMES } from '@/data/heroes';
import type { HeroData, DraftAnalysis, GameMode, DraftTeam } from '@/types/draft';
import { DRAFT_SEQUENCE } from '@/types/draft';
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
    };
  });
}

function makeSlots(n: number): null[] { return Array(n).fill(null); }

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

  loadHeroPool:    () => Promise<void>;
  selectHero:      (hero: HeroData) => void;
  undoLastAction:  () => void;
  resetDraft:      () => void;
  setGameMode:     (mode: GameMode) => void;
  setSearch:       (q: string) => void;
  setRoleFilter:   (role: string) => void;
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
  const currentTeam: DraftTeam =
    nextStep < DRAFT_SEQUENCE.length ? DRAFT_SEQUENCE[nextStep].team : 'blue';

  return runDraftAnalysis(heroPool, bPicks, rPicks, bBans, rBans, currentTeam, gameMode);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDraftStore = create<DraftStore>((set, get) => ({
  heroPool:       [],
  isLoadingPool:  false,
  poolError:      null,

  blueBans:    makeSlots(5),
  redBans:     makeSlots(5),
  bluePicks:   makeSlots(5),
  redPicks:    makeSlots(5),
  currentStep: 0,
  gameMode:    'ranked',

  analysis:    null,
  search:      '',
  roleFilter:  'All',

  // ── Load hero pool ────────────────────────────────────────────────────────
  // Tries /api/heroes first (dev + Vercel), then /{basePath}/heroes.json
  // (generated at build time for GitHub Pages static export), then offline.
  loadHeroPool: async () => {
    set({ isLoadingPool: true, poolError: null });

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const endpoints = [
      '/api/heroes',
      `${basePath}/heroes.json`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        // /api/heroes returns { data: HeroData[] }; heroes.json is a flat array
        const pool: HeroData[] = Array.isArray(json) ? json : json.data;
        if (Array.isArray(pool) && pool.length > 0) {
          set({ heroPool: pool, isLoadingPool: false });
          return;
        }
      } catch { /* try next endpoint */ }
    }

    // All endpoints failed — offline fallback
    const fallback = buildFallbackPool();
    set({ heroPool: fallback, isLoadingPool: false, poolError: 'API unavailable — using offline data' });
  },

  // ── Select hero for current draft step ───────────────────────────────────
  selectHero: (hero: HeroData) => {
    const state = get();
    if (state.currentStep >= DRAFT_SEQUENCE.length) return;

    const step = DRAFT_SEQUENCE[state.currentStep];
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
    const step    = DRAFT_SEQUENCE[prevIdx];

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
  resetDraft: () =>
    set({ blueBans: makeSlots(5), redBans: makeSlots(5), bluePicks: makeSlots(5), redPicks: makeSlots(5), currentStep: 0, analysis: null }),

  setGameMode:   (mode) => set({ gameMode: mode }),
  setSearch:     (q)    => set({ search: q }),
  setRoleFilter: (role) => set({ roleFilter: role }),
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
