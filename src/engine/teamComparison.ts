import type { HeroData, TeamMetrics, DraftAnalysis, GameMode } from '@/types/draft';
import { getSuggestions } from './draftEngine';
import { predictEnemyPicks } from './predictionEngine';
import { detectTeamArchetype } from './archetypeEngine';
import { buildEnemyCompAnalysis } from './compositionEngine';

// ─── Team metric calculation ─────────────────────────────────────────────────

/**
 * Compute the 7-axis metrics for a team of up to 5 heroes.
 * Each axis is 0–10. Empty team returns zeros.
 */
export function calculateTeamMetrics(team: HeroData[]): TeamMetrics {
  if (team.length === 0) {
    return { early: 0, mid: 0, late: 0, damage: 0, tankiness: 0, cc: 0, push: 0 };
  }

  const avg = (fn: (h: HeroData) => number) =>
    team.reduce((s, h) => s + fn(h), 0) / team.length;

  // For damage/cc/tankiness: take the MAX of the best 2 heroes (reflects team ceiling)
  const top2 = (fn: (h: HeroData) => number) => {
    const sorted = [...team].sort((a, b) => fn(b) - fn(a));
    const top = sorted.slice(0, 2);
    return top.reduce((s, h) => s + fn(h), 0) / top.length;
  };

  return {
    early:     clamp(avg((h) => h.early),     0, 10),
    mid:       clamp(avg((h) => h.mid),       0, 10),
    late:      clamp(avg((h) => h.late),      0, 10),
    damage:    clamp(top2((h) => h.damage),   0, 10),
    tankiness: clamp(top2((h) => h.tankiness),0, 10),
    cc:        clamp(top2((h) => h.cc),       0, 10),
    push:      clamp(avg((h) => h.push),      0, 10),
  };
}

// ─── Counter Index ────────────────────────────────────────────────────────────
//
// Range: −10 to +10
// Positive = blue team has counter advantage
// Negative = red team has counter advantage

export function calculateCounterIndex(
  blueTeam: HeroData[],
  redTeam: HeroData[]
): number {
  if (blueTeam.length === 0 || redTeam.length === 0) return 0;

  let blueAdv = 0;
  let redAdv  = 0;

  for (const b of blueTeam) {
    for (const r of redTeam) {
      if (b.counters.includes(r.id))   blueAdv += 1;
      if (r.counters.includes(b.id))   redAdv  += 1;
      if (b.counteredBy.includes(r.id)) redAdv += 0.5;
      if (r.counteredBy.includes(b.id)) blueAdv += 0.5;
    }
  }

  const maxPossible = blueTeam.length * redTeam.length * 1.5;
  const raw = ((blueAdv - redAdv) / maxPossible) * 10;
  return clamp(raw, -10, 10);
}

// ─── Lineup Rating ────────────────────────────────────────────────────────────
//
// Overall draft quality for a team (0–10)
// Considers: meta strength, synergy density, phase balance, role coverage

export function calculateLineupRating(team: HeroData[]): number {
  if (team.length === 0) return 5;

  const metaAvg  = team.reduce((s, h) => s + calculateHeroMeta(h), 0) / team.length;
  const phaseBalance = calculatePhaseBalance(team);
  const roleCov  = calculateRoleCoverage(team);
  const synergyBonus = calculateTeamSynergy(team);

  return clamp(
    metaAvg * 0.35 +
    phaseBalance * 0.25 +
    roleCov * 0.25 +
    synergyBonus * 0.15,
    0, 10
  );
}

// ─── Win Probability ─────────────────────────────────────────────────────────
//
// Formula: WinChance = 50 + (LineupDiff × 5) + (CounterIndex × 3)
// Clamped: 5–95%

export function calculateWinProbability(
  blueTeam: HeroData[],
  redTeam: HeroData[]
): number {
  if (blueTeam.length === 0 && redTeam.length === 0) return 50;

  const blueRating    = calculateLineupRating(blueTeam);
  const redRating     = calculateLineupRating(redTeam);
  const lineupDiff    = blueRating - redRating;           // -10 to +10
  const counterIndex  = calculateCounterIndex(blueTeam, redTeam);

  const raw = 50 + (lineupDiff * 5) + (counterIndex * 3);
  return clamp(Math.round(raw), 5, 95);
}

// ─── Full draft analysis ─────────────────────────────────────────────────────

export function runDraftAnalysis(
  allHeroes: HeroData[],
  blueTeam: HeroData[],
  redTeam: HeroData[],
  blueBans: HeroData[],
  redBans: HeroData[],
  currentTeam: 'blue' | 'red',
  gameMode: GameMode
): DraftAnalysis {
  const blueMetrics = calculateTeamMetrics(blueTeam);
  const redMetrics  = calculateTeamMetrics(redTeam);

  const counterIndex   = calculateCounterIndex(blueTeam, redTeam);
  const blueRating     = calculateLineupRating(blueTeam);
  const redRating      = calculateLineupRating(redTeam);
  const winProbability = calculateWinProbability(blueTeam, redTeam);

  const bannedIds = new Set([
    ...blueBans.map((h) => h.id),
    ...redBans.map((h)  => h.id),
  ]);
  const pickedIds = new Set([
    ...blueTeam.map((h) => h.id),
    ...redTeam.map((h)  => h.id),
  ]);

  const alliedTeam = currentTeam === 'blue' ? blueTeam : redTeam;
  const enemyTeam  = currentTeam === 'blue' ? redTeam  : blueTeam;

  const suggestions = getSuggestions(
    allHeroes, alliedTeam, enemyTeam, bannedIds, pickedIds, gameMode, 5
  );

  const enemyNextTeam  = currentTeam === 'blue' ? redTeam  : blueTeam;
  const friendlyPicks  = currentTeam === 'blue' ? blueTeam : redTeam;

  const enemyPredictions = predictEnemyPicks(
    allHeroes, enemyNextTeam, friendlyPicks, bannedIds, pickedIds, gameMode, 3
  );

  const blueArchetype = detectTeamArchetype(blueTeam);
  const redArchetype  = detectTeamArchetype(redTeam);

  // Enemy composition analysis: predict enemy strategy + build counter comps
  const enemyCompAnalysis = buildEnemyCompAnalysis(
    allHeroes,
    enemyTeam,    // enemy's confirmed picks
    bannedIds,
    pickedIds,
  );

  return {
    blueMetrics,
    redMetrics,
    counterIndex,
    blueRating,
    redRating,
    winProbability,
    suggestions,
    enemyPredictions,
    blueArchetype,
    redArchetype,
    enemyCompAnalysis,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function calculateHeroMeta(hero: HeroData): number {
  if (hero.banRate > 0.25 || (hero.winRate > 0.53 && hero.pickRate > 0.10)) return 9;
  if (hero.banRate > 0.10 || hero.winRate > 0.515) return 7;
  if (hero.winRate > 0.505) return 5.5;
  return 4;
}

function calculatePhaseBalance(team: HeroData[]): number {
  if (team.length === 0) return 5;
  const early = team.reduce((s, h) => s + h.early, 0) / team.length;
  const mid   = team.reduce((s, h) => s + h.mid,   0) / team.length;
  const late  = team.reduce((s, h) => s + h.late,  0) / team.length;
  // A balanced team: all phases close to each other and all above 5
  const avg3  = (early + mid + late) / 3;
  const variance = ((early - avg3) ** 2 + (mid - avg3) ** 2 + (late - avg3) ** 2) / 3;
  return clamp(avg3 - Math.sqrt(variance) * 0.5, 0, 10);
}

function calculateRoleCoverage(team: HeroData[]): number {
  const essential = ['Tank', 'Marksman', 'Mage'];
  const allRoles  = new Set(team.flatMap((h) => h.roles));
  const covered   = essential.filter((r) => allRoles.has(r)).length;
  return clamp((covered / essential.length) * 10, 0, 10);
}

function calculateTeamSynergy(team: HeroData[]): number {
  if (team.length < 2) return 5;
  let synergyCount = 0;
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      if (team[i].synergies.includes(team[j].id)) synergyCount++;
      if (team[j].synergies.includes(team[i].id)) synergyCount++;
    }
  }
  const maxPairs = team.length * (team.length - 1);
  return clamp((synergyCount / maxPairs) * 10, 0, 10);
}
