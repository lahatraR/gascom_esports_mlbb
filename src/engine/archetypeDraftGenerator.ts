import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';
import { getHeroTierScore, getHeroLanes, LANE_TIERS } from '@/data/tierList';
import type { LaneKey } from '@/data/tierList';

export interface GeneratedDraftSlot {
  lane:         'EXP' | 'Jungle' | 'Mid' | 'Gold' | 'Roam';
  hero:          HeroData;
  archetypeFit:  number;  // 0-100
  role:          string;
  why:           string;
}

export interface GeneratedBan {
  hero:     HeroData;
  priority: 'must-ban' | 'high' | 'situational';
  reason:   string;
}

export interface GeneratedDraft {
  rank:         number;
  slots:        GeneratedDraftSlot[];
  bans:         GeneratedBan[];
  teamScore:    number;  // 0-100
  synergyScore: number;  // 0-100 (pair synergies)
  winCondition: string;
  archetype:    DraftArchetype;
}

// ─── Ground rules ─────────────────────────────────────────────────────────────
//
// A hero candidate for lane X must satisfy BOTH conditions:
//   1. TIER LIST GATE  — the hero appears in that lane's tier list (proven meta)
//      OR is a strong multi-lane hero whose primary role is correct
//   2. ROLE GATE       — the hero's roles[] includes the canonical role for X
//
// This prevents e.g.:
//   • Ruby (Fighter/Support) → EXP tier list only → excluded from Roam
//   • Yi Sun-Shin (Marksman/Assassin) → Gold+Jungle tier lists → excluded from Mid
//   • Lolita (Tank) → Roam tier list → excluded from EXP/Jungle/Mid/Gold

const LANE_CANONICAL_ROLES: Record<LaneKey, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Tank', 'Support'],
  Jungle: ['Assassin', 'Fighter', 'Tank'],
  EXP:    ['Fighter', 'Assassin'],
  Mid:    ['Mage'],               // Assassin Mid only if explicitly in Mid tier list
};

// Lanes where Assassin is allowed without being in tier list
const ASSASSIN_MID_LIST = new Set(
  Object.values(LANE_TIERS['Mid']).flat().map((n) => n.toLowerCase())
);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Tier list membership check ───────────────────────────────────────────────
function isInLaneTierList(heroName: string, lane: LaneKey): boolean {
  const tiers = LANE_TIERS[lane];
  const lower = heroName.toLowerCase();
  return (Object.values(tiers) as string[][]).some(
    (heroes) => heroes?.some((n) => n.toLowerCase() === lower)
  );
}

// ─── Two-gate candidate check ─────────────────────────────────────────────────
// Returns true only if hero is a legitimate pick for this lane.
function isValidCandidate(hero: HeroData, lane: LaneKey): boolean {
  const canonical = LANE_CANONICAL_ROLES[lane] ?? [];
  const hasRole   = hero.roles.some((r) => canonical.includes(r));
  const inTier    = isInLaneTierList(hero.name, lane);

  if (!hasRole) {
    // No role match at all → never valid
    return false;
  }

  if (inTier) {
    // In this lane's tier list AND has the role → always valid
    return true;
  }

  // Has the role but NOT in this lane's tier list.
  // Allow only if this is the hero's PRIMARY expected lane (from getHeroLanes).
  const heroLanes = getHeroLanes(hero.name, hero.roles);
  if (heroLanes.includes(lane)) return true;

  // Special case: Assassins in Mid are only valid if they're in the Mid tier list
  if (lane === 'Mid' && hero.roles.includes('Assassin') && !hero.roles.includes('Mage')) {
    return ASSASSIN_MID_LIST.has(hero.name.toLowerCase());
  }

  // Otherwise, role present but not validated for this lane → exclude
  return false;
}

// ─── Per-archetype lane importance ────────────────────────────────────────────
const LANE_ARCH_WEIGHT: Record<DraftArchetype, Record<string, number>> = {
  engage:  { EXP: 1.2, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 1.5 },
  poke:    { EXP: 0.9, Jungle: 0.8, Mid: 1.5, Gold: 1.4, Roam: 1.0 },
  protect: { EXP: 0.8, Jungle: 1.0, Mid: 1.2, Gold: 1.5, Roam: 1.5 },
  split:   { EXP: 1.5, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 0.8 },
  catch:   { EXP: 1.2, Jungle: 1.4, Mid: 1.2, Gold: 1.0, Roam: 1.1 },
};

// ─── Individual hero score for a lane+archetype slot ─────────────────────────
// Components:
//   • Archetype fit  (50%) — how much this hero enables the chosen archetype
//   • Tier list score (35%) — meta quality specifically in this lane
//   • Win rate        (15%) — statistical baseline
function scoreHeroForSlot(hero: HeroData, lane: LaneKey, archetype: DraftArchetype): number {
  const archScores = heroArchetypeScores(hero);
  const archFit    = clamp((archScores[archetype] ?? 0) / 10, 0, 1);
  const tierRaw    = getHeroTierScore(hero.name, hero.roles);  // uses lane-specific lookup
  const tierFit    = clamp(tierRaw / 10, 0, 1);
  const wrFit      = clamp(((hero.winRate ?? 0.50) - 0.45) / 0.15, 0, 1);
  const laneW      = LANE_ARCH_WEIGHT[archetype][lane] ?? 1.0;

  return clamp((archFit * 0.50 + tierFit * 0.35 + wrFit * 0.15) * laneW, 0, 1.5);
}

// ─── Pair synergy score ───────────────────────────────────────────────────────
//
// Key MLBB pairs that matter most in a draft:
//   Roam ↔ Mid  (they move together — engage setup + mage follow)
//   Roam ↔ Gold (Roam peels and enables the carry)
//   Jungle ↔ EXP (dive or split coordination)
//   Any hero ↔ any hero via API synergy list
//
// Returns 0–100 (average of active pair scores)
function computePairSynergy(slots: GeneratedDraftSlot[]): number {
  const byLane = Object.fromEntries(slots.map((s) => [s.lane, s.hero]));
  const roam  = byLane['Roam'];
  const mid   = byLane['Mid'];
  const gold  = byLane['Gold'];
  const jgl   = byLane['Jungle'];
  const exp   = byLane['EXP'];

  let score = 0;
  let count = 0;

  function pairScore(a: HeroData, b: HeroData): number {
    let s = 0;
    if (a.synergies.includes(b.id)) s += 3;
    if (b.synergies.includes(a.id)) s += 3;
    if (a.counters.includes(b.id)) s -= 1;
    if (b.counters.includes(a.id)) s -= 1;
    return clamp(s / 6, 0, 1);
  }

  // Weighted pairs: Roam-Mid is the most important duo (always lane-phases together)
  if (roam && mid)  { score += pairScore(roam, mid)  * 2.0; count += 2.0; }
  if (roam && gold) { score += pairScore(roam, gold) * 1.5; count += 1.5; }
  if (jgl  && exp)  { score += pairScore(jgl,  exp)  * 1.2; count += 1.2; }
  if (jgl  && mid)  { score += pairScore(jgl,  mid)  * 0.8; count += 0.8; }
  if (mid  && gold) { score += pairScore(mid,  gold) * 0.6; count += 0.6; }

  return count > 0 ? clamp(Math.round((score / count) * 100), 0, 100) : 50;
}

// ─── Why text ─────────────────────────────────────────────────────────────────
function buildWhy(hero: HeroData, lane: LaneKey, archetype: DraftArchetype): string {
  const archScores  = heroArchetypeScores(hero);
  const fit         = clamp(Math.round((archScores[archetype] ?? 0) * 10), 0, 100);
  const role        = hero.roles[0] ?? 'Héros';
  const laneLabel   = ({ EXP: 'EXP Lane', Jungle: 'Jungle', Mid: 'Mid Lane', Gold: 'Gold Lane', Roam: 'Roam' } as Record<string, string>)[lane] ?? lane;
  const wr          = ((hero.winRate ?? 0) * 100).toFixed(1);
  return `${role} ${laneLabel} — score ${ARCHETYPE_LABELS[archetype]} : ${fit}/100 · WR ${wr}%`;
}

// ─── Win condition per archetype ──────────────────────────────────────────────
function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const find = (lane: string) => slots.find((s) => s.lane === lane)?.hero.name ?? '?';
  const gold = find('Gold');
  const roam = find('Roam');
  const jgl  = find('Jungle');
  const mid  = find('Mid');
  const exp  = find('EXP');
  const cond: Record<DraftArchetype, string> = {
    engage:  `${roam} initie, ${jgl} plonge en seconde, ${mid} et ${gold} suivent derrière. Convergence < 2 secondes. Objectif Lord après chaque fight.`,
    poke:    `${mid} + ${gold} harcèlent depuis l'arrière pendant que ${jgl} sécurise les objectifs. Engagez seulement quand l'ennemi est < 60% de vie.`,
    protect: `Construisez un mur autour de ${gold}. ${roam} peel, ${jgl} couvre les flancs, ${mid} deal depuis la sécurité. Ne cherchez pas le 5v5 ouvert.`,
    split:   `${exp} force une réponse sur la side lane. ${jgl} conteste les objectifs. Ne jamais 5v5 — forcez les choix 1v2 ou 3v2.`,
    catch:   `${jgl} et ${roam} isolent une cible déplacée — ${mid} burst, ${exp} nettoie. Jamais de fight en plein champ ouvert.`,
  };
  return cond[archetype];
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function generateArchetypeDrafts(
  archetype: DraftArchetype,
  heroPool: HeroData[],
  excludedIds: Set<string> = new Set()
): GeneratedDraft[] {
  const LANES: LaneKey[] = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'];

  // ── 1. Build valid candidates per lane (both gates: role + tier list) ────
  const pool = heroPool.filter((h) => !excludedIds.has(String(h.id)));

  const candidates: Record<LaneKey, HeroData[]> = {} as Record<LaneKey, HeroData[]>;
  for (const lane of LANES) {
    candidates[lane] = pool
      .filter((h) => isValidCandidate(h, lane))
      .sort((a, b) => scoreHeroForSlot(b, lane, archetype) - scoreHeroForSlot(a, lane, archetype))
      .slice(0, 8);
  }

  // ── 2. Build ban recommendations ──────────────────────────────────────────
  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([a]) => a as DraftArchetype);

  const bans: GeneratedBan[] = pool
    .map((h) => {
      const scores     = heroArchetypeScores(h);
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const metaBonus  = clamp((h.winRate ?? 0.50) - 0.50, 0, 0.10) * 20;
      return { hero: h, score: counterStr + metaBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((c, i) => ({
      hero:     c.hero,
      priority: (i < 2 ? 'must-ban' : i < 4 ? 'high' : 'situational') as GeneratedBan['priority'],
      reason:   i < 2
        ? `Contre directement votre stratégie ${ARCHETYPE_LABELS[archetype]}`
        : i < 4 ? `Méta fort pouvant perturber votre plan`
        : `Situationnel — bannir si l'ennemi semble le viser`,
    }));

  // ── 3. Generate compositions with synergy scoring ─────────────────────────
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

            // No duplicate heroes
            const ids = [heroEXP.id, heroJGL.id, heroMid.id, heroGold.id, heroRoam.id];
            if (new Set(ids).size < 5) continue;
            const key = [...ids].sort().join(',');
            if (usedKeys.has(key)) continue;
            usedKeys.add(key);

            const fn = heroArchetypeScores;
            const slots: GeneratedDraftSlot[] = [
              { lane: 'EXP',    hero: heroEXP,  archetypeFit: clamp(Math.round(fn(heroEXP)[archetype]  * 10), 0, 100), role: heroEXP.roles[0]  ?? '', why: buildWhy(heroEXP,  'EXP',    archetype) },
              { lane: 'Jungle', hero: heroJGL,  archetypeFit: clamp(Math.round(fn(heroJGL)[archetype]  * 10), 0, 100), role: heroJGL.roles[0]  ?? '', why: buildWhy(heroJGL,  'Jungle', archetype) },
              { lane: 'Mid',    hero: heroMid,  archetypeFit: clamp(Math.round(fn(heroMid)[archetype]  * 10), 0, 100), role: heroMid.roles[0]  ?? '', why: buildWhy(heroMid,  'Mid',    archetype) },
              { lane: 'Gold',   hero: heroGold, archetypeFit: clamp(Math.round(fn(heroGold)[archetype] * 10), 0, 100), role: heroGold.roles[0] ?? '', why: buildWhy(heroGold, 'Gold',   archetype) },
              { lane: 'Roam',   hero: heroRoam, archetypeFit: clamp(Math.round(fn(heroRoam)[archetype] * 10), 0, 100), role: heroRoam.roles[0] ?? '', why: buildWhy(heroRoam, 'Roam',   archetype) },
            ];

            // Individual lane scores (weighted blend)
            const indivScore = clamp(
              Math.round(
                slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.lane, archetype), 0) / 5 * 100
              ), 0, 100
            );

            // Pair synergy score (Roam-Mid, Roam-Gold, JGL-EXP, etc.)
            const synergy = computePairSynergy(slots);

            // Final team score: 75% individual quality + 25% pair synergy
            const teamScore = clamp(Math.round(indivScore * 0.75 + synergy * 0.25), 0, 100);

            drafts.push({
              rank: drafts.length + 1,
              slots,
              bans,
              teamScore,
              synergyScore: synergy,
              winCondition: buildWinCondition(archetype, slots),
              archetype,
            });
          }
        }
      }
    }
  }

  return drafts
    .sort((a, b) => b.teamScore - a.teamScore)
    .map((d, i) => ({ ...d, rank: i + 1 }));
}
