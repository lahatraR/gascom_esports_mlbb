/**
 * Execution Difficulty per Hero  (1 = easiest → 5 = hardest)
 * ──────────────────────────────────────────────────────────
 * Reflects the mechanical skill floor required to play the hero optimally,
 * NOT the learning curve to understand their kit.
 *
 * Scoring criteria:
 *  1 — Point-and-click, forgiving cooldowns, no combos required
 *  2 — Simple combos or positioning, one skill to land precisely
 *  3 — Multi-step combos, good positioning required, timing matters
 *  4 — Complex combos, execution punishes heavily on miss, map reads required
 *  5 — Exceptional mechanical ceiling (cable physics, frame-perfect combos,
 *       multi-step micro that separates top-0.1% from everyone else)
 */

export type DifficultyRating = 1 | 2 | 3 | 4 | 5;

export const HERO_DIFFICULTY: Record<string, DifficultyRating> = {
  // ── Difficulty 5 — Elite execution required ──────────────────────────────
  Fanny:      5,  // cable physics, energy management, real-time pathfinding
  Ling:       5,  // wallhop micro, energy, ult timing with Flicker
  Kagura:     5,  // umbrella 6-form combos, rapid stance-switching
  Gusion:     5,  // dagger-blink-recall frame-tight burst combo
  Lancelot:   5,  // triple blink cancel combos, precise engagement angles
  Benedetta:  5,  // dash-cancel mechanics, execution window < 0.5s

  // ── Difficulty 4 — High skill floor ──────────────────────────────────────
  Hayabusa:   4,  // shadow management, shuriken bounce positioning
  Chou:       4,  // kick angle control, S1-cancel-S2-cancel chains
  Natalia:    4,  // fog timing, silence window exploitation, positioning
  Helcurt:    4,  // silence + sprint timing, dark shroud radius judgement
  Selena:     4,  // elven form arrow placement, form-switch timing
  Harley:     4,  // portal placement combos, hat-reset chains
  Kaja:       4,  // ult pull direction micro, positioning before commit
  Atlas:      4,  // ult chain commit timing, team coordination dependency
  Franco:     4,  // hook prediction accuracy defines 100% of value
  Khufra:     4,  // ball bounce direction, anti-dash timing reads
  Joy:        4,  // S2 reset chain management, stamina tracking
  Aamon:      4,  // fragment burst window, dagger-reveal combos
  Suyou:      4,  // stance-tracking, simultaneous dual-hero management
  Paquito:    4,  // champ stack tracking, combo reset precision
  Guinevere:  4,  // S2 knockup → ult cancel timing, mid-air positioning
  Martis:     4,  // S2 charge management, phase-through wall reads
  Beatrix:    4,  // weapon-switch micro (Renner snipe angle, Bennett spread)

  // ── Difficulty 3 — Moderate, rewards practice ────────────────────────────
  Minotaur:   3,  // ult direction + Flicker timing, rage management
  Akai:       3,  // spin direction to wall, Flicker mid-spin
  Jawhead:    3,  // throw target selection, S1 engage angle
  Tigreal:    3,  // S2→Flicker→S3 combo sequence
  Johnson:    3,  // vehicle targeting, teammate pick-up coordination
  Mathilda:   3,  // link target selection, dive angle calculation
  Cecilion:   3,  // stack management, Flicker reposition during ult
  Lunox:      3,  // mode-switching awareness, light/dark resource management
  Vale:       3,  // wind stack bonus choice, S1+S2+S3 angle alignment
  Valir:      3,  // knockback direction micro, Vengeance timing
  Pharsa:     3,  // flight + Arrival combo, ult angle choice
  Wanwan:     3,  // weakness cycling (hit all 4), ult + Sprint
  Brody:      3,  // stack management, ult target prediction at range
  Granger:    3,  // last-bullet execute timing, dash repositioning
  Fredrinn:   3,  // combo point management, dive timing off CC
  Arlott:     3,  // mark-tracking, dash chain onto right target
  Yu_Zhong:   3,  // dragon form awareness, wing landing zone
  'Yu Zhong': 3,
  Khaleed:    3,  // quicksand surfing direction, ult hold timing
  Sora:       3,  // form transitions, AoE placement during ult
  Silvanna:   3,  // circle lock timing, combo precision
  Roger:      3,  // form-swap micro in fight, wolf path
  Aldous:     3,  // stack-game decisions, ult global tracking
  Esmeralda:  3,  // bubble orbit mechanics, shield stack timing
  Leomord:    3,  // nightmare horse mount timing, position during ult
  Zetian:     3,  // Arrival → ult global combo timing
  Yve:        3,  // ultimate reticle management, zone placement

  // ── Difficulty 2 — Accessible, one skill to learn ────────────────────────
  Karina:     2,  // S2 reset on kill — straightforward execution
  Zilong:     2,
  Cici:       2,
  Diggie:     2,
  Angela:     2,
  Estes:      2,
  Floryn:     2,
  Rafaela:    2,
  Carmilla:   2,
  Faramis:    2,
  Gloo:       2,
  Lolita:     2,
  Barats:     2,
  Belerick:   2,
  Hylos:      2,
  Grock:      2,
  Uranus:     2,
  Alice:      2,
  Nana:       2,
  Odette:     2,
  Zhask:      2,
  Vexana:     2,
  Badang:     2,
  Bane:       2,
  Hilda:      2,
  Terizla:    2,
  Gatotkaca:  2,
  Aulus:      2,
  Ruby:       2,
  Irithel:    2,
  Karrie:     2,
  Natan:      2,
  Popol_and_Kupa: 2,
  'Popol and Kupa': 2,
  Kimmy:      2,
  Moskov:     2,
  Hanabi:     2,
  Bruno:      2,
  'Yi Sun-Shin': 2,
  Claude:     2,
  Melissa:    2,
  Obsidia:    2,
  Lylia:      2,
  Eudora:     2,
  Aurora:     2,
  Xavier:     2,
  Gord:       2,
  Zhuxin:     2,
  Luo_Yi:     2,
  'Luo Yi':   2,
  Dyrroth:    2,
  Masha:      2,
  Julian:     2,
  Hanzo:      2,

  // ── Difficulty 1 — Beginner friendly ─────────────────────────────────────
  Miya:       1,
  Layla:      1,
  Lesley:     1,
  Clint:      1,
  Balmond:    1,
  Sun:        1,
  Cyclops:    1,
  Alpha:      1,
  Alucard:    1,
  Argus:      1,
  'Chang\'e': 1,
  Thamuz:     1,
  Lapu_Lapu:  1,
  'Lapu-Lapu': 1,
  Ixia:       1,
};

/** Returns difficulty rating (defaults to 3 if not listed). */
export function getHeroDifficulty(heroName: string): DifficultyRating {
  return HERO_DIFFICULTY[heroName] ?? 3;
}

/** Returns a visual indicator string: ⚡ to ⚡⚡⚡⚡⚡ */
export function difficultyLabel(d: DifficultyRating): string {
  return '⚡'.repeat(d);
}

/** Returns a colour token for the difficulty level. */
export function difficultyColor(d: DifficultyRating): string {
  if (d >= 5) return '#f87171'; // red
  if (d >= 4) return '#fb923c'; // orange
  if (d >= 3) return '#facc15'; // yellow
  if (d >= 2) return '#4ade80'; // green
  return '#94a3b8';              // slate — trivial
}
