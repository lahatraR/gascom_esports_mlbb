/**
 * Execution Roles — how heroes actually function in a fight sequence
 * ──────────────────────────────────────────────────────────────────
 * Distinct from playstyle archetypes (what a hero IS) and composition archetypes
 * (what a TEAM does). Execution roles describe WHAT a hero does at the moment
 * of commitment in a fight — the verb, not the noun.
 *
 * Example: Kaja is a Fighter/Support (role), an Initiator (playstyle),
 * in a Catch team (comp archetype), and his execution role is isolation_cc —
 * he walks up, ults the carry, drags them to your team.
 */

import type { DraftArchetype } from '@/types/draft';

// ─── Execution Role Types ─────────────────────────────────────────────────────

export type ExecutionRole =
  // ── Initiation roles ──
  | 'isolation_cc'        // Hard mono-target CC that separates ONE enemy from their team
                          // Kit requirement: grab / hook / suppression / 1v1 isolation
                          // Heroes: Kaja, Franco, Chou, Jawhead, Yin, Gloo
  | 'aoe_cc_initiator'    // Dives into the enemy team and AoE locks them
                          // Often paired with Flash/Flicker battle spell for surprise
                          // Heroes: Minotaur, Atlas, Khufra, Tigreal, Akai
  | 'anti_dash'           // Kit specifically counters Flicker/dash escapes
                          // Critical against mobile comps — turns Flicker into a wasted spell
                          // Heroes: Khufra (S1 ball), Lolita (S2 shield), Chou (S1), Franco (ult)

  // ── Damage roles ──
  | 'mono_burst'          // Deletes ONE isolated target extremely fast (< 2 seconds)
                          // Needs setup from isolation_cc to work — doesn't initiate
                          // Heroes: Lunox, Karrie, Gusion, Aamon, Selena, Harley, Saber
  | 'aoe_burst'           // High AoE damage that converts AoE CC into team wipes
                          // Usually follows aoe_cc_initiator — the second half of the engage
                          // Heroes: Zetian, Pharsa, Vale, Valir, Odette, Cecilion, Lunox
  | 'global_presence'     // Ultimate or skill that reaches anywhere on the map
                          // Enables: joining fights from base, punishing out-of-position heroes
                          // Heroes: Zetian (global ult), Pharsa (global bird), Odette, Yi Sun-Shin
  | 'sustained_dps'       // Consistent damage over time — not a burst, a grind
                          // Effective when fight drags on (protect comps, long teamfights)
                          // Heroes: Claude, Brody, Karrie, Kimmy, Yve, Cecilion

  // ── Support/enabling roles ──
  | 'hypercarry'          // Scales harder than any opponent if alive long enough
                          // The win condition in protect — build the whole comp around them
                          // Heroes: Claude, Brody, Karrie, Yi Sun-Shin, Beatrix, Wanwan
  | 'hard_peel'           // Dedicates their kit to keeping ONE ally alive
                          // Usually attaches to the hypercarry or key damage dealer
                          // Heroes: Angela (S3 attach), Mathilda (S2 rescue), Kaja (drag away threats)
  | 'sustain_heal'        // Continuous healing that sustains the team through attrition
                          // Critical in long fights — counters poke and sustained damage
                          // Heroes: Estes, Floryn, Rafaela, Uranus (self), Angela

  // ── Map pressure roles ──
  | 'split_threat'        // Forces the enemy to dedicate 1-2 heroes to defend a side lane
                          // Creates a 4v3 or 3v2 elsewhere — wins by geography
                          // Heroes: Ling, Fanny, Benedetta, Hayabusa, Leomord, Khaleed
  | 'objective_rusher'    // Takes Lord/Turtle abnormally fast after a pick or fight
                          // Converts kills into structures — prevents "moral victory" without reward
                          // Heroes: most junglers, especially early-dominant ones

  // ── Finisher roles ──
  | 'execution_finisher'  // Chases and eliminates low-HP heroes trying to escape
                          // The "cleanup" role — no target survives after the core combo
                          // Heroes: Karina, Saber, Zilong, Joy, Helcurt, Natalia, Hayabusa
  | 'vision_assassin';    // Creates vision denial, enabling picks without detection
                          // Heroes: Natalia (passive invisibility), Helcurt (S2 dark shroud)

// ─── Hero → Execution Roles ──────────────────────────────────────────────────
// Assign the execution roles each hero fills based on their kit.
// Multiple roles allowed (Kaja = isolation_cc + hard_peel).
// Heroes without explicit mapping → [] (handled by fallback logic).

const HERO_EXECUTION_ROLES_RAW: [string, ExecutionRole[]][] = [
  // ── Tanks / Roam ────────────────────────────────────────────────────────────
  ['atlas',       ['aoe_cc_initiator', 'anti_dash']],               // S3 Annihilate + S2 anti-Flicker
  ['khufra',      ['aoe_cc_initiator', 'anti_dash']],               // S1 ball stops ALL dashes
  ['minotaur',    ['aoe_cc_initiator']],                            // Flash ult = signature AoE stun
  ['tigreal',     ['aoe_cc_initiator']],                            // S3 AoE drag + stun combo
  ['akai',        ['aoe_cc_initiator', 'anti_dash']],               // S2 rolling pin disrupts formations
  ['lolita',      ['aoe_cc_initiator', 'anti_dash']],               // S2 blocks projectiles + S3 AoE CC
  ['franco',      ['isolation_cc', 'anti_dash']],                   // S1 hook = quintessential pick tool
  ['chou',        ['isolation_cc', 'anti_dash']],                   // S1 interrupt + ult kick isolation
  ['kaja',        ['isolation_cc', 'hard_peel']],                   // ult drags carry away + can peel for own carry
  ['jawhead',     ['isolation_cc', 'aoe_cc_initiator']],            // S1 throws one target + S2 engage
  ['johnson',     ['aoe_cc_initiator', 'isolation_cc']],            // car crash = AoE + one target pinned
  ['barats',      ['aoe_cc_initiator']],                            // S3 devour = AoE absorb
  ['gloo',        ['isolation_cc', 'aoe_cc_initiator']],            // S2 stun pull on target + sticky
  ['gatotkaca',   ['aoe_cc_initiator']],                            // S3 arena AoE stun
  ['hylos',       ['aoe_cc_initiator']],                            // sustained AoE + AoE slow ult

  // ── Fighters ────────────────────────────────────────────────────────────────
  ['yin',         ['isolation_cc']],                                // ult creates 1v1 realm — perfect isolation
  ['fredrinn',    ['aoe_cc_initiator', 'anti_dash']],               // S3 grab + S2 frontline engage
  ['guinevere',   ['aoe_cc_initiator', 'isolation_cc']],            // S2 AoE knockup + ult aerial
  ['paquito',     ['isolation_cc', 'execution_finisher']],          // stun chain on one target + chase
  ['silvanna',    ['isolation_cc', 'aoe_cc_initiator']],            // ult arena isolates + AoE inside
  ['badang',      ['aoe_cc_initiator']],                            // S3 wall trap = AoE cage
  ['minsitthar',  ['aoe_cc_initiator']],                            // ult halberd = AoE pull + pin
  ['sora',        ['aoe_cc_initiator', 'anti_dash']],               // AoE stun kick + engage dive
  ['arlott',      ['aoe_cc_initiator', 'execution_finisher']],      // dive engage + chase kill
  ['joy',         ['execution_finisher', 'sustained_dps']],         // chain S2 on mobile low HP targets
  ['khaleed',     ['split_threat', 'aoe_cc_initiator']],            // lane pressure + S3 sand wave
  ['benedetta',   ['split_threat', 'execution_finisher']],          // extreme lane + chase
  ['leomord',     ['split_threat', 'execution_finisher']],          // mount speed + chase kill
  ['zilong',      ['execution_finisher', 'split_threat']],          // speed ult = chase
  ['thamuz',      ['sustained_dps', 'objective_rusher']],           // sustained damage + farm speed
  ['freya',       ['sustained_dps']],                               // sustained auto + skill DPS

  // ── Mages ───────────────────────────────────────────────────────────────────
  ['zetian',      ['global_presence', 'aoe_burst', 'mono_burst']],  // global ult + AoE stun + burst
  ['pharsa',      ['global_presence', 'aoe_burst']],                // global bird ult + AoE zones
  ['vale',        ['aoe_burst', 'anti_dash']],                      // S3 tornado + S2 can interrupt
  ['lunox',       ['mono_burst', 'aoe_burst', 'sustained_dps']],    // chaos = mono burst, light = AoE sustained
  ['odette',      ['aoe_burst', 'global_presence']],                // ult = AoE fear + damage radius
  ['valir',       ['aoe_burst', 'anti_dash']],                      // S2 pushes + S3 AoE
  ['cecilion',    ['aoe_burst', 'sustained_dps']],                  // scaling AoE sustained
  ['yve',         ['aoe_burst', 'sustained_dps']],                  // zone control + sustained AoE
  ['gord',        ['sustained_dps', 'aoe_burst']],                  // channel sustained + S3 AoE
  ['kagura',      ['mono_burst', 'anti_dash']],                     // umbrella mechanics + burst
  ['selena',      ['mono_burst', 'isolation_cc']],                  // stun setup → burst combo
  ['harley',      ['mono_burst']],                                   // combo burst on one target
  ['gusion',      ['mono_burst', 'execution_finisher']],            // fastest combo burst + reset
  ['aamon',       ['mono_burst', 'execution_finisher']],            // passive armor shred + burst kill
  ['aurora',      ['mono_burst', 'aoe_cc_initiator']],              // freeze combo = isolation + kill
  ['eudora',      ['mono_burst']],                                   // triple lightning burst
  ['zhuxin',      ['aoe_burst', 'sustained_dps']],                  // current meta S+ AoE damage
  ['kimmy',       ['sustained_dps', 'aoe_burst']],                  // S+ mid, mobile sustained DPS
  ['luo yi',      ['aoe_cc_initiator', 'aoe_burst']],               // yin-yang swap = team warp + burst

  // ── Assassins ───────────────────────────────────────────────────────────────
  ['karina',      ['execution_finisher', 'mono_burst']],            // S2 reset on kill = chain execute
  ['saber',       ['mono_burst', 'isolation_cc']],                  // ult = instant aerial isolation + burst
  ['suyou',       ['mono_burst', 'execution_finisher']],            // combo assassin + chase
  ['julian',      ['mono_burst', 'sustained_dps']],                 // flexible combos
  ['natalia',     ['vision_assassin', 'mono_burst']],               // silence + ambush burst
  ['helcurt',     ['vision_assassin', 'mono_burst']],               // darkness shroud + burst
  ['ling',        ['split_threat', 'execution_finisher']],          // extreme mobility split + finisher
  ['fanny',       ['split_threat', 'execution_finisher']],          // unkillable rotations + dive
  ['hayabusa',    ['split_threat', 'execution_finisher']],          // clone map pressure + finisher
  ['lancelot',    ['mono_burst', 'execution_finisher']],            // dash combo burst
  ['gusion',      ['mono_burst', 'execution_finisher']],            // already above
  ['alucard',     ['split_threat', 'execution_finisher']],          // lifesteal sustain + chase
  ['benedetta',   ['split_threat', 'execution_finisher']],          // already above

  // ── Marksmen ────────────────────────────────────────────────────────────────
  ['karrie',      ['mono_burst', 'hypercarry', 'sustained_dps']],   // true damage = tank shredder
  ['claude',      ['hypercarry', 'sustained_dps']],                 // unlimited ammo + clone = best late
  ['brody',       ['hypercarry', 'mono_burst', 'sustained_dps']],   // slow stacks + ult ranged burst
  ['yi sun-shin', ['global_presence', 'hypercarry', 'objective_rusher']], // global S1 + carry late
  ['beatrix',     ['hypercarry', 'sustained_dps']],                 // weapon-swap adaptability
  ['wanwan',      ['hypercarry', 'anti_dash']],                     // ult pierce dash + carry
  ['granger',     ['mono_burst', 'execution_finisher']],            // last bullet burst + finisher
  ['melissa',     ['hard_peel', 'sustained_dps']],                  // S3 cage = anti-dive peel
  ['obsidia',     ['mono_burst', 'execution_finisher']],            // chain damage = picks off isolées + finisher
  ['kimmy',       ['sustained_dps', 'aoe_burst']],                  // already above

  // ── Supports ────────────────────────────────────────────────────────────────
  ['angela',      ['hard_peel', 'sustain_heal']],                   // S3 attach = ultimate peel
  ['mathilda',    ['hard_peel', 'aoe_cc_initiator']],               // S2 rescue + S3 engage
  ['estes',       ['sustain_heal']],                                 // chain healing
  ['floryn',      ['sustain_heal', 'hard_peel']],                   // heal + item buff
  ['diggie',      ['hard_peel', 'anti_dash']],                      // ult CC immunity + stun eggs
  ['rafaela',     ['sustain_heal']],                                 // heal + slow
];

function normalizeHeroName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const _EXEC_LOOKUP = new Map<string, ExecutionRole[]>(
  HERO_EXECUTION_ROLES_RAW.map(([k, v]) => [normalizeHeroName(k), v])
);

export function getExecutionRoles(heroName: string): ExecutionRole[] {
  return _EXEC_LOOKUP.get(normalizeHeroName(heroName)) ?? [];
}

// ─── Archetype Execution Templates ───────────────────────────────────────────
// Defines what execution roles each archetype NEEDS to function properly.
// corePair: the 2 execution roles that form the win condition
// supportNeeds: what the remaining 3 slots should cover
// naturalSecondary: the hybrid identity this archetype naturally develops

export interface ArchetypeExecutionTemplate {
  corePair:         [ExecutionRole, ExecutionRole];
  supportNeeds:     [ExecutionRole, ExecutionRole, ExecutionRole];
  naturalSecondary: DraftArchetype;
  hybridRatio:      number;     // 0–1: how much secondary archetype to blend in scoring (0.3 = 70/30)
  executionNote:    string;     // Human-readable execution logic
}

export const ARCHETYPE_EXECUTION_TEMPLATE: Record<DraftArchetype, ArchetypeExecutionTemplate> = {

  catch: {
    corePair:         ['isolation_cc', 'mono_burst'],
    supportNeeds:     ['anti_dash', 'aoe_burst', 'execution_finisher'],
    naturalSecondary: 'engage',
    hybridRatio:      0.25,
    executionNote:
      'Le catcher crée une fenêtre de 1.5s par CC mono-cible → le burster one-shot la cible isolée. ' +
      'Les 3 autres : bloquer l\'escape (anti_dash), occuper les 4 ennemis restants (aoe_burst), ' +
      'finir les fuyards (execution_finisher). Ne jamais initier en plein champ — attendre une cible seule.',
  },

  engage: {
    corePair:         ['aoe_cc_initiator', 'aoe_burst'],
    supportNeeds:     ['anti_dash', 'mono_burst', 'sustained_dps'],
    naturalSecondary: 'catch',
    hybridRatio:      0.20,
    executionNote:
      'L\'initiateur plonge avec Flash/Flicker et lance son AoE CC → le followup AoE burst dans la seconde. ' +
      'Anti_dash crucial : si l\'ennemi peut Flicker hors du CC, l\'engage rate. ' +
      'Mono_burst finit le carry pendant qu\'il est CC. Sustained DPS nettoie les survivants.',
  },

  protect: {
    corePair:         ['hypercarry', 'hard_peel'],
    supportNeeds:     ['aoe_cc_initiator', 'anti_dash', 'sustain_heal'],
    naturalSecondary: 'poke',
    hybridRatio:      0.20,
    executionNote:
      'Tout tourne autour de la survie du hypercarry. Hard_peel = mur entre lui et les menaces. ' +
      'Anti_dash bloque les assassins avant qu\'ils atteignent le carry. ' +
      'Aoe_cc protège les retraites. Sustain_heal = attrition gagnée sur la durée. ' +
      'Objectif : gagner le game à 4 items carry.',
  },

  poke: {
    corePair:         ['sustained_dps', 'aoe_burst'],
    supportNeeds:     ['anti_dash', 'hard_peel', 'objective_rusher'],
    naturalSecondary: 'protect',
    hybridRatio:      0.25,
    executionNote:
      'Deux sources de dégâts à distance qui forcent l\'ennemi à recall avant chaque objectif. ' +
      'Ne pas engager — si l\'ennemi rush in, anti_dash les punit. ' +
      'Hard_peel protège les DPS à distance. Objective_rusher convertit l\'attrition en structures. ' +
      'Règle : engagez SEULEMENT si l\'ennemi est < 60% de vie en amont de l\'objectif.',
  },

  split: {
    corePair:         ['split_threat', 'objective_rusher'],
    supportNeeds:     ['aoe_cc_initiator', 'global_presence', 'mono_burst'],
    naturalSecondary: 'catch',
    hybridRatio:      0.30,
    executionNote:
      'Le split_threat force l\'ennemi à envoyer 1-2 héros en side lane. ' +
      'En même temps, objective_rusher conteste le côté opposé. ' +
      'Global_presence peut join les deux scenarios en même temps. ' +
      'Mono_burst pick off les défenseurs isolés. ' +
      'Règle : ne jamais accepter un 5v5 ouvert — forcer les 1v2 et 3v2 impossibles.',
  },
};

// ─── Coverage Score ───────────────────────────────────────────────────────────
// 0–100: how well a composition covers the execution template for its archetype.
// Evaluates whether the core pair + support roles are present.

export function computeExecutionCoverage(
  heroNames: string[],
  archetype:  DraftArchetype,
): number {
  const template  = ARCHETYPE_EXECUTION_TEMPLATE[archetype];
  const allRoles  = heroNames.flatMap(getExecutionRoles);
  const has = (r: ExecutionRole) => allRoles.includes(r);

  // Core pair: both required — if either is missing, execution is fundamentally broken
  const coreA = has(template.corePair[0]);
  const coreB = has(template.corePair[1]);
  const coreScore = coreA && coreB ? 60
                  : coreA || coreB ? 30
                  : 0;

  // Support needs: each covered = +13 points (3 × 13 = 39, total max = 99 → round to 100)
  let supportScore = 0;
  for (const need of template.supportNeeds) {
    if (has(need)) supportScore += 13;
  }

  return Math.min(100, coreScore + supportScore + (coreA && coreB ? 1 : 0));
}

// ─── Core Pair Detection ──────────────────────────────────────────────────────
// Given a list of heroes in a composition, find the pair that best fulfills
// the archetype's core execution pair — this pair IS the win condition.

export interface DetectedCorePair {
  heroA:     string;
  roleA:     ExecutionRole;
  heroB:     string;
  roleB:     ExecutionRole;
  isComplete: boolean;  // true if both roles of the core pair are covered
}

export function detectCorePair(
  heroNames: string[],
  archetype: DraftArchetype,
): DetectedCorePair | null {
  const template = ARCHETYPE_EXECUTION_TEMPLATE[archetype];
  const [roleA, roleB] = template.corePair;

  const heroA = heroNames.find((n) => getExecutionRoles(n).includes(roleA));
  const heroB = heroNames.find((n) => n !== heroA && getExecutionRoles(n).includes(roleB));

  if (!heroA && !heroB) return null;

  return {
    heroA:      heroA ?? '?',
    roleA,
    heroB:      heroB ?? '?',
    roleB,
    isComplete: !!heroA && !!heroB,
  };
}
