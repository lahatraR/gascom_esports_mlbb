import type { HeroData, DraftSuggestion, ScoreBreakdown, GameMode } from '@/types/draft';
import { getHeroTierScore } from '@/data/tierList';
import { playstyleCounterScore, buildPlaystyleHint, getPlaystyles, PLAYSTYLE_LABEL } from '@/data/heroArchetypes';

// ─── Weight configuration per game mode ─────────────────────────────────────

const WEIGHTS: Record<GameMode, {
  counter: number; synergy: number; meta: number; phase: number; pressure: number;
}> = {
  ranked:     { counter: 0.30, synergy: 0.25, meta: 0.20, phase: 0.15, pressure: 0.10 },
  tournament: { counter: 0.28, synergy: 0.22, meta: 0.25, phase: 0.15, pressure: 0.10 },
  custom:     { counter: 0.25, synergy: 0.30, meta: 0.15, phase: 0.20, pressure: 0.10 },
};

// ─── Individual scoring functions ────────────────────────────────────────────

/**
 * Counter Score (0–10):
 * Blends two signals:
 *  1. API relation data (+2 for each enemy countered, -2/-1.5 for countered)  — 70%
 *  2. Playstyle archetype counter matrix (glorious_launcher beats prey_hunter, etc.) — 30%
 *
 * The archetype signal adds richness when the API counter arrays are sparse.
 */
export function calculateCounterScore(hero: HeroData, enemyTeam: HeroData[]): number {
  if (enemyTeam.length === 0) return 5;

  // ── Signal 1: API relation arrays ─────────────────────────────────────────
  let raw = 0;
  for (const enemy of enemyTeam) {
    if (hero.counters.includes(enemy.id))      raw += 2;
    if (hero.counteredBy.includes(enemy.id))   raw -= 2;
    if (enemy.counters.includes(hero.id))      raw -= 1.5;
    if (enemy.counteredBy.includes(hero.id))   raw += 1.5;
  }
  const maxRaw  = enemyTeam.length * 3.5;
  const apiScore = clamp(((raw + maxRaw) / (maxRaw * 2)) * 10, 0, 10);

  // ── Signal 2: Playstyle archetype counter score ────────────────────────────
  const archScore = playstyleCounterScore(hero.name, enemyTeam.map((e) => e.name));

  // Blend: API is primary (70%), archetypes add signal (30%)
  return clamp(apiScore * 0.70 + archScore * 0.30, 0, 10);
}

/**
 * Synergy Score (0–10):
 * Pairwise synergy with existing allied picks.
 */
export function calculateSynergyScore(hero: HeroData, alliedTeam: HeroData[]): number {
  if (alliedTeam.length === 0) return 5;
  let score = 0;
  for (const ally of alliedTeam) {
    if (hero.synergies.includes(ally.id)) score += 2;
    if (ally.synergies.includes(hero.id)) score += 1;
  }
  return clamp((score / (alliedTeam.length * 3)) * 10, 0, 10);
}

/**
 * Meta Score (0–10):
 * Combines:
 *  - Lane tier list score (from gosugamers patch tier list, weight 60%)
 *  - Statistical score from hero-rank win/ban/pick rates (weight 40%)
 *
 * Tier list gives much stronger signal for draft priority than raw win rates
 * because it accounts for patch context, pro-play viability, and lane fit.
 */
export function calculateMetaScore(hero: HeroData): number {
  // Tier list component (0–10)
  const tierScore = getHeroTierScore(hero.name, hero.roles);

  // Statistical component (0–10)
  const { winRate, pickRate, banRate } = hero;
  let statScore: number;
  if (banRate > 0.25 || (winRate > 0.53 && pickRate > 0.10)) statScore = 9.5;
  else if (banRate > 0.15 || (winRate > 0.52 && pickRate > 0.07)) statScore = 8.0;
  else if (banRate > 0.08 || winRate > 0.515) statScore = 6.5;
  else if (winRate > 0.505) statScore = 5.5;
  else if (winRate >= 0.495) statScore = 4.5;
  else statScore = 3.0;

  // Weighted blend: tier list is the primary signal
  return clamp(tierScore * 0.60 + statScore * 0.40, 0, 10);
}

/**
 * Game Phase Score (0–10):
 * Rewards heroes that fill the team's weakest game phase.
 * In tournament: rewards phase versatility.
 */
export function calculatePhaseScore(
  hero: HeroData,
  alliedTeam: HeroData[],
  gameMode: GameMode
): number {
  if (alliedTeam.length === 0) return hero.mid; // early picks: favour mid-game

  const avgEarly = avg(alliedTeam.map((h) => h.early));
  const avgMid   = avg(alliedTeam.map((h) => h.mid));
  const avgLate  = avg(alliedTeam.map((h) => h.late));
  const minPhase = Math.min(avgEarly, avgMid, avgLate);

  if (gameMode === 'tournament') {
    // Reward versatility: the higher the lowest phase score, the better
    const heroMin = Math.min(hero.early, hero.mid, hero.late);
    return clamp(heroMin * 0.7 + hero.mid * 0.3, 0, 10);
  }

  // For ranked/custom: fill the weakest phase
  if (minPhase === avgEarly) return hero.early;
  if (minPhase === avgLate)  return hero.late;
  return hero.mid;
}

/**
 * Pressure Score (0–10):
 * Rewards map pressure contribution to the team.
 * Penalizes redundant pressure types (e.g. 3 assassins).
 */
export function calculatePressureScore(hero: HeroData, alliedTeam: HeroData[]): number {
  const baseScore = hero.pressure;
  // Redundancy penalty: count same primary role in team
  const primaryRole = hero.roles[0];
  const sameRoleCount = alliedTeam.filter((h) => h.roles[0] === primaryRole).length;
  const penalty = sameRoleCount * 0.8;
  return clamp(baseScore - penalty, 0, 10);
}

// ─── Final hero score ────────────────────────────────────────────────────────

export function scoreHero(
  hero: HeroData,
  alliedTeam: HeroData[],
  enemyTeam: HeroData[],
  bannedIds: Set<number>,
  gameMode: GameMode
): ScoreBreakdown {
  if (bannedIds.has(hero.id)) {
    return { counter: 0, synergy: 0, meta: 0, phase: 0, pressure: 0, total: 0 };
  }

  const w = WEIGHTS[gameMode];
  const counter  = calculateCounterScore(hero, enemyTeam);
  const synergy  = calculateSynergyScore(hero, alliedTeam);
  const meta     = calculateMetaScore(hero);
  const phase    = calculatePhaseScore(hero, alliedTeam, gameMode);
  const pressure = calculatePressureScore(hero, alliedTeam);

  const total = (counter * w.counter) +
                (synergy * w.synergy) +
                (meta    * w.meta)    +
                (phase   * w.phase)   +
                (pressure * w.pressure);

  return { counter, synergy, meta, phase, pressure, total };
}

// ─── Top-N suggestions for the current team ──────────────────────────────────

export function getSuggestions(
  allHeroes: HeroData[],
  alliedTeam: HeroData[],
  enemyTeam: HeroData[],
  bannedIds: Set<number>,
  pickedIds: Set<number>,
  gameMode: GameMode,
  topN = 5
): DraftSuggestion[] {
  const available = allHeroes.filter(
    (h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)
  );

  const scored = available.map((hero) => {
    const bd = scoreHero(hero, alliedTeam, enemyTeam, bannedIds, gameMode);
    return { hero, bd };
  });

  scored.sort((a, b) => b.bd.total - a.bd.total);

  return scored.slice(0, topN).map(({ hero, bd }) => ({
    hero,
    score: Math.round(normalizeScore(bd.total) * 100),
    breakdown: bd,
    reason: buildReason(hero, bd, alliedTeam, enemyTeam),
  }));
}

// ─── Role coverage analysis ──────────────────────────────────────────────────

export function analyzeRoleCoverage(team: HeroData[]): {
  missing: string[];
  covered: string[];
} {
  const essential = ['Tank', 'Marksman', 'Mage', 'Fighter', 'Assassin'];
  const allRoles  = team.flatMap((h) => h.roles);
  const covered   = essential.filter((r) => allRoles.includes(r));
  const missing   = essential.filter((r) => !allRoles.includes(r));
  return { covered, missing };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * The raw total is in [0, ~10]. We normalize to [0, 1] then output 0–100.
 * Max possible weighted total ≈ 10 (all components max).
 */
function normalizeScore(total: number): number {
  return clamp(total / 10, 0, 1);
}

function buildReason(
  hero: HeroData,
  bd: ScoreBreakdown,
  allied: HeroData[],
  enemies: HeroData[]
): string {
  const parts: string[] = [];

  // API counter matches
  if (bd.counter >= 7) {
    const countered = enemies.filter((e) => hero.counters.includes(e.id));
    if (countered.length > 0)
      parts.push(`counters ${countered.map((e) => e.name).join(', ')}`);
    else {
      // Fallback: playstyle archetype advantage hint
      const hint = buildPlaystyleHint(hero.name, enemies.map((e) => e.name));
      if (hint && !hint.startsWith('⚠')) parts.push(hint);
    }
  }

  // Archetype identity badge (if hero has notable playstyle)
  const playstyles = getPlaystyles(hero.name);
  if (playstyles.length > 0 && parts.length < 2) {
    const primary = playstyles[0];
    if (['glorious_launcher','prey_hunter','speed_specialist','enchanter','control_mage'].includes(primary)) {
      parts.push(PLAYSTYLE_LABEL[primary]);
    }
  }

  if (bd.synergy >= 7 && allied.length > 0) {
    const synergized = allied.filter((a) => hero.synergies.includes(a.id));
    if (synergized.length > 0)
      parts.push(`synergy with ${synergized.map((a) => a.name).join(', ')}`);
  }

  if (bd.meta >= 8) parts.push('high meta priority');

  if (bd.phase >= 7) {
    const best = hero.early >= hero.mid && hero.early >= hero.late ? 'early'
               : hero.late  >= hero.mid ? 'late' : 'mid';
    parts.push(`fills ${best}-game gap`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'balanced pick';
}
