import type {
  HeroData,
  DraftArchetype,
  BanAnalysis,
  ArchetypeProbability,
  CompositionHole,
  LaneRole,
} from '@/types/draft';
import {
  ARCHETYPE_LOSES_TO,
  ARCHETYPE_LABELS,
  heroArchetypeScores,
} from './archetypeEngine';

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCHETYPES: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

// ─── Ban Analysis ─────────────────────────────────────────────────────────────
//
// "Protection theory": teams ban heroes that threaten their own strategy.
// If the enemy bans Engage heroes → they fear Engage → they're likely playing Catch or Protect
// (the archetypes that Engage loses to, i.e., what beats Engage)

/**
 * Return the dominant archetype of a set of heroes (which archetype do they collectively fit best).
 */
function dominantArchetypeOfHeroes(heroes: HeroData[]): DraftArchetype | null {
  if (heroes.length === 0) return null;

  const totals: Record<DraftArchetype, number> = { poke: 0, engage: 0, protect: 0, split: 0, catch: 0 };
  for (const h of heroes) {
    const s = heroArchetypeScores(h);
    for (const a of ARCHETYPES) totals[a] += s[a];
  }

  let best: DraftArchetype = 'poke';
  let bestVal = -1;
  for (const a of ARCHETYPES) {
    if (totals[a] > bestVal) { bestVal = totals[a]; best = a; }
  }
  return best;
}

// French insight templates per banned archetype
const BAN_INSIGHT_FR: Record<DraftArchetype, (strategies: string) => string> = {
  engage:  (s) => `L'ennemi ban des héros Engage — ils protègent une comp ${s}. Anticipez un jeu défensif ou de harcèlement à distance.`,
  poke:    (s) => `Les bans adverses ciblent le Poke — ils jouent probablement ${s}. Attendez-vous à un engage agressif ou un split push.`,
  protect: (s) => `L'ennemi ban la protection — leur style sera ${s}. Ils veulent des fights rapides sans peel.`,
  split:   (s) => `Les bans ciblent le Split Push — ils préparent un ${s}. Soyez prêts pour un engagement groupé.`,
  catch:   (s) => `L'ennemi ban le Catch — ils préfèrent ${s}. Protégez les isolements, restez groupés.`,
};

export function analyzeBanPattern(
  enemyBans: HeroData[],
  _allyBans: HeroData[],
): BanAnalysis | null {
  if (enemyBans.length === 0) return null;

  const bannedArchetype = dominantArchetypeOfHeroes(enemyBans);
  if (!bannedArchetype) return null;

  // What strategies beat/threaten the banned archetype? That's what the enemy wants to play.
  const inferredStrategies = ARCHETYPE_LOSES_TO[bannedArchetype];

  const stratLabels = inferredStrategies
    .map((a) => ARCHETYPE_LABELS[a])
    .join(' ou ');

  const insight = BAN_INSIGHT_FR[bannedArchetype](stratLabels);

  // Confidence: more bans of the same type = more confident
  const banScores = enemyBans.map((h) => heroArchetypeScores(h)[bannedArchetype]);
  const avgScore  = banScores.reduce((s, v) => s + v, 0) / banScores.length;
  const confidence = Math.round(Math.min(95, 30 + avgScore * 5 + enemyBans.length * 8));

  return {
    bannedThreat:      bannedArchetype,
    bannedThreatLabel: ARCHETYPE_LABELS[bannedArchetype],
    inferredStrategies,
    insight,
    confidence,
    banCount: enemyBans.length,
  };
}

// ─── Archetype Probability Distribution ───────────────────────────────────────
//
// Updated each step with Bayesian-style weights:
//   - Each enemy pick contributes weight × 3 (confirmed signal)
//   - Each enemy ban contributes weight × 0.75 (indirect signal: they don't want to face this)
//     but interpreted via protection theory: ban = signal of their OWN strategy

export function buildArchetypeProbability(
  enemyPicks: HeroData[],
  enemyBans:  HeroData[],
): ArchetypeProbability | null {
  const signalCount = enemyPicks.length + enemyBans.length;
  if (signalCount === 0) return null;

  const dist: Record<DraftArchetype, number> = { poke: 0, engage: 0, protect: 0, split: 0, catch: 0 };

  // Picks → direct archetype signal (weight × 3)
  for (const h of enemyPicks) {
    const s = heroArchetypeScores(h);
    for (const a of ARCHETYPES) dist[a] += s[a] * 3;
  }

  // Bans → protection theory: ban of archetype X signals enemy plays what X loses to
  // We add weight × 0.75 to each inferred strategy
  for (const h of enemyBans) {
    const s = heroArchetypeScores(h);
    // Find which archetype this hero best represents (what's being banned)
    let topArchetype: DraftArchetype = 'poke';
    let topScore = -1;
    for (const a of ARCHETYPES) {
      if (s[a] > topScore) { topScore = s[a]; topArchetype = a; }
    }
    // Infer what the enemy is playing based on protection theory
    for (const inferredArchetype of ARCHETYPE_LOSES_TO[topArchetype]) {
      dist[inferredArchetype] += topScore * 0.75;
    }
  }

  // Normalize to percentages summing to 100
  const total = ARCHETYPES.reduce((s, a) => s + dist[a], 0);
  if (total === 0) return null;

  const normalized: Record<DraftArchetype, number> = { poke: 0, engage: 0, protect: 0, split: 0, catch: 0 };
  for (const a of ARCHETYPES) {
    normalized[a] = Math.round((dist[a] / total) * 100);
  }

  // Fix rounding: adjust largest to make sum = 100
  const sum = ARCHETYPES.reduce((s, a) => s + normalized[a], 0);
  if (sum !== 100) {
    const largest = ARCHETYPES.reduce((best, a) => normalized[a] > normalized[best] ? a : best, ARCHETYPES[0]);
    normalized[largest] += 100 - sum;
  }

  const sorted = [...ARCHETYPES].sort((a, b) => normalized[b] - normalized[a]);
  const dominantArchetype = normalized[sorted[0]] >= 35 ? sorted[0] : null;

  return {
    distribution: normalized,
    sorted,
    dominantArchetype,
    signalCount,
  };
}

// ─── Composition Hole Detection ───────────────────────────────────────────────
//
// Detects missing roles in the allied team and returns ⚠️ alerts.

function hasRole(team: HeroData[], role: string): boolean {
  return team.some((h) => h.roles.includes(role));
}

function teamAvg(team: HeroData[], fn: (h: HeroData) => number): number {
  if (team.length === 0) return 0;
  return team.reduce((s, h) => s + fn(h), 0) / team.length;
}

export function detectCompositionHoles(
  allyPicks: HeroData[],
): CompositionHole[] {
  if (allyPicks.length < 2) return [];

  const holes: CompositionHole[] = [];

  // ── No frontline / Tank ───────────────────────────────────────────────────
  const avgTankiness = teamAvg(allyPicks, (h) => h.tankiness);
  if (!hasRole(allyPicks, 'Tank') && avgTankiness < 4.5) {
    holes.push({
      id:        'no-frontline',
      severity:  'critical',
      message:   'Aucun frontline — votre équipe sera trop fragile pour engager ou tenir un fight.',
      roleToFill: 'Roam',
      condition: 'no-tank',
    });
  }

  // ── No initiator (high CC) ─────────────────────────────────────────────────
  const avgCC = teamAvg(allyPicks, (h) => h.cc);
  const hasTankOrFighter = allyPicks.some((h) => h.roles.includes('Tank') || h.roles.includes('Fighter'));
  if (avgCC < 3.5 && !hasTankOrFighter) {
    holes.push({
      id:        'no-initiator',
      severity:  'critical',
      message:   "Pas d'initiateur — impossible d'engager les fights. Cherchez un héros avec beaucoup de CC.",
      roleToFill: 'Roam',
      condition: 'no-cc',
    });
  } else if (avgCC < 4.0 && allyPicks.length >= 3) {
    holes.push({
      id:        'low-cc',
      severity:  'warning',
      message:   'Peu de CC — vous aurez du mal à contrôler les fights. Pensez à ajouter un héros de contrôle.',
      roleToFill: 'Roam',
      condition: 'low-cc',
    });
  }

  // ── No DPS / Damage carry ─────────────────────────────────────────────────
  const avgDamage = teamAvg(allyPicks, (h) => h.damage);
  const hasCarry  = allyPicks.some((h) => h.roles.includes('Marksman') || h.roles.includes('Mage') || h.roles.includes('Assassin'));
  if (!hasCarry && avgDamage < 5.0) {
    holes.push({
      id:        'no-damage',
      severity:  'critical',
      message:   "Manque de DPS — votre équipe ne pourra pas tuer les ennemis assez vite pour gagner les fights.",
      roleToFill: 'Gold',
      condition: 'no-dps',
    });
  }

  // ── No late-game presence ─────────────────────────────────────────────────
  const avgLate = teamAvg(allyPicks, (h) => h.late);
  if (avgLate < 4.0 && allyPicks.length >= 3) {
    holes.push({
      id:        'no-late-game',
      severity:  'warning',
      message:   "Équipe faible en late game — vos adversaires deviendront plus puissants si le match dure. Forcez les décisions tôt.",
      roleToFill: 'Gold',
      condition: 'weak-late',
    });
  }

  // ── No peel / support ─────────────────────────────────────────────────────
  const hasSupport = allyPicks.some((h) => h.roles.includes('Support'));
  const hasProtect = allyPicks.some((h) => heroArchetypeScores(h)['protect'] > 6);
  if (!hasSupport && !hasProtect && allyPicks.length >= 4) {
    holes.push({
      id:        'no-peel',
      severity:  'warning',
      message:   "Pas de support/peel — vos carries seront vulnérables au Catch ennemi. Envisagez un héros de protection.",
      roleToFill: 'Roam',
      condition: 'no-peel',
    });
  }

  // ── No map pressure / split threat ────────────────────────────────────────
  const avgPressure = teamAvg(allyPicks, (h) => h.pressure);
  const avgPush     = teamAvg(allyPicks, (h) => h.push);
  if (avgPressure < 3.5 && avgPush < 3.5 && allyPicks.length >= 4) {
    holes.push({
      id:        'no-pressure',
      severity:  'warning',
      message:   "Peu de pression de carte — l'ennemi contrôlera librement les objectifs. Ajoutez un héros avec de la mobilité ou du push.",
      roleToFill: 'EXP',
      condition: 'no-pressure',
    });
  }

  // Sort: critical first, then warnings
  return holes.sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'critical' ? -1 : 1;
  });
}
