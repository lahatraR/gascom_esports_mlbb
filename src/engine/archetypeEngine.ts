import type { HeroData, DraftArchetype, ArchetypeResult } from '@/types/draft';
import { getPlaystyles, PLAYSTYLE_TO_COMP_BONUS } from '@/data/heroArchetypes';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const ARCHETYPE_LABELS: Record<DraftArchetype, string> = {
  poke:    'Poke',
  engage:  'Engage',
  protect: 'Protect',
  split:   'Split Push',
  catch:   'Catch / Pick-Off',
};

export const ARCHETYPE_SHORT: Record<DraftArchetype, string> = {
  poke:    'Poke',
  engage:  'Engage',
  protect: 'Protect',
  split:   'Split',
  catch:   'Catch',
};

export const ARCHETYPE_ICON: Record<DraftArchetype, string> = {
  poke:    '🎯',
  engage:  '⚔️',
  protect: '🛡️',
  split:   '🌊',
  catch:   '🪤',
};

export const ARCHETYPE_COLOR: Record<DraftArchetype, string> = {
  poke:    'violet',
  engage:  'orange',
  protect: 'teal',
  split:   'yellow',
  catch:   'red',
};

// Tailwind-safe color classes per archetype (cannot be dynamic)
export const ARCHETYPE_CLASSES: Record<DraftArchetype, {
  badge: string; bar: string; border: string; text: string;
}> = {
  poke:    { badge: 'bg-violet-900/60  border-violet-500/50  text-violet-300',  bar: 'bg-violet-500',  border: 'border-violet-500/50',  text: 'text-violet-300'  },
  engage:  { badge: 'bg-orange-900/60  border-orange-500/50  text-orange-300',  bar: 'bg-orange-500',  border: 'border-orange-500/50',  text: 'text-orange-300'  },
  protect: { badge: 'bg-teal-900/60    border-teal-500/50    text-teal-300',    bar: 'bg-teal-500',    border: 'border-teal-500/50',    text: 'text-teal-300'    },
  split:   { badge: 'bg-yellow-900/60  border-yellow-500/50  text-yellow-300',  bar: 'bg-yellow-500',  border: 'border-yellow-500/50',  text: 'text-yellow-300'  },
  catch:   { badge: 'bg-red-900/60     border-red-500/50     text-red-300',     bar: 'bg-red-500',     border: 'border-red-500/50',     text: 'text-red-300'     },
};

export const ARCHETYPE_DESCRIPTION: Record<DraftArchetype, string> = {
  poke:    'Harcèle l\'ennemi à distance avant le combat. Efficace si bien positionné — une mauvaise position se punit immédiatement.',
  engage:  'Déclenche les fights sur votre terrain. Requiert un initiateur + CC long + dégâts de zone + finisher.',
  protect: 'Protège un ou deux carries pour la fin de partie. On construit un mur défensif autour d\'eux.',
  split:   'Casse la formation ennemie en forçant des réponses sur plusieurs lanes simultanément.',
  catch:   'Isole et élimine des cibles séparées du groupe. CC mono-cible + burst + héros difficiles à attraper.',
};

// ─── Counter / beats matrix ────────────────────────────────────────────────────
//
//   Poke    beats Protect, Catch
//   Engage  beats Poke, Split
//   Protect beats Catch, Engage
//   Split   beats Poke, Protect
//   Catch   beats Engage, Split

export const ARCHETYPE_BEATS: Record<DraftArchetype, DraftArchetype[]> = {
  poke:    ['protect', 'catch'],
  engage:  ['poke',    'split'],
  protect: ['catch',   'engage'],
  split:   ['poke',    'protect'],
  catch:   ['engage',  'split'],
};

export const ARCHETYPE_LOSES_TO: Record<DraftArchetype, DraftArchetype[]> = {
  poke:    ['split',   'engage'],
  engage:  ['catch',   'protect'],
  protect: ['poke',    'split'],
  split:   ['catch',   'engage'],
  catch:   ['protect', 'poke'],
};

// ─── Hero archetype scoring ────────────────────────────────────────────────────

export function heroArchetypeScores(hero: HeroData): Record<DraftArchetype, number> {
  return heroScores(hero);
}

function heroScores(hero: HeroData): Record<DraftArchetype, number> {
  const { early, damage, tankiness, cc, mobility, push, pressure, roles, late, mid } = hero;
  const primaryRole = roles[0] ?? '';

  // ── All base scores produce 0–10 max from pure stats ──────────────────────
  // Role bonuses are capped so the total stays within 0–10.
  // Formula: weighted stats (max 10.0) + role bonus (≤ 1.5) → clamped to 10.

  // POKE: sustained range damage, high pressure, mobile, low tankiness, strong early
  let poke = pressure * 0.25 + early * 0.25 + mobility * 0.20
           + (10 - tankiness) * 0.15 + (10 - cc) * 0.15;
  if (primaryRole === 'Mage')     poke += 1.0;
  if (primaryRole === 'Marksman') poke += 1.0;

  // ENGAGE: CC-heavy, durable, fight initiation, able to convert CC to kills.
  // — damage × 0.10 rewards fighters who can follow up their own CC (Yu Zhong, Arlott, Thamuz)
  // — mobility × 0.05 small bonus: dive engage fighters need to reach enemies
  // — removed (10-mobility) penalty: no longer rewards low-mobility defensive peelers (Ruby) for engage
  let engage = cc * 0.35 + tankiness * 0.30 + early * 0.20 + damage * 0.10 + mobility * 0.05;
  if (primaryRole === 'Tank')    engage += 1.5;
  if (primaryRole === 'Fighter') engage += 0.5;

  // PROTECT: late-game focused, peel/utility, scaling, support roles
  let protect = late * 0.35 + tankiness * 0.20 + cc * 0.20 + mid * 0.15
              + (10 - damage) * 0.10;
  if (primaryRole === 'Support') protect += 1.5;
  if (primaryRole === 'Tank')    protect += 0.5;

  // SPLIT: agile + map pressure + objective/push, formation breaker
  let split = mobility * 0.35 + push * 0.30 + pressure * 0.20 + (10 - cc) * 0.15;
  if (primaryRole === 'Assassin') split += 1.0;
  if (primaryRole === 'Fighter')  split += 1.0;

  // CATCH: burst + lockdown + mobility + early aggression.
  // Replaced (10 - tankiness) with early: being tanky ≠ bad catcher (Franco hooks from fog,
  // survives the initiation). Early aggression is what defines a pick-off hero.
  let catchScore = damage * 0.30 + cc * 0.30 + mobility * 0.25 + early * 0.15;
  if (primaryRole === 'Assassin') catchScore += 1.0;

  // ── Playstyle archetype bonuses (scaled to keep total ≤ 10) ──────────────
  const playstyles = getPlaystyles(hero.name);
  for (const ps of playstyles) {
    const bonuses = PLAYSTYLE_TO_COMP_BONUS[ps];
    if (!bonuses) continue;
    if (bonuses.poke)    poke       += bonuses.poke    * 0.7;
    if (bonuses.engage)  engage     += bonuses.engage  * 0.7;
    if (bonuses.protect) protect    += bonuses.protect * 0.7;
    if (bonuses.split)   split      += bonuses.split   * 0.7;
    if (bonuses.catch)   catchScore += bonuses.catch   * 0.7;
  }

  // All scores normalized to 0–10
  return {
    poke:    clamp(poke,       0, 10),
    engage:  clamp(engage,     0, 10),
    protect: clamp(protect,    0, 10),
    split:   clamp(split,      0, 10),
    catch:   clamp(catchScore, 0, 10),
  };
}

// ─── Team archetype detection ─────────────────────────────────────────────────

export function detectTeamArchetype(team: HeroData[]): ArchetypeResult | null {
  if (team.length < 2) return null;

  const archetypes: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

  // Sum each hero's archetype contribution scores
  const totals: Record<DraftArchetype, number> = { poke: 0, engage: 0, protect: 0, split: 0, catch: 0 };
  for (const hero of team) {
    const s = heroScores(hero);
    for (const a of archetypes) totals[a] += s[a];
  }

  // Average across the team
  for (const a of archetypes) totals[a] /= team.length;

  // Normalize to percentages (sum = 100)
  const sum = archetypes.reduce((acc, a) => acc + totals[a], 0);
  const pcts: Record<DraftArchetype, number> = { poke: 0, engage: 0, protect: 0, split: 0, catch: 0 };
  for (const a of archetypes) {
    pcts[a] = Math.round((totals[a] / sum) * 100);
  }

  // Sort descending
  const sorted = [...archetypes].sort((a, b) => pcts[b] - pcts[a]);
  const primary   = sorted[0];
  const secondary = pcts[sorted[1]] > 15 ? sorted[1] : null;

  // Confidence: how far ahead is the primary over the runner-up
  const diff = pcts[primary] - pcts[sorted[1]];
  const confidence = clamp(Math.round(diff * 2.5 + 30), 20, 95);

  return { primary, secondary, confidence, scores: pcts };
}

// ─── Matchup tip generator ────────────────────────────────────────────────────

export function getMatchupTip(
  ours: DraftArchetype,
  enemy: DraftArchetype
): { icon: string; message: string; type: 'advantage' | 'disadvantage' | 'neutral' } {
  const weCounter = ARCHETYPE_BEATS[ours].includes(enemy);
  const theyCounter = ARCHETYPE_BEATS[enemy].includes(ours);

  if (weCounter) {
    return {
      type: 'advantage',
      icon: '✅',
      message: `Votre style ${ARCHETYPE_LABELS[ours]} contre structurellement le ${ARCHETYPE_LABELS[enemy]} adverse.`,
    };
  }
  if (theyCounter) {
    const pivotTo = ARCHETYPE_LOSES_TO[ours].find(
      (a) => ARCHETYPE_BEATS[a].includes(enemy)
    ) ?? null;
    const pivotHint = pivotTo ? ` Pivotez vers un style ${ARCHETYPE_SHORT[pivotTo]} pour renverser le matchup.` : '';
    return {
      type: 'disadvantage',
      icon: '⚠️',
      message: `Leur ${ARCHETYPE_LABELS[enemy]} contre votre style ${ARCHETYPE_LABELS[ours]}.${pivotHint}`,
    };
  }
  return {
    type: 'neutral',
    icon: '🔄',
    message: 'Matchup neutre — l\'exécution et les picks individuels feront la différence.',
  };
}

// ─── Archetype score for a single hero (used in suggestions) ──────────────────

export function heroArchetypeFit(hero: HeroData, archetype: DraftArchetype): number {
  return heroScores(hero)[archetype] / 10; // 0–1  (scores now 0–10)
}

// ─── Enemy archetype counter recommendations ──────────────────────────────────
// Given the detected enemy archetype, returns which archetypes beat it and WHY.
// Used by draft panel to guide composition selection against a known enemy.

export interface CounterRecommendation {
  archetype:     DraftArchetype;
  label:         string;
  effectiveness: number;    // 0–100
  reason:        string;    // French: why this archetype counters the enemy
  keyMechanics:  string[];  // Hero types / executions that exploit the weakness
}

export function getCounterRecommendations(enemyArchetype: DraftArchetype): CounterRecommendation[] {
  const counters = ARCHETYPE_LOSES_TO[enemyArchetype];

  const reasonMap: Record<DraftArchetype, Partial<Record<DraftArchetype, string>>> = {
    poke:    {
      split:   'Le split push force des réponses side lane — impossible de poke quelqu\'un qui n\'est pas en face.',
      engage:  'L\'engage burst annule la poke : une fois à portée mêlée, les mages poke perdent leur avantage de distance.',
    },
    engage:  {
      catch:   'La catch intercepte les initiateurs avant qu\'ils n\'engagent — l\'initiateur isolé devient une cible facile.',
      protect: 'Le protect absorbe l\'engage avec des shields/heals et contre-attaque avec un carry intouchable.',
    },
    protect: {
      poke:    'La poke dégrade lentement même les comps protect : shields/heals ne régénèrent pas assez vite sur la durée.',
      split:   'Le split ne peut pas être "protégé" globalement — on force des 1v1 et 2v2 que le protect ne peut pas suivre.',
    },
    split:   {
      catch:   'La catch élimine le splitpusher isolé avant qu\'il ne soit dangereux — il ne peut pas toujours avoir un backup.',
      engage:  'L\'engage force les fights 5v5 que le split veut éviter — si l\'engage arrive assez vite, le split est pris de cours.',
    },
    catch:   {
      protect: 'Le protect met un mur entre la catch et sa cible — impossible d\'isoler quelqu\'un entouré de heals et de shields.',
      poke:    'La poke tient à distance les héros de catch qui ont besoin d\'approcher — leur mobilité ne compense pas la portée.',
    },
  };

  const mechanicsMap: Record<DraftArchetype, string[]> = {
    poke:    ['Héros à grande portée', 'Zone denial / murs', 'CC long-distance'],
    engage:  ['Initiateurs AoE avec Flash', 'Tanks glorious launcher', 'Dive + burst synchronized'],
    protect: ['Enchanteurs / healers', 'Tanks de peel', 'Hypercarry late game'],
    split:   ['Splitpushers mobiles', 'Présence globale (YSS, Khaleed)', 'Objectif rusher rapide'],
    catch:   ['CC mono-cible (Kaja, Franco)', 'Burst sur cible isolée', 'Anti-dash / silence (Helcurt)'],
  };

  return counters.map((counterArch, idx) => ({
    archetype:     counterArch,
    label:         ARCHETYPE_LABELS[counterArch],
    effectiveness: idx === 0 ? 85 : 70,
    reason:        reasonMap[enemyArchetype]?.[counterArch]
                     ?? `${ARCHETYPE_LABELS[counterArch]} est la réponse naturelle à ${ARCHETYPE_LABELS[enemyArchetype]}.`,
    keyMechanics:  mechanicsMap[counterArch] ?? [],
  }));
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
