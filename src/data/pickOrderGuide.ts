export type PickOrderTip = {
  title: string;
  advice: string[];
};

// Key: "blue-pick-1", "red-pick-1-2", "blue-pick-2-3", "red-pick-3", "red-pick-4", "blue-pick-4-5", "red-pick-5"
export const PICK_ORDER_TIPS: Record<string, PickOrderTip> = {
  'blue-pick-1': {
    title: '1er Pick Blue — Imposez votre gameplan',
    advice: [
      'Choisissez un héros méta de haute priorité ou très flexible.',
      "Ce pick doit être difficile à répondre pour l'ennemi.",
      'Évitez de révéler toute votre stratégie avec ce seul pick.',
    ],
  },
  'red-pick-1-2': {
    title: '1er & 2e Pick Red — Lisez ou restez flexible',
    advice: [
      "Option 1 : Lisez le gameplan ennemi et contrez-le directement.",
      'Option 2 : Deux picks flexibles pour rester adaptable.',
      "Vous avez l'avantage de répondre au premier pick blue.",
    ],
  },
  'blue-pick-2-3': {
    title: '2e & 3e Pick Blue — Suivez ou cachez votre stratégie',
    advice: [
      'Option 1 : Consolidez la synergie avec votre premier pick.',
      'Option 2 : Retardez la révélation de votre stratégie complète.',
      'Pensez déjà à votre position pick 4-5 (double contre possible).',
    ],
  },
  'red-pick-3': {
    title: '3e Pick Red — Position très forte',
    advice: [
      "Vous avez vu 3 picks ennemis : style de jeu, composition, gameplan.",
      'Vous pouvez changer de direction si vos deux premiers picks étaient flexibles.',
      "C'est le moment de verrouiller votre archetype ou d'opter pour un contre direct.",
    ],
  },
  'red-pick-4': {
    title: '4e Pick Red — Surprise ou flexibilité',
    advice: [
      'Option 1 : Un pick surprise pour piéger la lecture ennemie.',
      'Option 2 : Un pick flexible (commun avec les double fighters).',
    ],
  },
  'blue-pick-4-5': {
    title: '4e & 5e Pick Blue — Position de draft la plus forte',
    advice: [
      "Option 1 : Double contre sur l'archetype ennemi identifié.",
      'Option 2 : Forte synergie de finition.',
      'Attention : ces deux picks ne doivent pas être contrés par le même héros ennemi.',
    ],
  },
  'red-pick-5': {
    title: '5e Pick Red — Le clou du spectacle',
    advice: [
      'Option 1 : Un pick surprise / power pick inattendu.',
      'Option 2 : Un pick stable et sûr pour ne pas se faire contrer.',
    ],
  },
};

// Return the tip key for a given tournament step (0-indexed)
export function getTournamentPickTip(pickNumber: number, team: 'blue' | 'red'): string | null {
  // Tournament pick order: Blue1, Red1, Red2, Blue2, Blue3, Red3, (ban2), Red4, Blue4, Blue5, Red5
  // pickNumber = 1-indexed pick number within the sequence
  if (team === 'blue') {
    if (pickNumber === 1) return 'blue-pick-1';
    if (pickNumber === 2 || pickNumber === 3) return 'blue-pick-2-3';
    if (pickNumber === 4 || pickNumber === 5) return 'blue-pick-4-5';
  } else {
    if (pickNumber === 1 || pickNumber === 2) return 'red-pick-1-2';
    if (pickNumber === 3) return 'red-pick-3';
    if (pickNumber === 4) return 'red-pick-4';
    if (pickNumber === 5) return 'red-pick-5';
  }
  return null;
}
