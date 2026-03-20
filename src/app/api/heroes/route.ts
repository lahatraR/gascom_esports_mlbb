import { NextResponse } from 'next/server';
import { getCachedHeroList, getCachedHeroRank } from '@/lib/apiCache';
import { HERO_STATS, getDefaultsForRoles } from '@/data/heroes';
import type { HeroData } from '@/types/draft';

export const dynamic = 'force-dynamic';

// ─── Transform API data → HeroData[] ─────────────────────────────────────────

export async function GET() {
  try {
    const [heroList, heroRank] = await Promise.all([
      getCachedHeroList(),
      getCachedHeroRank().catch(() => []),
    ]);

    // Build a win/ban/pick rate lookup from hero-rank
    const rankMap = new Map(heroRank.map((r) => [r.id, r]));

    // Transform each hero from hero-list
    const heroes: HeroData[] = heroList.map((h) => {
      const stats  = HERO_STATS[h.id];
      const rank   = rankMap.get(h.id);
      const roles  = stats?.roles ?? ['Fighter'];
      const defs   = stats ? stats : { roles, ...getDefaultsForRoles(roles) };

      return {
        id:          h.id,
        name:        h.name,
        image:       h.image,
        roles,
        early:       defs.early,
        mid:         defs.mid,
        late:        defs.late,
        damage:      defs.damage,
        tankiness:   defs.tankiness,
        cc:          defs.cc,
        mobility:    defs.mobility,
        push:        defs.push,
        pressure:    defs.pressure,
        // Relation data comes directly from the API's hero-list
        counters:    h.counters,
        counteredBy: h.counteredBy,
        synergies:   h.synergies,
        // Rates: hero-rank if available, else static or defaults
        winRate:  rank?.winRate  ?? defs.winRate  ?? 0.500,
        pickRate: rank?.pickRate ?? defs.pickRate ?? 0.050,
        banRate:  rank?.banRate  ?? defs.banRate  ?? 0.010,
      };
    });

    return NextResponse.json({ data: heroes }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API error';
    console.error('[/api/heroes]', message);
    return NextResponse.json({ data: [], error: message }, { status: 200 });
  }
}
