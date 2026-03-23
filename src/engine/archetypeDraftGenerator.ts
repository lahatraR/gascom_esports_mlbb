import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';
import { getHeroTierScore } from '@/data/tierList';

export interface GeneratedDraftSlot {
  lane: 'EXP' | 'Jungle' | 'Mid' | 'Gold' | 'Roam';
  hero: HeroData;
  archetypeFit: number;  // 0-100
  role: string;
  why: string;
}

export interface GeneratedBan {
  hero: HeroData;
  priority: 'must-ban' | 'high' | 'situational';
  reason: string;
}

export interface GeneratedDraft {
  rank: number;
  slots: GeneratedDraftSlot[];
  bans: GeneratedBan[];
  teamScore: number;  // 0-100
  winCondition: string;
  archetype: DraftArchetype;
}

// ─── Strict role requirements per lane ───────────────────────────────────────
// A hero MUST match at least one of these roles to be a candidate for that lane.
// This enforces the team composition norm:
//   Gold   → Marksman (the DPS carry)
//   Roam   → Tank or Support (vision + engage + peel)
//   Jungle → Assassin, Fighter, or Tank (objectives + ganks)
//   EXP    → Fighter or Assassin (duel + side pressure)
//   Mid    → Mage or Assassin (burst + rotation)

const LANE_STRICT_ROLES: Record<string, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Tank', 'Support'],
  Jungle: ['Assassin', 'Fighter', 'Tank'],
  EXP:    ['Fighter', 'Assassin'],
  Mid:    ['Mage', 'Assassin'],
};

// Per-archetype lane importance weights (for score boosting — not filtering)
const LANE_ARCH_WEIGHT: Record<DraftArchetype, Record<string, number>> = {
  engage:  { EXP: 1.2, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 1.5 },
  poke:    { EXP: 0.9, Jungle: 0.8, Mid: 1.5, Gold: 1.4, Roam: 1.0 },
  protect: { EXP: 0.8, Jungle: 1.0, Mid: 1.2, Gold: 1.5, Roam: 1.5 },
  split:   { EXP: 1.5, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 0.8 },
  catch:   { EXP: 1.2, Jungle: 1.4, Mid: 1.2, Gold: 1.0, Roam: 1.1 },
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// Score a hero for a specific lane + archetype.
// Hero MUST already be pre-filtered by role — this function only handles ordering.
function scoreHeroForSlot(hero: HeroData, lane: string, archetype: DraftArchetype): number {
  const archScores = heroArchetypeScores(hero);
  const rawArch    = archScores[archetype] ?? 0;           // 0–10 scale from archetypeEngine
  const archFit    = clamp(rawArch / 10, 0, 1);            // normalise to 0–1
  const tierScore  = getHeroTierScore(hero.name, hero.roles) / 10; // 0–1
  const winScore   = clamp(((hero.winRate ?? 0.50) - 0.45) / 0.15, 0, 1);
  const laneWeight = LANE_ARCH_WEIGHT[archetype][lane] ?? 1.0;

  // Weighted blend: archetype fit 50%, tier list 30%, win rate 20%
  const base = archFit * 0.50 + tierScore * 0.30 + winScore * 0.20;
  return clamp(base * laneWeight, 0, 1);
}

function buildWhy(hero: HeroData, lane: string, archetype: DraftArchetype): string {
  const archScores = heroArchetypeScores(hero);
  const fit        = clamp(Math.round((archScores[archetype] ?? 0) * 10), 0, 100);
  const role       = hero.roles[0] ?? 'Héros';
  const laneLabel  = ({ EXP: 'EXP Lane', Jungle: 'Jungle', Mid: 'Mid Lane', Gold: 'Gold Lane', Roam: 'Roam' } as Record<string, string>)[lane] ?? lane;
  return `${role} ${laneLabel} — score ${ARCHETYPE_LABELS[archetype]} : ${fit}/100 · WR ${((hero.winRate ?? 0) * 100).toFixed(1)}%`;
}

function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const gold = slots.find((s) => s.lane === 'Gold')?.hero.name ?? 'le carry';
  const roam = slots.find((s) => s.lane === 'Roam')?.hero.name ?? 'le tank';
  const jgl  = slots.find((s) => s.lane === 'Jungle')?.hero.name ?? 'le jungler';
  const conditions: Record<DraftArchetype, string> = {
    engage:  `Initiez les fights avec ${roam} + ${jgl} — convergence en 2 secondes. Protégez ${gold} pendant le teamfight. Objectif : Lord après chaque fight gagné.`,
    poke:    `Harcelez avec ${jgl} et le Mid avant chaque objectif. Forcez les soins ennemis, puis engagez quand ils sont à mi-vie.`,
    protect: `Protégez ${gold} à tout prix. ${roam} + ${jgl} tournent autour du carry. Ne cherchez pas le fight — attendez le late.`,
    split:   `${jgl} conteste les objectifs pendant que l'EXP crée de la pression side. Forcez 2 réponses ennemies simultanées.`,
    catch:   `Isolez les cibles séparées avec ${jgl} et le Mid. CC mono-cible → burst → teamfight 5v4. Jamais de fight en plein milieu.`,
  };
  return conditions[archetype];
}

export function generateArchetypeDrafts(
  archetype: DraftArchetype,
  heroPool: HeroData[],
  excludedIds: Set<string> = new Set()
): GeneratedDraft[] {
  const lanes = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'] as const;

  // ── Build candidate pool per lane (STRICT role filter) ──────────────────
  const candidates: Record<string, HeroData[]> = {};
  for (const lane of lanes) {
    const required = LANE_STRICT_ROLES[lane] ?? [];
    candidates[lane] = heroPool
      .filter((h) => !excludedIds.has(String(h.id)))
      .filter((h) => h.roles.some((r) => required.includes(r)))  // STRICT: role must match
      .sort((a, b) => scoreHeroForSlot(b, lane, archetype) - scoreHeroForSlot(a, lane, archetype))
      .slice(0, 8);
  }

  // ── Build ban list ────────────────────────────────────────────────────────
  // Heroes whose archetype beats ours (counter-drafters)
  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([arch]) => arch as DraftArchetype);

  const banCandidates = heroPool
    .filter((h) => !excludedIds.has(String(h.id)))
    .map((h) => {
      const scores = heroArchetypeScores(h);
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const metaBonus  = clamp((h.winRate ?? 0.50) - 0.50, 0, 0.10) * 20;
      return { hero: h, score: counterStr + metaBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const bans: GeneratedBan[] = banCandidates.map((c, i) => ({
    hero:     c.hero,
    priority: (i < 2 ? 'must-ban' : i < 4 ? 'high' : 'situational') as GeneratedBan['priority'],
    reason:   i < 2
      ? `Contre directement votre ${ARCHETYPE_LABELS[archetype]} — ban obligatoire`
      : i < 4
        ? `Meta solide qui peut répondre à votre stratégie`
        : `Situationnel — à bannir si l'ennemi semble vouloir le pick`,
  }));

  // ── Generate up to 10 diverse valid compositions ──────────────────────────
  const drafts: GeneratedDraft[] = [];
  const usedKeys = new Set<string>();

  outer:
  for (let a = 0; a < 8; a++) {
    for (let b = 0; b < 8; b++) {
      for (let c = 0; c < 8; c++) {
        for (let d = 0; d < 8; d++) {
          for (let e = 0; e < 8; e++) {
            if (drafts.length >= 10) break outer;

            const heroEXP  = candidates['EXP'][a];
            const heroJGL  = candidates['Jungle'][b];
            const heroMid  = candidates['Mid'][c];
            const heroGold = candidates['Gold'][d];
            const heroRoam = candidates['Roam'][e];

            if (!heroEXP || !heroJGL || !heroMid || !heroGold || !heroRoam) continue;

            // No duplicate heroes across lanes
            const ids = [heroEXP.id, heroJGL.id, heroMid.id, heroGold.id, heroRoam.id];
            if (new Set(ids).size < 5) continue;
            const key = [...ids].sort().join(',');
            if (usedKeys.has(key)) continue;
            usedKeys.add(key);

            const archScores = heroArchetypeScores;
            const slots: GeneratedDraftSlot[] = [
              { lane: 'EXP',    hero: heroEXP,  archetypeFit: clamp(Math.round(archScores(heroEXP)[archetype]  * 10), 0, 100), role: heroEXP.roles[0]  ?? '', why: buildWhy(heroEXP,  'EXP',    archetype) },
              { lane: 'Jungle', hero: heroJGL,  archetypeFit: clamp(Math.round(archScores(heroJGL)[archetype]  * 10), 0, 100), role: heroJGL.roles[0]  ?? '', why: buildWhy(heroJGL,  'Jungle', archetype) },
              { lane: 'Mid',    hero: heroMid,  archetypeFit: clamp(Math.round(archScores(heroMid)[archetype]  * 10), 0, 100), role: heroMid.roles[0]  ?? '', why: buildWhy(heroMid,  'Mid',    archetype) },
              { lane: 'Gold',   hero: heroGold, archetypeFit: clamp(Math.round(archScores(heroGold)[archetype] * 10), 0, 100), role: heroGold.roles[0] ?? '', why: buildWhy(heroGold, 'Gold',   archetype) },
              { lane: 'Roam',   hero: heroRoam, archetypeFit: clamp(Math.round(archScores(heroRoam)[archetype] * 10), 0, 100), role: heroRoam.roles[0] ?? '', why: buildWhy(heroRoam, 'Roam',   archetype) },
            ];

            const teamScore = clamp(
              Math.round(slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.lane, archetype), 0) / 5 * 100),
              0, 100
            );

            drafts.push({ rank: drafts.length + 1, slots, bans, teamScore, winCondition: buildWinCondition(archetype, slots), archetype });
          }
        }
      }
    }
  }

  return drafts
    .sort((a, b) => b.teamScore - a.teamScore)
    .map((d, i) => ({ ...d, rank: i + 1 }));
}
