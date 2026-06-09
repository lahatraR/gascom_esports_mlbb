/**
 * What-If Draft Simulation Engine
 * ─────────────────────────────────
 * For a candidate pick, simulates the 3 most likely enemy responses,
 * then computes the best counter-pick for each scenario.
 *
 * Usage:
 *   const tree = simulateWhatIf(candidate, alliedTeam, enemyTeam, heroPool, archetype, side);
 *
 * Returns a WhatIfTree with:
 *   - The candidate hero
 *   - Up to 3 enemy "threat" picks (most impactful enemy responses)
 *   - For each threat: the best ally counter-pick + reasoning
 */

import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS } from './archetypeEngine';
import { getHeroTierScoreForLane, getHeroLanes } from '@/data/tierList';
import type { LaneKey } from '@/data/tierList';
import { getPlaystyles } from '@/data/heroArchetypes';
import type { PlaystyleArchetype } from '@/data/heroArchetypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatIfCounterPick {
  hero:      HeroData;
  lane:      LaneKey;
  reason:    string;
  fitScore:  number;   // 0–100
}

export interface WhatIfBranch {
  threatHero:   HeroData;
  threatReason: string;
  threatScore:  number;   // how dangerous this enemy pick is (0–100)
  bestCounter:  WhatIfCounterPick | null;
}

export interface WhatIfTree {
  candidate: HeroData;
  branches:  WhatIfBranch[];   // up to 3 branches
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Rough "how dangerous is this hero as an enemy pick" score (0–100). */
function enemyThreatScore(hero: HeroData): number {
  const wr   = (hero.winRate ?? 0.50) - 0.44;
  const ban  = hero.banRate  ?? 0;
  const pr   = hero.pickRate ?? 0;
  const primaryLane: LaneKey = getHeroLanes(hero.name, hero.roles)[0] ?? 'EXP';
  const tier = getHeroTierScoreForLane(hero.name, primaryLane) ?? 5;
  return Math.min(100, Math.round(wr * 200 + ban * 150 + pr * 60 + tier * 2));
}

/**
 * Playstyle counter map — which playstyles counter which.
 * If enemy has playstyle X → counter-picks should have playstyle Y.
 */
const PLAYSTYLE_COUNTER: Partial<Record<PlaystyleArchetype, PlaystyleArchetype[]>> = {
  glorious_launcher: ['enchanter', 'stone_wall', 'stunner'],
  explosive_mage:    ['avant_garde', 'stone_wall'],
  prey_hunter:       ['avant_garde', 'enchanter', 'speed_specialist'],
  sniper:            ['speed_specialist', 'prey_hunter', 'avant_garde'],
  stunner:           ['speed_specialist', 'enchanter'],
  initiator:         ['stunner', 'enchanter'],
  speed_specialist:  ['stunner', 'glorious_launcher'],
  berserker:         ['stone_wall', 'enchanter'],
  enchanter:         ['sniper', 'explosive_mage', 'prey_hunter'],
  stone_wall:        ['explosive_mage', 'sniper'],
};

function counterPlaystyles(threat: HeroData): PlaystyleArchetype[] {
  const threatStyles = getPlaystyles(threat.name);
  const counters: PlaystyleArchetype[] = [];
  for (const style of threatStyles) {
    const c = PLAYSTYLE_COUNTER[style];
    if (c) counters.push(...c);
  }
  return [...new Set(counters)];
}

/** Score a potential ally counter-pick against a specific threat hero. */
function scoreCounterVsThreat(
  candidate:  HeroData,
  threat:     HeroData,
  archetype:  DraftArchetype,
  lane:       LaneKey,
): number {
  let score = 0;

  // Tier in the lane
  const tierScore = getHeroTierScoreForLane(candidate.name, lane) ?? 5;
  score += tierScore * 1.5;

  // WR contribution
  const wr = (candidate.winRate ?? 0.50);
  score += (wr - 0.44) * 120;

  // Archetype fit
  const archetypeScore = heroArchetypeScores(candidate)[archetype] ?? 0;
  score += archetypeScore * 1.2;

  // Playstyle counter bonus
  const wantedCounters = counterPlaystyles(threat);
  const candidateStyles = getPlaystyles(candidate.name);
  const counterOverlap = candidateStyles.filter((s) => wantedCounters.includes(s)).length;
  score += counterOverlap * 15;

  // Archetype beats bonus: does this candidate's best archetype beat the threat's expected archetype?
  const candidateBestArch = (Object.entries(heroArchetypeScores(candidate)) as [DraftArchetype, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const threatBestArch = (Object.entries(heroArchetypeScores(threat)) as [DraftArchetype, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (candidateBestArch && threatBestArch && ARCHETYPE_BEATS[candidateBestArch].includes(threatBestArch)) {
    score += 20;
  }

  return Math.min(100, Math.round(score));
}

/** Build a human-readable reason why this hero counters the threat. */
function buildCounterReason(counter: HeroData, threat: HeroData): string {
  const counterStyles = getPlaystyles(counter.name);
  const wantedCounters = counterPlaystyles(threat);
  const matched = counterStyles.filter((s) => wantedCounters.includes(s));

  if (matched.includes('stunner'))          return `Contrôle de ${threat.name} via CC`;
  if (matched.includes('enchanter'))        return `Protège contre la menace de ${threat.name}`;
  if (matched.includes('avant_garde'))      return `Absorbe les dégâts de ${threat.name}`;
  if (matched.includes('speed_specialist')) return `Échappe et harcèle ${threat.name}`;
  if (matched.includes('prey_hunter'))      return `Chasse et élimine ${threat.name}`;
  if (matched.includes('explosive_mage'))   return `Burst one-shot ${threat.name}`;
  if (matched.includes('sniper'))           return `Punit ${threat.name} à distance`;
  if (matched.includes('stone_wall'))       return `Absorbe les pokes de ${threat.name}`;
  return `Bon matchup face à ${threat.name}`;
}

/** Build a reason why this hero is a threat in this context. */
function buildThreatReason(threat: HeroData, alliedArchetype: DraftArchetype): string {
  const styles = getPlaystyles(threat.name);
  const beatsOurs = ARCHETYPE_BEATS[alliedArchetype]; // archetypes that beat our strategy
  const threatBestArch = (Object.entries(heroArchetypeScores(threat)) as [DraftArchetype, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (threatBestArch && beatsOurs.includes(threatBestArch)) return `Contre directement votre stratégie ${alliedArchetype}`;
  if (styles.includes('glorious_launcher')) return `Engage/initie sur votre équipe`;
  if (styles.includes('explosive_mage'))    return `Burst capable d'éliminer vos carries`;
  if (styles.includes('prey_hunter'))       return `Chase et élimine les cibles isolées`;
  if (styles.includes('sniper'))            return `Pression range dangereuse contre votre comp`;
  if (styles.includes('stunner'))           return `CC lourd neutralisant vos picks clés`;
  if (threat.banRate && threat.banRate > 0.10) return `Héros fortement banni — menace meta confirmée`;
  return `Impact global fort dans le meta actuel`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Simulate What-If tree for a candidate hero pick.
 *
 * @param candidate    Hero being considered for ally team
 * @param alliedTeam   Current allied picks
 * @param enemyTeam    Current enemy picks
 * @param heroPool     Full available hero pool
 * @param archetype    Planned ally draft archetype
 * @param side         'blue' | 'red'
 */
export function simulateWhatIf(
  candidate:  HeroData,
  alliedTeam: HeroData[],
  enemyTeam:  HeroData[],
  heroPool:   HeroData[],
  archetype:  DraftArchetype,
  side:       'blue' | 'red',
): WhatIfTree {
  const usedIds = new Set([
    ...alliedTeam.map((h) => h.id),
    ...enemyTeam.map((h) => h.id),
    candidate.id,
  ]);

  // ── Step 1: Find top-3 enemy threat picks ──────────────────────────────────
  const threatCandidates = heroPool
    .filter((h) => !usedIds.has(h.id))
    .map((h) => ({ hero: h, score: enemyThreatScore(h) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // ── Step 2: For each threat, find best counter from remaining allied pool ──
  const remainingAllyPool = heroPool.filter((h) => !usedIds.has(h.id));

  const branches: WhatIfBranch[] = threatCandidates.map(({ hero: threat, score: threatScore }) => {
    // Score each remaining ally as a counter
    const counterCandidates = remainingAllyPool
      .filter((h) => h.id !== threat.id)
      .map((ally) => {
        const lanes = getHeroLanes(ally.name, ally.roles);
        const primaryLane: LaneKey = lanes[0] ?? 'EXP';
        const fit = scoreCounterVsThreat(ally, threat, archetype, primaryLane);
        return { hero: ally, lane: primaryLane, fitScore: fit };
      })
      .sort((a, b) => b.fitScore - a.fitScore);

    const best = counterCandidates[0] ?? null;

    return {
      threatHero:   threat,
      threatReason: buildThreatReason(threat, archetype),
      threatScore:  Math.min(100, threatScore),
      bestCounter:  best
        ? {
            hero:     best.hero,
            lane:     best.lane,
            reason:   buildCounterReason(best.hero, threat),
            fitScore: best.fitScore,
          }
        : null,
    };
  });

  return { candidate, branches };
}
