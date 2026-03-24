import type { LaneKey } from '@/data/tierList';

// ─── Raw API response shapes (actual mlbb-stats.rone.dev format) ─────────────

interface RawHeroListResponse {
  code: number;
  data: {
    records: Array<{
      data: {
        hero_id: number;
        hero: { data: { name: string; head: string; smallmap?: string } };
        relation: {
          assist: { target_hero_id: number[] };
          strong: { target_hero_id: number[] };
          weak:   { target_hero_id: number[] };
        };
      };
    }>;
  };
}

interface RawHeroRankResponse {
  code: number;
  data: {
    records: Array<{
      data: {
        main_heroid:            number;
        main_hero_win_rate:     number;
        main_hero_ban_rate:     number;
        main_hero_appearance_rate: number;
        main_hero: { data: { name: string; head: string } };
      };
    }>;
  };
}

// ─── Parsed shapes returned to callers ───────────────────────────────────────

export interface ParsedHeroEntry {
  id:          number;
  name:        string;
  image:       string;  // head URL
  counters:    number[]; // weak.target_hero_id
  counteredBy: number[]; // strong.target_hero_id
  synergies:   number[]; // assist.target_hero_id
}

export interface ParsedHeroRank {
  id:       number;
  name:     string;
  winRate:  number;
  banRate:  number;
  pickRate: number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE_URL   = 'https://mlbb-stats.rone.dev/api';
const TIMEOUT_MS = 10_000;

async function apiFetch<T>(path: string, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        signal: ctrl.signal,
        next: { revalidate: 300 },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json() as T;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

// ─── Public API calls ─────────────────────────────────────────────────────────

export async function fetchHeroList(): Promise<ParsedHeroEntry[]> {
  const raw = await apiFetch<RawHeroListResponse>('/hero-list/');
  return raw.data.records.map((rec) => {
    const d = rec.data;
    return {
      id:          d.hero_id,
      name:        d.hero.data.name,
      image:       d.hero.data.head,
      counters:    (d.relation.weak.target_hero_id   ?? []).filter((id: number) => id > 0),
      counteredBy: (d.relation.strong.target_hero_id ?? []).filter((id: number) => id > 0),
      synergies:   (d.relation.assist.target_hero_id ?? []).filter((id: number) => id > 0),
    };
  });
}

// ─── Hero position types ──────────────────────────────────────────────────────

export interface ParsedHeroPosition {
  id:    number;
  name:  string;
  lanes: LaneKey[];
  roles: string[];
}

// raw shape for hero-position endpoint
interface RawHeroPositionResponse {
  code: number;
  data: {
    records: Array<{
      data: {
        hero_id: number;
        hero: {
          data: {
            name: string;
            roadsort: Array<{ data?: { road_sort_title: string } } | string>;
            sortid:   Array<{ data?: { sort_title: string }   } | string>;
          };
        };
      };
      id: number;
    }>;
  };
}

const API_LANE_MAP: Record<string, LaneKey> = {
  'Exp Lane':  'EXP',
  'Gold Lane': 'Gold',
  'Mid Lane':  'Mid',
  'Jungle':    'Jungle',
  'Roam':      'Roam',
};

const ROLE_NORMALIZE: Record<string, string> = {
  fighter:  'Fighter',
  assassin: 'Assassin',
  marksman: 'Marksman',
  mage:     'Mage',
  tank:     'Tank',
  support:  'Support',
};

export async function fetchHeroPositions(): Promise<ParsedHeroPosition[]> {
  const raw = await apiFetch<RawHeroPositionResponse>('/hero-position');
  return raw.data.records.map((rec) => {
    const d = rec.data;
    const hero = d.hero.data;
    const lanes = (hero.roadsort ?? [])
      .filter((r): r is { data: { road_sort_title: string } } => !!r && typeof r === 'object' && !!r.data)
      .map((r) => API_LANE_MAP[r.data.road_sort_title])
      .filter((l): l is LaneKey => !!l);
    const roles = (hero.sortid ?? [])
      .filter((r): r is { data: { sort_title: string } } => !!r && typeof r === 'object' && !!r.data)
      .map((r) => ROLE_NORMALIZE[r.data.sort_title.toLowerCase()] ?? r.data.sort_title);
    return { id: d.hero_id, name: hero.name, lanes, roles };
  });
}

// ─── Hero detail stats types ──────────────────────────────────────────────────

interface RawHeroDetailStatsResponse {
  code: number;
  data: {
    records: Array<{
      data: {
        main_heroid:               number;
        main_hero_win_rate:        number;
        main_hero_ban_rate:        number;
        main_hero_appearance_rate: number;
        sub_hero: Array<{
          data: {
            heroid:           number;
            increase_win_rate: number;
          };
        }>;
      };
    }>;
  };
}

export interface ParsedHeroDetailStat {
  id:           number;
  winRate:      number;
  banRate:      number;
  pickRate:     number;
  // Sorted descending by boost value
  synergyPairs: Array<{ heroId: number; boost: number }>;
}

export async function fetchHeroDetailStats(heroName: string): Promise<ParsedHeroDetailStat | null> {
  try {
    const raw = await apiFetch<RawHeroDetailStatsResponse>(
      `/hero-detail-stats/${encodeURIComponent(heroName)}`,
      1, // 1 retry only — we'll fire many of these
    );
    const rec = raw?.data?.records?.[0]?.data;
    if (!rec) return null;

    const synergyPairs = (rec.sub_hero ?? [])
      .filter((s) => s?.data?.heroid && (s.data.increase_win_rate ?? 0) > 0)
      .map((s) => ({ heroId: s.data.heroid, boost: s.data.increase_win_rate }))
      .sort((a, b) => b.boost - a.boost);

    return {
      id:       rec.main_heroid,
      winRate:  rec.main_hero_win_rate,
      banRate:  rec.main_hero_ban_rate,
      pickRate: rec.main_hero_appearance_rate,
      synergyPairs,
    };
  } catch {
    return null;
  }
}

export async function fetchHeroRank(): Promise<ParsedHeroRank[]> {
  const raw = await apiFetch<RawHeroRankResponse>('/hero-rank/');
  return raw.data.records.map((rec) => {
    const d = rec.data;
    return {
      id:       d.main_heroid,
      name:     d.main_hero.data.name,
      winRate:  d.main_hero_win_rate,
      banRate:  d.main_hero_ban_rate,
      pickRate: d.main_hero_appearance_rate,
    };
  });
}
