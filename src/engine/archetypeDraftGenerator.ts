import type { HeroData, DraftArchetype } from '@/types/draft';
import { heroArchetypeScores, ARCHETYPE_BEATS, ARCHETYPE_LABELS } from './archetypeEngine';
import { getHeroTierScore, getHeroLanes, LANE_TIERS } from '@/data/tierList';
import type { LaneKey, TierRank } from '@/data/tierList';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedDraftSlot {
  lane:         'EXP' | 'Jungle' | 'Mid' | 'Gold' | 'Roam';
  hero:          HeroData;
  archetypeFit:  number;   // 0-100
  role:          string;   // canonical role for this lane
  why:           string;
  alternatives:  HeroData[]; // backup picks if this hero is banned
}

export interface GeneratedBan {
  hero:     HeroData;
  priority: 'must-ban' | 'high' | 'situational';
  reason:   string;
}

export interface GeneratedDraft {
  rank:         number;
  slots:        GeneratedDraftSlot[];
  bans:         GeneratedBan[];   // excludes heroes used in this composition
  teamScore:    number;   // 0-100
  synergyScore: number;  // 0-100
  winCondition: string;
  archetype:    DraftArchetype;
}

// ─── Role gates ───────────────────────────────────────────────────────────────
// A hero MUST have at least one of these roles to qualify for the lane.

// Role → primary lane logic (mirrors https://mlbb-stats.rone.dev/api/hero-position):
//   fighter   → Exp Lane        assassin → Jungle
//   mage      → Mid Lane        Marksman → Gold Lane
//   tank      → Roam            support  → Roam
//
// Jungle: Tank-only heroes (Lolita, Khufra…) are Roam heroes — they do NOT jungle.
// A hero like Fredrinn (Fighter + Tank) qualifies via the Fighter role.
const LANE_CANONICAL_ROLES: Record<LaneKey, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Tank', 'Support'],
  Jungle: ['Assassin', 'Fighter'],   // ← Tank removed: tank primary = Roam, not Jungle
  EXP:    ['Fighter', 'Assassin'],
  Mid:    ['Mage'],
};

// The best role label to show for a hero in a given lane
function canonicalRoleLabel(hero: HeroData, lane: LaneKey): string {
  const required = LANE_CANONICAL_ROLES[lane] ?? [];
  return hero.roles.find((r) => required.includes(r)) ?? hero.roles[0] ?? 'Héros';
}

// Mid lane: Assassins are only valid if they appear explicitly in the Mid tier list
const MID_TIER_NAMES = new Set(
  (Object.values(LANE_TIERS['Mid']) as string[][]).flat().map((n) => n.toLowerCase())
);

// Tiers we consider viable for a lane slot (C = too weak to recommend)
const VIABLE_TIERS: TierRank[] = ['S+', 'S-', 'A+', 'A', 'B'];

function isValidCandidate(hero: HeroData, lane: LaneKey): boolean {
  const canonical = LANE_CANONICAL_ROLES[lane] ?? [];
  const hasRole   = hero.roles.some((r) => canonical.includes(r));
  if (!hasRole) return false;

  // Check presence in a viable tier (C excluded — those heroes aren't draftable)
  const inTierList = (VIABLE_TIERS).some((tier) =>
    (LANE_TIERS[lane][tier] ?? []).some((n) => n.toLowerCase() === hero.name.toLowerCase())
  );
  if (inTierList) return true;

  // Not in tier list — only allow if this is the hero's natural primary lane
  const heroLanes = getHeroLanes(hero.name, hero.roles);
  if (heroLanes.includes(lane)) return true;

  // Assassin in Mid is only valid when explicitly in the Mid tier list
  if (lane === 'Mid' && hero.roles.includes('Assassin') && !hero.roles.includes('Mage')) {
    return MID_TIER_NAMES.has(hero.name.toLowerCase());
  }

  return false;
}

// ─── Per-archetype lane weight ────────────────────────────────────────────────

const LANE_ARCH_WEIGHT: Record<DraftArchetype, Record<string, number>> = {
  engage:  { EXP: 1.2, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 1.5 },
  poke:    { EXP: 0.9, Jungle: 0.8, Mid: 1.5, Gold: 1.4, Roam: 1.0 },
  protect: { EXP: 0.8, Jungle: 1.0, Mid: 1.2, Gold: 1.5, Roam: 1.5 },
  split:   { EXP: 1.5, Jungle: 1.3, Mid: 0.9, Gold: 1.0, Roam: 0.8 },
  catch:   { EXP: 1.2, Jungle: 1.4, Mid: 1.2, Gold: 1.0, Roam: 1.1 },
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreHeroForSlot(hero: HeroData, lane: LaneKey, archetype: DraftArchetype): number {
  const archFit  = clamp((heroArchetypeScores(hero)[archetype] ?? 0) / 10, 0, 1);
  const tierFit  = clamp(getHeroTierScore(hero.name, hero.roles) / 10, 0, 1);
  const wrFit    = clamp(((hero.winRate ?? 0.50) - 0.45) / 0.15, 0, 1);
  const laneW    = LANE_ARCH_WEIGHT[archetype][lane] ?? 1.0;
  return clamp((archFit * 0.50 + tierFit * 0.35 + wrFit * 0.15) * laneW, 0, 1.5);
}

// ─── Synergy scoring ──────────────────────────────────────────────────────────
// Two signals:
//   1. API synergy list (sparse but accurate when present)
//   2. Role-based affinity (tank+mage, support+marksman, etc.)

const ROLE_AFFINITY: Record<string, string[]> = {
  Tank:     ['Mage', 'Assassin', 'Marksman'],
  Support:  ['Marksman', 'Mage', 'Fighter'],
  Mage:     ['Tank', 'Support', 'Fighter'],
  Marksman: ['Support', 'Tank'],
  Fighter:  ['Support', 'Mage'],
  Assassin: ['Tank', 'Support'],
};

function pairSynergyScore(a: HeroData, b: HeroData): number {
  // API signal
  let apiScore = 0;
  if (a.synergies.includes(b.id)) apiScore += 1.0;
  if (b.synergies.includes(a.id)) apiScore += 1.0;
  if (a.counters.includes(b.id) || b.counters.includes(a.id)) apiScore -= 0.5;

  // Role-based fallback
  const roleA = a.roles[0] ?? '';
  const roleB = b.roles[0] ?? '';
  const roleScore = (ROLE_AFFINITY[roleA]?.includes(roleB) ? 0.5 : 0)
                  + (ROLE_AFFINITY[roleB]?.includes(roleA) ? 0.5 : 0);

  // Blend: if API data exists, weight it heavier
  const hasApi = apiScore !== 0;
  return clamp(hasApi ? apiScore * 0.70 + roleScore * 0.30 : roleScore, 0, 1);
}

function computeTeamSynergy(slots: GeneratedDraftSlot[]): number {
  const byLane = Object.fromEntries(slots.map((s) => [s.lane, s.hero]));
  const roam   = byLane['Roam'];
  const mid    = byLane['Mid'];
  const gold   = byLane['Gold'];
  const jgl    = byLane['Jungle'];
  const exp    = byLane['EXP'];

  // Weighted pairs — Roam↔Mid most important (always lane together)
  const pairs: [HeroData, HeroData, number][] = [
    [roam, mid,  2.0],  // duo lane: roam rotates with mage
    [roam, gold, 1.5],  // peel: roam protects carry
    [jgl,  exp,  1.2],  // dive coordination
    [jgl,  mid,  0.8],  // gank → mage followup
    [mid,  gold, 0.6],  // safe follow from mid for carry
  ];

  let total = 0, weight = 0;
  for (const [a, b, w] of pairs) {
    if (!a || !b) continue;
    total  += pairSynergyScore(a, b) * w;
    weight += w;
  }

  return weight > 0 ? clamp(Math.round((total / weight) * 100), 0, 100) : 50;
}

// ─── Diversity check ──────────────────────────────────────────────────────────
// Two compositions are "too similar" if they share 4+ heroes.
// We enforce that each added composition differs by at least 2 heroes from all existing ones.

function isDiverseEnough(draft: GeneratedDraft, selected: GeneratedDraft[]): boolean {
  const ids = new Set(draft.slots.map((s) => s.hero.id));
  for (const existing of selected) {
    const shared = existing.slots.filter((s) => ids.has(s.hero.id)).length;
    if (shared >= 4) return false; // too similar → skip
  }
  return true;
}

// ─── Win condition ────────────────────────────────────────────────────────────

function buildWinCondition(archetype: DraftArchetype, slots: GeneratedDraftSlot[]): string {
  const find = (lane: string) => slots.find((s) => s.lane === lane)?.hero.name ?? '?';
  const gold = find('Gold');
  const roam = find('Roam');
  const jgl  = find('Jungle');
  const mid  = find('Mid');
  const exp  = find('EXP');
  const cond: Record<DraftArchetype, string> = {
    engage:  `${roam} initie, ${jgl} plonge immédiatement. ${mid} + ${gold} finissent le fight. Convergence < 2 secondes — objectif Lord après chaque fight gagné.`,
    poke:    `${mid} + ${gold} harcèlent avant chaque objectif. ${jgl} sécurise les buffs et les objectifs. Engagez seulement quand l'ennemi est < 60% de vie.`,
    protect: `Mur défensif autour de ${gold} : ${roam} peel, ${jgl} couvre les flancs. ${mid} deal depuis la sécurité. Ne cherchez pas le fight ouvert — attendez le late game.`,
    split:   `${exp} force une réponse side lane. ${jgl} conteste les objectifs en même temps. Ne jamais 5v5 — forcez les choix impossibles 1v2 et 3v2.`,
    catch:   `${jgl} + ${roam} isolent une cible déplacée. ${mid} burst, ${exp} nettoie. Jamais de fight en plein champ — toujours initier sur une cible seule.`,
  };
  return cond[archetype];
}

// ─── Why text ─────────────────────────────────────────────────────────────────

function buildWhy(hero: HeroData, lane: LaneKey, archetype: DraftArchetype): string {
  const fit      = clamp(Math.round((heroArchetypeScores(hero)[archetype] ?? 0) * 10), 0, 100);
  const role     = canonicalRoleLabel(hero, lane);
  const laneStr  = ({ EXP: 'EXP Lane', Jungle: 'Jungle', Mid: 'Mid Lane', Gold: 'Gold Lane', Roam: 'Roam' } as Record<string, string>)[lane] ?? lane;
  const wr       = ((hero.winRate ?? 0) * 100).toFixed(1);
  return `${role} ${laneStr} — score ${ARCHETYPE_LABELS[archetype]} : ${fit}/100 · WR ${wr}%`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateArchetypeDrafts(
  archetype: DraftArchetype,
  heroPool: HeroData[],
  excludedIds: Set<string> = new Set()
): GeneratedDraft[] {
  const LANES: LaneKey[] = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'];
  const pool = heroPool.filter((h) => !excludedIds.has(String(h.id)));

  // ── 1. Candidates per lane (double gate: role + tier list) ─────────────
  const candidates: Record<LaneKey, HeroData[]> = {} as Record<LaneKey, HeroData[]>;
  for (const lane of LANES) {
    candidates[lane] = pool
      .filter((h) => isValidCandidate(h, lane))
      .sort((a, b) => scoreHeroForSlot(b, lane, archetype) - scoreHeroForSlot(a, lane, archetype))
      .slice(0, 10); // keep top 10 per lane for more composition diversity
  }

  // ── 2. Global ban candidates (before filtering per composition) ─────────
  const beatsUs = Object.entries(ARCHETYPE_BEATS)
    .filter(([, beats]) => beats.includes(archetype))
    .map(([a]) => a as DraftArchetype);

  const banPool = pool
    .map((h) => {
      const scores     = heroArchetypeScores(h);
      const counterStr = beatsUs.reduce((s, a) => s + (scores[a] ?? 0), 0) / Math.max(beatsUs.length, 1);
      const metaBonus  = clamp((h.winRate ?? 0.50) - 0.50, 0, 0.10) * 20;
      return { hero: h, score: counterStr + metaBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12); // wider pool so each composition has 6 bans after excluding its own picks

  // ── 3. Generate all valid compositions, then select top 10 diverse ones ─
  const allDrafts: GeneratedDraft[] = [];
  const usedKeys  = new Set<string>();

  outer:
  for (let a = 0; a < 10; a++) {
    for (let b = 0; b < 10; b++) {
      for (let c = 0; c < 10; c++) {
        for (let d = 0; d < 10; d++) {
          for (let e = 0; e < 10; e++) {
            if (allDrafts.length >= 80) break outer; // generate many, then pick diverse top 10

            const heroEXP  = candidates['EXP'][a];
            const heroJGL  = candidates['Jungle'][b];
            const heroMid  = candidates['Mid'][c];
            const heroGold = candidates['Gold'][d];
            const heroRoam = candidates['Roam'][e];

            if (!heroEXP || !heroJGL || !heroMid || !heroGold || !heroRoam) continue;

            const ids = [heroEXP.id, heroJGL.id, heroMid.id, heroGold.id, heroRoam.id];
            if (new Set(ids).size < 5) continue;
            const key = [...ids].sort().join(',');
            if (usedKeys.has(key)) continue;
            usedKeys.add(key);

            const compIds = new Set(ids);

            // Per-composition bans: exclude heroes used in this composition
            const compBans: GeneratedBan[] = banPool
              .filter((c) => !compIds.has(c.hero.id))
              .slice(0, 6)
              .map((c, i) => ({
                hero:     c.hero,
                priority: (i < 2 ? 'must-ban' : i < 4 ? 'high' : 'situational') as GeneratedBan['priority'],
                reason:   i < 2
                  ? `Contre directement votre ${ARCHETYPE_LABELS[archetype]}`
                  : i < 4 ? `Méta fort pouvant perturber votre stratégie`
                  : `Situationnel — bannir si l'ennemi semble le viser`,
              }));

            // Build slots with alternatives (next best candidate not already in compo)
            const buildSlot = (hero: HeroData, lane: LaneKey): GeneratedDraftSlot => ({
              lane,
              hero,
              archetypeFit: clamp(Math.round((heroArchetypeScores(hero)[archetype] ?? 0) * 10), 0, 100),
              role:         canonicalRoleLabel(hero, lane),
              why:          buildWhy(hero, lane, archetype),
              alternatives: candidates[lane]
                .filter((h) => !compIds.has(h.id))
                .slice(0, 2),
            });

            const slots: GeneratedDraftSlot[] = [
              buildSlot(heroEXP,  'EXP'),
              buildSlot(heroJGL,  'Jungle'),
              buildSlot(heroMid,  'Mid'),
              buildSlot(heroGold, 'Gold'),
              buildSlot(heroRoam, 'Roam'),
            ];

            const indivScore = clamp(
              Math.round(
                slots.reduce((s, sl) => s + scoreHeroForSlot(sl.hero, sl.lane, archetype), 0) / 5 * 100
              ), 0, 100
            );
            const synergy   = computeTeamSynergy(slots);
            const teamScore = clamp(Math.round(indivScore * 0.75 + synergy * 0.25), 0, 100);

            allDrafts.push({
              rank: 0,
              slots,
              bans:         compBans,
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

  // ── 4. Sort and apply diversity filter — keep top 10 diverse compositions
  allDrafts.sort((a, b) => b.teamScore - a.teamScore);

  const selected: GeneratedDraft[] = [];
  for (const draft of allDrafts) {
    if (selected.length >= 10) break;
    if (isDiverseEnough(draft, selected)) {
      selected.push({ ...draft, rank: selected.length + 1 });
    }
  }

  return selected;
}
