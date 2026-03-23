import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';

export interface GeneratedDraftSlot {
  lane: 'EXP' | 'Jungle' | 'Mid' | 'Gold' | 'Roam';
  hero: HeroData;
  archetypeFit: number;  // 0-100
  role: string;          // e.g. "Fighter", "Mage"
  why: string;           // explanation
}

export interface GeneratedBan {
  hero: HeroData;
  priority: 'must-ban' | 'high' | 'situational';
  reason: string;
}

export interface GeneratedDraft {
  rank: number;           // 1-10
  slots: GeneratedDraftSlot[];
  bans: GeneratedBan[];
  teamScore: number;      // 0-100 overall team score
  winCondition: string;
  archetype: DraftArchetype;
}

const LANE_IDEAL_ROLES: Record<string, string[]> = {
  EXP:    ['Fighter', 'Tank'],
  Jungle: ['Assassin', 'Fighter', 'Tank'],
  Mid:    ['Mage', 'Assassin'],
  Gold:   ['Marksman', 'Mage'],
  Roam:   ['Tank', 'Support'],
};

const LANE_ARCHETYPE_WEIGHTS: Record<DraftArchetype, Record<string, number>> = {
  engage:  { EXP: 1.2, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 1.5 },
  poke:    { EXP: 0.9, Jungle: 0.8, Mid: 1.5, Gold: 1.4, Roam: 1.0 },
  protect: { EXP: 0.8, Jungle: 1.0, Mid: 1.2, Gold: 1.5, Roam: 1.5 },
  split:   { EXP: 1.5, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 0.8 },
  catch:   { EXP: 1.2, Jungle: 1.4, Mid: 1.2, Gold: 1.0, Roam: 1.1 },
};

function laneRoleScore(hero: HeroData, lane: string): number {
  const ideal = LANE_IDEAL_ROLES[lane] ?? [];
  return hero.roles.some((r) => ideal.includes(r)) ? 1.0 : 0.45;
}

function scoreHeroForLaneArch(hero: HeroData, lane: string, archetype: DraftArchetype): number {
  const archScores = heroArchetypeScores(hero);
  const archFit    = (archScores[archetype] ?? 0) / 10;           // 0-1
  const laneMult   = LANE_ARCHETYPE_WEIGHTS[archetype][lane] ?? 1.0;
  const roleFit    = laneRoleScore(hero, lane);
  const metaScore  = (hero.winRate ?? 50) / 100;
  return ((archFit * 3 + metaScore * 1.5 + roleFit * 1.5) * laneMult);
}

function buildWhy(hero: HeroData, lane: string, archetype: DraftArchetype): string {
  const archScores = heroArchetypeScores(hero);
  const fit = Math.round((archScores[archetype] ?? 0) * 10);
  const topRole = hero.roles[0] ?? 'Héros';
  const laneLabel = ({ EXP: 'EXP Lane', Jungle: 'Jungle', Mid: 'Mid Lane', Gold: 'Gold Lane', Roam: 'Roam' } as Record<string, string>)[lane] ?? lane;
  return `${topRole} ${laneLabel} — score ${ARCHETYPE_LABELS[archetype]} : ${fit}/100 · WR ${hero.winRate?.toFixed(1) ?? '?'}%`;
}

function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const names = slots.map((s) => s.hero.name).join(', ');
  const conditions: Record<DraftArchetype, string> = {
    engage:  `Déclenchez le fight avec le Roam/Jungle — ${names} doit converger en moins de 2 secondes. Objectif : Lord dès le fight gagnant.`,
    poke:    `Harcelez depuis une distance sûre avant chaque objectif. ${names} doit forcer les soins ennemis avant d'engager.`,
    protect: `Protégez le Gold Lane carry en toute circonstance. Rotation Roam + Jungle autour du carry en late game.`,
    split:   `Forcez des réponses sur deux lanes simultanément. Le jungler alterne pression et conteste objectif.`,
    catch:   `Isolez les cibles déplacées. Utilisez les CC mono-cible pour éliminer un carry ennemi avant chaque fight.`,
  };
  return conditions[archetype];
}

export function generateArchetypeDrafts(
  archetype: DraftArchetype,
  heroPool: HeroData[],
  excludedIds: Set<string> = new Set()
): GeneratedDraft[] {
  const lanes = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'] as const;

  // Score all heroes per lane
  const laneTopHeroes: Record<string, HeroData[]> = {};
  for (const lane of lanes) {
    laneTopHeroes[lane] = [...heroPool]
      .filter((h) => !excludedIds.has(String(h.id)))
      .sort((a, b) => scoreHeroForLaneArch(b, lane, archetype) - scoreHeroForLaneArch(a, lane, archetype))
      .slice(0, 6);
  }

  // Build ban recommendations: heroes that counter our archetype OR are top-meta disruptors
  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([arch]) => arch as DraftArchetype);

  const banCandidates = [...heroPool]
    .filter((h) => !excludedIds.has(String(h.id)))
    .map((h) => {
      const archScores = heroArchetypeScores(h);
      const counterScore = beatsUs.reduce((sum, a) => sum + (archScores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const metaScore = (h.winRate ?? 50) - 50;
      return { hero: h, score: counterScore + metaScore * 0.3 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const bans: GeneratedBan[] = banCandidates.slice(0, 6).map((c, i) => ({
    hero: c.hero,
    priority: (i < 2 ? 'must-ban' : i < 4 ? 'high' : 'situational') as GeneratedBan['priority'],
    reason: i < 2
      ? `Contre directement votre stratégie ${ARCHETYPE_LABELS[archetype]} — ban obligatoire`
      : i < 4
        ? `Héros meta qui peut perturber votre plan de jeu`
        : `A bannir si l'ennemi semble vouloir le pick`,
  }));

  // Generate top 10 diverse drafts
  const drafts: GeneratedDraft[] = [];
  const usedCombinations = new Set<string>();

  outer:
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 6; k++) {
        for (let l = 0; l < 6; l++) {
          for (let m = 0; m < 6; m++) {
            if (drafts.length >= 10) break outer;

            const heroExp    = laneTopHeroes['EXP'][i];
            const heroJgl    = laneTopHeroes['Jungle'][j];
            const heroMid    = laneTopHeroes['Mid'][k];
            const heroGold   = laneTopHeroes['Gold'][l];
            const heroRoam   = laneTopHeroes['Roam'][m];

            if (!heroExp || !heroJgl || !heroMid || !heroGold || !heroRoam) continue;

            // No duplicate heroes
            const ids = [heroExp.id, heroJgl.id, heroMid.id, heroGold.id, heroRoam.id];
            if (new Set(ids).size < 5) continue;
            const key = [...ids].sort().join(',');
            if (usedCombinations.has(key)) continue;
            usedCombinations.add(key);

            const slots: GeneratedDraftSlot[] = [
              { lane: 'EXP',    hero: heroExp,  archetypeFit: Math.round(heroArchetypeScores(heroExp)[archetype]  * 10), role: heroExp.roles[0]  ?? '', why: buildWhy(heroExp,  'EXP',    archetype) },
              { lane: 'Jungle', hero: heroJgl,  archetypeFit: Math.round(heroArchetypeScores(heroJgl)[archetype]  * 10), role: heroJgl.roles[0]  ?? '', why: buildWhy(heroJgl,  'Jungle', archetype) },
              { lane: 'Mid',    hero: heroMid,  archetypeFit: Math.round(heroArchetypeScores(heroMid)[archetype]  * 10), role: heroMid.roles[0]  ?? '', why: buildWhy(heroMid,  'Mid',    archetype) },
              { lane: 'Gold',   hero: heroGold, archetypeFit: Math.round(heroArchetypeScores(heroGold)[archetype] * 10), role: heroGold.roles[0] ?? '', why: buildWhy(heroGold, 'Gold',   archetype) },
              { lane: 'Roam',   hero: heroRoam, archetypeFit: Math.round(heroArchetypeScores(heroRoam)[archetype] * 10), role: heroRoam.roles[0] ?? '', why: buildWhy(heroRoam, 'Roam',   archetype) },
            ];

            const teamScore = Math.round(slots.reduce((s, sl) => s + sl.archetypeFit, 0) / 5);

            drafts.push({
              rank: drafts.length + 1,
              slots,
              bans,
              teamScore,
              winCondition: buildWinCondition(archetype, slots),
              archetype,
            });
          }
        }
      }
    }
  }

  return drafts.sort((a, b) => b.teamScore - a.teamScore).map((d, i) => ({ ...d, rank: i + 1 }));
}
