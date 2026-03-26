/**
 * Battle Spell Recommendations per Hero
 * ──────────────────────────────────────
 * In MLBB the battle spell IS part of the hero's execution kit.
 * Minotaur without Flash is a fundamentally different (weaker) hero.
 * These are not preferences — they are execution requirements for the meta kit.
 */

export interface BattleSpellRec {
  primary:    string;       // The required spell for optimal execution
  secondary?: string;       // Alternative if primary is taken by teammate
  note:       string;       // French: WHY this spell, not just what
}

// ─── Per-hero recommendations ────────────────────────────────────────────────
// Only heroes where the battle spell meaningfully changes execution are listed.
// Heroes without a strong opinion → default ('Vengeance' for tanks, 'Execute' for carries)

export const HERO_BATTLE_SPELLS: Record<string, BattleSpellRec> = {

  // ── Tanks / Initiators ──────────────────────────────────────────────────────
  Minotaur: {
    primary:   'Flicker',
    note:      'Obligatoire — Flicker pendant l\'ultime = stun AoE surprise depuis les buissons. Sans Flicker, l\'ennemi peut simplement reculer hors de portée.',
  },
  Atlas: {
    primary:   'Flicker',
    note:      'Dive engage depuis distance — S3 Annihilate après Flicker couvre toute la zone. Le seul moyen d\'initier sur une équipe bien positionnée.',
  },
  Khufra: {
    primary:   'Flicker',
    secondary: 'Arrival',
    note:      'Flicker pour engage surprise ; Arrival pour rotations rapides et contester objectives côté opposé.',
  },
  Tigreal: {
    primary:   'Flicker',
    note:      'S2 → Flicker → S3 = combo de CC instantané sans préavis. Sans Flicker, Tigreal est trop lisible.',
  },
  Akai: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'Flicker pendant le spin S2 pour changer la direction et piéger l\'ennemi contre un mur.',
  },
  Franco: {
    primary:   'Flicker',
    secondary: 'Sprint',
    note:      'Flicker pour raccourcir la distance avant le hook S1. Sprint si la cible fuit après le hook.',
  },
  Chou: {
    primary:   'Flicker',
    secondary: 'Sprint',
    note:      'Flicker + S1 pour ouvrir des angles d\'isolation impossibles. Sprint pour chaser une cible après le kick.',
  },
  Kaja: {
    primary:   'Flicker',
    secondary: 'Sprint',
    note:      'Flicker vers la cible pour forcer l\'ultime sans laisser le temps de réagir. Sprint si la cible a déjà un gap.',
  },
  Johnson: {
    primary:   'Arrival',
    secondary: 'Flicker',
    note:      'Arrival amplifie la portée de l\'ultime voiture — arrive de zones impossibles. Flicker si déjà dans une teamfight.',
  },
  Jawhead: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'Flicker + S1 pour projeter un ennemi dans une position isolée. Vengeance si rôle frontline tank.',
  },
  Lolita: {
    primary:   'Vengeance',
    secondary: 'Flicker',
    note:      'Vengeance pour tenir le front line en vie pendant le canal de S3. Flicker si comp engage agressive.',
  },
  Gloo: {
    primary:   'Flicker',
    secondary: 'Sprint',
    note:      'Flicker sur la cible depuis les buissons pour S2 stun pull instantané. Sprint si la cible est mobile.',
  },

  // ── Fighters ────────────────────────────────────────────────────────────────
  Cici: {
    primary:   'Flicker',
    note:      'Extended reach pour engage ou escape via dash combo.',
  },
  Yin: {
    primary:   'Flicker',
    secondary: 'Retribution',
    note:      'Flicker pour s\'assurer que la cible ne peut pas s\'échapper avant l\'ultime 1v1. Retribution si rôle jungler.',
  },
  Fredrinn: {
    primary:   'Retribution',
    secondary: 'Vengeance',
    note:      'Retribution pour le clear jungle rapide — Fredrinn a besoin d\'être ahead en objets. Vengeance si roam support.',
  },
  Paquito: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution pour jungle, Execute pour convertir le stun chain en kill garanti.',
  },
  Guinevere: {
    primary:   'Flicker',
    secondary: 'Execute',
    note:      'Flicker vers la cible pour opener S2 knockup → ultime. Execute pour finir les cibles basses HP.',
  },
  Khaleed: {
    primary:   'Retribution',
    secondary: 'Arrival',
    note:      'Retribution pour jungler ; Arrival pour les splits — arrive sur la side lane en secondes.',
  },
  Benedetta: {
    primary:   'Retribution',
    secondary: 'Sprint',
    note:      'Retribution jungler principal. Sprint si EXP lane pour la mobilité max.',
  },
  Arlott: {
    primary:   'Retribution',
    secondary: 'Vengeance',
    note:      'Retribution pour jungle priority. Vengeance si joue comme EXP front line tanky.',
  },
  Leomord: {
    primary:   'Retribution',
    note:      'Jungle principal — Retribution pour objectifs rapides + Nightmare Horse speed.',
  },
  Sora: {
    primary:   'Flicker',
    secondary: 'Retribution',
    note:      'Flicker pour engages surprise AoE. Retribution si rôle jungler.',
  },
  Joy: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution jungler. Execute pour chaîner les kills avec S2 reset.',
  },
  Martis: {
    primary:   'Retribution',
    secondary: 'Vengeance',
    note:      'Retribution pour jungle priorité. Vengeance si front line engage.',
  },

  // ── Assassins ───────────────────────────────────────────────────────────────
  Ling: {
    primary:   'Retribution',
    note:      'Retribution obligatoire — Ling sans jungle priorité ne scale pas. Toujours jungler.',
  },
  Fanny: {
    primary:   'Retribution',
    note:      'Retribution obligatoire — Fanny doit avoir les buffs pour les câbles. Toujours jungler.',
  },
  Gusion: {
    primary:   'Retribution',
    secondary: 'Flicker',
    note:      'Retribution si jungler. Flicker si mid/roam pour approche surprise combo.',
  },
  Lancelot: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution jungle. Execute pour garantir le kill sur les cibles basses HP.',
  },
  Karina: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution jungle. Execute pour confirmer le kill et reset S2 — la chaîne de kill dépend de ça.',
  },
  Aamon: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution jungle. Execute pour finir les cibles avec armor shred passif.',
  },
  Suyou: {
    primary:   'Retribution',
    note:      'Retribution jungle obligatoire — S+ jungler qui dépend des objets.',
  },
  Natalia: {
    primary:   'Retribution',
    secondary: 'Sprint',
    note:      'Retribution pour jungle. Sprint amplifie la mobilité pour les picks invisibles.',
  },
  Helcurt: {
    primary:   'Sprint',
    secondary: 'Execute',
    note:      'Sprint + silence S1 = cible qui ne peut ni dash ni s\'échapper. Execute pour garantir le kill.',
  },
  Hayabusa: {
    primary:   'Retribution',
    secondary: 'Sprint',
    note:      'Retribution jungle. Sprint pour les split push rotations ultra-rapides.',
  },

  // ── Mages ───────────────────────────────────────────────────────────────────
  Zetian: {
    primary:   'Arrival',
    secondary: 'Flicker',
    note:      'Arrival pour arriver sur le pick depuis n\'importe où — combine avec l\'ultime global. Flicker si engage frontline.',
  },
  Pharsa: {
    primary:   'Arrival',
    secondary: 'Flicker',
    note:      'Arrival pour join les fights via les airs — l\'ultime global + Arrival = présence partout. Flicker si besoin d\'escape.',
  },
  Lunox: {
    primary:   'Flicker',
    secondary: 'Execute',
    note:      'Flicker pour approcher en mode chaos (mono burst) ou pour fuir en mode lumière. Execute pour confirmer le kill.',
  },
  Vale: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'Flicker pour compléter le combo S1+S2+S3 dans le bon angle. Vengeance si rôle demi-frontline.',
  },
  Kagura: {
    primary:   'Flicker',
    note:      'Flicker + mécaniques parapluie = angles de CC impossibles à anticiper.',
  },
  Selena: {
    primary:   'Flicker',
    note:      'Flicker en forme Elven pour placer les flèches stun dans des positions surprises.',
  },
  Harley: {
    primary:   'Flicker',
    secondary: 'Retribution',
    note:      'Flicker pour combo burst instantané. Retribution si joué jungler.',
  },
  Alice: {
    primary:   'Vengeance',
    secondary: 'Flicker',
    note:      'Vengeance pour tankiness sustain en fight prolongé. Flicker pour engage depuis buissons.',
  },
  Cecilion: {
    primary:   'Flicker',
    secondary: 'Arrival',
    note:      'Flicker pour reposition safe. Arrival pour rotations et join global teamfights.',
  },
  Valir: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'Flicker pour push les ennemis dans des angles improbables avec S2. Vengeance si frontline.',
  },
  Yve: {
    primary:   'Flicker',
    secondary: 'Arrival',
    note:      'Flicker pour reposition pendant l\'ultime. Arrival pour join fights à distance.',
  },
  Zhuxin: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'S+ mid — Flicker pour engagement surprise ou escape. Vengeance si rôle semi-tank.',
  },

  // ── Marksmen ────────────────────────────────────────────────────────────────
  Claude: {
    primary:   'Retribution',
    secondary: 'Flicker',
    note:      'Retribution si gold lane avec jungle proximity. Flicker pour escape avec S2 Dexter position change.',
  },
  Brody: {
    primary:   'Flicker',
    secondary: 'Execute',
    note:      'Flicker pour maximize la portée de l\'ultime et pick off la bonne cible. Execute pour garantir le kill avec les stacks.',
  },
  Karrie: {
    primary:   'Flicker',
    secondary: 'Inspire',
    note:      'Flicker pour survive les dive assassins. Inspire pour amplifier les stacks de true damage passif.',
  },
  'Yi Sun-Shin': {
    primary:   'Arrival',
    secondary: 'Retribution',
    note:      'Arrival amplifie la présence globale — arrive partout après l\'ultime global. Retribution si rôle jungler principal.',
  },
  Wanwan: {
    primary:   'Sprint',
    secondary: 'Flicker',
    note:      'Sprint pendant l\'ultime = impossible à toucher tout en attaquant. Flicker si escape d\'urgence requis.',
  },
  Beatrix: {
    primary:   'Flicker',
    secondary: 'Inspire',
    note:      'Flicker pour repositionnement rapide entre les armes. Inspire pour augmenter le DPS Renner (sniper).',
  },
  Melissa: {
    primary:   'Flicker',
    secondary: 'Vengeance',
    note:      'Flicker pour se mettre hors de portée tout en gardant la cage S3 active. Vengeance si comp engage lourde.',
  },
  Obsidia: {
    primary:   'Flicker',
    secondary: 'Execute',
    note:      'Flicker pour reposition rapide sur les cibles. Execute pour confirmer les picks chaîne.',
  },
  Granger: {
    primary:   'Retribution',
    secondary: 'Execute',
    note:      'Retribution si joué jungler. Execute pour garantir le kill avec la dernière balle de rechargement.',
  },

  // ── Supports ────────────────────────────────────────────────────────────────
  Angela: {
    primary:   'Flicker',
    secondary: 'Arrival',
    note:      'Flicker pour attacher à un allié depuis une distance de sécurité. Arrival pour join les fights depuis la base.',
  },
  Mathilda: {
    primary:   'Flicker',
    secondary: 'Sprint',
    note:      'Flicker pour engage avec S3 ou pour rescue allié surprise. Sprint pour amplifier les rotations.',
  },
  Diggie: {
    primary:   'Flicker',
    secondary: 'Arrival',
    note:      'Flicker pour placer les eggs dans des positions clés. Arrival pour join fights depuis la base.',
  },
};

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function getBattleSpell(heroName: string): BattleSpellRec | null {
  return HERO_BATTLE_SPELLS[heroName] ?? null;
}
