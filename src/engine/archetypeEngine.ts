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

  // POKE: sustained range damage, high pressure, mobile, low tankiness, strong early
  let poke = pressure * 0.25 + early * 0.25 + mobility * 0.20
           + (10 - tankiness) * 0.15 + (10 - cc) * 0.15;
  if (primaryRole === 'Mage')     poke += 1.5;
  if (primaryRole === 'Marksman') poke += 1.5;

  // ENGAGE: CC-heavy, durable, fight initiation, sacrifices mobility
  let engage = cc * 0.40 + tankiness * 0.30 + early * 0.20 + (10 - mobility) * 0.10;
  if (primaryRole === 'Tank')    engage += 2.0;
  if (primaryRole === 'Fighter') engage += 0.5;

  // PROTECT: late-game focused, peel/utility, scaling, support roles
  let protect = late * 0.35 + tankiness * 0.20 + cc * 0.20 + mid * 0.15
              + (10 - damage) * 0.10;
  if (primaryRole === 'Support') protect += 2.5;
  if (primaryRole === 'Tank')    protect += 0.5;

  // SPLIT: agile + map pressure + objective/push, formation breaker
  let split = mobility * 0.35 + push * 0.30 + pressure * 0.20 + (10 - cc) * 0.15;
  if (primaryRole === 'Assassin') split += 1.0;
  if (primaryRole === 'Fighter')  split += 1.0;

  // CATCH: burst + lockdown + mobility + hard to catch after
  let catchScore = damage * 0.30 + cc * 0.30 + mobility * 0.25 + (10 - tankiness) * 0.15;
  if (primaryRole === 'Assassin') catchScore += 1.5;

  // ── Playstyle archetype bonuses ───────────────────────────────────────────
  // Apply PLAYSTYLE_TO_COMP_BONUS so that, e.g., Glorious Launchers are always
  // detected as Engage comps and Enchanters always register as Protect comps.
  const playstyles = getPlaystyles(hero.name);
  for (const ps of playstyles) {
    const bonuses = PLAYSTYLE_TO_COMP_BONUS[ps];
    if (!bonuses) continue;
    if (bonuses.poke)    poke       += bonuses.poke;
    if (bonuses.engage)  engage     += bonuses.engage;
    if (bonuses.protect) protect    += bonuses.protect;
    if (bonuses.split)   split      += bonuses.split;
    if (bonuses.catch)   catchScore += bonuses.catch;
  }

  return {
    poke:    clamp(poke,       0, 14),
    engage:  clamp(engage,     0, 14),
    protect: clamp(protect,    0, 14),
    split:   clamp(split,      0, 14),
    catch:   clamp(catchScore, 0, 14),
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
  return heroScores(hero)[archetype] / 12; // 0–1
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
