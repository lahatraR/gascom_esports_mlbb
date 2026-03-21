// ─── Draft Archetype System ───────────────────────────────────────────────────

export type DraftArchetype = 'poke' | 'engage' | 'protect' | 'split' | 'catch';

export interface ArchetypeResult {
  primary:    DraftArchetype;
  secondary:  DraftArchetype | null;   // present when runner-up score > 15%
  confidence: number;                  // 20–95
  scores:     Record<DraftArchetype, number>; // each 0–100, sum ≈ 100
}

// ─── Hero Data (unified, enriched from API + static fallback) ────────────────

export interface HeroData {
  id: number;
  name: string;
  roles: string[];      // ["Tank", "Support"]
  image: string;        // URL for display

  // Combat attributes (0–10)
  early: number;
  mid: number;
  late: number;
  damage: number;
  tankiness: number;
  cc: number;           // crowd control
  mobility: number;
  push: number;         // siege/push
  pressure: number;     // map pressure

  // Relationships (hero IDs)
  counters: number[];    // this hero counters these enemies
  counteredBy: number[]; // these heroes counter this hero
  synergies: number[];   // synergy partners

  // Meta rates (0–1 decimals)
  winRate: number;
  pickRate: number;
  banRate: number;
}

// ─── Draft Structure ─────────────────────────────────────────────────────────

export type DraftAction = 'ban' | 'pick';
export type DraftTeam = 'blue' | 'red';
export type DraftPhase = 'ban1' | 'pick1' | 'ban2' | 'pick2';
export type GameMode = 'ranked' | 'tournament' | 'custom';

export interface DraftStep {
  step: number;       // 0-based index 0–19
  team: DraftTeam;
  action: DraftAction;
  phase: DraftPhase;
  label: string;      // e.g. "Blue Ban 1"
}

// Full 5v5 draft sequence (5 bans + 5 picks each = 20 total)
export const DRAFT_SEQUENCE: DraftStep[] = [
  // Ban Phase 1 (6 steps)
  { step: 0,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 1'  },
  { step: 1,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 1'   },
  { step: 2,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 2'  },
  { step: 3,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 2'   },
  { step: 4,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 3'  },
  { step: 5,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 3'   },
  // Pick Phase 1 (4 steps)
  { step: 6,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 1' },
  { step: 7,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 1'  },
  { step: 8,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 2'  },
  { step: 9,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 2' },
  // Ban Phase 2 (4 steps)
  { step: 10, team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 4'  },
  { step: 11, team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 4'   },
  { step: 12, team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 5'  },
  { step: 13, team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 5'   },
  // Pick Phase 2 (6 steps)
  { step: 14, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 3'  },
  { step: 15, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 3' },
  { step: 16, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 4' },
  { step: 17, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 4'  },
  { step: 18, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 5'  },
  { step: 19, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 5' },
];

// ─── Counter Composition types ────────────────────────────────────────────────

export type LaneRole = 'Gold' | 'Jungle' | 'Mid' | 'EXP' | 'Roam';

export interface CompositionSlot {
  hero:      HeroData;
  laneRole:  LaneRole;
  reason:    string;
}

export interface CounterComposition {
  archetype:     DraftArchetype;
  slots:         CompositionSlot[];  // 5 slots
  winCondition:  string;
  counterReason: string;
  strength:      number;  // 0–100
}

export interface EnemyCompAnalysis {
  predictedArchetype: DraftArchetype;
  confidence:         number;   // 0–100
  reasoning:          string;   // e.g. "Fanny + Ling → high burst + mobile CC"
  counterComps:       CounterComposition[];  // top 2 counter archetypes
}

// ─── Analysis types ──────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  counter: number;
  synergy: number;
  meta: number;
  phase: number;
  pressure: number;
  total: number;
}

export interface DraftSuggestion {
  hero: HeroData;
  score: number;           // 0–100 normalized
  breakdown: ScoreBreakdown;
  reason: string;
}

export interface EnemyPrediction {
  hero: HeroData;
  probability: number;     // 0–100 %
  reasons: string[];
}

export interface TeamMetrics {
  early: number;      // 0–10
  mid: number;
  late: number;
  damage: number;
  tankiness: number;
  cc: number;
  push: number;
}

export interface DraftAnalysis {
  blueMetrics: TeamMetrics;
  redMetrics: TeamMetrics;
  counterIndex: number;    // -10 to +10 (positive = blue advantage)
  blueRating: number;      // 0–10 overall lineup strength
  redRating: number;
  winProbability: number;  // 0–100 (blue win %)
  suggestions: DraftSuggestion[];
  enemyPredictions: EnemyPrediction[];
  blueArchetype: ArchetypeResult | null;
  redArchetype:  ArchetypeResult | null;
  enemyCompAnalysis: EnemyCompAnalysis | null;
}
