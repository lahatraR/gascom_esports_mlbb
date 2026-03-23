/**
 * Lane tier list — sourced from @gosugamersmlbb (March 2026 patch)
 *
 * Tier → meta score mapping:
 *   S+ = 10.0 (must-pick / permaban)
 *   S- = 8.5  (strong conditional)
 *   A+ = 7.0  (generally good)
 *   A  = 5.5  (solid choice)
 *   B  = 4.0  (situational)
 *   C  = 2.5  (needs buff)
 */

export type TierRank = 'S+' | 'S-' | 'A+' | 'A' | 'B' | 'C';
export type LaneKey  = 'EXP' | 'Gold' | 'Jungle' | 'Mid' | 'Roam';

export const TIER_META_SCORE: Record<TierRank, number> = {
  'S+': 10.0,
  'S-':  8.5,
  'A+':  7.0,
  'A':   5.5,
  'B':   4.0,
  'C':   2.5,
};

// ─── Per-lane tier lists (by hero name, case-sensitive) ──────────────────────

export const LANE_TIERS: Record<LaneKey, Partial<Record<TierRank, string[]>>> = {

  // ── EXP Lane (Solo/Fighter) ────────────────────────────────────────────────
  // Source: gosugamers tier list image — "Arlott, Yu Zhong, and Sora dominate"
  EXP: {
    'S+': ['Arlott', 'Yu Zhong', 'Sora', 'Thamuz', 'Joy', 'Fredrinn', 'Khaleed', 'Ruby'],
    'S-': ['Guinevere', 'Benedetta', 'Terizla', 'Masha'],
    'A+': ['Argus', 'Aldous', 'Paquito', 'Dyrroth', 'Chou', 'X.Borg'],
    'A':  ['Zilong', 'Balmond', 'Lapu-Lapu', 'Silvanna', 'Badang', 'Roger', 'Sun'],
    'B':  ['Esmeralda', 'Hilda', 'Aulus', 'Gatotkaca', 'Bane', 'Jawhead', 'Leomord'],
    'C':  ['Alucard', 'Alpha', 'Hanzo', 'Martis', 'Hylos', 'Cyclops'],
  },

  // ── Gold Lane (Marksman) ───────────────────────────────────────────────────
  // Source: gosugamers — "Yi Sun-Shin newly viable in gold lane"
  Gold: {
    'S+': ['Claude', 'Brody', 'Beatrix', 'Yi Sun-Shin'],
    'S-': ['Wanwan', 'Melissa', 'Irithel', 'Valentina', 'Granger'],
    'A+': ['Karrie', 'Natan', 'Moskov', 'Popol and Kupa', 'Kimmy', 'Clint', 'Miya'],
    'A':  ['Layla', 'Lesley', 'Hanabi', 'Bruno'],
    'B':  ['Ixia', 'Chang\'e', 'Zilong', 'Harley', 'Thamuz'],
    'C':  ['Alucard', 'Vexana', 'Selena'],
  },

  // ── Jungle ────────────────────────────────────────────────────────────────
  // Source: gosugamers — "Leomord, Fredrinn, and Suyou remain top jungle picks"
  Jungle: {
    'S+': ['Leomord', 'Fredrinn', 'Suyou', 'Julian', 'Karina', 'Aamon'],
    'S-': ['Ling', 'Fanny', 'Gusion', 'Benedetta', 'Lancelot', 'Hayabusa'],
    'A+': ['Yi Sun-Shin', 'Joy', 'Hanzo', 'Granger', 'Wanwan', 'Selena', 'Arlott'],
    'A':  ['Roger', 'Balmond', 'Jawhead', 'Harley', 'Aldous', 'Alucard'],
    'B':  ['Alpha', 'Sun', 'Bane', 'Argus', 'Natalia', 'Cyclops', 'Dyrroth', 'Silvanna', 'Badang', 'Masha'],
    'C':  ['Lolita', 'Gloo', 'Popol and Kupa', 'Uranus', 'Terizla', 'Hilda'],
  },

  // ── Mid Lane (Mage) ────────────────────────────────────────────────────────
  // Source: gosugamers — "Zhuxin, Kimmy, Yve are must-picks"
  Mid: {
    'S+': ['Zhuxin', 'Kimmy', 'Yve', 'Kagura', 'Lunox'],
    'S-': ['Luo Yi', 'Lylia', 'Cecilion', 'Valir', 'Eudora'],
    'A+': ['Xavier', 'Vale', 'Gord', 'Pharsa', 'Aurora', 'Alice', 'Harley', 'Odette'],
    'A':  ['Nana', 'Chang\'e', 'Vexana', 'Cyclops', 'Esmeralda', 'Zhask', 'Guinevere'],
    'B':  ['Kadita', 'Faramis', 'Selena'],
    'C':  [],
  },

  // ── Roam (Support/Tank) ───────────────────────────────────────────────────
  Roam: {
    'S+': ['Atlas', 'Khufra', 'Chou', 'Kaja', 'Mathilda'],
    'S-': ['Tigreal', 'Franco', 'Akai', 'Jawhead', 'Lolita'],
    'A+': ['Barats', 'Hylos', 'Grock', 'Carmilla', 'Estes', 'Angela'],
    'A':  ['Belerick', 'Gloo', 'Johnson', 'Faramis', 'Floryn'],
    'B':  ['Uranus', 'Terizla', 'Rafaela', 'Minotaur'],
    'C':  ['Bane', 'Layla'],
  },
};

// ─── Role → primary lane mapping ─────────────────────────────────────────────

const ROLE_TO_LANE: Record<string, LaneKey> = {
  Fighter:   'EXP',
  Marksman:  'Gold',
  Assassin:  'Jungle',
  Mage:      'Mid',
  Tank:      'Roam',
  Support:   'Roam',
};

// ─── Lookup: get tier meta score for a hero by name + roles ──────────────────

export function getHeroTierScore(heroName: string, roles: string[]): number {
  // Try primary role lane first, then all lanes
  const primaryRole = roles[0] ?? 'Fighter';
  const primaryLane = ROLE_TO_LANE[primaryRole] ?? 'EXP';

  const lanesToCheck: LaneKey[] = [
    primaryLane,
    ...(['EXP', 'Gold', 'Jungle', 'Mid', 'Roam'] as LaneKey[]).filter((l) => l !== primaryLane),
  ];

  for (const lane of lanesToCheck) {
    const tiers = LANE_TIERS[lane];
    for (const [tier, heroes] of Object.entries(tiers) as [TierRank, string[]][]) {
      if (heroes?.some((n) => n.toLowerCase() === heroName.toLowerCase())) {
        return TIER_META_SCORE[tier];
      }
    }
  }

  // Not in tier list — neutral score
  return 5.0;
}

// ─── Archetype affinity per hero ─────────────────────────────────────────────
// Each hero has one or more archetype tags indicating which draft style they fit.
// Used by archetypeEngine to detect team comp identity.

export type DraftArchetypeTag = 'poke' | 'engage' | 'protect' | 'split' | 'catch';

export const HERO_ARCHETYPE_TAGS: Record<string, DraftArchetypeTag[]> = {
  // ── Poke (consistent damage, long range, short cooldowns) ─────────────────
  // DPS/Control Mages + Crit/Skill Marksmen
  Yve:       ['poke'],
  Zhuxin:    ['poke'],
  Kimmy:     ['poke'],
  Gord:      ['poke'],
  Vale:      ['poke'],
  Xavier:    ['poke'],
  Pharsa:    ['poke'],
  Lunox:     ['poke'],
  Chang_e:   ['poke'],
  "Chang'e": ['poke'],
  Lesley:    ['poke'],
  Layla:     ['poke'],
  Moskov:    ['poke'],
  Clint:     ['poke'],
  Granger:   ['poke'],
  Hanabi:    ['poke'],
  Beatrix:   ['poke'],
  Odette:    ['poke'],
  Cecilion:  ['poke'],
  Lylia:     ['poke'],
  Miya:      ['poke'],
  Valir:     ['poke'],
  Zhask:     ['poke'],
  Bruno:     ['poke'],
  Irithel:   ['poke'],
  Melissa:   ['poke', 'protect'],

  // ── Engage (teamfight initiation, AoE CC, force fights) ──────────────────
  // Glorious Launchers + Mastodon fighters
  Atlas:     ['engage'],
  Khufra:    ['engage'],
  Tigreal:   ['engage'],
  Franco:    ['engage'],
  Akai:      ['engage'],
  Barats:    ['engage'],
  Belerick:  ['engage'],
  Grock:     ['engage'],
  Hylos:     ['engage'],
  Johnson:   ['engage'],
  Lolita:    ['engage'],
  Minotaur:  ['engage'],
  Gatotkaca: ['engage'],
  Chou:      ['engage', 'catch'],
  Jawhead:   ['engage', 'catch'],
  Thamuz:    ['engage'],
  Fredrinn:  ['engage'],
  Yu_Zhong:  ['engage'],
  'Yu Zhong': ['engage'],
  Arlott:    ['engage'],
  Martis:    ['engage'],
  Ruby:      ['engage', 'catch'],
  Paquito:   ['engage', 'catch'],
  Badang:    ['engage'],
  Silvanna:  ['engage', 'catch'],
  Guinevere: ['engage', 'catch'],

  // ── Protect (scaling carries + 2 defensive layers) ────────────────────────
  // Enchanters + Avant-gardes + scaling damage dealers
  Angela:    ['protect'],
  Estes:     ['protect'],
  Floryn:    ['protect'],
  Rafaela:   ['protect'],
  Carmilla:  ['protect'],
  Mathilda:  ['protect'],
  Faramis:   ['protect'],
  Alice:     ['protect'],
  Uranus:    ['protect'],
  Esmeralda: ['protect'],
  Claude:    ['protect'],
  Brody:     ['protect'],
  Wanwan:    ['protect'],
  Diggie:    ['protect'],
  Natan:     ['protect', 'poke'],

  // ── Split (map pressure, agile heroes, objective control) ─────────────────
  // Speed Specialists + Berserkers + Skill Marksmen with global presence
  Ling:      ['split'],
  Fanny:     ['split'],
  Hayabusa:  ['split'],
  Alucard:   ['split'],
  'Yi Sun-Shin': ['split'],
  Leomord:   ['split'],
  Benedetta: ['split'],
  Zilong:    ['split'],
  Khaleed:   ['split', 'engage'],
  Sora:      ['split', 'engage'],
  Roger:     ['split'],
  Argus:     ['split'],
  Joy:       ['split', 'catch'],
  Masha:     ['split'],
  Lancelot:  ['split', 'catch'],

  // ── Catch (single-target CC, burst, hard to escape) ──────────────────────
  // Prey Hunters + Snipers + Initiators with lockdown
  Kaja:      ['catch'],
  Suyou:     ['catch'],
  Gusion:    ['catch'],
  Aamon:     ['catch'],
  Selena:    ['catch'],
  Karina:    ['catch'],
  Julian:    ['catch'],
  Harley:    ['catch'],
  Natalia:   ['catch'],
  Helcurt:   ['catch'],
  Hanzo:     ['catch'],
  Kagura:    ['catch'],
  Luo_Yi:    ['catch', 'engage'],
  'Luo Yi':  ['catch', 'engage'],
  Gloo:      ['catch'],
  Nana:      ['catch'],
  Saber:     ['catch'],
};

/** Get archetype tags for a hero by name */
export function getHeroArchetypeTags(heroName: string): DraftArchetypeTag[] {
  // Normalize name: replace spaces/dots with underscore, try exact then normalized
  const exact = HERO_ARCHETYPE_TAGS[heroName];
  if (exact) return exact;

  const normalized = heroName.replace(/[\s.]/g, '_');
  return HERO_ARCHETYPE_TAGS[normalized] ?? [];
}
