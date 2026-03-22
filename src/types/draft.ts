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

  // Live phase win rates from Academy API time-win-rate endpoint (0–10 normalized)
  // Derived from actual match data: win_rate per time bracket, normalized (0.42→0, 0.58→10)
  phaseEarly: number;   // avg win rate in early game phase (0–~10min)
  phaseMid:   number;   // avg win rate in mid game phase (~10–18min)
  phaseLate:  number;   // avg win rate in late game phase (18+min)

  // Average win rate boost when playing with synergy partners (from /teammates)
  // 0 = no data, 5 = neutral, >5 = positive synergy → used for Team Coordination metric
  synergyBoost: number;  // 0–10
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

// ─── RANKED sequence — 20 steps ──────────────────────────────────────────────
// Ban Phase 1 (6) → Ban Phase 2 (4, immediately) → Pick Phase 1 (6) → Pick Phase 2 (4)
// Picks: 1B, 2R, 2B, 2R, 2B, 1R
export const RANKED_SEQUENCE: DraftStep[] = [
  // Ban Phase 1 — 3 per side (alternating)
  { step: 0,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 1'  },
  { step: 1,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 1'   },
  { step: 2,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 2'  },
  { step: 3,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 2'   },
  { step: 4,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 3'  },
  { step: 5,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 3'   },
  // Ban Phase 2 — 2 per side (immediately after, no picks between)
  { step: 6,  team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 4'  },
  { step: 7,  team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 4'   },
  { step: 8,  team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 5'  },
  { step: 9,  team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 5'   },
  // Pick Phase 1 — 1B, 2R, 2B, 1R
  { step: 10, team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 1' },
  { step: 11, team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 1'  },
  { step: 12, team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 2'  },
  { step: 13, team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 2' },
  { step: 14, team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 3' },
  { step: 15, team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 3'  },
  // Pick Phase 2 — 2R, 2B, 1R
  { step: 16, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 4'  },
  { step: 17, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 4' },
  { step: 18, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 5' },
  { step: 19, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 5'  },
];

// ─── TOURNAMENT sequence — 20 steps ──────────────────────────────────────────
// Ban1(6) → Pick1(6) → Ban2(4) → Pick2(4)
// Pick1: 1B, 2R, 2B, 1R   |   Pick2: 1R, 2B, 1R
export const TOURNAMENT_SEQUENCE: DraftStep[] = [
  // Ban Phase 1 — 3 per side
  { step: 0,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 1'  },
  { step: 1,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 1'   },
  { step: 2,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 2'  },
  { step: 3,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 2'   },
  { step: 4,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 3'  },
  { step: 5,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 3'   },
  // Pick Phase 1 — 1B, 2R, 2B, 1R
  { step: 6,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 1' },
  { step: 7,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 1'  },
  { step: 8,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 2'  },
  { step: 9,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 2' },
  { step: 10, team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 3' },
  { step: 11, team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 3'  },
  // Ban Phase 2 — 2 per side
  { step: 12, team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 4'  },
  { step: 13, team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 4'   },
  { step: 14, team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 5'  },
  { step: 15, team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 5'   },
  // Pick Phase 2 — 1R, 2B, 1R
  { step: 16, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 4'  },
  { step: 17, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 4' },
  { step: 18, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 5' },
  { step: 19, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 5'  },
];

// ─── CUSTOM sequence — 16 steps ───────────────────────────────────────────────
// Ban1(4) → Pick1(6) → Ban2(2) → Pick2(4)  — 3 bans per side, 5 picks per side
// Pick1: 1B, 2R, 2B, 1R   |   Pick2: 1R, 2B, 1R
export const CUSTOM_SEQUENCE: DraftStep[] = [
  // Ban Phase 1 — 2 per side
  { step: 0,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 1'  },
  { step: 1,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 1'   },
  { step: 2,  team: 'blue', action: 'ban',  phase: 'ban1',  label: 'Blue Ban 2'  },
  { step: 3,  team: 'red',  action: 'ban',  phase: 'ban1',  label: 'Red Ban 2'   },
  // Pick Phase 1 — 1B, 2R, 2B, 1R
  { step: 4,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 1' },
  { step: 5,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 1'  },
  { step: 6,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 2'  },
  { step: 7,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 2' },
  { step: 8,  team: 'blue', action: 'pick', phase: 'pick1', label: 'Blue Pick 3' },
  { step: 9,  team: 'red',  action: 'pick', phase: 'pick1', label: 'Red Pick 3'  },
  // Ban Phase 2 — 1 per side
  { step: 10, team: 'blue', action: 'ban',  phase: 'ban2',  label: 'Blue Ban 3'  },
  { step: 11, team: 'red',  action: 'ban',  phase: 'ban2',  label: 'Red Ban 3'   },
  // Pick Phase 2 — 1R, 2B, 1R
  { step: 12, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 4'  },
  { step: 13, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 4' },
  { step: 14, team: 'blue', action: 'pick', phase: 'pick2', label: 'Blue Pick 5' },
  { step: 15, team: 'red',  action: 'pick', phase: 'pick2', label: 'Red Pick 5'  },
];

// ─── Mode → sequence lookup ───────────────────────────────────────────────────

export function getDraftSequence(mode: GameMode): DraftStep[] {
  if (mode === 'tournament') return TOURNAMENT_SEQUENCE;
  if (mode === 'custom')     return CUSTOM_SEQUENCE;
  return RANKED_SEQUENCE;
}

/** Number of bans per side for the given mode */
export function getBanCount(mode: GameMode): number {
  const seq = getDraftSequence(mode);
  return seq.filter((s) => s.team === 'blue' && s.action === 'ban').length;
}

/** @deprecated Use getDraftSequence('ranked') — kept for any remaining references */
export const DRAFT_SEQUENCE = RANKED_SEQUENCE;

// ─── Counter Composition types ────────────────────────────────────────────────

export type LaneRole = 'Gold' | 'Jungle' | 'Mid' | 'EXP' | 'Roam';

export interface CompositionSlot {
  hero:      HeroData;
  laneRole:  LaneRole;
  reason:    string;
}

// ─── Winning Lineup types ─────────────────────────────────────────────────────

export interface WinningLineupSlot {
  hero:           HeroData;
  laneRole:       LaneRole;
  reason:         string;          // short summary (French)
  detailedReason: string;          // full French explanation (2-4 sentences)
  isLocked:       boolean;         // true = already picked, false = recommendation
}

export interface BanThreat {
  hero:         HeroData;          // hero in our lineup that the enemy should ban
  banReason:    string;            // French: why the enemy would target this hero
  priority:     'high' | 'medium';
  backupPick:   HeroData | null;   // best alternative if this hero gets banned
  backupReason: string;            // why the backup works
}

export interface WinningLineup {
  slots:           WinningLineupSlot[];  // always 5
  archetype:       DraftArchetype;
  archetypeReason: string;              // why this archetype was chosen (French)
  winCondition:    string;              // French win condition
  strength:        number;              // 0–100
  banThreats:      BanThreat[];         // heroes the enemy might ban to hurt us
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
  earlyMid:    number;   // 0–10  (avg of early + mid, like M7 broadcast "Early to Mid Game Potential")
  late:        number;   // 0–10
  damage:      number;   // 0–10
  tankiness:   number;   // 0–10  (Survivability)
  cc:          number;   // 0–10  (Control Ability)
  push:        number;   // 0–10  (Push Ability)
  coordination: number;  // 0–10  (Team Coordination / synergy)
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
  winningLineup:     WinningLineup | null;
}
