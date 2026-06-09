'use client';

import { create } from 'zustand';
import { HERO_STATS, getDefaultsForRoles, FALLBACK_HERO_NAMES } from '@/data/heroes';
import type { HeroData, DraftAnalysis, GameMode, DraftTeam, SeriesMode, SeriesGame } from '@/types/draft';
import { getDraftSequence, getBanCount } from '@/types/draft';
import { runDraftAnalysis } from '@/engine/teamComparison';

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

  // ── Feature 6: BO Series ───────────────────────────────────────────────────
  seriesMode:    SeriesMode;
  currentGame:   number;
  gamesHistory:  SeriesGame[];

  // ── Feature 7: Enemy Pool restriction ─────────────────────────────────────
  restrictedEnemyIds: number[];

  // ── Actions ───────────────────────────────────────────────────────────────
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

  seriesMode:    'none',
  currentGame:   1,
  gamesHistory:  [],

  restrictedEnemyIds: [],

  // ── Load hero pool ────────────────────────────────────────────────────────
  loadHeroPool: async () => {
    set({ isLoadingPool: true, poolError: null });
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    try {
      const res = await fetch(`${basePath}/heroes.json`);
      if (res.ok) {
        const pool: HeroData[] = await res.json();
        if (Array.isArray(pool) && pool.length > 0) {
          set({ heroPool: pool, isLoadingPool: false });
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
    set({
      blueBans:    makeSlots(bans),
      redBans:     makeSlots(bans),
      bluePicks:   makeSlots(5),
      redPicks:    makeSlots(5),
      currentStep: 0,
      analysis:    null,
    });
  },

  setGameMode: (mode) => {
    const bans = getBanCount(mode);
    pushDraftUrl(mode, makeSlots(bans), makeSlots(bans), makeSlots(5), makeSlots(5), 0);
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

  // ── Series ────────────────────────────────────────────────────────────────
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

  // ── Enemy pool restriction ────────────────────────────────────────────────
  toggleRestrictedEnemy: (id) => {
    const { restrictedEnemyIds } = get();
    if (restrictedEnemyIds.includes(id)) {
      set({ restrictedEnemyIds: restrictedEnemyIds.filter((x) => x !== id) });
    } else {
      set({ restrictedEnemyIds: [...restrictedEnemyIds, id] });
    }
  },

  clearRestrictedEnemies: () => set({ restrictedEnemyIds: [] }),

  // ── Derived helper ────────────────────────────────────────────────────────
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
