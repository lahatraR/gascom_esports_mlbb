import type { DraftArchetype } from '@/types/draft';

// ─── Data types ───────────────────────────────────────────────────────────────

export interface LaneOption {
  primary: string;
  backup:  string[];
  role:    string;    // e.g. "Tank Initiateur"
  why:     string;    // one line: why this hero in this comp
}

export interface BanPriority {
  heroName: string;
  priority: 'mandatory' | 'high' | 'situational';
  reason:   string;
}

export interface DraftTemplate {
  id:          string;
  archetype:   DraftArchetype;
  name:        string;    // e.g. "Full Engage"
  tagline:     string;    // 1-line sell
  description: string;    // paragraph

  lanes: {
    exp:    LaneOption;
    jungle: LaneOption;
    mid:    LaneOption;
    gold:   LaneOption;
    roam:   LaneOption;
  };

  bans: BanPriority[];

  winCondition: string;

  phaseRating: { early: number; mid: number; late: number }; // 1–5
  phaseNotes:  { early: string; mid: string; late: string };

  tips: string[];
}

// ─── Template data ────────────────────────────────────────────────────────────

export const DRAFT_TEMPLATES: DraftTemplate[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // 1. FULL ENGAGE
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'full-engage',
    archetype: 'engage',
    name: 'Full Engage',
    tagline: 'Forcer le teamfight, avaler l\'ennemi',
    description:
      'Composition centrée sur l\'initiation de masse. Atlas ou Tigreal ouvre le combat par un CC AoE, ' +
      'Fredrinn plonge en première ligne, Arlott punit les cibles engagées, Yve verrouille la zone et ' +
      'Beatrix nettoie depuis une position sécurisée. La clé : forcer les combats dans des zones étroites ' +
      '(base ennemie, couloirs de jungle) où votre CC de masse est insurmontable.',

    lanes: {
      exp: {
        primary: 'Arlott',
        backup:  ['Yu Zhong', 'Thamuz'],
        role:    'Fighter dive / damage',
        why:     'Burst ciblé post-CC, peut finir les cibles à faible vie que l\'engage a isolées.',
      },
      jungle: {
        primary: 'Fredrinn',
        backup:  ['Leomord', 'Barats'],
        role:    'Tank jungler / initiateur secondaire',
        why:     'Absorbe les dégâts en première ligne, ult qui explose en teamfight après accumulation de charges.',
      },
      mid: {
        primary: 'Yve',
        backup:  ['Kagura', 'Lunox'],
        role:    'Mage CC zone',
        why:     'Zone de ralentissement + stun pendant l\'engage, force les ennemis dans le CC d\'Atlas.',
      },
      gold: {
        primary: 'Beatrix',
        backup:  ['Brody', 'Claude'],
        role:    'Marksman DPS / cleaner',
        why:     'Dégâts soutenus depuis la ligne arrière, profite du CC massif pour placer tous ses bullets.',
      },
      roam: {
        primary: 'Atlas',
        backup:  ['Tigreal', 'Khufra'],
        role:    'Hard initiateur tank',
        why:     'Fatal Links → CC simultané sur 3-5 ennemis. Le cœur de tout le gameplan.',
      },
    },

    bans: [
      {
        heroName: 'Diggie',
        priority: 'mandatory',
        reason:   'Son ultime annule TOUS nos CC pendant le teamfight — rend notre engage totalement inutile.',
      },
      {
        heroName: 'Luo Yi',
        priority: 'mandatory',
        reason:   'Son portail téléporte toute l\'équipe ennemie hors de notre Fatal Links en un instant.',
      },
      {
        heroName: 'Angela',
        priority: 'high',
        reason:   'Se lie au carry ennemi → shield + heal massif qui peut survive notre burst post-engage.',
      },
      {
        heroName: 'Chou',
        priority: 'high',
        reason:   'Peut kickback notre initiateur (Atlas/Tigreal) et retourner l\'engage contre nous.',
      },
      {
        heroName: 'Paquito',
        priority: 'situational',
        reason:   'Immunité aux CC pendant ses combos — peut ignorer notre engage et tuer notre carry.',
      },
    ],

    winCondition:
      'Démarrer Atlas à lvl 4 dès que possible. Rotations groupées : toujours engager à 4-5. ' +
      'Target priority : éliminer d\'abord le support ou le mage ennemi pour couper leur sustain. ' +
      'Yve place sa zone AVANT l\'Atlas ult pour maximiser la durée totale du CC.',

    phaseRating: { early: 2, mid: 5, late: 4 },
    phaseNotes: {
      early: 'Difficile — Fredrinn et Atlas ont besoin de niveaux. Éviter les confrontations avant lvl 4.',
      mid:   'Pic de puissance absolu. Chercher les teamfights groupés autour du Lord et des tours.',
      late:  'Toujours dominants mais l\'ennemi peut avoir des itemisations anti-CC (Immortality, etc.).',
    },

    tips: [
      'Ne jamais engager à 3 ou moins — l\'engage full Engage nécessite que TOUTE l\'équipe soit là.',
      'Watcher sur la minimap : si l\'ennemi a Diggie, ulti d\'Atlas APRÈS l\'ult Diggie pour le waste.',
      'Après Fatal Links, Yve place immédiatement sa zone au centre du groupe CC — durée combinée devastatrice.',
      'Beatrix : utilisez Wesker (shotgun) dans le CC groupé, Renner (sniper) pour finir les fuyards.',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 2. POKE & SIEGE
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'poke-siege',
    archetype: 'poke',
    name: 'Poke & Siège',
    tagline: 'Harceler à distance, push sans engagement',
    description:
      'Composition axée sur le dégât à longue portée et la domination des zones ouvertes. ' +
      'Pharsa poke les tours depuis derrière les murs, Claude et Brody maintiennent la pression ' +
      'sur la Gold lane, Selena rotat pour pick des kills isolés, et Hylos absorbe les dégâts entrants. ' +
      'On ne cherche jamais le 5v5 direct — on affaiblit l\'équipe ennemie jusqu\'à ce qu\'elle soit ' +
      'trop basse pour défendre ses objectifs.',

    lanes: {
      exp: {
        primary: 'Esmeralda',
        backup:  ['Bane', 'Uranus'],
        role:    'Tank sustain solo',
        why:     'Se sustain toute seule, libère les supports pour le carry. Peut poke avec ses compétences.',
      },
      jungle: {
        primary: 'Selena',
        backup:  ['Karina', 'Joy'],
        role:    'Mage assassin rotat / pick-off',
        why:     'Arrow stun longue portée pour pick des cibles isolées sans risquer un engage 5v5.',
      },
      mid: {
        primary: 'Pharsa',
        backup:  ['Yve', 'Vale'],
        role:    'Mage poke ultra portée',
        why:     'Ult à zone massive peut poke depuis derrière les murs — idéal pour harceler tours et lord.',
      },
      gold: {
        primary: 'Claude',
        backup:  ['Brody', 'Natan'],
        role:    'Marksman DPS + mobilité',
        why:     'Portée de base et Dexter lui permettent de poke depuis une distance très sécurisée.',
      },
      roam: {
        primary: 'Hylos',
        backup:  ['Lolita', 'Carmilla'],
        role:    'Tank engage défensif',
        why:     'Lolita bloque les projectiles ennemis, protège nos fragiles mages de leur contre-poke.',
      },
    },

    bans: [
      {
        heroName: 'Lancelot',
        priority: 'mandatory',
        reason:   'Dive instantanée sur nos mages fragiles — une mort de Pharsa coupe tout notre poke.',
      },
      {
        heroName: 'Fanny',
        priority: 'mandatory',
        reason:   'Immunité au poke grâce à sa mobilité câbles — peut dive et tuer nos carries sans risque.',
      },
      {
        heroName: 'Khufra',
        priority: 'high',
        reason:   'Bouncing Ball bloque les dashes de Claude et de Selena, limitant notre mobilité.',
      },
      {
        heroName: 'Benedetta',
        priority: 'high',
        reason:   'Shield absorbe notre poke et peut flanquer nos mages depuis des angles inattendus.',
      },
      {
        heroName: 'Atlas',
        priority: 'situational',
        reason:   'Fatal Links dans une zone ouverte peut catch tout notre backline en même temps.',
      },
    ],

    winCondition:
      'Ne JAMAIS chercher le fight 5v5 — c\'est perdu d\'avance. Pharsa ult sur la tour adversaire ' +
      'pendant que Claude poke les healers. Selena arrow pour garder le lord sécurisé. ' +
      'Pousser lane par lane en gardant toujours la distance de sécurité maximale. ' +
      'Gagner par épuisement des ressources ennemies (potions, heals, lives).',

    phaseRating: { early: 3, mid: 5, late: 3 },
    phaseNotes: {
      early: 'Correct — pression de lane dès le départ avec Pharsa et Claude, mais pas de kills facilement.',
      mid:   'Apogée du poke. Prendre les objectifs à distance de sécurité avec Pharsa ult sur Lord.',
      late:  'Risqué si l\'ennemi a un front-line capable de drive à travers notre poke sans mourir.',
    },

    tips: [
      'Placer des wards dans les buissons autour du Lord AVANT de poke — Selena peut arrow les approches.',
      'Claude doit garder son Dexter pour escape. Ne jamais utiliser la compétence 2 agressivement.',
      'Pharsa ult est interruptible — Esmeralda doit être en position pour shield avant que Pharsa ulte.',
      'Si l\'ennemi engage malgré tout : Lolita ult IMMÉDIATEMENT pour bloquer les CC projectiles entrants.',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3. PROTECT THE CARRY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'protect-carry',
    archetype: 'protect',
    name: 'Protect the Carry',
    tagline: 'Scaler jusqu\'en late game, devenir inarrêtable',
    description:
      'Composition construite autour d\'un hyper carry protégé par deux couches de sustain. ' +
      'Angela se lie à Melissa mi-partie et forme un duo quasi-immortel. Cecilion scale avec ses stacks ' +
      'pour devenir le second carry en late. Fredrinn sécurise le jungle et protège les flancs. ' +
      'La clé : tenir jusqu\'au mid-game et ne JAMAIS laisser mourir Melissa.',

    lanes: {
      exp: {
        primary: 'Yu Zhong',
        backup:  ['Thamuz', 'Guinevere'],
        role:    'Fighter self-sustain solo',
        why:     'Sustain autonome en EXP, libère Angela pour accompagner Melissa. Front-line secondaire.',
      },
      jungle: {
        primary: 'Fredrinn',
        backup:  ['Barats', 'Hilda'],
        role:    'Tank jungler protecteur de flanc',
        why:     'Durable sans heal, sécurise le gold de Melissa et protège les approches de flanc.',
      },
      mid: {
        primary: 'Cecilion',
        backup:  ['Odette', 'Chang\'e'],
        role:    'Mage scaling late / second carry',
        why:     'Plus Cecilion stack sa compétence 1, plus son DPS explose en late. Semi-safe en mid.',
      },
      gold: {
        primary: 'Melissa',
        backup:  ['Layla', 'Wanwan'],
        role:    'Hyper carry marksman',
        why:     'Sa poupée Muddles bloque les engages directs. Combinée avec Angela = quasi-immortelle.',
      },
      roam: {
        primary: 'Angela',
        backup:  ['Estes', 'Floryn'],
        role:    'Support ult-carry / bouclier vivant',
        why:     'Se lie à Melissa : shield continu + heal + CC. Rend le duo impossible à éliminer.',
      },
    },

    bans: [
      {
        heroName: 'Saber',
        priority: 'mandatory',
        reason:   'Ultime qui one-cible plonge directement sur Melissa, contourne la poupée et le shield Angela.',
      },
      {
        heroName: 'Chou',
        priority: 'mandatory',
        reason:   'Knockback sur Angela AVANT qu\'elle lance son ult — coupe la protection de Melissa.',
      },
      {
        heroName: 'Selena',
        priority: 'high',
        reason:   'Chain stun à longue portée peut CC Melissa avant qu\'Angela réagisse.',
      },
      {
        heroName: 'Gusion',
        priority: 'high',
        reason:   'Mobilité extrême pour contourner la poupée et burst Melissa avant le shield Angela.',
      },
      {
        heroName: 'Ling',
        priority: 'situational',
        reason:   'Peut planer au-dessus de la poupée Melissa et engage depuis des angles non couverts.',
      },
    ],

    winCondition:
      'Survivre l\'early game à tout prix — ne pas risquer Melissa inutilement. ' +
      'À partir du mid-game : Angela ult sur Melissa à chaque teamfight. ' +
      'Yu Zhong et Fredrinn absorbent les engages entrants. Cecilion poket de loin. ' +
      'En late : Melissa inarrêtable. Pousser une lane dominante et ne JAMAIS split les deux carries.',

    phaseRating: { early: 2, mid: 4, late: 5 },
    phaseNotes: {
      early: 'Très fragile — Melissa doit farmer safe. Fredrinn rush jungle gold pour tenir les flancs.',
      mid:   'Angela + Melissa actifs = teamfights dominants si l\'ennemi n\'a pas de hard dive.',
      late:  'Quasi-invincible. Cecilion stacks + Melissa full build = duo impossible à stopper.',
    },

    tips: [
      'Angela ne doit JAMAIS mourir — elle est la clé du duo. Toujours garder une sortie.',
      'Melissa : ne jamais s\'avancer sans Angela à portée de son ult (1500 range).',
      'En cas de pression early : swap Angela sur Fredrinn au lieu de Melissa pour garder les flancs.',
      'Cecilion doit stack sa compétence 1 en laning safe — 10 stacks avant le premier teamfight.',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4. SPLIT PUSH
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'split-push',
    archetype: 'split',
    name: 'Split Push Global',
    tagline: 'Diviser les ressources, créer des choix impossibles',
    description:
      'Composition qui force l\'ennemi à faire des choix impossibles : répondre à Masha en EXP ' +
      'ou défendre le Lord contre 4 joueurs. Yi Sun-Shin voit toute la map avec son ult et peut ' +
      'aider n\'importe quelle lane en crise. Diggie permet au 4v5 de survivre sans lui grâce à son ult. ' +
      'Le but n\'est pas de kill, c\'est de prendre des tours pendant que l\'ennemi chase dans le vide.',

    lanes: {
      exp: {
        primary: 'Masha',
        backup:  ['Joy', 'Guinevere'],
        role:    'Split pusher hyper agressif',
        why:     'Ses 3 barres de vie lui permettent de tenir 1v2 le temps que l\'équipe capitalise ailleurs.',
      },
      jungle: {
        primary: 'Yi Sun-Shin',
        backup:  ['Lancelot', 'Benedetta'],
        role:    'Semi-carry global / vision',
        why:     'Ult global révèle TOUTE la map — peut rotate sur n\'importe quelle crisis en 2 secondes.',
      },
      mid: {
        primary: 'Diggie',
        backup:  ['Harith', 'Lunox'],
        role:    'Anti-CC enabler / game pace',
        why:     'Son ult Time Journey enlève tous les CC de l\'équipe → le 4v5 peut fight pendant Masha split.',
      },
      gold: {
        primary: 'Brody',
        backup:  ['Bruno', 'Kimmy'],
        role:    'Marksman poke / lane holder',
        why:     'Peut hold la Gold lane seul grâce à ses dégâts à distance et son CC de base.',
      },
      roam: {
        primary: 'Floryn',
        backup:  ['Mathilda', 'Faramis'],
        role:    'Support heal global / enabler',
        why:     'Heal passif partout sur la map. Ult peut sauver Masha en split depuis l\'autre côté.',
      },
    },

    bans: [
      {
        heroName: 'Franco',
        priority: 'mandatory',
        reason:   'Hook = mort instantanée pour Masha en split. Un seul hook bien placé rend le split impossible.',
      },
      {
        heroName: 'Jawhead',
        priority: 'mandatory',
        reason:   'Throw Masha dans toute l\'équipe ennemie — annule complètement la pression de split.',
      },
      {
        heroName: 'Nana',
        priority: 'high',
        reason:   'Molina peut transform Masha en chat → rend la fuite ou le push impossible pendant 2 secondes.',
      },
      {
        heroName: 'Atlas',
        priority: 'high',
        reason:   'Fatal Links peut attraper Masha même en split si Atlas rotat secrètement sur la lane.',
      },
      {
        heroName: 'Chou',
        priority: 'situational',
        reason:   'Peut interrompre Yi Sun-Shin pendant son ult global et le forcer à cancel la rotation.',
      },
    ],

    winCondition:
      'Masha push EXP dès que possible. Si 3+ ennemis viennent : Yi Sun-Shin check minimap, ' +
      'Diggie ult ready → l\'équipe engage 4v2 ailleurs. Si personne ne vient : Masha prend la tour. ' +
      'Never stop split — la pression permanente est ce qui gagne la game, pas les kills.',

    phaseRating: { early: 4, mid: 5, late: 3 },
    phaseNotes: {
      early: 'Très bonne pression individuelle — Masha et Yi Sun-Shin dominent leurs lanes dès le début.',
      mid:   'Pic du split push. L\'ennemi doit choisir entre répondre ou perdre une tour à chaque minute.',
      late:  'Moins efficace si l\'ennemi full-items et peut 5v4 rapidement. Rush le lord avant ce stade.',
    },

    tips: [
      'Masha : toujours garder un tiers de vie pour escape. Jamais de fights directs — elle est une tour, pas un fighter.',
      'Yi Sun-Shin : placez des wards dans les buissons adverses AVANT de lancer l\'ult global pour maximiser la vision.',
      'Diggie : timed bomb en advance à chaque approach ennemi. Utilisez le slow dès que Masha est en danger.',
      'Brody : ne jamais quitter Gold lane sauf pour le Lord. Votre lane doit pousser constamment.',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 5. CATCH & BURST
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'catch-burst',
    archetype: 'catch',
    name: 'Catch & Burst',
    tagline: 'Isoler une cible, burst instantané, repeat',
    description:
      'Composition basée sur l\'élimination rapide de cibles isolées. Franco hook depuis les buissons ' +
      'ou Selena arrow longue portée → Chou kickback pour repositionner → Gusion burst en 1.5 seconde → ' +
      'Granger execute. On ne cherche pas le 5v5 — on supprime un ennemi toutes les 15 secondes ' +
      'jusqu\'à ce que l\'ennemi n\'ait plus les ressources pour défendre.',

    lanes: {
      exp: {
        primary: 'Chou',
        backup:  ['Paquito', 'Silvanna'],
        role:    'Fighter catch / repositionneur',
        why:     'Shunpo + kick peut attraper une cible et l\'envoyer en équipe. CC secondaire post-Selena.',
      },
      jungle: {
        primary: 'Gusion',
        backup:  ['Ling', 'Lancelot'],
        role:    'Assassin burst / carry',
        why:     'Dagger combo burst → élimination d\'une cible stun-lock en moins de 2 secondes.',
      },
      mid: {
        primary: 'Selena',
        backup:  ['Nana', 'Valir'],
        role:    'Mage catch longue portée',
        why:     'Arrow + Abyssal trap → chain stun depuis une distance sécurisée pour setup Gusion.',
      },
      gold: {
        primary: 'Granger',
        backup:  ['Wanwan', 'Karrie'],
        role:    'Marksman burst / execute',
        why:     'Bullets chargées + ult exécution sur la cible isolée. Nettoie les fuyards low HP.',
      },
      roam: {
        primary: 'Franco',
        backup:  ['Khufra', 'Jawhead'],
        role:    'Hard catch initiateur',
        why:     'Hook depuis les buissons = catch garanti. Frostbite immobilise pour Selena ou Gusion.',
      },
    },

    bans: [
      {
        heroName: 'Lolita',
        priority: 'mandatory',
        reason:   'Son shield bloque les stuns de Selena et le hook de Franco — rend notre catch impossible.',
      },
      {
        heroName: 'Diggie',
        priority: 'mandatory',
        reason:   'Ult Time Journey annule tous nos CC → la cible catchée peut s\'échapper ou résister.',
      },
      {
        heroName: 'Estes',
        priority: 'high',
        reason:   'Heal massif sur la cible catchée peut la faire survive notre combo burst complet.',
      },
      {
        heroName: 'Natalia',
        priority: 'high',
        reason:   'Peut contre-pick Gusion dans les buissons et silent nos assassins avant leur combo.',
      },
      {
        heroName: 'Chou',
        priority: 'situational',
        reason:   'Si l\'ennemi joue Chou, il peut kickback Franco pendant son hook et retourner le catch.',
      },
    ],

    winCondition:
      'Rotation toutes les 20 secondes : Franco check buissons ennemis. Selena arrow setup. ' +
      'Dès qu\'une cible est isolée → Franco hook ou Selena stun → Chou repositionne → ' +
      'Gusion burst → Granger execute. Target priority : support ennemi en premier, ' +
      'puis mage, puis carry. Sans healer ennemi, les fights sont devenus impossibles à survivre.',

    phaseRating: { early: 4, mid: 5, late: 3 },
    phaseNotes: {
      early: 'Franco + Selena peuvent get des kills dès lvl 2-3 dans la jungle enemy.',
      mid:   'Rotation optimale. Chaque catch crée un avantage gold / objectif immédiat.',
      late:  'Risqué si l\'ennemi a des Estes ou Angela qui rendent le burst insuffisant.',
    },

    tips: [
      'Placez des wards dans les buissons latéraux AVANT que Franco tente un hook. Vision = catch garanti.',
      'Selena : arrow AVANT que la cible soit dans les buissons. Plus la flèche est loin, plus le stun est long.',
      'Gusion : ne jamais utiliser le combo complet sur une cible non-CC — garder les daggers pour escape.',
      'En late : si leur carry a Angela → switch target priority sur leur fighter ou tank pour forcer des 4v5.',
    ],
  },
];
