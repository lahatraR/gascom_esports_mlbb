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
  ARCHETYPE_BEATS,
  ARCHETYPE_LABELS,
  ARCHETYPE_SHORT,
  heroArchetypeScores,
} from './archetypeEngine';

// ─── Strategic Read ────────────────────────────────────────────────────────────
//
// Chess master approach: read BOTH enemy bans AND picks to infer their intent.
//
// Three reading layers:
//   1. Ban tells  — what they ban reveals what they FEAR (protection theory)
//   2. Pick tells — what they pick reveals what they BUILD
//   3. Cross-reference — if both signals converge → high confidence enemy plan
//
// Output: what WE should do, whether to pivot, and any trap/deception opportunity.

export interface StrategicRead {
  enemyPlan:       DraftArchetype | null;   // detected enemy composition
  counterStrategy: DraftArchetype | null;   // archetype that beats their plan
  pivotNeeded:     boolean;                 // true if our current plan loses to their plan
  trapOpportunity: string | null;           // flexible "hidden" pick suggestion
  insight:         string;                  // French explanation
  confidence:      'low' | 'medium' | 'high';
}

export function buildStrategicRead(
  enemyPicks:       HeroData[],
  enemyBans:        HeroData[],
  allyBans:         HeroData[],
  ourArchetype:     DraftArchetype | null,
): StrategicRead {
  const archetypes: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

  // ── Signal 1: pick-based detection (direct) ──────────────────────────────
  let pickSignal: DraftArchetype | null = null;
  if (enemyPicks.length >= 1) {
    const pickTotals: Record<DraftArchetype, number> = { poke:0, engage:0, protect:0, split:0, catch:0 };
    for (const h of enemyPicks) {
      const s = heroArchetypeScores(h);
      for (const a of archetypes) pickTotals[a] += s[a];
    }
    const sorted = [...archetypes].sort((a, b) => pickTotals[b] - pickTotals[a]);
    const top     = pickTotals[sorted[0]];
    const second  = pickTotals[sorted[1]];
    const pickShare = top / (Object.values(pickTotals).reduce((s, v) => s + v, 0) || 1);
    if (pickShare > 0.30) pickSignal = sorted[0];
  }

  // ── Signal 2: ban-based detection (protection theory) ────────────────────
  // If they ban a lot of "Engage" heroes → they FEAR engage → they're building Catch or Protect
  let banSignal: DraftArchetype | null = null;
  if (enemyBans.length >= 1) {
    const banTotals: Record<DraftArchetype, number> = { poke:0, engage:0, protect:0, split:0, catch:0 };
    for (const h of enemyBans) {
      const s = heroArchetypeScores(h);
      for (const a of archetypes) banTotals[a] += s[a];
    }
    const bannedDominant = archetypes.reduce((best, a) => banTotals[a] > banTotals[best] ? a : best, archetypes[0]);
    // What plays well against the archetype they're banning?
    const inferred = ARCHETYPE_LOSES_TO[bannedDominant];
    if (inferred.length > 0) banSignal = inferred[0]; // primary inferred enemy style
  }

  // ── Signal 3: our own bans tell about OUR intent ──────────────────────────
  // (Used to detect trap opportunities: our bans reveal our strategy to the enemy)
  let ourBanSignal: DraftArchetype | null = null;
  if (allyBans.length >= 2) {
    const ourBanTotals: Record<DraftArchetype, number> = { poke:0, engage:0, protect:0, split:0, catch:0 };
    for (const h of allyBans) {
      const s = heroArchetypeScores(h);
      for (const a of archetypes) ourBanTotals[a] += s[a];
    }
    const bannedBy = archetypes.reduce((b, a) => ourBanTotals[a] > ourBanTotals[b] ? a : b, archetypes[0]);
    // What WE are banning exposes what we fear, hinting our strategy
    ourBanSignal = ARCHETYPE_LOSES_TO[bannedBy][0] ?? null;
  }

  // ── Cross-reference: combine pick + ban signals ───────────────────────────
  let enemyPlan: DraftArchetype | null = null;
  let confidence: StrategicRead['confidence'] = 'low';

  if (pickSignal && banSignal && pickSignal === banSignal) {
    enemyPlan  = pickSignal;
    confidence = 'high';  // both signals agree
  } else if (pickSignal && enemyPicks.length >= 2) {
    enemyPlan  = pickSignal;
    confidence = enemyPicks.length >= 3 ? 'high' : 'medium';
  } else if (banSignal && enemyBans.length >= 2) {
    enemyPlan  = banSignal;
    confidence = 'medium';
  } else if (pickSignal || banSignal) {
    enemyPlan  = pickSignal ?? banSignal;
    confidence = 'low';
  }

  // ── Counter strategy ──────────────────────────────────────────────────────
  const counterStrategy: DraftArchetype | null = enemyPlan
    ? (ARCHETYPE_BEATS[enemyPlan][0] ?? null)
    : null;

  // ── Pivot needed? ─────────────────────────────────────────────────────────
  const pivotNeeded = !!(
    enemyPlan && ourArchetype &&
    ARCHETYPE_BEATS[enemyPlan].includes(ourArchetype) === false &&
    ARCHETYPE_LOSES_TO[ourArchetype].includes(enemyPlan)
  );

  // ── Trap opportunity: our bans may be leaking our strategy ───────────────
  let trapOpportunity: string | null = null;
  if (ourBanSignal && ourArchetype && ourBanSignal === ourArchetype && confidence !== 'low') {
    const flexible = ARCHETYPE_BEATS[ourArchetype][0];
    trapOpportunity = `Vos bans révèlent votre stratégie ${ARCHETYPE_SHORT[ourArchetype]}. Pikez un héros flexible ${ARCHETYPE_SHORT[flexible]} d'abord pour masquer votre plan.`;
  } else if (enemyPlan && counterStrategy && confidence === 'high') {
    trapOpportunity = `L'ennemi construit du ${ARCHETYPE_SHORT[enemyPlan]} — pikez des héros ${ARCHETYPE_SHORT[counterStrategy]} qui paraissent neutres pour ne pas déclencher leurs bans phase 2.`;
  }

  // ── French insight ────────────────────────────────────────────────────────
  let insight = '';
  if (!enemyPlan) {
    insight = 'Pas encore assez de données — continuez à observer les bans et picks ennemis pour déduire leur plan.';
  } else if (confidence === 'high') {
    const counter = counterStrategy ? ARCHETYPE_LABELS[counterStrategy] : '?';
    insight = pivotNeeded
      ? `⚠️ L'ennemi joue ${ARCHETYPE_LABELS[enemyPlan]} — votre stratégie actuelle est en danger. Pivotez vers ${counter} pour renverser le matchup.`
      : `✅ L'ennemi joue ${ARCHETYPE_LABELS[enemyPlan]} — votre ${ourArchetype ? ARCHETYPE_LABELS[ourArchetype] : counter} le contre structurellement. Renforcez votre plan.`;
  } else if (confidence === 'medium') {
    insight = `Indice probable : l'ennemi semble construire du ${ARCHETYPE_LABELS[enemyPlan]}. ${counterStrategy ? `Préparez du ${ARCHETYPE_LABELS[counterStrategy]}.` : ''}`;
  } else {
    insight = `Signal faible : ${ARCHETYPE_LABELS[enemyPlan!]} possible côté ennemi. Restez flexibles jusqu'au prochain pick.`;
  }

  return { enemyPlan, counterStrategy, pivotNeeded, trapOpportunity, insight, confidence };
}

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

// ─── Adaptive Ban Suggestions ────────────────────────────────────────────────
//
// Phase-2 aware ban recommendations:
//   1. Synergy partners of confirmed enemy picks (break their combos)
//   2. Counters to our confirmed picks (protect our carries)
//   3. Heroes that would complete the enemy archetype
//
// Call when at least 1 enemy pick is confirmed.

export interface AdaptiveBanSuggestion {
  hero:    HeroData;
  reason:  string;
  urgency: 'critical' | 'high' | 'medium';
}

export function buildAdaptiveBanSuggestions(
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
  allHeroes:  HeroData[],
  bannedIds:  Set<number>,
  pickedIds:  Set<number>,
): AdaptiveBanSuggestion[] {
  if (enemyPicks.length === 0) return [];

  const available = allHeroes.filter((h) => !bannedIds.has(h.id) && !pickedIds.has(h.id));
  const results:   AdaptiveBanSuggestion[] = [];
  const seen = new Set<number>();

  const add = (hero: HeroData, reason: string, urgency: AdaptiveBanSuggestion['urgency']) => {
    if (seen.has(hero.id)) return;
    seen.add(hero.id);
    results.push({ hero, reason, urgency });
  };

  // 1. Synergy partners of confirmed enemy picks
  for (const enemy of enemyPicks) {
    const partners = available
      .filter((h) => enemy.synergies.includes(h.id) || h.synergies.includes(enemy.id))
      .slice(0, 2);
    for (const p of partners) {
      add(p, `Partenaire fort de ${enemy.name} — brisez leur combo de kit`, 'high');
    }
  }

  // 2. Hard counters to our confirmed picks
  for (const ally of allyPicks) {
    const counters = available
      .filter((h) => ally.counteredBy.includes(h.id) || h.counters.includes(ally.id))
      .slice(0, 1);
    for (const c of counters) {
      add(c, `Counter direct de votre ${ally.name} — protégez votre composition`, 'critical');
    }
  }

  // 3. Heroes that would complete the enemy archetype (strongest fit not yet picked)
  const enemyArch = dominantArchetypeOfHeroes(enemyPicks);
  if (enemyArch && enemyPicks.length >= 2) {
    const completions = [...available]
      .sort((a, b) => heroArchetypeScores(b)[enemyArch] - heroArchetypeScores(a)[enemyArch])
      .slice(0, 3);
    for (const hero of completions) {
      if (heroArchetypeScores(hero)[enemyArch] > 7) {
        add(hero, `Compléterait parfaitement leur ${ARCHETYPE_LABELS[enemyArch]}`, 'high');
      }
    }
  }

  // Sort: critical first, then high, then medium. Return top 5.
  const urgencyOrder: Record<AdaptiveBanSuggestion['urgency'], number> = { critical: 0, high: 1, medium: 2 };
  return results
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, 5);
}

// ─── Counterplay Tips ─────────────────────────────────────────────────────────
//
// Generates actionable French tips based on confirmed enemy heroes' stat profiles.
// Items amplify base stats, so a high-CC hero will apply more CC with CC items —
// we can reliably warn about their threats without knowing their specific items.

export interface CounterplayTip {
  targetHero: string;
  tip:        string;
  priority:   'critical' | 'high' | 'medium';
}

export function buildCounterplayTips(enemyPicks: HeroData[]): CounterplayTip[] {
  if (enemyPicks.length === 0) return [];
  const tips: CounterplayTip[] = [];

  for (const hero of enemyPicks) {
    // Dominant late game carry → time pressure
    if (hero.late >= 8) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} devient dominant en late — forcez les objectifs avant 12 min et ne laissez pas le jeu s'étirer.`,
        priority:   'critical',
      });
    }
    // Massive CC → positioning discipline
    if (hero.cc >= 8) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} possède un CC massif — restez dispersés, gardez votre Flicker pour esquiver son lockdown.`,
        priority:   'critical',
      });
    }
    // Mobile assassin → never split
    if (hero.mobility >= 8 && hero.damage >= 7) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} est un assassin mobile et dévastateur — ne vous isolez jamais, restez en groupe lors des rotations.`,
        priority:   'high',
      });
    }
    // Extreme tankiness → penetration items hint
    if (hero.tankiness >= 8) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} est extrêmement résistant — priorisez les objets de pénétration physique/magique ou de réduction défense.`,
        priority:   'high',
      });
    }
    // Heavy map pressure / split threat → map awareness
    if (hero.pressure >= 8) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} impose une pression de carte massive — répondez à ses rotations, ne laissez pas les objectifs sans contestation.`,
        priority:   'high',
      });
    }
    // High damage but immobile → punish positioning
    if (hero.damage >= 8 && hero.mobility <= 4) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} inflige d'énormes dégâts mais manque de mobilité — plongez dessus avant qu'il puisse s'installer en position.`,
        priority:   'high',
      });
    }
    // Early game dominant → survive early
    if (hero.early >= 8) {
      tips.push({
        targetHero: hero.name,
        tip:        `${hero.name} domine l'early game — évitez les trades défavorables jusqu'à vos premiers objets clés.`,
        priority:   'medium',
      });
    }
  }

  const priorityOrder: Record<CounterplayTip['priority'], number> = { critical: 0, high: 1, medium: 2 };
  return tips
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
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
