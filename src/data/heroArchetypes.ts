/**
 * MLBB Hero Playstyle Archetypes
 * ─────────────────────────────
 * 18 sub-archetypes that describe the PLAYSTYLE of individual heroes.
 * These are distinct from the 5 DRAFT COMPOSITION archetypes (poke/engage/protect/split/catch)
 * in archetypeEngine.ts, but are used to enrich counter-scoring and comp detection.
 *
 * Source: gosugamers MLBB archetype guide
 */

// ─── Type definitions ─────────────────────────────────────────────────────────

export type PlaystyleArchetype =
  // Tank
  | 'glorious_launcher'   // AoE stun/engage initiator
  | 'stone_wall'          // Massive HP/armor, sustains damage
  | 'avant_garde'         // Protects backline with instant/on-demand CC
  // Fighter
  | 'mastodon'            // Balanced offense/defense, shields
  | 'stunner'             // Aggressive + strong CC, relies on lockdown
  | 'berserker'           // Lifesteal-driven, unkillable under the right conditions
  // Mage
  | 'explosive_mage'      // High-damage burst combos from bushes
  | 'battle_mage'         // Low-cooldown sustained damage, close combat
  | 'control_mage'        // AoE CC that controls zones
  | 'dps_mage'            // Sustained long-range magic DPS
  | 'summoner'            // Deploys entities to deal/threaten damage
  // Assassin
  | 'prey_hunter'         // Pure assassin: cleans up fleeing/low-HP targets
  | 'sniper'              // Instantly eliminates backline before they react
  | 'speed_specialist'    // Extreme mobility, in-and-out combat
  // Marksman
  | 'crit_marksman'       // Crit-based basic attack carry
  | 'skill_marksman'      // Skill-reliant, often doubles as jungler
  // Support
  | 'enchanter'           // Heals/shields/speed/buffs for the team
  | 'initiator';          // Tank-support hybrid, sets up kills with debuffs

// ─── Labels & descriptions ────────────────────────────────────────────────────

export const PLAYSTYLE_LABEL: Record<PlaystyleArchetype, string> = {
  glorious_launcher: 'Glorious Launcher',
  stone_wall:        'Stone Wall',
  avant_garde:       'Avant-garde',
  mastodon:          'Mastodon',
  stunner:           'Stunner',
  berserker:         'Berserker',
  explosive_mage:    'Explosive Mage',
  battle_mage:       'Battle Mage',
  control_mage:      'Control Mage',
  dps_mage:          'DPS Mage',
  summoner:          'Summoner',
  prey_hunter:       'Prey Hunter',
  sniper:            'Sniper',
  speed_specialist:  'Speed Specialist',
  crit_marksman:     'Crit Marksman',
  skill_marksman:    'Skill Marksman',
  enchanter:         'Enchanter',
  initiator:         'Initiator',
};

export const PLAYSTYLE_DESC: Record<PlaystyleArchetype, string> = {
  glorious_launcher: 'AoE stuns & knockdowns — breaks formations, potential 5-man wipe with team follow-up.',
  stone_wall:        'Massive HP/defense. Flesh shield that takes very long to destroy.',
  avant_garde:       'Instant on-demand CC that protects the backline from assassins & divers.',
  mastodon:          'Balanced fighter with shields/damage reduction. Fights multiple targets.',
  stunner:           'Aggressive CC fighter. Relies on lockdown to minimize damage taken.',
  berserker:         '"Best defense is offense." Lifesteal-driven — nearly unkillable at full steam.',
  explosive_mage:    'Rapid-succession high-burst skills. Plays around bushes for surprise engagements.',
  battle_mage:       'Low-cooldown sustained damage + defensive skills. Thrives in close combat.',
  control_mage:      'Controls map zones with AoE CC — disrupts anyone entering their territory.',
  dps_mage:          'Long-range sustained magic damage — primary damage before late-game scales.',
  summoner:          'Deploys entities on the battlefield that deal damage independently.',
  prey_hunter:       'Pure assassin — cleans up fleeing enemies and backline carries.',
  sniper:            'Instantly eliminates backline heroes before they can react. Devastating 1v1.',
  speed_specialist:  'All-in on mobility — traverses the map in seconds, dashes in and out of combat.',
  crit_marksman:     'Relies on basic attacks + crit items. Excellent positioning required.',
  skill_marksman:    'Skill-reliant carry — ultimate is primary damage source. Good mobility.',
  enchanter:         'Heals, shields, speed boosts, and buffs for allies.',
  initiator:         'Tank/support hybrid — applies debuffs to set up easy kills for the team.',
};

// ─── Counter matrix ───────────────────────────────────────────────────────────
//
// "A counters B" means A's strengths directly exploit B's weaknesses.

export const PLAYSTYLE_COUNTERS: Record<PlaystyleArchetype, PlaystyleArchetype[]> = {
  // Glorious Launcher: smashes glass cannon backlines and assassins
  glorious_launcher: ['prey_hunter', 'speed_specialist', 'sniper', 'crit_marksman', 'skill_marksman', 'explosive_mage'],

  // Stone Wall: outlasts burst — counters high burst damage types
  stone_wall:        ['explosive_mage', 'sniper', 'prey_hunter'],

  // Avant-garde: instantly stops assassins and divers from reaching backline
  avant_garde:       ['prey_hunter', 'speed_specialist', 'sniper'],

  // Mastodon: dominates melee/mid-range brawl scenarios
  mastodon:          ['stunner', 'berserker', 'battle_mage'],

  // Stunner: locks down and eliminates glass cannons
  stunner:           ['explosive_mage', 'crit_marksman', 'skill_marksman', 'prey_hunter', 'speed_specialist', 'sniper'],

  // Berserker: unstoppable vs sustained melee fighters
  berserker:         ['mastodon', 'stone_wall', 'stunner', 'battle_mage', 'avant_garde'],

  // Explosive Mage: deletes low-health glass cannons and enchanters
  explosive_mage:    ['crit_marksman', 'skill_marksman', 'enchanter', 'mastodon', 'stunner'],

  // Battle Mage: outduels enduring frontliners in sustained trades
  battle_mage:       ['mastodon', 'stone_wall', 'berserker'],

  // Control Mage: pins down tanks and melee who can't avoid AoE zones
  control_mage:      ['stone_wall', 'mastodon', 'glorious_launcher'],

  // DPS Mage: melts low-mobility targets and enchanters over time
  dps_mage:          ['stone_wall', 'mastodon', 'enchanter', 'berserker'],

  // Summoner: floods melee zone with entities — dominates short-range heroes
  summoner:          ['mastodon', 'berserker', 'battle_mage', 'stunner'],

  // Prey Hunter: murders backline carries who have no CC to protect them
  prey_hunter:       ['crit_marksman', 'skill_marksman', 'dps_mage', 'explosive_mage', 'enchanter'],

  // Sniper: deletes isolated glass cannons instantly — great 1v1
  sniper:            ['crit_marksman', 'skill_marksman', 'enchanter', 'dps_mage', 'explosive_mage'],

  // Speed Specialist: dashes into backline and eliminates carries before they react
  speed_specialist:  ['crit_marksman', 'skill_marksman', 'enchanter', 'dps_mage'],

  // Crit Marksman: shreds tanks and fighters with sustained AA over time
  crit_marksman:     ['mastodon', 'stone_wall', 'berserker', 'avant_garde'],

  // Skill Marksman: kites and outputs damage vs fighters and melee frontline
  skill_marksman:    ['mastodon', 'berserker', 'battle_mage', 'avant_garde'],

  // Enchanter: keeps carry alive through the burst of explosive heroes
  enchanter:         ['explosive_mage', 'sniper', 'prey_hunter', 'speed_specialist'],

  // Initiator: sets up kills vs anyone who lacks CC immunity
  initiator:         ['crit_marksman', 'skill_marksman', 'enchanter', 'dps_mage', 'prey_hunter'],
};

// Derived inverse: what counters each archetype
export const PLAYSTYLE_COUNTERED_BY: Record<PlaystyleArchetype, PlaystyleArchetype[]> = (() => {
  const map: Record<string, PlaystyleArchetype[]> = {};
  for (const [a, targets] of Object.entries(PLAYSTYLE_COUNTERS) as [PlaystyleArchetype, PlaystyleArchetype[]][]) {
    for (const t of targets) {
      if (!map[t]) map[t] = [];
      map[t].push(a);
    }
  }
  return map as Record<PlaystyleArchetype, PlaystyleArchetype[]>;
})();

// ─── Playstyle → Composition archetype contribution ──────────────────────────
//
// Used by archetypeEngine to augment composition detection when hero stats
// alone are ambiguous.

export const PLAYSTYLE_TO_COMP_BONUS: Record<PlaystyleArchetype, Partial<Record<'poke'|'engage'|'protect'|'split'|'catch', number>>> = {
  glorious_launcher: { engage: 3.5 },
  stone_wall:        { protect: 2.0, engage: 1.0 },
  avant_garde:       { protect: 3.5 },
  mastodon:          { engage: 1.0, split: 1.5 },
  stunner:           { catch: 2.5, engage: 1.0 },
  berserker:         { split: 2.5, engage: 0.5 },
  explosive_mage:    { poke: 2.5, catch: 1.0 },
  battle_mage:       { engage: 2.0, poke: 0.5 },
  control_mage:      { poke: 3.0, protect: 1.0 },
  dps_mage:          { poke: 3.0 },
  summoner:          { protect: 2.0, poke: 1.5 },
  prey_hunter:       { catch: 3.0, split: 1.0 },
  sniper:            { catch: 3.0 },
  speed_specialist:  { split: 3.0, catch: 1.0 },
  crit_marksman:     { poke: 2.5, protect: 1.0 },
  skill_marksman:    { poke: 1.5, split: 1.0 },
  enchanter:         { protect: 3.5 },
  initiator:         { engage: 2.5, catch: 1.0 },
};

// ─── Hero → Playstyle archetypes ─────────────────────────────────────────────
//
// Keys are normalised (lowercase, no special chars) hero names.
// Use getPlaystyles(heroName) to look up.

const HERO_PLAYSTYLES_RAW: [string, PlaystyleArchetype[]][] = [
  // ── Tanks ───────────────────────────────────────────────────────────────────
  ['akai',            ['glorious_launcher', 'avant_garde']],
  ['atlas',           ['glorious_launcher']],
  ['gatotkaca',       ['glorious_launcher', 'stone_wall']],
  ['johnson',         ['glorious_launcher', 'avant_garde']],
  ['khufra',          ['glorious_launcher']],
  ['lolita',          ['glorious_launcher', 'avant_garde', 'initiator']],
  ['minotaur',        ['glorious_launcher', 'initiator']],
  ['ruby',            ['glorious_launcher', 'avant_garde', 'mastodon', 'stunner', 'berserker']],
  ['tigreal',         ['glorious_launcher', 'avant_garde']],
  ['barats',          ['stone_wall', 'mastodon']],
  ['baxia',           ['stone_wall']],
  ['belerick',        ['stone_wall', 'avant_garde']],
  ['gloo',            ['stone_wall']],
  ['grock',           ['stone_wall']],
  ['hylos',           ['stone_wall']],
  ['uranus',          ['stone_wall', 'berserker']],
  ['franco',          ['avant_garde', 'initiator']],
  ['carmilla',        ['initiator']],
  // ── Fighters ────────────────────────────────────────────────────────────────
  ['aldous',          ['mastodon']],
  ['bane',            ['mastodon']],
  ['freya',           ['mastodon']],
  ['hilda',           ['mastodon']],
  ['jawhead',         ['mastodon', 'stunner']],
  ['khaleed',         ['mastodon', 'berserker']],
  ['lapulapu',        ['mastodon', 'berserker']],
  ['minsitthar',      ['mastodon', 'stunner']],
  ['paquito',         ['mastodon', 'stunner', 'berserker']],
  ['phoveus',         ['mastodon', 'berserker']],
  ['terizla',         ['mastodon']],
  ['thamuz',          ['mastodon', 'berserker']],
  ['xborg',           ['mastodon', 'berserker']],
  ['yuzhong',         ['mastodon', 'berserker']],
  ['badang',          ['stunner']],
  ['chou',            ['stunner', 'speed_specialist']],
  ['guinevere',       ['stunner']],
  ['kaja',            ['stunner', 'initiator']],
  ['martis',          ['stunner', 'berserker']],
  ['silvanna',        ['stunner', 'berserker']],
  ['zilong',          ['stunner', 'prey_hunter', 'speed_specialist']],
  ['alpha',           ['berserker']],
  ['alucard',         ['berserker', 'sniper']],
  ['argus',           ['berserker']],
  ['balmond',         ['berserker']],
  ['dyrroth',         ['berserker']],
  ['leomord',         ['berserker', 'speed_specialist']],
  ['masha',           ['berserker']],
  ['sun',             ['berserker', 'summoner']],
  ['roger',           ['berserker', 'skill_marksman']],
  ['sora',            ['berserker', 'speed_specialist']],
  ['arlott',          ['mastodon', 'berserker']],
  ['joy',             ['speed_specialist', 'berserker']],
  ['aulus',           ['berserker']],
  ['fredrinn',        ['mastodon']],
  // ── Mages ───────────────────────────────────────────────────────────────────
  ['aurora',          ['explosive_mage', 'control_mage']],
  ['eudora',          ['explosive_mage', 'control_mage']],
  ['faramis',         ['explosive_mage', 'battle_mage', 'enchanter']],
  ['gord',            ['explosive_mage', 'dps_mage']],
  ['harley',          ['explosive_mage', 'sniper']],
  ['kadita',          ['explosive_mage']],
  ['kagura',          ['explosive_mage', 'control_mage', 'summoner']],
  ['odette',          ['explosive_mage', 'control_mage']],
  ['pharsa',          ['explosive_mage', 'control_mage', 'dps_mage']],
  ['selena',          ['explosive_mage', 'summoner', 'sniper']],
  ['vale',            ['explosive_mage', 'control_mage']],
  ['alice',           ['battle_mage', 'control_mage']],
  ['cyclops',         ['battle_mage', 'dps_mage']],
  ['esmeralda',       ['battle_mage']],
  ['harith',          ['battle_mage', 'speed_specialist']],
  ['lylia',           ['battle_mage', 'summoner']],
  ['lunox',           ['battle_mage', 'dps_mage']],
  ['cecilion',        ['control_mage', 'dps_mage']],
  ['change',          ['dps_mage']],
  ['luoyi',           ['control_mage', 'dps_mage']],
  ['nana',            ['control_mage', 'summoner']],
  ['valir',           ['control_mage', 'dps_mage']],
  ['vexana',          ['control_mage', 'summoner']],
  ['kimmy',           ['dps_mage', 'skill_marksman']],
  ['yve',             ['dps_mage', 'control_mage']],
  ['zhask',           ['dps_mage', 'summoner']],
  ['xavier',          ['dps_mage', 'control_mage']],
  ['zhuxin',          ['dps_mage', 'control_mage']],
  // ── Assassins ───────────────────────────────────────────────────────────────
  ['benedetta',       ['prey_hunter', 'speed_specialist']],
  ['fanny',           ['prey_hunter', 'speed_specialist']],
  ['hanzo',           ['prey_hunter']],
  ['gusion',          ['prey_hunter', 'speed_specialist']],
  ['karina',          ['prey_hunter', 'sniper']],
  ['ling',            ['prey_hunter', 'speed_specialist']],
  ['natalia',         ['prey_hunter', 'sniper', 'speed_specialist']],
  ['hayabusa',        ['sniper', 'speed_specialist']],
  ['helcurt',         ['sniper', 'speed_specialist']],
  ['lancelot',        ['sniper', 'speed_specialist']],
  ['saber',           ['sniper']],
  ['aamon',           ['sniper', 'prey_hunter']],
  ['suyou',           ['prey_hunter', 'speed_specialist']],
  ['julian',          ['prey_hunter', 'berserker']],
  // ── Marksmen ────────────────────────────────────────────────────────────────
  ['bruno',           ['crit_marksman']],
  ['clint',           ['crit_marksman']],
  ['hanabi',          ['crit_marksman']],
  ['irithel',         ['crit_marksman']],
  ['layla',           ['crit_marksman']],
  ['lesley',          ['crit_marksman', 'sniper']],
  ['miya',            ['crit_marksman']],
  ['moskov',          ['crit_marksman']],
  ['natan',           ['crit_marksman', 'skill_marksman']],
  ['beatrix',         ['skill_marksman']],
  ['brody',           ['skill_marksman']],
  ['claude',          ['skill_marksman']],
  ['granger',         ['skill_marksman']],
  ['karrie',          ['skill_marksman']],
  ['wanwan',          ['skill_marksman']],
  ['yisunshin',       ['skill_marksman', 'speed_specialist']],
  ['ixia',            ['skill_marksman']],
  ['melissa',         ['skill_marksman', 'enchanter']],
  ['popol',           ['summoner', 'skill_marksman']],   // Popol and Kupa
  ['popolandkupa',    ['summoner', 'skill_marksman']],
  // ── Supports ────────────────────────────────────────────────────────────────
  ['angela',          ['enchanter']],
  ['diggie',          ['summoner', 'enchanter']],
  ['estes',           ['enchanter']],
  ['mathilda',        ['enchanter', 'initiator']],
  ['rafaela',         ['enchanter']],
  ['floryn',          ['enchanter']],
  // ── Heroes added after archetype confirmation ────────────────────────────
  // Tanks / Supports
  ['kalea',           ['avant_garde', 'initiator']],           // Tank/Support — on-demand CC, protects backline
  ['chip',            ['enchanter', 'initiator']],             // Support — utility + CC setup
  ['edith',           ['stone_wall', 'crit_marksman']],        // Tank/Marksman — unique hybrid (tank form + AA form)
  ['marcel',          ['enchanter', 'initiator']],             // Support — CC + utility
  // Fighters
  ['cici',            ['mastodon', 'speed_specialist']],       // Fighter — balanced tanky + agile
  ['lukas',           ['mastodon', 'berserker']],              // Fighter — high dmg frontliner, sustain
  ['yin',             ['stunner', 'prey_hunter']],             // Fighter — 1v1 isolation trap, catch-fighter
  // Assassins
  ['nolan',           ['speed_specialist', 'sniper']],         // Assassin — extreme mobility, burst burst
  ['zetian',          ['sniper', 'prey_hunter']],              // Assassin/Mage — magic burst, cleanup
  // Mages
  ['novaria',         ['dps_mage', 'control_mage']],           // Mage — bouncing orbs = DPS + zone control
  ['valentina',       ['explosive_mage', 'control_mage']],     // Mage — copies ults = burst + control
  ['obsidia',         ['skill_marksman', 'prey_hunter']],      // Marksman — Finisher/Damage, Gold Lane
];

// ─── Lookup map (normalized name → archetypes) ────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const _LOOKUP = new Map<string, PlaystyleArchetype[]>(
  HERO_PLAYSTYLES_RAW.map(([k, v]) => [normalize(k), v])
);

/**
 * Return playstyle archetypes for a hero by name.
 * Name matching is fuzzy: lowercase, strips all punctuation/spaces.
 */
export function getPlaystyles(heroName: string): PlaystyleArchetype[] {
  return _LOOKUP.get(normalize(heroName)) ?? [];
}

// ─── Archetype counter bonus ──────────────────────────────────────────────────
//
// Used in draftEngine.calculateCounterScore() as an additive signal.
// Returns 0–10: how well this hero's playstyle counters the enemy pool.

export function playstyleCounterScore(heroName: string, enemyNames: string[]): number {
  if (enemyNames.length === 0) return 5;

  const heroArchetypes = getPlaystyles(heroName);
  if (heroArchetypes.length === 0) return 5;

  let score = 0;
  let maxPossible = 0;

  for (const enemyName of enemyNames) {
    const enemyArchetypes = getPlaystyles(enemyName);
    if (enemyArchetypes.length === 0) continue;

    for (const ha of heroArchetypes) {
      const counters   = PLAYSTYLE_COUNTERS[ha]      ?? [];
      const counteredBy = PLAYSTYLE_COUNTERED_BY[ha] ?? [];
      for (const ea of enemyArchetypes) {
        if (counters.includes(ea))    score += 2;
        if (counteredBy.includes(ea)) score -= 1.5;
      }
    }
    maxPossible += heroArchetypes.length * 2;
  }

  if (maxPossible === 0) return 5;
  // Normalise to 0–10 centred at 5
  const raw = score / maxPossible;          // -0.75 to +1.0
  return Math.max(0, Math.min(10, 5 + raw * 7));
}

/**
 * Returns a short human-readable hint about which playstyle archetypes
 * make this hero good or risky against the given enemy pool.
 */
export function buildPlaystyleHint(heroName: string, enemyNames: string[]): string | null {
  const heroArchetypes = getPlaystyles(heroName);
  if (heroArchetypes.length === 0) return null;

  const countered: string[] = [];
  const risky: string[] = [];

  for (const enemyName of enemyNames) {
    const enemyArchetypes = getPlaystyles(enemyName);
    for (const ha of heroArchetypes) {
      const counters    = PLAYSTYLE_COUNTERS[ha]     ?? [];
      const counteredBy = PLAYSTYLE_COUNTERED_BY[ha] ?? [];
      const matchedCounter   = enemyArchetypes.filter((ea) => counters.includes(ea));
      const matchedCountered = enemyArchetypes.filter((ea) => counteredBy.includes(ea));
      if (matchedCounter.length)   countered.push(`${PLAYSTYLE_LABEL[ha]} vs ${enemyName}`);
      if (matchedCountered.length) risky.push(`${enemyName}'s ${matchedCountered.map((e) => PLAYSTYLE_LABEL[e]).join('/')} pressures ${PLAYSTYLE_LABEL[ha]}`);
    }
  }

  if (countered.length > 0) return countered[0];
  if (risky.length > 0)     return `⚠ ${risky[0]}`;
  return null;
}
