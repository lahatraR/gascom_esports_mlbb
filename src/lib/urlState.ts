import type { HeroData, GameMode } from '@/types/draft';
import { getBanCount } from '@/types/draft';

// Encode the current draft into a compact URL query string.
// Format: ?m=r&bb=1,2,0&rb=3,4,0&bp=5,6,0,0,0&rp=7,8,0,0,0
// 0 = empty slot. m: r=ranked, t=tournament, c=custom

const MODE_CODE: Record<GameMode, string> = { ranked: 'r', tournament: 't', custom: 'c' };
const CODE_MODE: Record<string, GameMode> = { r: 'ranked', t: 'tournament', c: 'custom' };

function heroIds(arr: (HeroData | null)[]): string {
  return arr.map((h) => h?.id ?? 0).join(',');
}

function decodeIds(str: string | null, len: number, heroById: Map<number, HeroData>): (HeroData | null)[] {
  if (!str) return Array(len).fill(null);
  const ids = str.split(',').map(Number);
  const result: (HeroData | null)[] = Array(len).fill(null);
  ids.slice(0, len).forEach((id, i) => {
    result[i] = id > 0 ? (heroById.get(id) ?? null) : null;
  });
  return result;
}

export interface DraftUrlState {
  gameMode: GameMode;
  blueBans: (HeroData | null)[];
  redBans: (HeroData | null)[];
  bluePicks: (HeroData | null)[];
  redPicks: (HeroData | null)[];
  currentStep: number;
}

export function encodeDraftToUrl(state: DraftUrlState): string {
  const p = new URLSearchParams();
  p.set('m',  MODE_CODE[state.gameMode]);
  p.set('bb', heroIds(state.blueBans));
  p.set('rb', heroIds(state.redBans));
  p.set('bp', heroIds(state.bluePicks));
  p.set('rp', heroIds(state.redPicks));
  p.set('s',  String(state.currentStep));
  return p.toString();
}

export function decodeDraftFromUrl(
  params: URLSearchParams,
  heroPool: HeroData[]
): DraftUrlState | null {
  const m = params.get('m');
  if (!m || !CODE_MODE[m]) return null;

  const gameMode  = CODE_MODE[m];
  const banCount  = getBanCount(gameMode);
  const heroById  = new Map(heroPool.map((h) => [h.id, h]));
  const step      = parseInt(params.get('s') ?? '0', 10);

  return {
    gameMode,
    blueBans:  decodeIds(params.get('bb'), banCount, heroById),
    redBans:   decodeIds(params.get('rb'), banCount, heroById),
    bluePicks: decodeIds(params.get('bp'), 5, heroById),
    redPicks:  decodeIds(params.get('rp'), 5, heroById),
    currentStep: isNaN(step) ? 0 : step,
  };
}
