// ─── Winning Lineup Engine ────────────────────────────────────────────────────
//
// Builds the optimal FULL 5-hero lineup for our team by:
//  1. Assigning already-locked ally picks to their best lanes
//  2. Choosing the archetype that best counters the enemy AND fits current picks
//  3. Filling every remaining lane with the best available hero
//
// Result: WinningLineup with isLocked flags so the UI can show
//         locked picks (✓) separately from fresh recommendations (→ PICK).

import type {
  HeroData, DraftArchetype, WinningLineup, WinningLineupSlot, LaneRole,
} from '@/types/draft';
import {
  detectTeamArchetype,
  ARCHETYPE_BEATS,
  ARCHETYPE_LABELS,
  heroArchetypeFit,
} from './archetypeEngine';
import { calculateMetaScore } from './draftEngine';
import { LANE_TIERS, TIER_META_SCORE, type TierRank } from '@/data/tierList';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANES: LaneRole[] = ['Gold', 'Roam', 'Jungle', 'Mid', 'EXP'];

const LANE_PRIMARY_ROLES: Record<LaneRole, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Support', 'Tank'],
  Jungle: ['Assassin', 'Fighter'],
  Mid:    ['Mage', 'Assassin'],
  EXP:    ['Fighter', 'Tank'],
};

const WIN_CONDITIONS: Record<DraftArchetype, string> = {
  protect: 'Scale to late game safely — peel and shield your carry through every burst window',
  poke:    'Chip their HP from range and force bad engages — take objectives on your terms',
  engage:  'Dive in with chain CC and overwhelm before they can reposition or react',
  split:   'Apply pressure on multiple lanes simultaneously — force losing 4v5 responses',
  catch:   'Eliminate isolated targets and snowball pick advantages into map control',
};

// ─── Lane tier score ──────────────────────────────────────────────────────────

function getHeroLaneTierScore(heroName: string, lane: LaneRole): number {
  const tierMap = LANE_TIERS[lane];
  for (const [tier, heroes] of Object.entries(tierMap)) {
    if ((heroes as string[] | undefined)?.includes(heroName)) {
      return TIER_META_SCORE[tier as TierRank];
    }
  }
  return 0;
}

function getLaneScore(hero: HeroData, lane: LaneRole): number {
  const tier = getHeroLaneTierScore(hero.name, lane);
  if (tier > 0) return tier;
  const expected = LANE_PRIMARY_ROLES[lane];
  const primary  = hero.roles[0];
  if (expected[0] === primary)                        return 4.5;
  if (expected.includes(primary))                     return 3.0;
  if (hero.roles.some((r) => expected.includes(r)))   return 1.5;
  return 0;
}

// ─── Hero slot scoring ────────────────────────────────────────────────────────

function scoreHeroForSlot(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
): number {
  // Archetype fit (0–10) — 30%
  const archFit = heroArchetypeFit(hero, archetype) * 10;

  // Lane viability (0–10) — 30%
  const laneScore = getLaneScore(hero, lane);

  // Counter value vs confirmed enemy picks (0–10) — 20%
  let counterRaw = 0;
  for (const e of enemyPicks) {
    if (hero.counters.includes(e.id))    counterRaw += 2;
    if (hero.counteredBy.includes(e.id)) counterRaw -= 1.5;
  }
  const counterScore = clamp(counterRaw + 5, 0, 10);

  // Synergy with already-locked ally picks (0–10) — 10%
  let synergyRaw = 0;
  for (const a of allyPicks) {
    if (hero.synergies.includes(a.id)) synergyRaw += 2;
    if (a.synergies.includes(hero.id)) synergyRaw += 1;
  }
  const synergyScore = clamp(synergyRaw + 3, 0, 10);

  // Meta score (0–10) — 10%
  const metaScore = calculateMetaScore(hero);

  return archFit * 3 + laneScore * 3 + counterScore * 2 + synergyScore + metaScore;
}

// ─── Archetype selection ──────────────────────────────────────────────────────

function chooseBestArchetype(
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
): DraftArchetype {
  const ALL: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

  // Determine which archetypes are valid (counter enemy if possible)
  const enemyArch      = enemyPicks.length >= 2 ? detectTeamArchetype(enemyPicks) : null;
  const validArchetypes = enemyArch
    ? ALL.filter((a) => ARCHETYPE_BEATS[a].includes(enemyArch.primary))
    : ALL;

  // Among valid archetypes, prefer the one our locked picks best fit
  if (allyPicks.length >= 1) {
    const scored = validArchetypes.map((arch) => ({
      arch,
      fit: allyPicks.reduce((s, h) => s + heroArchetypeFit(h, arch), 0) / allyPicks.length,
    }));
    scored.sort((a, b) => b.fit - a.fit);
    return scored[0].arch;
  }

  return validArchetypes[0];
}

// ─── Assign locked picks to lanes (greedy best-claim) ────────────────────────

function assignLockedPicksToLanes(
  lockedPicks: HeroData[],
): Map<LaneRole, HeroData> {
  const result     = new Map<LaneRole, HeroData>();
  const usedIds    = new Set<number>();
  const usedLanes  = new Set<LaneRole>();

  // Score each hero on every lane, sort heroes by their single best lane score
  const heroScores = lockedPicks.map((h) => ({
    hero: h,
    ranked: LANES
      .map((lane) => ({ lane, score: getLaneScore(h, lane) }))
      .sort((a, b) => b.score - a.score),
  }));
  heroScores.sort((a, b) => b.ranked[0].score - a.ranked[0].score);

  for (const { hero, ranked } of heroScores) {
    if (usedIds.has(hero.id)) continue;
    for (const { lane } of ranked) {
      if (!usedLanes.has(lane)) {
        result.set(lane, hero);
        usedIds.add(hero.id);
        usedLanes.add(lane);
        break;
      }
    }
  }
  return result;
}

// ─── Slot reason builder ──────────────────────────────────────────────────────

function buildReason(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  isLocked:   boolean,
): string {
  if (isLocked) {
    return getLaneScore(hero, lane) > 6
      ? `top ${lane.toLowerCase()} lane · already locked`
      : `assigned ${lane.toLowerCase()} lane · already locked`;
  }

  const parts: string[] = [];
  const countered = enemyPicks.filter((e) => hero.counters.includes(e.id));
  if (countered.length > 0) parts.push(`counters ${countered.map((e) => e.name).join(', ')}`);
  if (heroArchetypeFit(hero, archetype) > 0.65) parts.push(`${ARCHETYPE_LABELS[archetype].toLowerCase()} fit`);
  if (getLaneScore(hero, lane) > 6)             parts.push(`S/A-tier ${lane.toLowerCase()}`);
  if (parts.length === 0)                       parts.push(`best available ${lane.toLowerCase()}`);
  return parts.join(' · ');
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function buildWinningLineup(
  allHeroes:  HeroData[],
  allyPicks:  HeroData[],
  enemyPicks: HeroData[],
  bannedIds:  Set<number>,
  pickedIds:  Set<number>,
): WinningLineup | null {
  const archetype = chooseBestArchetype(enemyPicks, allyPicks);

  // Assign locked picks to their best lanes
  const lockedAssignment = assignLockedPicksToLanes(allyPicks);

  const usedIds  = new Set<number>(allyPicks.map((h) => h.id));
  const available = allHeroes.filter(
    (h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)
  );

  const slots: WinningLineupSlot[] = [];

  for (const lane of LANES) {
    const locked = lockedAssignment.get(lane);
    if (locked) {
      slots.push({
        hero:     locked,
        laneRole: lane,
        reason:   buildReason(locked, lane, archetype, enemyPicks, true),
        isLocked: true,
      });
    } else {
      const candidates = available.filter((h) => !usedIds.has(h.id));
      if (candidates.length === 0) break;

      const scored = candidates
        .map((h) => ({ hero: h, score: scoreHeroForSlot(h, lane, archetype, enemyPicks, allyPicks) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      usedIds.add(best.hero.id);
      slots.push({
        hero:     best.hero,
        laneRole: lane,
        reason:   buildReason(best.hero, lane, archetype, enemyPicks, false),
        isLocked: false,
      });
    }
  }

  if (slots.length < 5) return null;

  // Strength = average slot score normalised to 0–100
  const avgScore = slots.reduce(
    (s, sl) => s + scoreHeroForSlot(sl.hero, sl.laneRole, archetype, enemyPicks, allyPicks), 0
  ) / slots.length;
  const strength = clamp(Math.round((avgScore / 90) * 100), 0, 100);

  // Archetype reason string
  const enemyArch = enemyPicks.length >= 2 ? detectTeamArchetype(enemyPicks) : null;
  const archetypeReason = enemyArch
    ? `${ARCHETYPE_LABELS[archetype]} counters enemy ${ARCHETYPE_LABELS[enemyArch.primary]} (${enemyArch.confidence}% confidence)`
    : allyPicks.length >= 1
      ? `${ARCHETYPE_LABELS[archetype]} fits your current picks best`
      : `${ARCHETYPE_LABELS[archetype]} is the strongest opening archetype`;

  return { slots, archetype, archetypeReason, winCondition: WIN_CONDITIONS[archetype], strength };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
