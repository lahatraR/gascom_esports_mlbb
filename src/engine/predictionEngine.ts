import type { HeroData, EnemyPrediction, GameMode } from '@/types/draft';
import { calculateMetaScore } from './draftEngine';

// ─── Enemy Pick Prediction ───────────────────────────────────────────────────
//
// Predict the top-N heroes the enemy team is likely to pick next.
// Logic factors:
//   1. Role gap: which roles is the enemy team still missing?
//   2. Meta priority: high win/ban/pick rate heroes
//   3. Counter picks: heroes that counter the friendly team
//   4. Pro tendency: heroes with high ban rates (used in pro/tournament contexts)
//   5. Available pool: remove already banned/picked heroes

interface RoleWeight {
  role: string;
  weight: number;
}

// Typical role priority order in MLBB draft
const ROLE_PRIORITY: Record<string, number> = {
  Tank: 1, Support: 1, Mage: 2, Assassin: 3, Marksman: 4, Fighter: 3,
};

export function predictEnemyPicks(
  allHeroes: HeroData[],
  enemyPicks: HeroData[],     // already confirmed enemy picks
  friendlyPicks: HeroData[],  // our team's picks
  bannedIds: Set<number>,
  pickedIds: Set<number>,
  gameMode: GameMode,
  topN = 3
): EnemyPrediction[] {
  const available = allHeroes.filter(
    (h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)
  );
  if (available.length === 0) return [];

  // Score each available hero from the enemy's perspective
  const rawScores = available.map((hero) => {
    const score = computeEnemyScore(hero, enemyPicks, friendlyPicks, gameMode);
    return { hero, score };
  });

  // Sort descending
  rawScores.sort((a, b) => b.score - a.score);

  // Softmax normalization → probability %
  const top = rawScores.slice(0, Math.min(topN * 3, 12));
  const probs = softmax(top.map((e) => e.score));

  return top.slice(0, topN).map(({ hero }, i) => ({
    hero,
    probability: Math.round(probs[i] * 100),
    reasons: buildEnemyReasons(hero, enemyPicks, friendlyPicks),
  }));
}

// ─── Internal scoring ────────────────────────────────────────────────────────

function computeEnemyScore(
  hero: HeroData,
  enemyPicks: HeroData[],
  friendlyPicks: HeroData[],
  gameMode: GameMode
): number {
  let score = 0;

  // 1. Meta priority (0–10)
  score += calculateMetaScore(hero) * 0.30;

  // 2. Role gap: reward filling missing roles in enemy team (0–10)
  const roleGapScore = getRoleGapScore(hero, enemyPicks);
  score += roleGapScore * 0.25;

  // 3. Counter pick: reward countering our team (0–10)
  const counterScore = getEnemyCounterScore(hero, friendlyPicks);
  score += counterScore * 0.25;

  // 4. Tournament mode: heavier meta weight
  if (gameMode === 'tournament') {
    score += (hero.banRate * 30) * 0.10; // high ban rate = high value
  }

  // 5. Win rate bonus
  const wrBonus = (hero.winRate - 0.48) * 50; // ~0 for 48%, ~2.5 for 53%
  score += Math.max(0, wrBonus) * 0.10;

  return score;
}

function getRoleGapScore(hero: HeroData, enemyPicks: HeroData[]): number {
  if (enemyPicks.length === 0) return 5; // no info yet
  const coveredRoles = new Set(enemyPicks.flatMap((h) => h.roles));
  const fillsGap = hero.roles.some((r) => !coveredRoles.has(r));
  const rolePriority = Math.max(...hero.roles.map((r) => 10 - (ROLE_PRIORITY[r] ?? 5)));
  return fillsGap ? Math.min(10, rolePriority + 3) : Math.max(0, rolePriority - 2);
}

function getEnemyCounterScore(hero: HeroData, friendlyPicks: HeroData[]): number {
  if (friendlyPicks.length === 0) return 5;
  let raw = 0;
  for (const friendly of friendlyPicks) {
    if (hero.counters.includes(friendly.id)) raw += 2;
    if (friendly.counteredBy.includes(hero.id)) raw += 1.5;
  }
  const maxRaw = friendlyPicks.length * 3.5;
  return Math.min(10, (raw / maxRaw) * 10);
}

function buildEnemyReasons(
  hero: HeroData,
  enemyPicks: HeroData[],
  friendlyPicks: HeroData[]
): string[] {
  const reasons: string[] = [];

  const metaScore = calculateMetaScore(hero);
  if (metaScore >= 8) reasons.push('High meta priority');

  const countered = friendlyPicks.filter((f) => hero.counters.includes(f.id));
  if (countered.length > 0)
    reasons.push(`Counters ${countered.map((f) => f.name).join(', ')}`);

  const coveredRoles = new Set(enemyPicks.flatMap((h) => h.roles));
  const fillsGap = hero.roles.some((r) => !coveredRoles.has(r));
  if (fillsGap) reasons.push(`Fills role gap (${hero.roles.join('/')})`);

  if (hero.banRate > 0.10) reasons.push('High ban rate hero');

  return reasons.length > 0 ? reasons : ['Solid meta choice'];
}

// ─── Softmax ─────────────────────────────────────────────────────────────────

function softmax(scores: number[]): number[] {
  const temperature = 0.6; // lower = more deterministic
  const exps = scores.map((s) => Math.exp(s / temperature));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
