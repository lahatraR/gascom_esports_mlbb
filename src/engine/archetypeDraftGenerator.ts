import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';
import { getHeroTierScore, getHeroTierScoreForLane, getHeroLanes, LANE_TIERS } from '@/data/tierList';
import type { LaneKey, TierRank } from '@/data/tierList';
import { getPlaystyles } from '@/data/heroArchetypes';
import type { PlaystyleArchetype } from '@/data/heroArchetypes';
import {
  getExecutionRoles,
  computeExecutionCoverage,
  detectCorePair,
  ARCHETYPE_EXECUTION_TEMPLATE,
} from '@/data/executionRoles';
import { getBattleSpell } from '@/data/battleSpells';
import type { BattleSpellRec } from '@/data/battleSpells';

// ─── Pick order per archetype ─────────────────────────────────────────────────
// Blue side: reveals intent early → flex picks first, win condition last.
// Red side: reacts to enemy reveal → lock win condition early once threats are clear.

export interface PickOrderStep {
  order:  number; // 1–5
  lane:   string;
  reason: string;
}

// Blue side: must pick first — prioritise flex picks and flex lanes early.
const ARCHETYPE_PICK_ORDER_BLUE: Record<DraftArchetype, PickOrderStep[]> = {
  engage: [
    { order: 1, lane: 'Roam',   reason: 'Flex initiateur (Atlas/Khufra) — hard to counter, establishes engage threat' },
    { order: 2, lane: 'Jungle', reason: 'Dive jungler après avoir vu P1 ennemi — complète le duo initiation' },
    { order: 3, lane: 'EXP',    reason: 'Flex fighter selon les réactions ennemies (pick 3–4 enemy revealed)' },
    { order: 4, lane: 'Mid',    reason: 'Damage burst après initiation Roam+Jungle — confirme la threat' },
    { order: 5, lane: 'Gold',   reason: 'Carry dernier pick — counter direct le Gold ennemi révélé' },
  ],
  poke: [
    { order: 1, lane: 'Mid',    reason: 'Flex mage poke (Zhuxin/Yve) — difficile à directement counter' },
    { order: 2, lane: 'Gold',   reason: 'Marksman DPS à distance — double pression de zone confirme l\'identité' },
    { order: 3, lane: 'Roam',   reason: 'Support adapté à la poke (Diggie anti-CC, Mathilda roam) — flex position' },
    { order: 4, lane: 'Jungle', reason: 'Secure objectifs pendant que la poke prive la vision ennemie' },
    { order: 5, lane: 'EXP',    reason: 'Dernier pick flex — s\'adapte aux menaces restantes vues au pick 4' },
  ],
  protect: [
    { order: 1, lane: 'Gold',   reason: 'Win condition centrale — construire toute la comp autour de lui' },
    { order: 2, lane: 'Mid',    reason: 'Second carry — draft les deux win conditions avant que l\'ennemi réagisse' },
    { order: 3, lane: 'Jungle', reason: 'Flex peel ou dive selon les menaces ennemies confirmées à ce stade' },
    { order: 4, lane: 'Roam',   reason: 'Support peel — confirme après avoir vu le roster ennemi complet' },
    { order: 5, lane: 'EXP',    reason: 'Comble les faiblesses finales (manque CC/tankiness/engage)' },
  ],
  split: [
    { order: 1, lane: 'EXP',    reason: 'Flex splitpusher (Ling/YSS) — force une réponse ennemie immédiate' },
    { order: 2, lane: 'Jungle', reason: 'Conteste objectifs pendant que l\'EXP pousse — double menace' },
    { order: 3, lane: 'Mid',    reason: 'Flex roam ou push selon la pression — s\'adapte si ennemi counter split' },
    { order: 4, lane: 'Gold',   reason: 'Late game insurance si le split ne clôt pas assez vite' },
    { order: 5, lane: 'Roam',   reason: 'Dernier pick — comble les faiblesses vues sur tout le draft ennemi' },
  ],
  catch: [
    { order: 1, lane: 'Jungle', reason: 'Flex assassin (Suyou/Karina) — annonce pick-off sans révéler le core exact' },
    { order: 2, lane: 'Roam',   reason: 'Tank initiateur isolation — crée le core CC après voir pick 1 ennemi' },
    { order: 3, lane: 'Mid',    reason: 'Burst de confirmation — choisir selon la cible prioritaire ennemie' },
    { order: 4, lane: 'EXP',    reason: 'Second isolateur ou nettoyeur de teamfight — confirme la complétion' },
    { order: 5, lane: 'Gold',   reason: 'Carry dernier pick — capitalise sur les ouvertures créées par le core' },
  ],
};

// Red side: picks 2nd in each phase → can directly counter enemy reveals.
const ARCHETYPE_PICK_ORDER_RED: Record<DraftArchetype, PickOrderStep[]> = {
  engage: [
    { order: 1, lane: 'Jungle', reason: 'Réponse immédiate au Jungle ennemi — plongeur confirmé ou counter direct' },
    { order: 2, lane: 'Roam',   reason: 'Initiateur connu après avoir vu P1+P2 blue — contre leur roam ciblé' },
    { order: 3, lane: 'Mid',    reason: 'Damage AoE — contre le Gold ennemi révélé, confirme le suivi d\'initiation' },
    { order: 4, lane: 'EXP',    reason: 'Fighter selon les gaps identifiés (manque de CC/tankiness) dans le draft' },
    { order: 5, lane: 'Gold',   reason: 'Carry dernier pick — counter hard le Gold ennemi avec connaissance complète' },
  ],
  poke: [
    { order: 1, lane: 'Gold',   reason: 'Marksman counter le Gold ennemi P1 — établit double menace à distance' },
    { order: 2, lane: 'Mid',    reason: 'Mage poke selon les picks ennemis — exploite les espaces identifiés' },
    { order: 3, lane: 'Jungle', reason: 'Objectif rusher — contre la menace jungle ennemie vue en P1-P4' },
    { order: 4, lane: 'Roam',   reason: 'Support selon le profil ennemi complet — anti-CC ou engage roam' },
    { order: 5, lane: 'EXP',    reason: 'Dernier pick avec info complète — counter la menace EXP/Jungle restante' },
  ],
  protect: [
    { order: 1, lane: 'Mid',    reason: 'Mage vs mage counter — sécurise mid avant Gold win condition' },
    { order: 2, lane: 'Gold',   reason: 'Win condition après voir l\'initiation ennemie — choisit le carry qui survive' },
    { order: 3, lane: 'Roam',   reason: 'Support peel selon les assassins/divers ennemis confirmés' },
    { order: 4, lane: 'Jungle', reason: 'Flex jungle selon les besoins (peel/flanc/early dominance)' },
    { order: 5, lane: 'EXP',    reason: 'Dernier pick — hard counter la menace EXP ennemie avec info complète' },
  ],
  split: [
    { order: 1, lane: 'Jungle', reason: 'Objective rusher counter — répond à la menace objectif ennemie P1' },
    { order: 2, lane: 'EXP',    reason: 'Splitpusher ciblé selon la side lane ennemie révélée en P1-P2 blue' },
    { order: 3, lane: 'Gold',   reason: 'Late game insurance — sécurise le late si le split échoue' },
    { order: 4, lane: 'Mid',    reason: 'Flex selon gap identifié — roam global ou poke/control' },
    { order: 5, lane: 'Roam',   reason: 'Dernier pick avec info complète — anti-engage ou peeler selon besoin' },
  ],
  catch: [
    { order: 1, lane: 'Roam',   reason: 'Tank isolateur — counter direct le Roam ennemi avec connaissance P1-P2' },
    { order: 2, lane: 'Jungle', reason: 'Assassin pick-off — contre la menace jungle ennemie confirmée' },
    { order: 3, lane: 'EXP',    reason: 'Second isolateur selon les cibles prioritaires ennemies révélées' },
    { order: 4, lane: 'Mid',    reason: 'Burst confirme selon la cible — choisit le burst approprié au Gold ennemi' },
    { order: 5, lane: 'Gold',   reason: 'Carry dernier pick — capitalise avec info ennemie complète' },
  ],
};

const ARCHETYPE_PICK_ORDER = ARCHETYPE_PICK_ORDER_BLUE; // default export (blue)

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
  battleSpell:     BattleSpellRec | null; // recommended battle spell for this hero
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
  // Priority 1: tier list is authoritative — explicitly listed heroes always qualify,
  // even if their primary role doesn't match the canonical lane role
  // (e.g. Chou Fighter/Assassin is S+ Roam, Jawhead Fighter is S- Roam).
  const inTierList = VIABLE_TIERS.some((tier) =>
    (LANE_TIERS[lane][tier] ?? []).some((n) => n.toLowerCase() === hero.name.toLowerCase())
  );
  if (inTierList) return true;

  // Priority 2: role-based eligibility for heroes not listed in the tier list
  const canonical = LANE_CANONICAL_ROLES[lane] ?? [];
  const hasRole   = hero.roles.some((r) => canonical.includes(r));
  if (!hasRole) return false;

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
  // "Engage-type" Roam: glorious launchers and stunners — they initiate/catch,
  // not healers. Detected by playstyle, not role, so Chou (Fighter) and Kaja
  // (Fighter/Support) get the correct initiator multiplier in Roam.
  const playstyles = getPlaystyles(hero.name);
  const isEngageType = playstyles.some(
    (ps) => ps === 'glorious_launcher' || ps === 'stunner',
  );

  if (isRoamTank(hero) || isEngageType) {
    // Tank/initiator Roam: excels at initiating, penalised when team needs peel
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
  return 1.0; // mixed role without strong playstyle signal (e.g., Faramis)
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

// ─── Dynamic tier score ───────────────────────────────────────────────────────
// Blends static tier list (60%) with live win/pick rate data (40%).
// Reflects meta evolution: a B-tier hero with 55% WR is stronger than static tier suggests.
// win rate bracket: 45% = 0, 59% = 10 (real meta range)
// pick rate bracket:  3% = 0, 15% = 10 (high pick = high meta confidence)

function dynamicTierScore(hero: HeroData): number {
  const wr = hero.winRate  ?? 0.50;
  const pr = hero.pickRate ?? 0.05;
  const wrScore = clamp((wr - 0.45) / 0.14 * 10, 0, 10);
  const prScore = clamp((pr - 0.03) / 0.12 * 10, 0, 10);
  return wrScore * 0.65 + prScore * 0.35;
}

// ─── Speciality → archetype bonus ────────────────────────────────────────────
// Maps official MLBB speciality tags (from /api/heroes/{name}) to composition
// archetype contributions. These are additive bonuses on top of stat-based archFit.
// Each value is a 0–1 bonus applied in scoreHeroForSlot.

const SPECIALITY_ARCH_BONUS: Record<string, Partial<Record<DraftArchetype, number>>> = {
  'Crowd Control': { engage: 0.12, catch: 0.10, poke: 0.04 },
  'Initiator':     { engage: 0.15, catch: 0.10 },
  'Burst':         { catch: 0.12, poke: 0.10 },
  'Finisher':      { catch: 0.15 },
  'Guard':         { protect: 0.15 },
  'Regen':         { protect: 0.10, split: 0.08 },
  'Poke':          { poke: 0.12 },
  'Damage':        { poke: 0.08, protect: 0.04 },
  'Charge':        { engage: 0.10, catch: 0.08 },
  'Slow':          { poke: 0.08, catch: 0.06 },
  'Push':          { split: 0.15 },
  'Flicker':       { split: 0.10, catch: 0.08 },
  'Control':       { poke: 0.10, engage: 0.06 },
};

// Returns total speciality bonus (0–0.25 max) for a hero in a given archetype.
function specialityFit(hero: HeroData, archetype: DraftArchetype): number {
  if (!hero.speciality?.length) return 0;
  let bonus = 0;
  for (const spec of hero.speciality) {
    bonus += SPECIALITY_ARCH_BONUS[spec]?.[archetype] ?? 0;
  }
  return Math.min(0.25, bonus);
}

// ─── Power spike alignment ────────────────────────────────────────────────────
// Returns 0–1: how well a hero's power curve peak aligns with the archetype's
// preferred fight window. Uses real API win-rate data when available.

const ARCHETYPE_PEAK_WINDOW: Record<DraftArchetype, 'early' | 'mid' | 'late'> = {
  engage:  'early',
  catch:   'early',
  poke:    'mid',
  split:   'mid',
  protect: 'late',
};

function powerSpikeAlignment(hero: HeroData, archetype: DraftArchetype): number {
  const pc = hero.powerCurve;
  if (!pc) {
    // Fallback: use existing early/mid/late stats
    const wanted = ARCHETYPE_PEAK_WINDOW[archetype];
    const score  = wanted === 'early' ? hero.early : wanted === 'mid' ? hero.mid : hero.late;
    return clamp(score / 10, 0, 1);
  }
  const wanted = ARCHETYPE_PEAK_WINDOW[archetype];
  const score  = wanted === 'early' ? pc.early : wanted === 'mid' ? pc.mid : pc.late;
  return clamp(score / 10, 0, 1);
}

// ─── Phase control score ──────────────────────────────────────────────────────
// 0–100: does the composition dominate at the right game phases?
// Uses powerCurve (real data) with fallback to hero early/mid/late stats.

function computePhaseControl(slots: GeneratedDraftSlot[], archetype: DraftArchetype): number {
  const heroes = slots.map((s) => s.hero);
  const get = (h: HeroData, phase: 'early' | 'mid' | 'late') => {
    if (h.powerCurve) return h.powerCurve[phase];
    return phase === 'early' ? h.early : phase === 'mid' ? h.mid : h.late;
  };
  const avgEarly = heroes.reduce((s, h) => s + get(h, 'early'), 0) / 5;
  const avgMid   = heroes.reduce((s, h) => s + get(h, 'mid'),   0) / 5;
  const avgLate  = heroes.reduce((s, h) => s + get(h, 'late'),  0) / 5;

  // Count phases where team has meaningful advantage (> 6.5/10)
  const dominated = [avgEarly > 6.5, avgMid > 6.5, avgLate > 6.5].filter(Boolean).length;

  // Archetype-specific wanted phase score
  const wantedPhase = ARCHETYPE_PEAK_WINDOW[archetype];
  const wantedScore = wantedPhase === 'early' ? avgEarly : wantedPhase === 'mid' ? avgMid : avgLate;

  // 20 base + 13 per dominated phase + wanted phase score weighted
  return clamp(Math.round(20 + dominated * 13 + wantedScore * 3.5), 0, 100);
}

// ─── Timeline consistency ─────────────────────────────────────────────────────
// 0–100: how consistently ALL heroes in the comp peak at the archetype's wanted phase.
// A catch comp with 4 early-spike heroes and 1 late-scaling carry is consistent.
// A catch comp with 2 early + 2 late + 1 mid is inconsistent — no unified power spike.

function computeTimelineConsistency(slots: GeneratedDraftSlot[], archetype: DraftArchetype): number {
  const wanted = ARCHETYPE_PEAK_WINDOW[archetype];
  const heroes = slots.map((s) => s.hero);

  const getPhaseScore = (h: HeroData, phase: 'early' | 'mid' | 'late') => {
    if (h.powerCurve) return h.powerCurve[phase];
    return phase === 'early' ? h.early : phase === 'mid' ? h.mid : h.late;
  };

  // Each hero: does their wanted phase score exceed the threshold (6.5)?
  const consistent = heroes.filter((h) => getPhaseScore(h, wanted) >= 6.5).length;

  // Count heroes that spike at the WRONG phase relative to archetype
  const wrongPhase: Record<DraftArchetype, 'early' | 'mid' | 'late'> = {
    engage: 'late', catch: 'late', poke: 'early', split: 'early', protect: 'early',
  };
  const wrong = heroes.filter((h) => {
    const wp = wrongPhase[archetype];
    return getPhaseScore(h, wp) > getPhaseScore(h, wanted) + 1.5;
  }).length;

  // Scoring: 20 base + 14 per consistent hero − 10 per wrong-phase hero
  return clamp(Math.round(20 + consistent * 14 - wrong * 10), 0, 100);
}

// ─── Universal threat coverage ────────────────────────────────────────────────
// 0–100: can this composition answer the 6 universal threat profiles?
// Independent of enemy picks — tests if the comp is self-sufficient.
// Uses playstyle archetypes so it works even before API data loads.

function computeThreatCoverage(slots: GeneratedDraftSlot[]): number {
  const heroNames   = slots.map((s) => s.hero.name);
  const allStyles   = heroNames.flatMap((n) => getPlaystyles(n));
  const has = (ps: PlaystyleArchetype) => allStyles.includes(ps);

  const checks: { covered: boolean; weight: number }[] = [
    // 1. Can we burst / take down tanky/regen heroes?
    { covered: has('explosive_mage') || has('sniper') || has('dps_mage') || has('prey_hunter'), weight: 1.0 },
    // 2. Can we protect against assassins / divers?
    { covered: has('avant_garde') || has('enchanter') || has('stone_wall'), weight: 1.0 },
    // 3. Do we have fight-starting capability?
    { covered: has('glorious_launcher') || has('stunner') || has('initiator'), weight: 1.0 },
    // 4. Can we execute / finish kills?
    { covered: has('prey_hunter') || has('sniper') || has('skill_marksman') || has('crit_marksman'), weight: 0.8 },
    // 5. Can we answer split push / map pressure?
    { covered: has('speed_specialist') || has('prey_hunter'), weight: 0.7 },
    // 6. Do we have reliable sustained damage?
    { covered: has('crit_marksman') || has('skill_marksman') || has('dps_mage') || has('berserker'), weight: 0.8 },
  ];

  const totalW   = checks.reduce((s, c) => s + c.weight, 0);
  const coveredW = checks.filter((c) => c.covered).reduce((s, c) => s + c.weight, 0);
  return clamp(Math.round((coveredW / totalW) * 100), 0, 100);
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
  const archFit    = clamp((heroArchetypeScores(hero)[archetype] ?? 0) / 10, 0, 1);
  // Blend static tier list (60%) with live WR/PR data (40%) for meta-adaptive scoring.
  // Lane-specific tier score used when available (Chou S+ Roam vs A+ EXP → use S+ for Roam).
  const staticTier = getHeroTierScoreForLane(hero.name, lane) ?? getHeroTierScore(hero.name, hero.roles);
  const tierScore  = staticTier * 0.60 + dynamicTierScore(hero) * 0.40;
  const tierFit    = clamp(tierScore / 10, 0, 1);
  const wrFit     = clamp(((hero.winRate ?? 0.50) - 0.45) / 0.15, 0, 1);
  const laneW     = LANE_ARCH_WEIGHT[archetype][lane] ?? 1.0;
  const roamMul   = lane === 'Roam' ? roamSubtypeMultiplier(hero, archetype) : 1.0;
  const expMul    = lane === 'EXP'  ? expContextMultiplier(hero, archetype)  : 1.0;
  // Blue side: flex picks get a bonus (safer first-pick, harder to read)
  const flexBonus = side === 'blue' && getFlexInfo(hero).isFlexPick ? 0.06 : 0;
  // S+ multiplicative bonus — ensures top meta heroes always strongly preferred
  const tierMul   = tierScore >= 10.0 ? 1.25 : tierScore >= 8.5 ? 1.10 : 1.0;
  // Speciality fit from official MLBB tags (0–0.25 additive bonus)
  const specBonus = specialityFit(hero, archetype);
  // Power spike alignment: multiplier when hero peaks at the right phase (0.97–1.12)
  const spikeMul  = 1.0 + powerSpikeAlignment(hero, archetype) * 0.12;

  // ── Hybrid archetype blending (70% primary / 30% secondary) ──────────────
  // Real compositions have a natural secondary identity — Catch comps naturally
  // have some Engage in them (the isolation initiator also works in teamfights).
  // Blending ensures we pick heroes that work in both scenarios, not just one.
  const secondaryArchetype = ARCHETYPE_EXECUTION_TEMPLATE[archetype].naturalSecondary;
  const blendRatio         = ARCHETYPE_EXECUTION_TEMPLATE[archetype].hybridRatio;
  const secondaryFit = clamp((heroArchetypeScores(hero)[secondaryArchetype] ?? 0) / 10, 0, 1);
  const blendedArchFit = archFit * (1 - blendRatio) + secondaryFit * blendRatio;

  // ── Execution role bonus ──────────────────────────────────────────────────
  // Heroes that fill the core execution pair get a significant bonus.
  // Heroes that fill support execution needs get a smaller bonus.
  // This ensures the composition naturally builds around an execution core.
  const execRoles   = getExecutionRoles(hero.name);
  const template    = ARCHETYPE_EXECUTION_TEMPLATE[archetype];
  const fillsCore   = execRoles.some((r) => template.corePair.includes(r));
  const fillsSupport = execRoles.some((r) => template.supportNeeds.includes(r));
  const execBonus   = fillsCore ? 0.14 : fillsSupport ? 0.07 : 0;

  // Combined formula:
  //   blended archetype fit (35%) + tier (35%) + win rate (10%)
  //   + speciality tags (≤18%) + exec role bonus (≤14%) + flex bonus (6%)
  //   × lane weight × role subtypes × tier multiplier × spike multiplier
  return clamp(
    (blendedArchFit * 0.35 + tierFit * 0.35 + wrFit * 0.10 + specBonus + execBonus + flexBonus)
    * laneW * roamMul * expMul * tierMul * spikeMul,
    0, 2.5,
  );
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
    if (shared >= 2) return false; // max 1 hero shared between any two comps
  }
  return true;
}

// ─── Win condition text ───────────────────────────────────────────────────────

function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const find = (lane: string) => slots.find((s) => s.lane === lane)?.hero.name ?? '?';
  const gold = find('Gold'); const roam = find('Roam');
  const jgl  = find('Jungle'); const mid = find('Mid'); const exp = find('EXP');

  // Detect the 2-hero execution core to describe the specific play sequence
  const heroNames = slots.map((s) => s.hero.name);
  const core = detectCorePair(heroNames, archetype);

  // Build an execution-aware description using the actual heroes in this composition
  if (core?.isComplete) {
    const coreA = core.heroA; const coreB = core.heroB;
    const roleDescriptions: Record<string, string> = {
      isolation_cc:      'crée l\'isolation CC mono-cible',
      aoe_cc_initiator:  'initie le AoE CC (Flash recommandé)',
      mono_burst:        'burst la cible isolée en < 2 secondes',
      aoe_burst:         'suit avec l\'AoE burst sur le groupe CC',
      global_presence:   'join depuis n\'importe où avec son ultime',
      anti_dash:         'bloque tous les Flicker/dashes ennemis',
      hypercarry:        'est la win condition — survivre = gagner',
      hard_peel:         'construit un mur autour du carry',
      split_threat:      'force une réponse side lane obligatoire',
      execution_finisher:'chasse et finit tous les fuyards',
      sustained_dps:     'maintain la pression DPS sur la durée',
      sustain_heal:      'tient le groupe en vie pendant l\'attrition',
      objective_rusher:  'convertit chaque kill en objectif immédiat',
      vision_assassin:   'crée les conditions de pick en vision denial',
    };
    const descA = roleDescriptions[core.roleA] ?? core.roleA;
    const descB = roleDescriptions[core.roleB] ?? core.roleB;

    const secondaryArchetype = ARCHETYPE_EXECUTION_TEMPLATE[archetype].naturalSecondary;
    const secondaryLabel = secondaryArchetype.charAt(0).toUpperCase() + secondaryArchetype.slice(1);

    switch (archetype) {
      case 'catch':
        return `Core pick-off : ${coreA} ${descA} → ${coreB} ${descB}. ` +
               `${jgl !== coreA && jgl !== coreB ? jgl + ' ouvre' : roam !== coreA && roam !== coreB ? roam + ' crée' : exp + ' nettoie'} la fenêtre. ` +
               `Attendre une cible isolée — ne jamais initier en plein champ. Après le pick : objectif immédiat. ` +
               `(Identité secondaire ${secondaryLabel} : si l'ennemi reste groupé, ce comp peut aussi engager.)`;
      case 'engage':
        return `Core teamfight : ${coreA} ${descA} → ${coreB} ${descB} dans la seconde qui suit. ` +
               `${jgl !== coreA && jgl !== coreB ? jgl : exp} s\'assure que personne n\'échappe via Flicker. ` +
               `Convergence < 2s après le CC — diverger = perdre le fight. Objectif Lord après chaque fight. ` +
               `(Identité secondaire ${secondaryLabel} : si l'ennemi se sépare, ${coreA} peut pick-off isolément.)`;
      case 'protect':
        return `Win condition : ${coreA} à 4-5 items est imbattable si vivant. ` +
               `${coreB} ${descB} — aucun héros ennemi n\'atteint ${coreA}. ` +
               `${jgl} couvre les flancs, ${mid} deal depuis la sécurité. ` +
               `Perdre les early fights est acceptable — gagner le game à items complets. ` +
               `(Identité secondaire ${secondaryLabel} : harcèle l'ennemi pour ralentir leur scaling.)`;
      case 'poke':
        return `Attrition forcée : ${coreA} ${descA} + ${coreB} ${descB} avant chaque objectif. ` +
               `${jgl} sécurise les buffs pendant la poke. Règle absolue : engager seulement si l\'ennemi est < 60% de vie. ` +
               `${roam !== coreA && roam !== coreB ? roam + ' punit les rushes avec CC' : exp + ' contre en side lane'}. ` +
               `(Identité secondaire ${secondaryLabel} : ce comp peut aussi protéger ses propres carries.)`;
      case 'split':
        return `Pression géographique : ${coreA} ${descA} — l\'ennemi envoie 1-2 héros en side lane. ` +
               `Pendant ce temps, ${coreB} ${descB} côté opposé. ` +
               `Jamais de fight 5v5 ouvert — forcer les 1v2 et 3v2 impossibles. ` +
               `${mid} ou ${jgl} avec présence globale : peuvent rejoindre les deux scenarios. ` +
               `(Identité secondaire ${secondaryLabel} : pick off les défenseurs isolés envoyés en réponse.)`;
    }
  }

  // Fallback: generic but lane-specific description
  const cond: Record<DraftArchetype, string> = {
    engage:  `${roam} initie, ${jgl} plonge immédiatement. ${mid} + ${gold} finissent le fight. Convergence < 2 secondes — objectif Lord après chaque fight gagné.`,
    poke:    `${mid} + ${gold} harcèlent avant chaque objectif. ${jgl} sécurise les buffs. Engagez seulement si l'ennemi est < 60% de vie.`,
    protect: `Mur défensif autour de ${gold} : ${roam} peel, ${jgl} couvre les flancs. ${mid} deal depuis la sécurité. Attendez le late game.`,
    split:   `${exp} force une réponse side lane. ${jgl} conteste les objectifs en même temps. Ne jamais 5v5 — forcez les 1v2 et 3v2.`,
    catch:   `${jgl} + ${roam} isolent une cible déplacée. ${mid} burst, ${exp} nettoie. Toujours initier sur une cible seule.`,
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
      .slice(0, 20);
  }

  // ── 2. Three-phase ban pool ──────────────────────────────────────────────
  // Phase 1 (must-ban 2): Heroes that directly counter our execution core.
  //   → Kills the win condition before it can be established.
  // Phase 2 (high 2): S+ flex picks — high-impact heroes that work in any comp.
  //   → Denies powerful versatile threats regardless of enemy comp.
  // Phase 3 (situational 2): Carry threats specific to our composition's weaknesses.
  //   → Targets heroes that exploit the natural holes in our archetype.

  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([a]) => a as DraftArchetype);

  // Phase 1: heroes whose execution roles neutralize our core pair
  // e.g. for catch: heroes with 'hard_peel' block isolation CC; 'sustain_heal' saves the target
  const executionCounterRoles: Record<DraftArchetype, string[]> = {
    catch:   ['hard_peel', 'sustain_heal'],       // peelers/healers protect the isolated target
    engage:  ['anti_dash', 'hard_peel'],           // anti-dash stops the dive; peel counters AoE initiation
    protect: ['vision_assassin', 'mono_burst'],    // assassins that bypass peel and burst the carry
    poke:    ['execution_finisher', 'anti_dash'],  // gap closers that punish poke positioning
    split:   ['objective_rusher', 'global_presence'], // heroes that match split speed
  };
  const coreCounterRoles = executionCounterRoles[archetype] ?? [];

  const phase1Heroes = pool
    .filter((h) => {
      const execRoles = getExecutionRoles(h.name);
      return execRoles.some((r) => coreCounterRoles.includes(r));
    })
    .map((h) => {
      const scores = heroArchetypeScores(h);
      // Prefer heroes that are both execution counters AND good in archetypes that beat us
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const staticTier = getHeroTierScore(h.name, h.roles);
      return { hero: h, score: counterStr * 0.60 + staticTier * 0.40 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Phase 2: S+ flex picks (high tier across multiple archetypes — pick denial)
  const phase2Heroes = pool
    .filter((h) => {
      const tierScore = getHeroTierScore(h.name, h.roles);
      if (tierScore < 8.5) return false; // S- minimum
      // Not already in phase 1
      return !phase1Heroes.some((p) => p.hero.id === h.id);
    })
    .map((h) => {
      const scores = heroArchetypeScores(h);
      const flexCount = (Object.values(scores) as number[]).filter((s) => s >= 7.0).length;
      return { hero: h, score: getHeroTierScore(h.name, h.roles) + flexCount * 0.5 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Phase 3: situational carries that specifically exploit our archetype holes
  const archetypeHoleRoles: Record<DraftArchetype, string[]> = {
    catch:   ['hypercarry', 'hard_peel'],         // protect carries survive our isolation attempts
    engage:  ['split_threat', 'vision_assassin'], // splitpushers avoid our 5v5, assassins pick our backlane
    protect: ['sustained_dps', 'aoe_burst'],      // sustained poke/burst bypasses shields over time
    poke:    ['hypercarry', 'sustain_heal'],       // sustain negates attrition; hypercarry survives to late
    split:   ['aoe_cc_initiator', 'mono_burst'],  // engage answers split with forced 5v5
  };
  const holeRoles = archetypeHoleRoles[archetype] ?? [];
  const phase3Heroes = pool
    .filter((h) => {
      const execRoles = getExecutionRoles(h.name);
      const alreadyBanned = phase1Heroes.some((p) => p.hero.id === h.id) ||
                            phase2Heroes.some((p) => p.hero.id === h.id);
      return !alreadyBanned && execRoles.some((r) => holeRoles.includes(r));
    })
    .map((h) => ({
      hero:  h,
      score: getHeroTierScore(h.name, h.roles) + (h.winRate ?? 0.50) * 5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Assemble ban pool: best 2 from each phase = 6 total
  const banPool = [
    ...phase1Heroes.slice(0, 4),
    ...phase2Heroes.slice(0, 4),
    ...phase3Heroes.slice(0, 4),
  ];

  // ── 3. Generate compositions via diagonal index sweep ──────────────────
  // Instead of sequential nested loops (a=0 appears in all first 15^4 combos),
  // we iterate by "sum of indices" (k = a+b+c+d+e = 0,1,2,...).
  // At k=0: only [0,0,0,0,0]. At k=1: 5 combos varying one position.
  // This ensures all 5 lane positions gain variety simultaneously,
  // producing truly diverse hero combinations from the first iterations.
  const allDrafts: GeneratedDraft[] = [];
  const usedKeys  = new Set<string>();

  const nEXP  = candidates['EXP'].length;
  const nJGL  = candidates['Jungle'].length;
  const nMid  = candidates['Mid'].length;
  const nGold = candidates['Gold'].length;
  const nRoam = candidates['Roam'].length;

  const MAX_SUM = Math.min((nEXP - 1) + (nJGL - 1) + (nMid - 1) + (nGold - 1) + (nRoam - 1), 40);

  outer:
  for (let sumIdx = 0; sumIdx <= MAX_SUM; sumIdx++) {
    for (let a = 0; a <= Math.min(sumIdx, nEXP - 1); a++) {
      for (let b = 0; b <= Math.min(sumIdx - a, nJGL - 1); b++) {
        for (let c = 0; c <= Math.min(sumIdx - a - b, nMid - 1); c++) {
          for (let d = 0; d <= Math.min(sumIdx - a - b - c, nGold - 1); d++) {
            if (allDrafts.length >= 400) break outer;
            const e = sumIdx - a - b - c - d;
            if (e < 0 || e >= nRoam) continue;
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

            // 3-phase ban reasons: Phase 1 = core counter, Phase 2 = S+ flex, Phase 3 = carry threat
            const phase1Size = phase1Heroes.filter((p) => !compIds.has(p.hero.id)).length;
            const phase1Count = Math.min(phase1Size, 2);
            const phase2Count = Math.min(phase2Heroes.filter((p) => !compIds.has(p.hero.id)).length, 2);
            const compBans: GeneratedBan[] = banPool
              .filter((c) => !compIds.has(c.hero.id))
              .slice(0, 6)
              .map((c, i) => {
                const isPhase1 = i < phase1Count;
                const isPhase2 = !isPhase1 && i < phase1Count + phase2Count;
                const priority: GeneratedBan['priority'] = isPhase1 ? 'must-ban' : isPhase2 ? 'high' : 'situational';
                const reason = isPhase1
                  ? `Phase 1 — Neutralise votre core ${ARCHETYPE_LABELS[archetype]} : contre directement l'exécution`
                  : isPhase2
                  ? `Phase 2 — Pick S+ flex : trop polyvalent pour laisser passer`
                  : `Phase 3 — Menace situationnelle : exploite les failles naturelles de votre composition`;
                return { hero: c.hero, priority, reason };
              });

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
                battleSpell:    getBattleSpell(hero.name),
              };
            };

            const slots: GeneratedDraftSlot[] = [
              buildSlot(heroEXP,  'EXP'),
              buildSlot(heroJGL,  'Jungle'),
              buildSlot(heroMid,  'Mid'),
              buildSlot(heroGold, 'Gold'),
              buildSlot(heroRoam, 'Roam'),
            ];

            const indivScore   = clamp(
              Math.round(
                slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.lane, archetype, side), 0) / 5 * 100
              ), 0, 100
            );
            const synergy           = computeTeamSynergy(slots);
            const topCombos         = computeTopCombos(slots);
            const phaseScore        = computePhaseControl(slots, archetype);
            const coverageScore     = computeThreatCoverage(slots);
            // Timeline consistency: all heroes peak at the right game phase
            const timelineScore     = computeTimelineConsistency(slots, archetype);
            // Execution coverage: does this comp have the 2-hero execution core + support roles?
            const executionScore    = computeExecutionCoverage(slots.map((s) => s.hero.name), archetype);
            // Red side gets stronger counter weight (reacts to enemy picks with full info)
            const counterWeight = side === 'red' ? 14 : 10;
            const counterAdj = enemyPicks.length > 0
              ? counterScoreVsEnemy(slots, enemyPicks) * counterWeight
              : 0;
            // Multidimensional team score — execution + timeline consistency are primary signals:
            //   No enemy data  → indiv 25% + synergy 8% + phase 18% + coverage 10% + exec 22% + timeline 17%
            //   Enemy known    → indiv 20% + synergy 7% + phase 14% + coverage  9% + exec 18% + timeline 14% + counter adj
            const teamScore = enemyPicks.length > 0
              ? clamp(Math.round(
                  indivScore * 0.20 + synergy * 0.07 + phaseScore * 0.14 +
                  coverageScore * 0.09 + executionScore * 0.18 + timelineScore * 0.14 + counterAdj
                ), 0, 100)
              : clamp(Math.round(
                  indivScore * 0.25 + synergy * 0.08 + phaseScore * 0.18 +
                  coverageScore * 0.10 + executionScore * 0.22 + timelineScore * 0.17
                ), 0, 100);

            const healthCheck = checkCompositionHealth(slots, archetype);
            // Adaptive pick order: red side reacts to enemy reveals, blue side picks flex-first
            const pickOrder = side === 'red'
              ? ARCHETYPE_PICK_ORDER_RED[archetype]
              : ARCHETYPE_PICK_ORDER_BLUE[archetype];

            allDrafts.push({
              rank: 0,
              slots,
              bans:         compBans,
              teamScore,
              synergyScore: synergy,
              topCombos,
              pickOrder,
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

  // Pass 1: strict — max 1 shared hero between any two comps, max 2 appearances per hero
  const heroCount1 = new Map<number, number>();
  const selected: GeneratedDraft[] = [];

  for (const draft of allDrafts) {
    if (selected.length >= 8) break;
    if (!isDiverseEnough(draft, selected)) continue;
    const overused = draft.slots.some((s) => (heroCount1.get(s.hero.id) ?? 0) >= 2);
    if (overused) continue;
    draft.slots.forEach((s) => heroCount1.set(s.hero.id, (heroCount1.get(s.hero.id) ?? 0) + 1));
    selected.push({ ...draft, rank: selected.length + 1 });
  }

  // Pass 2: fallback — relax to max 2 shared heroes, max 3 appearances per hero
  if (selected.length < 8) {
    const heroCount2 = new Map<number, number>(heroCount1);
    const selectedKeys = new Set(selected.map((d) => d.slots.map((s) => s.hero.id).sort().join(',')));
    for (const draft of allDrafts) {
      if (selected.length >= 8) break;
      const key = draft.slots.map((s) => s.hero.id).sort().join(',');
      if (selectedKeys.has(key)) continue;
      // Relaxed diversity: max 2 shared heroes allowed
      const ids = new Set(draft.slots.map((s) => s.hero.id));
      const tooSimilar = selected.some((ex) => ex.slots.filter((s) => ids.has(s.hero.id)).length >= 3);
      if (tooSimilar) continue;
      const overused = draft.slots.some((s) => (heroCount2.get(s.hero.id) ?? 0) >= 3);
      if (overused) continue;
      draft.slots.forEach((s) => heroCount2.set(s.hero.id, (heroCount2.get(s.hero.id) ?? 0) + 1));
      selectedKeys.add(key);
      selected.push({ ...draft, rank: selected.length + 1 });
    }
  }

  return selected;
}

// ─── Standalone ban suggestions ───────────────────────────────────────────────
// Same 3-phase logic as the ban pool inside generateArchetypeDrafts, but without
// running the full 400-composition sweep. Used by the InlineBanSuggestionBar.

export function computeBanSuggestions(
  archetype:   DraftArchetype,
  heroPool:    HeroData[],
  excludedIds: Set<string> = new Set(),
): GeneratedBan[] {
  const pool = heroPool.filter((h) => !excludedIds.has(String(h.id)));

  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([a]) => a as DraftArchetype);

  // Phase 1: heroes that neutralise our execution core
  const executionCounterRoles: Record<DraftArchetype, string[]> = {
    catch:   ['hard_peel', 'sustain_heal'],
    engage:  ['anti_dash', 'hard_peel'],
    protect: ['vision_assassin', 'mono_burst'],
    poke:    ['execution_finisher', 'anti_dash'],
    split:   ['objective_rusher', 'global_presence'],
  };
  const phase1 = pool
    .filter((h) => {
      const execRoles = getExecutionRoles(h.name);
      return execRoles.some((r) => (executionCounterRoles[archetype] ?? []).includes(r));
    })
    .map((h) => {
      const scores = heroArchetypeScores(h);
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      return { hero: h, score: counterStr * 0.60 + getHeroTierScore(h.name, h.roles) * 0.40 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // Phase 2: S+ flex picks
  const phase1Ids = new Set(phase1.map((p) => p.hero.id));
  const phase2 = pool
    .filter((h) => {
      if (phase1Ids.has(h.id)) return false;
      return getHeroTierScore(h.name, h.roles) >= 8.5;
    })
    .map((h) => {
      const scores = heroArchetypeScores(h);
      const flexCount = (Object.values(scores) as number[]).filter((s) => s >= 7.0).length;
      return { hero: h, score: getHeroTierScore(h.name, h.roles) + flexCount * 0.5 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // Phase 3: carry threats that exploit archetype holes
  const archetypeHoleRoles: Record<DraftArchetype, string[]> = {
    catch:   ['hypercarry', 'hard_peel'],
    engage:  ['split_threat', 'vision_assassin'],
    protect: ['sustained_dps', 'aoe_burst'],
    poke:    ['hypercarry', 'sustain_heal'],
    split:   ['aoe_cc_initiator', 'mono_burst'],
  };
  const phase12Ids = new Set([...phase1, ...phase2].map((p) => p.hero.id));
  const phase3 = pool
    .filter((h) => {
      if (phase12Ids.has(h.id)) return false;
      const execRoles = getExecutionRoles(h.name);
      return execRoles.some((r) => (archetypeHoleRoles[archetype] ?? []).includes(r));
    })
    .map((h) => ({ hero: h, score: getHeroTierScore(h.name, h.roles) + (h.winRate ?? 0.50) * 5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const BAN_PHASE_REASON: Record<DraftArchetype, string[]> = {
    catch:   ['Protège la cible contre votre isolation CC', 'Contre-poke force l\'approach'],
    engage:  ['Bloque les dashes — neutralise votre initiation', 'Peel empêche le dive de passer'],
    protect: ['Burst traverse vos shields', 'Assassin contourne le peel'],
    poke:    ['Sustain annule votre attrition', 'Gap closer punit votre position'],
    split:   ['Présence globale annule le split', 'Engage force les 5v5 que vous évitez'],
  };

  const allPhases = [
    ...phase1.map((p, i) => ({ hero: p.hero, priority: 'must-ban'    as GeneratedBan['priority'], reason: BAN_PHASE_REASON[archetype]?.[i] ?? 'Contre directement votre core exécution' })),
    ...phase2.map((p, i) => ({ hero: p.hero, priority: 'high'        as GeneratedBan['priority'], reason: i === 0 ? 'Pick S+ flex — trop polyvalent à laisser passer' : 'Pick méta dominant avec haute flexibilité' })),
    ...phase3.map((p, i) => ({ hero: p.hero, priority: 'situational' as GeneratedBan['priority'], reason: BAN_PHASE_REASON[archetype]?.[i] ?? 'Exploite les failles naturelles de votre composition' })),
  ];

  return allPhases;
}
