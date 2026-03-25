import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';
import { getHeroTierScore, getHeroLanes, LANE_TIERS } from '@/data/tierList';
import type { LaneKey, TierRank } from '@/data/tierList';

// ─── Pick order per archetype ─────────────────────────────────────────────────
// Defines which role to draft at each pick slot (1st → 5th) based on archetype.
// Early picks establish intent or flex picks; late picks confirm counters.

export interface PickOrderStep {
  order:  number; // 1–5
  lane:   string;
  reason: string;
}

const ARCHETYPE_PICK_ORDER: Record<DraftArchetype, PickOrderStep[]> = {
  engage: [
    { order: 1, lane: 'Roam',   reason: 'Établit l\'intention engage — force l\'ennemi à réagir' },
    { order: 2, lane: 'Jungle', reason: 'Duo d\'initiation avec le Roam Tank — plongeur confirmé' },
    { order: 3, lane: 'EXP',    reason: 'Pick flex selon les réactions ennemies' },
    { order: 4, lane: 'Mid',    reason: 'Damage burst après l\'initiation du Roam+Jungle' },
    { order: 5, lane: 'Gold',   reason: 'Carry final — dernier pick pour counter l\'ennemi' },
  ],
  poke: [
    { order: 1, lane: 'Mid',    reason: 'Cœur de la poke — oriente tout le draft' },
    { order: 2, lane: 'Gold',   reason: 'Second DPS à distance — double pression de zone' },
    { order: 3, lane: 'Roam',   reason: 'Support adapté à la poke (Diggie, Mathilda)' },
    { order: 4, lane: 'Jungle', reason: 'Sécurise objectifs pendant que la poke force la respawn' },
    { order: 5, lane: 'EXP',    reason: 'Dernier pick flex — s\'adapte aux menaces restantes' },
  ],
  protect: [
    { order: 1, lane: 'Gold',   reason: 'Win condition centrale — construire toute la comp autour' },
    { order: 2, lane: 'Mid',    reason: 'Second carry à protéger avec le Gold' },
    { order: 3, lane: 'Jungle', reason: 'Flex peel ou dive selon les menaces confirmées' },
    { order: 4, lane: 'Roam',   reason: 'Support peel — confirme après avoir vu le draft ennemi' },
    { order: 5, lane: 'EXP',    reason: 'Comble les faiblesses finales de la composition' },
  ],
  split: [
    { order: 1, lane: 'EXP',    reason: 'Menace side lane dès le début — force une réponse ennemie' },
    { order: 2, lane: 'Jungle', reason: 'Conteste les objectifs pendant que l\'EXP pousse' },
    { order: 3, lane: 'Mid',    reason: 'Flex roam ou push selon la pression ennemie' },
    { order: 4, lane: 'Gold',   reason: 'Late game insurance si le split ne clôt pas assez vite' },
    { order: 5, lane: 'Roam',   reason: 'Dernier pick — comble les faiblesses identifiées' },
  ],
  catch: [
    { order: 1, lane: 'Jungle', reason: 'Assassin principal — annonce l\'intention pick-off' },
    { order: 2, lane: 'Roam',   reason: 'Tank initiateur — crée l\'isolation sur la cible' },
    { order: 3, lane: 'Mid',    reason: 'Burst de confirmation après l\'isolation' },
    { order: 4, lane: 'EXP',    reason: 'Second isolateur ou nettoyeur de teamfight' },
    { order: 5, lane: 'Gold',   reason: 'Carry final — capitalise les avantages créés' },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComboType = 'cc_chain' | 'engage_burst' | 'peel_carry' | 'dive_cleanup';

export const COMBO_LABELS: Record<ComboType, string> = {
  cc_chain:     'Chaîne de CC',
  engage_burst: 'Engage + Burst',
  peel_carry:   'Peel + Carry',
  dive_cleanup: 'Dive synchronisé',
};

export const COMBO_ICONS: Record<ComboType, string> = {
  cc_chain:     '🔗',
  engage_burst: '⚡',
  peel_carry:   '🛡',
  dive_cleanup: '🌀',
};

export interface DraftCombo {
  heroA:     string;
  laneA:     string;
  heroB:     string;
  laneB:     string;
  comboType: ComboType;
  label:     string;
  score:     number; // 0–100
}

export interface GeneratedDraftSlot {
  lane:           'EXP' | 'Jungle' | 'Mid' | 'Gold' | 'Roam';
  hero:            HeroData;
  archetypeFit:    number;           // 0–100
  role:            string;           // canonical role for this lane
  why:             string;
  alternatives:    HeroData[];       // backup picks if this hero is banned
  isFlexPick:      boolean;          // scores ≥5/10 in 2+ archetypes → safe first pick
  flexArchetypes:  DraftArchetype[]; // which archetypes this hero fits
}

// ─── Composition health check types ──────────────────────────────────────────
// Function-based, not lane-based: any hero in any position can cover a function.
// e.g. Minotaur (Roam) covers Initiateur + CC. Zetian (Mid) covers AoE.

export interface FunctionCoverage {
  key:       string;
  name:      string;          // French label
  icon:      string;
  covered:   boolean;
  coveredBy: string[];        // hero names that fill this function
  severity:  'critical' | 'warning';
}

export interface CompositionHealthCheck {
  functions:     FunctionCoverage[];
  overallHealth: 'good' | 'warning' | 'critical';
  missingCount:  number;
  summary:       string;      // French one-liner
}

export interface GeneratedBan {
  hero:     HeroData;
  priority: 'must-ban' | 'high' | 'situational';
  reason:   string;
}

export interface GeneratedDraft {
  rank:         number;
  slots:        GeneratedDraftSlot[];
  bans:         GeneratedBan[];
  teamScore:    number;   // 0–100
  synergyScore: number;  // 0–100
  topCombos:    DraftCombo[];
  pickOrder:    PickOrderStep[];
  winCondition: string;
  archetype:    DraftArchetype;
  healthCheck:  CompositionHealthCheck;
}

// ─── Role gates ───────────────────────────────────────────────────────────────

// Role → primary lane logic (mirrors https://mlbb-stats.rone.dev/api/hero-position):
//   fighter   → Exp Lane        assassin → Jungle
//   mage      → Mid Lane        Marksman → Gold Lane
//   tank      → Roam            support  → Roam
//
// Jungle: Tank-only heroes (Lolita, Khufra…) are Roam heroes — they do NOT jungle.
// A hero like Fredrinn (Fighter + Tank) qualifies via the Fighter role.
const LANE_CANONICAL_ROLES: Record<LaneKey, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Tank', 'Support'],
  Jungle: ['Assassin', 'Fighter'],   // ← Tank removed: tank primary = Roam, not Jungle
  EXP:    ['Fighter', 'Assassin'],
  Mid:    ['Mage'],
};

function canonicalRoleLabel(hero: HeroData, lane: LaneKey): string {
  const required = LANE_CANONICAL_ROLES[lane] ?? [];
  return hero.roles.find((r) => required.includes(r)) ?? hero.roles[0] ?? 'Héros';
}

const MID_TIER_NAMES = new Set(
  (Object.values(LANE_TIERS['Mid']) as string[][]).flat().map((n) => n.toLowerCase())
);

const VIABLE_TIERS: TierRank[] = ['S+', 'S-', 'A+', 'A', 'B'];

function isValidCandidate(hero: HeroData, lane: LaneKey): boolean {
  const canonical = LANE_CANONICAL_ROLES[lane] ?? [];
  const hasRole   = hero.roles.some((r) => canonical.includes(r));
  if (!hasRole) return false;

  const inTierList = VIABLE_TIERS.some((tier) =>
    (LANE_TIERS[lane][tier] ?? []).some((n) => n.toLowerCase() === hero.name.toLowerCase())
  );
  if (inTierList) return true;

  const heroLanes = getHeroLanes(hero.name, hero.roles);
  if (heroLanes.includes(lane)) return true;

  if (lane === 'Mid' && hero.roles.includes('Assassin') && !hero.roles.includes('Mage')) {
    return MID_TIER_NAMES.has(hero.name.toLowerCase());
  }

  return false;
}

// ─── Roam subtype detection ───────────────────────────────────────────────────
// Tank Roam: initiator (Atlas, Khufra, Tigreal…) — best for engage/catch
// Support Roam: peeler/healer (Mathilda, Angela, Estes…) — best for protect/poke

function isRoamTank(hero: HeroData): boolean {
  return hero.roles.includes('Tank') && !hero.roles.includes('Support');
}

function isRoamSupport(hero: HeroData): boolean {
  return hero.roles.includes('Support') && !hero.roles.includes('Tank');
}

function roamSubtypeMultiplier(hero: HeroData, archetype: DraftArchetype): number {
  if (isRoamTank(hero)) {
    // Tank Roam: excels at initiating, penalised when team needs peel
    if (archetype === 'engage') return 1.35;
    if (archetype === 'catch')  return 1.15;
    if (archetype === 'protect') return 0.65;
    if (archetype === 'poke')    return 0.80;
    return 1.0;
  }
  if (isRoamSupport(hero)) {
    // Support Roam: excels at protecting the carry, weak in all-in comps
    if (archetype === 'protect') return 1.40;
    if (archetype === 'poke')    return 1.20;
    if (archetype === 'engage')  return 0.60;
    if (archetype === 'catch')   return 0.80;
    return 1.0;
  }
  return 1.0; // mixed role (e.g., Kaja, Faramis)
}

// ─── EXP context multiplier ───────────────────────────────────────────────────
// EXP role: zone enemy jungler during objectives (pressure + mobility)
//           dive backline in teamfights (damage + mobility)

function expContextMultiplier(hero: HeroData, archetype: DraftArchetype): number {
  const n = (v: number) => clamp(v / 10, 0, 1);
  const zoneScore = (n(hero.pressure) + n(hero.mobility)) / 2;  // jungle contesting
  const diveScore = (n(hero.damage)   + n(hero.mobility)) / 2;  // teamfight dive
  const tankScore = (n(hero.tankiness) + n(hero.cc))      / 2;  // survive teamfight

  if (archetype === 'split')  return 1 + zoneScore * 0.40;
  if (archetype === 'catch')  return 1 + diveScore * 0.30;
  if (archetype === 'engage') return 1 + tankScore * 0.20;
  return 1.0;
}

// ─── Per-archetype lane weight ────────────────────────────────────────────────

const LANE_ARCH_WEIGHT: Record<DraftArchetype, Record<string, number>> = {
  // Jungle boosted for engage/catch — jungle dictates early game pace in MLBB
  engage:  { EXP: 1.2, Jungle: 1.5, Mid: 0.9, Gold: 1.0, Roam: 1.5 },
  poke:    { EXP: 0.9, Jungle: 0.8, Mid: 1.5, Gold: 1.4, Roam: 1.0 },
  protect: { EXP: 0.8, Jungle: 1.0, Mid: 1.2, Gold: 1.5, Roam: 1.5 },
  split:   { EXP: 1.5, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 0.8 },
  catch:   { EXP: 1.2, Jungle: 1.6, Mid: 1.2, Gold: 1.0, Roam: 1.1 },
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Flex pick detection ──────────────────────────────────────────────────────
// A "flex pick" scores ≥5/10 in at least 2 archetypes → hard to read for enemy.
// Blue side benefits most from flex picks (forced to reveal intent first).

const ALL_ARCHETYPES: DraftArchetype[] = ['engage', 'poke', 'protect', 'split', 'catch'];

function getFlexInfo(hero: HeroData): { isFlexPick: boolean; flexArchetypes: DraftArchetype[] } {
  const scores = heroArchetypeScores(hero);
  const flexArchetypes = ALL_ARCHETYPES.filter((a) => (scores[a] ?? 0) >= 5);
  return { isFlexPick: flexArchetypes.length >= 2, flexArchetypes };
}

function scoreHeroForSlot(
  hero:      HeroData,
  lane:      LaneKey,
  archetype: DraftArchetype,
  side:      'blue' | 'red' = 'blue',
): number {
  const archFit  = clamp((heroArchetypeScores(hero)[archetype] ?? 0) / 10, 0, 1);
  const tierScore = getHeroTierScore(hero.name, hero.roles);
  const tierFit  = clamp(tierScore / 10, 0, 1);
  const wrFit    = clamp(((hero.winRate ?? 0.50) - 0.45) / 0.15, 0, 1);
  const laneW    = LANE_ARCH_WEIGHT[archetype][lane] ?? 1.0;
  const roamMul  = lane === 'Roam' ? roamSubtypeMultiplier(hero, archetype) : 1.0;
  const expMul   = lane === 'EXP'  ? expContextMultiplier(hero, archetype)  : 1.0;
  // Blue side: flex picks get a bonus (safer first-pick, harder to read)
  const flexBonus = side === 'blue' && getFlexInfo(hero).isFlexPick ? 0.07 : 0;
  // S+ multiplicative bonus — ensures the best meta heroes are always strongly preferred.
  // S+(×1.25) and S-(×1.10) guarantee that even with slightly lower archetype fit,
  // top-tier heroes win over lower-tier alternatives. Target: maximize S+ in every comp.
  const tierMul  = tierScore >= 10.0 ? 1.25 : tierScore >= 8.5 ? 1.10 : 1.0;
  // Increase tierFit weight (0.35→0.42) and reduce archFit (0.50→0.42) so that
  // tier placement matters more vs raw stat formula.
  return clamp((archFit * 0.42 + tierFit * 0.42 + wrFit * 0.15 + flexBonus) * laneW * roamMul * expMul * tierMul, 0, 2.5);
}

// ─── Composition health check ─────────────────────────────────────────────────
// Checks 4 universal combat functions + 1 archetype-specific function.
// Any hero in any position can cover any function (flexible, not lane-locked).

function checkCompositionHealth(slots: GeneratedDraftSlot[], archetype: DraftArchetype): CompositionHealthCheck {
  const heroes = slots.map((s) => s.hero);
  const n = (v: number) => clamp(v / 10, 0, 1);

  // 1. Initiateur: can force engagement (tankiness + cc + mobility ≥ 5.5 avg)
  const initiators = heroes.filter((h) => (n(h.tankiness) + n(h.cc) + n(h.mobility)) / 3 >= 0.52);

  // 2. Contrôle de foule: lockdown — cc ≥ 7
  const ccHeroes = heroes.filter((h) => h.cc >= 7);

  // 3. Dégâts AoE: teamfight damage — Mage damage≥7, or Fighter damage≥7.5
  const aoeHeroes = heroes.filter(
    (h) => h.damage >= 7 && (h.roles.includes('Mage') || (h.roles.includes('Fighter') && h.damage >= 7.5)),
  );

  // 4. Finisseur: reliably closes out kills — Assassin/Marksman damage≥7, or Fighter damage≥8.5
  const finishers = heroes.filter(
    (h) =>
      (h.damage >= 7 && (h.roles.includes('Assassin') || h.roles.includes('Marksman'))) ||
      (h.damage >= 8.5 && h.roles.includes('Fighter')),
  );

  const functions: FunctionCoverage[] = [
    {
      key: 'initiator', name: 'Initiateur', icon: '⚡',
      covered: initiators.length >= 1, coveredBy: initiators.map((h) => h.name),
      severity: archetype === 'engage' || archetype === 'catch' ? 'critical' : 'warning',
    },
    {
      key: 'cc', name: 'Contrôle de foule', icon: '🔗',
      covered: ccHeroes.length >= 1, coveredBy: ccHeroes.map((h) => h.name),
      severity: 'critical',
    },
    {
      key: 'aoe', name: 'Dégâts AoE', icon: '💥',
      covered: aoeHeroes.length >= 1, coveredBy: aoeHeroes.map((h) => h.name),
      severity: archetype === 'poke' ? 'critical' : 'warning',
    },
    {
      key: 'finisher', name: 'Finisseur', icon: '🎯',
      covered: finishers.length >= 1, coveredBy: finishers.map((h) => h.name),
      severity: 'warning',
    },
  ];

  // Archetype-specific extra checks
  if (archetype === 'protect') {
    const carries = heroes.filter((h) => h.late >= 7 && h.damage >= 7.5 && (h.roles.includes('Marksman') || h.roles.includes('Mage')));
    functions.push({ key: 'carry', name: 'Carry principal', icon: '💎', covered: carries.length >= 1, coveredBy: carries.map((h) => h.name), severity: 'critical' });
  }
  if (archetype === 'split') {
    const pushers = heroes.filter((h) => h.push >= 7 && h.pressure >= 6);
    functions.push({ key: 'pusher', name: 'Pression side lane', icon: '🏃', covered: pushers.length >= 1, coveredBy: pushers.map((h) => h.name), severity: 'critical' });
  }
  if (archetype === 'poke') {
    const pokers = heroes.filter((h) => h.damage >= 7 && h.pressure >= 6);
    functions.push({ key: 'poke', name: 'Double harcèlement', icon: '🎯', covered: pokers.length >= 2, coveredBy: pokers.map((h) => h.name), severity: 'warning' });
  }
  if (archetype === 'catch') {
    const divers = heroes.filter((h) => h.mobility >= 7 && h.damage >= 7);
    functions.push({ key: 'diver', name: 'Plongeur mobile', icon: '🌀', covered: divers.length >= 2, coveredBy: divers.map((h) => h.name), severity: 'warning' });
  }

  const missingCritical = functions.filter((f) => !f.covered && f.severity === 'critical').length;
  const missingWarning  = functions.filter((f) => !f.covered && f.severity === 'warning').length;
  const missingCount    = functions.filter((f) => !f.covered).length;
  const overallHealth   = missingCritical > 0 ? 'critical' : missingWarning > 0 ? 'warning' : 'good';
  const summary = overallHealth === 'good'
    ? 'Composition équilibrée — toutes les fonctions couvertes'
    : overallHealth === 'critical'
    ? `${missingCritical} fonction${missingCritical > 1 ? 's' : ''} critique${missingCritical > 1 ? 's' : ''} manquante${missingCritical > 1 ? 's' : ''}`
    : `${missingWarning} point${missingWarning > 1 ? 's' : ''} à renforcer`;

  return { functions, overallHealth, missingCount, summary };
}

// ─── Kit-based synergy scoring ────────────────────────────────────────────────
// Based on hero stats and roles — items amplify what's already there:
//   - High CC stat → can create CC chains with another CC hero
//   - High tankiness + CC + mobility → initiator that sets up burst
//   - High damage + late scaling → carry that benefits from protection
//   - High mobility × mobility → synchronized dive/engagement
//
// Win rates are NOT used for synergy — synergy comes from kit complementarity.

const ROLE_AFFINITY: Record<string, string[]> = {
  Tank:     ['Mage', 'Assassin', 'Marksman'],
  Support:  ['Marksman', 'Mage', 'Fighter'],
  Mage:     ['Tank', 'Support', 'Fighter'],
  Marksman: ['Support', 'Tank'],
  Fighter:  ['Support', 'Mage'],
  Assassin: ['Tank', 'Support'],
};

interface KitComboComponents {
  ccChain:     number;  // 0–1, both heroes apply CC → chain lockdown
  engageBurst: number;  // 0–1, one dives + survives, other converts to kill
  peelCarry:   number;  // 0–1, one protects, other scales as carry
  diveCleanup: number;  // 0–1, both mobile → synchronized converge
}

function kitComboComponents(a: HeroData, b: HeroData): KitComboComponents {
  const n = (v: number) => clamp(v / 10, 0, 1);

  // CC Chain: requires BOTH to have CC — one CC hero + zero CC hero = no chain
  // Multiplication means if either is 0, the chain doesn't exist
  const ccChain = n(a.cc) * n(b.cc);

  // Engage + Burst: one hero initiates (survives + locks), other finishes
  // Initiator score = tankiness (survive) + CC (lock) + mobility (reach)
  const initA = (n(a.tankiness) + n(a.cc) + n(a.mobility)) / 3;
  const initB = (n(b.tankiness) + n(b.cc) + n(b.mobility)) / 3;
  const engageBurst = Math.max(initA * n(b.damage), initB * n(a.damage));

  // Peel + Carry: one protects (CC + tankiness blocks threats),
  // other wins late game (damage + late scaling = carries harder)
  const peelA  = (n(a.cc) + n(a.tankiness)) / 2;
  const peelB  = (n(b.cc) + n(b.tankiness)) / 2;
  const carryA = (n(a.damage) + n(a.late)) / 2;
  const carryB = (n(b.damage) + n(b.late)) / 2;
  const peelCarry = Math.max(peelA * carryB, peelB * carryA);

  // Dive Cleanup: both mobile → converge simultaneously on targets
  const diveCleanup = n(a.mobility) * n(b.mobility);

  return { ccChain, engageBurst, peelCarry, diveCleanup };
}

function kitSynergyScore(a: HeroData, b: HeroData): number {
  const { ccChain, engageBurst, peelCarry, diveCleanup } = kitComboComponents(a, b);

  // Role affinity (complementary roles — context bonus)
  const roleA = a.roles[0] ?? '';
  const roleB = b.roles[0] ?? '';
  const roleBonus = ((ROLE_AFFINITY[roleA]?.includes(roleB) ? 1 : 0)
                   + (ROLE_AFFINITY[roleB]?.includes(roleA) ? 1 : 0)) / 2;

  // Legacy API assist signal (secondary confirmation when available)
  const apiBonus = ((a.synergies.includes(b.id) ? 1 : 0)
                  + (b.synergies.includes(a.id) ? 1 : 0)) * 0.1;

  return clamp(
    ccChain     * 0.25 +
    engageBurst * 0.25 +
    peelCarry   * 0.20 +
    diveCleanup * 0.10 +
    roleBonus   * 0.15 +
    apiBonus,
    0, 1,
  );
}

function detectComboType(a: HeroData, b: HeroData): ComboType {
  const { ccChain, engageBurst, peelCarry, diveCleanup } = kitComboComponents(a, b);
  const scores: Record<ComboType, number> = {
    cc_chain:     ccChain,
    engage_burst: engageBurst,
    peel_carry:   peelCarry,
    dive_cleanup: diveCleanup,
  };
  return (Object.entries(scores).sort((x, y) => y[1] - x[1])[0][0]) as ComboType;
}

// ─── Team synergy score ───────────────────────────────────────────────────────

function computeTeamSynergy(slots: GeneratedDraftSlot[]): number {
  const byLane = Object.fromEntries(slots.map((s) => [s.lane, s.hero]));
  const roam = byLane['Roam'];
  const mid  = byLane['Mid'];
  const gold = byLane['Gold'];
  const jgl  = byLane['Jungle'];
  const exp  = byLane['EXP'];

  // Weighted pairs — Roam↔Mid most important, Roam↔Gold for peel/carry
  const pairs: [HeroData, HeroData, number][] = [
    [roam, mid,  2.0],
    [roam, gold, 1.5],
    [jgl,  exp,  1.2],
    [jgl,  mid,  0.8],
    [mid,  gold, 0.6],
  ];

  let total = 0, weight = 0;
  for (const [a, b, w] of pairs) {
    if (!a || !b) continue;
    total  += kitSynergyScore(a, b) * w;
    weight += w;
  }

  return weight > 0 ? clamp(Math.round((total / weight) * 100), 0, 100) : 50;
}

// ─── Top combos per composition ───────────────────────────────────────────────
// Inspects the key lane pairs and surfaces the 3 most impactful combos.

function computeTopCombos(slots: GeneratedDraftSlot[]): DraftCombo[] {
  const byLane = Object.fromEntries(slots.map((s) => [s.lane, s]));
  // Priority pairs: most impactful duos in the game flow
  const PAIRS: [string, string][] = [
    ['Roam', 'Mid'],
    ['Roam', 'Gold'],
    ['Jungle', 'EXP'],
    ['Jungle', 'Mid'],
    ['EXP', 'Mid'],
  ];

  const combos: DraftCombo[] = [];
  for (const [lA, lB] of PAIRS) {
    const sA = byLane[lA]; const sB = byLane[lB];
    if (!sA || !sB) continue;
    const score = Math.round(kitSynergyScore(sA.hero, sB.hero) * 100);
    if (score < 25) continue; // not worth surfacing
    const type = detectComboType(sA.hero, sB.hero);
    combos.push({
      heroA:     sA.hero.name,
      laneA:     lA,
      heroB:     sB.hero.name,
      laneB:     lB,
      comboType: type,
      label:     COMBO_LABELS[type],
      score,
    });
  }

  return combos.sort((a, b) => b.score - a.score).slice(0, 3);
}

// ─── Counter score vs known enemy picks ───────────────────────────────────────
// Returns −1…+1: positive = this composition counters the enemy well

function counterScoreVsEnemy(slots: GeneratedDraftSlot[], enemyPicks: HeroData[]): number {
  if (enemyPicks.length === 0) return 0;
  const allies = slots.map((s) => s.hero);
  let score = 0;
  for (const ally of allies) {
    for (const enemy of enemyPicks) {
      if (ally.counters.includes(enemy.id))   score += 1.0;
      if (enemy.counteredBy.includes(ally.id)) score += 0.5;
      if (enemy.counters.includes(ally.id))   score -= 0.5;
      if (ally.counteredBy.includes(enemy.id)) score -= 0.5;
    }
  }
  const maxPossible = allies.length * enemyPicks.length * 1.5;
  return clamp(score / maxPossible, -1, 1);
}

// ─── Diversity check ──────────────────────────────────────────────────────────

function isDiverseEnough(draft: GeneratedDraft, selected: GeneratedDraft[]): boolean {
  const ids = new Set(draft.slots.map((s) => s.hero.id));
  for (const existing of selected) {
    const shared = existing.slots.filter((s) => ids.has(s.hero.id)).length;
    if (shared >= 3) return false; // max 2 heroes shared between any two comps
  }
  return true;
}

// ─── Win condition text ───────────────────────────────────────────────────────

function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const find = (lane: string) => slots.find((s) => s.lane === lane)?.hero.name ?? '?';
  const gold = find('Gold'); const roam = find('Roam');
  const jgl  = find('Jungle'); const mid = find('Mid'); const exp = find('EXP');
  const cond: Record<DraftArchetype, string> = {
    engage:  `${roam} initie, ${jgl} plonge immédiatement. ${mid} + ${gold} finissent le fight. Convergence < 2 secondes — objectif Lord après chaque fight gagné.`,
    poke:    `${mid} + ${gold} harcèlent avant chaque objectif. ${jgl} sécurise les buffs et les objectifs. Engagez seulement quand l'ennemi est < 60% de vie.`,
    protect: `Mur défensif autour de ${gold} : ${roam} peel, ${jgl} couvre les flancs. ${mid} deal depuis la sécurité. Ne cherchez pas le fight ouvert — attendez le late game.`,
    split:   `${exp} force une réponse side lane. ${jgl} conteste les objectifs en même temps. Ne jamais 5v5 — forcez les choix impossibles 1v2 et 3v2.`,
    catch:   `${jgl} + ${roam} isolent une cible déplacée. ${mid} burst, ${exp} nettoie. Jamais de fight en plein champ — toujours initier sur une cible seule.`,
  };
  return cond[archetype];
}

function buildWhy(hero: HeroData, lane: LaneKey, archetype: DraftArchetype): string {
  const fit     = clamp(Math.round((heroArchetypeScores(hero)[archetype] ?? 0) * 10), 0, 100);
  const role    = canonicalRoleLabel(hero, lane);
  const laneStr = ({ EXP: 'EXP Lane', Jungle: 'Jungle', Mid: 'Mid Lane', Gold: 'Gold Lane', Roam: 'Roam' } as Record<string, string>)[lane] ?? lane;
  const roamType = lane === 'Roam'
    ? isRoamTank(hero) ? ' (Initiateur)' : isRoamSupport(hero) ? ' (Support)' : ''
    : '';
  return `${role}${roamType} ${laneStr} — fit ${ARCHETYPE_LABELS[archetype]} : ${fit}/100`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateArchetypeDrafts(
  archetype:    DraftArchetype,
  heroPool:     HeroData[],
  excludedIds:  Set<string> = new Set(),
  enemyPicks:   HeroData[]  = [],
  side:         'blue' | 'red' = 'blue',
): GeneratedDraft[] {
  const LANES: LaneKey[] = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'];
  const pool = heroPool.filter((h) => !excludedIds.has(String(h.id)));

  // ── 1. Candidates per lane ──────────────────────────────────────────────
  const candidates: Record<LaneKey, HeroData[]> = {} as Record<LaneKey, HeroData[]>;
  for (const lane of LANES) {
    candidates[lane] = pool
      .filter((h) => isValidCandidate(h, lane))
      .sort((a, b) => scoreHeroForSlot(b, lane, archetype, side) - scoreHeroForSlot(a, lane, archetype, side))
      .slice(0, 15);
  }

  // ── 2. Global ban pool ──────────────────────────────────────────────────
  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([a]) => a as DraftArchetype);

  const banPool = pool
    .map((h) => {
      const scores     = heroArchetypeScores(h);
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const metaBonus  = clamp((h.winRate ?? 0.50) - 0.50, 0, 0.10) * 20;
      return { hero: h, score: counterStr + metaBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  // ── 3. Generate all valid compositions ─────────────────────────────────
  const allDrafts: GeneratedDraft[] = [];
  const usedKeys  = new Set<string>();

  const nEXP  = candidates['EXP'].length;
  const nJGL  = candidates['Jungle'].length;
  const nMid  = candidates['Mid'].length;
  const nGold = candidates['Gold'].length;
  const nRoam = candidates['Roam'].length;

  outer:
  for (let a = 0; a < nEXP; a++) {
    for (let b = 0; b < nJGL; b++) {
      for (let c = 0; c < nMid; c++) {
        for (let d = 0; d < nGold; d++) {
          for (let e = 0; e < nRoam; e++) {
            if (allDrafts.length >= 300) break outer;

            const heroEXP  = candidates['EXP'][a];
            const heroJGL  = candidates['Jungle'][b];
            const heroMid  = candidates['Mid'][c];
            const heroGold = candidates['Gold'][d];
            const heroRoam = candidates['Roam'][e];

            if (!heroEXP || !heroJGL || !heroMid || !heroGold || !heroRoam) continue;

            const ids = [heroEXP.id, heroJGL.id, heroMid.id, heroGold.id, heroRoam.id];
            if (new Set(ids).size < 5) continue;
            const key = [...ids].sort().join(',');
            if (usedKeys.has(key)) continue;
            usedKeys.add(key);

            const compIds = new Set(ids);

            const compBans: GeneratedBan[] = banPool
              .filter((c) => !compIds.has(c.hero.id))
              .slice(0, 6)
              .map((c, i) => ({
                hero:     c.hero,
                priority: (i < 2 ? 'must-ban' : i < 4 ? 'high' : 'situational') as GeneratedBan['priority'],
                reason:   i < 2
                  ? `Contre directement votre ${ARCHETYPE_LABELS[archetype]}`
                  : i < 4 ? `Méta fort pouvant perturber votre stratégie`
                  : `Situationnel — bannir si l'ennemi semble le viser`,
              }));

            const buildSlot = (hero: HeroData, lane: LaneKey): GeneratedDraftSlot => {
              const { isFlexPick, flexArchetypes } = getFlexInfo(hero);
              return {
                lane,
                hero,
                archetypeFit:   clamp(Math.round((heroArchetypeScores(hero)[archetype] ?? 0) * 10), 0, 100),
                role:           canonicalRoleLabel(hero, lane),
                why:            buildWhy(hero, lane, archetype),
                alternatives:   candidates[lane].filter((h) => !compIds.has(h.id)).slice(0, 2),
                isFlexPick,
                flexArchetypes,
              };
            };

            const slots: GeneratedDraftSlot[] = [
              buildSlot(heroEXP,  'EXP'),
              buildSlot(heroJGL,  'Jungle'),
              buildSlot(heroMid,  'Mid'),
              buildSlot(heroGold, 'Gold'),
              buildSlot(heroRoam, 'Roam'),
            ];

            const indivScore = clamp(
              Math.round(
                slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.lane, archetype, side), 0) / 5 * 100
              ), 0, 100
            );
            const synergy   = computeTeamSynergy(slots);
            const topCombos = computeTopCombos(slots);
            // Red side gets stronger counter weight (reacts to enemy picks with full info)
            const counterWeight = side === 'red' ? 14 : 10;
            const counterAdj = enemyPicks.length > 0
              ? counterScoreVsEnemy(slots, enemyPicks) * counterWeight
              : 0;
            const teamScore = enemyPicks.length > 0
              ? clamp(Math.round(indivScore * 0.65 + synergy * 0.25 + counterAdj), 0, 100)
              : clamp(Math.round(indivScore * 0.75 + synergy * 0.25), 0, 100);

            const healthCheck = checkCompositionHealth(slots, archetype);

            allDrafts.push({
              rank: 0,
              slots,
              bans:         compBans,
              teamScore,
              synergyScore: synergy,
              topCombos,
              pickOrder:    ARCHETYPE_PICK_ORDER[archetype],
              winCondition: buildWinCondition(archetype, slots),
              archetype,
              healthCheck,
            });
          }
        }
      }
    }
  }

  // ── 4. Sort and diversity filter — keep top 8 ──────────────────────────
  allDrafts.sort((a, b) => b.teamScore - a.teamScore);

  // Pass 1: strict — max 2 shared heroes between any two comps, max 3 appearances per hero
  const heroCount1 = new Map<number, number>();
  const selected: GeneratedDraft[] = [];

  for (const draft of allDrafts) {
    if (selected.length >= 8) break;
    if (!isDiverseEnough(draft, selected)) continue;
    const overused = draft.slots.some((s) => (heroCount1.get(s.hero.id) ?? 0) >= 3);
    if (overused) continue;
    draft.slots.forEach((s) => heroCount1.set(s.hero.id, (heroCount1.get(s.hero.id) ?? 0) + 1));
    selected.push({ ...draft, rank: selected.length + 1 });
  }

  // Pass 2: fallback — relax to max 4 appearances if we didn't fill 8 slots
  if (selected.length < 8) {
    const heroCount2 = new Map<number, number>(heroCount1);
    const selectedKeys = new Set(selected.map((d) => d.slots.map((s) => s.hero.id).sort().join(',')));
    for (const draft of allDrafts) {
      if (selected.length >= 8) break;
      const key = draft.slots.map((s) => s.hero.id).sort().join(',');
      if (selectedKeys.has(key)) continue;
      // Relaxed diversity: max 3 shared heroes allowed now
      const ids = new Set(draft.slots.map((s) => s.hero.id));
      const tooSimilar = selected.some((ex) => ex.slots.filter((s) => ids.has(s.hero.id)).length >= 4);
      if (tooSimilar) continue;
      const overused = draft.slots.some((s) => (heroCount2.get(s.hero.id) ?? 0) >= 4);
      if (overused) continue;
      draft.slots.forEach((s) => heroCount2.set(s.hero.id, (heroCount2.get(s.hero.id) ?? 0) + 1));
      selectedKeys.add(key);
      selected.push({ ...draft, rank: selected.length + 1 });
    }
  }

  return selected;
}
