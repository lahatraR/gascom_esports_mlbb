// ─── Counter Composition Engine ───────────────────────────────────────────────
//
// Analyses enemy picks to predict their draft archetype, then builds
// optimal counter compositions (full 5-hero lineups) that structurally
// beat the predicted enemy strategy.

import type { HeroData, DraftArchetype, CounterComposition, CompositionSlot, EnemyCompAnalysis, LaneRole } from '@/types/draft';
import {
  detectTeamArchetype,
  ARCHETYPE_BEATS,
  ARCHETYPE_LABELS,
  heroArchetypeFit,
} from './archetypeEngine';
import { calculateMetaScore } from './draftEngine';
import { LANE_TIERS, TIER_META_SCORE, type TierRank } from '@/data/tierList';

// ─── Win condition & counter reason strings ───────────────────────────────────

const WIN_CONDITIONS: Record<DraftArchetype, string> = {
  protect: 'Scale safely to late game — shield and heal the carry through every burst window',
  poke:    'Whittle their HP from range — force them to engage at a disadvantage or concede objectives',
  engage:  'Force team fights with chain CC — overwhelm before they can reposition or react',
  split:   'Split-push multiple lanes simultaneously — force losing 4v5 responses across the map',
  catch:   'Pick off isolated targets before fights begin — eliminate key threats and snowball the lead',
};

const COUNTER_REASONS: Partial<Record<string, string>> = {
  'protect_vs_catch':   'Your shields and heals nullify their burst — they cannot find solo picks on a protected carry',
  'protect_vs_engage':  'Heavy peel absorbs their initiations — late-game scaling outlasts their front-line burst window',
  'poke_vs_catch':      'Out-range their dive pattern — drain HP before they close the gap',
  'poke_vs_protect':    'Sustained chip damage melts defensive layers without ever needing to dive in',
  'engage_vs_poke':     'Dive their back line before they kite you — chain CC prevents any repositioning',
  'engage_vs_split':    'Force 5v5 team fights — your mass CC neutralises split pushers in grouped battles',
  'split_vs_protect':   'Split push forces their carry off-base — no team fight means their protection is irrelevant',
  'split_vs_poke':      'Map pressure forces 4v5 responses they cannot manage; sustain or shields mitigate the poke',
  'catch_vs_engage':    'Eliminate front-line initiators before fights — no vanguard, no engage',
  'catch_vs_split':     'Intercept and burst isolated split pushers — they cannot 1v1 your pick-off setup',
};

// ─── Lane role definitions ────────────────────────────────────────────────────

const LANES: LaneRole[] = ['Gold', 'Roam', 'Jungle', 'Mid', 'EXP'];

// Primary roles expected per lane
const LANE_PRIMARY_ROLES: Record<LaneRole, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Support', 'Tank'],
  Jungle: ['Assassin', 'Fighter'],
  Mid:    ['Mage', 'Assassin'],
  EXP:    ['Fighter', 'Tank'],
};

const LANE_LABELS: Record<LaneRole, string> = {
  Gold:   'Gold lane carry',
  Roam:   'Vision & peel',
  Jungle: 'Jungle & objectives',
  Mid:    'Rotation & burst',
  EXP:    'EXP lane pressure',
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
  // Tier list placement is the strongest signal
  const tierScore = getHeroLaneTierScore(hero.name, lane);
  if (tierScore > 0) return tierScore;

  // Fallback: role-based heuristic
  const expected = LANE_PRIMARY_ROLES[lane];
  const primary  = hero.roles[0];
  if (expected[0] === primary) return 4.5;
  if (expected.includes(primary)) return 3.0;
  if (hero.roles.some((r) => expected.includes(r))) return 1.5;
  return 0;
}

// ─── Per-slot hero scoring ────────────────────────────────────────────────────

function scoreHeroForSlot(
  hero:        HeroData,
  lane:        LaneRole,
  archetype:   DraftArchetype,
  enemyPicks:  HeroData[],
): number {
  // Archetype fit (0–10) → 40%
  const archFit = heroArchetypeFit(hero, archetype) * 10;

  // Lane viability (0–10) → 30%
  const laneScore = getLaneScore(hero, lane);

  // Counter value vs confirmed enemy picks (0–10) → 20%
  let counterRaw = 0;
  for (const e of enemyPicks) {
    if (hero.counters.includes(e.id))    counterRaw += 2;
    if (hero.counteredBy.includes(e.id)) counterRaw -= 1.5;
  }
  const counterScore = clamp(counterRaw + 5, 0, 10);

  // Meta score (0–10) → 10%
  const metaScore = calculateMetaScore(hero);

  return archFit * 4 + laneScore * 3 + counterScore * 2 + metaScore;
}

// ─── Slot reason builder ──────────────────────────────────────────────────────

function buildSlotReason(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
): string {
  const parts: string[] = [];

  const countered = enemyPicks.filter((e) => hero.counters.includes(e.id));
  if (countered.length > 0) {
    parts.push(`counters ${countered.map((e) => e.name).join(', ')}`);
  }

  if (heroArchetypeFit(hero, archetype) > 0.65) {
    parts.push(`${ARCHETYPE_LABELS[archetype].toLowerCase()} profile`);
  }

  parts.push(LANE_LABELS[lane]);
  return parts.join(' · ');
}

// ─── Composition builder ──────────────────────────────────────────────────────

function buildCounterComp(
  archetype:      DraftArchetype,
  enemyArchetype: DraftArchetype,
  available:      HeroData[],
  enemyPicks:     HeroData[],
): CounterComposition | null {
  if (available.length < 5) return null;

  const slots: CompositionSlot[] = [];
  const usedIds = new Set<number>();

  for (const lane of LANES) {
    const candidates = available.filter((h) => !usedIds.has(h.id));
    if (candidates.length === 0) break;

    const scored = candidates.map((h) => ({
      hero:  h,
      score: scoreHeroForSlot(h, lane, archetype, enemyPicks),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    usedIds.add(best.hero.id);
    slots.push({
      hero:     best.hero,
      laneRole: lane,
      reason:   buildSlotReason(best.hero, lane, archetype, enemyPicks),
    });
  }

  if (slots.length < 5) return null;

  const key           = `${archetype}_vs_${enemyArchetype}`;
  const counterReason = COUNTER_REASONS[key]
    ?? `${ARCHETYPE_LABELS[archetype]} composition structurally counters ${ARCHETYPE_LABELS[enemyArchetype]}`;

  // Strength = average slot score normalised to 0–100
  const avgRaw  = slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.laneRole, archetype, enemyPicks), 0) / slots.length;
  const strength = clamp(Math.round((avgRaw / 90) * 100), 0, 100);

  return { archetype, slots, winCondition: WIN_CONDITIONS[archetype], counterReason, strength };
}

// ─── Enemy archetype reasoning ────────────────────────────────────────────────

const ARCHETYPE_INDICATORS: Record<DraftArchetype, string> = {
  catch:   'high burst + mobile single-target CC',
  poke:    'long range + sustained poke pressure',
  engage:  'heavy CC + durable initiators',
  protect: 'scaling carries + defensive utility',
  split:   'high mobility + push power',
};

function buildEnemyReasoning(
  enemyPicks: HeroData[],
  archetype:  DraftArchetype,
): string {
  const names = enemyPicks.map((h) => h.name).join(', ');
  return `${names} → ${ARCHETYPE_INDICATORS[archetype]}`;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function buildEnemyCompAnalysis(
  allHeroes:  HeroData[],
  enemyPicks: HeroData[],
  bannedIds:  Set<number>,
  pickedIds:  Set<number>,
): EnemyCompAnalysis | null {
  if (enemyPicks.length === 0) return null;

  // Detect enemy archetype from their confirmed picks
  const archResult = detectTeamArchetype(enemyPicks);
  if (!archResult) return null;

  const enemyArchetype = archResult.primary;
  const confidence     = archResult.confidence;

  // Heroes that are still available for our team to pick
  const available = allHeroes.filter(
    (h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)
  );

  // Archetypes that BEAT the enemy archetype (using the existing beats matrix)
  const ALL_ARCHETYPES: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];
  const counterArchetypes = ALL_ARCHETYPES.filter(
    (a) => ARCHETYPE_BEATS[a].includes(enemyArchetype)
  );

  // Build one composition per counter archetype (typically 2)
  const counterComps: CounterComposition[] = [];
  for (const arch of counterArchetypes) {
    const comp = buildCounterComp(arch, enemyArchetype, available, enemyPicks);
    if (comp) counterComps.push(comp);
  }

  if (counterComps.length === 0) return null;

  // Sort by composition strength descending
  counterComps.sort((a, b) => b.strength - a.strength);

  return {
    predictedArchetype: enemyArchetype,
    confidence,
    reasoning: buildEnemyReasoning(enemyPicks, enemyArchetype),
    counterComps,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
