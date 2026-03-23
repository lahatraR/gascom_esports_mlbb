// ─── Winning Lineup Engine ────────────────────────────────────────────────────
//
// Builds the optimal FULL 5-hero lineup for our team with:
//  · French contextual explanations per slot
//  · Ban threat analysis (which of our heroes the enemy should ban + backups)

import type {
  HeroData, DraftArchetype, WinningLineup, WinningLineupSlot, BanThreat, LaneRole,
} from '@/types/draft';
import {
  detectTeamArchetype,
  ARCHETYPE_BEATS,
  ARCHETYPE_LABELS,
  heroArchetypeFit,
} from './archetypeEngine';
import { calculateMetaScore } from './draftEngine';
import { LANE_TIERS, TIER_META_SCORE, type TierRank } from '@/data/tierList';

// ─── French locale constants ──────────────────────────────────────────────────

const LANE_FR: Record<LaneRole, string> = {
  Gold:   'Gold Lane',
  Roam:   'Roam/Support',
  Jungle: 'Jungle',
  Mid:    'Mid Lane',
  EXP:    'EXP Lane',
};

const LANE_ROLE_FR: Record<LaneRole, string> = {
  Gold:   'carry principal (Marksman) — domine sa lane, farm sécurisé, dégâts élevés et scaling late game',
  Roam:   'initiateur/support — vision, engage principal, CC ou peel selon si Tank ou Support',
  Jungle: 'jungler — objectifs (Lord/Turtle/buffs), ganks et pression globale sur la map',
  Mid:    'mage — clear rapide de lane, rotations et ralentissement de la backline ennemie',
  EXP:    'dueliste (Fighter) — pression XP, engageur secondaire, CC sur la backline adverse',
};

// Description courte du rôle de chaque lane (affichée dans les raisons)
const LANE_OBJECTIVE_FR: Record<LaneRole, string> = {
  Gold:   'Farmez votre lane, évitez les morts et montez en puissance pour le late game',
  Roam:   'Posez de la vision, aidez le clear de lane, puis engagez ou peelez selon le tempo',
  Jungle: 'Sécurisez Lord/Turtle/buffs, gankez aux bons moments et maintenez la pression globale',
  Mid:    'Clearez vite, rotatez pour aider les autres lanes et posez du poke à distance',
  EXP:    'Gagnez votre duel de lane, montez en XP et soyez prêt à engager ou suivre le team fight',
};

const ARCHETYPE_FR: Record<DraftArchetype, string> = {
  engage:  'Engage',
  poke:    'Poke',
  protect: 'Protect',
  split:   'Split Push',
  catch:   'Catch',
};

const WIN_CONDITIONS_FR: Record<DraftArchetype, string> = {
  protect: 'Scalez en late game en sécurité — protégez votre carry à chaque ouverture de burst. Jouez conservativement et contrôlez les objectifs avec votre peel.',
  poke:    'Usez les adversaires à distance avant chaque fight — forcez de mauvais engages ou cédez les objectifs. Maintenez la distance et pénalisez toute mauvaise position.',
  engage:  'Forcez des team fights avec du CC en chaîne — écrasez l\'adversaire avant qu\'il puisse se repositionner. Cherchez des engages sur plusieurs cibles simultanément.',
  split:   'Appliquez une pression simultanée sur plusieurs lanes — forcez des réponses 4v5 perdantes. Contrôlez la map et prenez des objectifs pendant que l\'ennemi court.',
  catch:   'Éliminez les cibles isolées avant les fights — snowballez les picks en avantages d\'objectifs. Attendez une erreur de position puis frappez vite et fort.',
};

// ─── Lane constants ───────────────────────────────────────────────────────────

const LANES: LaneRole[] = ['Gold', 'Roam', 'Jungle', 'Mid', 'EXP'];

const LANE_PRIMARY_ROLES: Record<LaneRole, string[]> = {
  Gold:   ['Marksman'],
  Roam:   ['Support', 'Tank'],
  Jungle: ['Assassin', 'Fighter'],
  Mid:    ['Mage', 'Assassin'],
  EXP:    ['Fighter', 'Tank'],
};

// ─── Profil de stats par rôle ─────────────────────────────────────────────────
//
// Basé sur les responsabilités réelles de chaque poste :
//
// Gold/Marksman  : domine sa lane, farm sécurisé, dégâts élevés, scaling late game
// Roam/Tank-Supp : vision, engage principal, CC/peel, tankiness (tank) ou utilitaire (support)
// Jungle         : contrôle des objectifs (Lord/Turtle/buffs), pression globale, gank
//                  → tanky jungler : engage + CC ; assassin : burst + mobilité
// Mid/Mage       : clear rapide, rotation, poke, ralentissement de la backline adverse
// EXP/Fighter    : dueliste, engageur secondaire, CC backline, early game fort

type HeroStat = 'damage' | 'cc' | 'tankiness' | 'mobility' | 'push' | 'late' | 'early' | 'pressure';

const LANE_STAT_WEIGHTS: Record<LaneRole, [HeroStat, number][]> = {
  // Marksman : dégâts élevés + scaling late + farm/push de lane (évite les morts early)
  Gold:   [['damage', 3], ['late', 3], ['push', 1], ['early', 1]],
  // Tank/Support : CC en priorité (engage ou peel), tankiness, soutien précoce
  Roam:   [['cc', 3], ['tankiness', 3], ['early', 2], ['pressure', 1]],
  // Jungler : pression globale sur la map, objectifs, mobilité — tanky ou burst selon le type
  Jungle: [['pressure', 3], ['mobility', 2], ['damage', 2], ['cc', 2], ['early', 1]],
  // Mage : clear rapide (push), dégâts, mobilité pour les rotations
  Mid:    [['damage', 3], ['push', 3], ['mobility', 2], ['cc', 1]],
  // Fighter/EXP : early game fort, duel, engage secondaire, CC sur la backline
  EXP:    [['early', 3], ['cc', 2], ['damage', 2], ['tankiness', 2], ['mobility', 1]],
};

// ─── Lane tier score ──────────────────────────────────────────────────────────

function getHeroLaneTierScore(heroName: string, lane: LaneRole): number {
  const tierMap = LANE_TIERS[lane];
  for (const [tier, heroes] of Object.entries(tierMap)) {
    if ((heroes as string[] | undefined)?.includes(heroName)) {
      return TIER_META_SCORE[tier as TierRank];
    }
  }
  return 0;
}

function getLaneScore(hero: HeroData, lane: LaneRole): number {
  const tier = getHeroLaneTierScore(hero.name, lane);
  if (tier > 0) return tier;
  const expected = LANE_PRIMARY_ROLES[lane];
  const primary  = hero.roles[0];
  if (expected[0] === primary)                        return 4.5;
  if (expected.includes(primary))                     return 3.0;
  if (hero.roles.some((r) => expected.includes(r)))   return 1.5;
  return 0;
}

// ─── Stat score par lane ──────────────────────────────────────────────────────

/**
 * Score 0–10 basé sur le profil de stats du héros vs les exigences du rôle.
 * Récompense un Marksman avec beaucoup de damage/late, un Tank avec cc/tankiness, etc.
 */
function getLaneStatScore(hero: HeroData, lane: LaneRole): number {
  const weights = LANE_STAT_WEIGHTS[lane];
  const totalWeight = weights.reduce((s, [, w]) => s + w, 0);
  const weightedSum = weights.reduce((s, [stat, w]) => s + (hero[stat] ?? 0) * w, 0);
  return weightedSum / totalWeight; // résultat 0–10
}

/**
 * Multiplicateur appliqué au score total d'un héros selon son adéquation au poste.
 * Un héros hors-rôle ne peut pas être sauvé par un bon fit d'archétype seul.
 *
 * - Listé dans le tier list pour cette lane → 1.0 (autorisé explicitement)
 * - Rôle principal correspond parfaitement → 1.0
 * - Rôle secondaire acceptable → 0.70
 * - Un rôle parmi plusieurs correspond → 0.45
 * - Aucun rôle compatible → 0.20  (dernier recours uniquement)
 */
function getLaneFitMultiplier(hero: HeroData, lane: LaneRole): number {
  if (getHeroLaneTierScore(hero.name, lane) > 0) return 1.0;
  const expected = LANE_PRIMARY_ROLES[lane];
  const primary  = hero.roles[0];
  if (expected[0] === primary)                      return 1.0;
  if (expected.includes(primary))                   return 0.70;
  if (hero.roles.some((r) => expected.includes(r))) return 0.45;
  return 0.20;
}

// ─── Slot scoring ─────────────────────────────────────────────────────────────

function scoreHeroForSlot(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
): number {
  const archFit   = heroArchetypeFit(hero, archetype) * 10;
  const laneScore = getLaneScore(hero, lane);

  let counterRaw = 0;
  for (const e of enemyPicks) {
    if (hero.counters.includes(e.id))    counterRaw += 2;
    if (hero.counteredBy.includes(e.id)) counterRaw -= 1.5;
  }
  const counterScore = clamp(counterRaw + 5, 0, 10);

  let synergyRaw = 0;
  for (const a of allyPicks) {
    if (hero.synergies.includes(a.id)) synergyRaw += 2;
    if (a.synergies.includes(hero.id)) synergyRaw += 1;
  }
  const synergyScore   = clamp(synergyRaw + 3, 0, 10);
  const metaScore      = calculateMetaScore(hero);
  const laneStatScore  = getLaneStatScore(hero, lane);  // stats vs rôle du poste

  // Multiplicateur de poste : un héros hors-rôle ne peut pas compenser par l'archétype seul
  const laneFitMult = getLaneFitMultiplier(hero, lane);

  const rawScore = archFit * 3 + laneScore * 3 + laneStatScore * 2 + counterScore * 2 + synergyScore + metaScore;
  return rawScore * laneFitMult;
}

// ─── French text generators ───────────────────────────────────────────────────

function getHeroStrengthsFR(hero: HeroData): string[] {
  const s: string[] = [];
  if (hero.damage    > 7.5) s.push('fort potentiel de dégâts');
  if (hero.cc        > 7.5) s.push('contrôle de foule puissant');
  if (hero.tankiness > 7.5) s.push('excellente résistance');
  if (hero.mobility  > 7.5) s.push('mobilité exceptionnelle');
  if (hero.push      > 7.5) s.push('pression de lane élevée');
  if (hero.late      > 7.5) s.push('scaling late game dominant');
  if (hero.early     > 7.5) s.push('early game agressif');
  if (hero.pressure  > 7.5) s.push('forte pression de map');
  return s;
}

function buildShortReasonFR(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
  isLocked:   boolean,
): string {
  if (isLocked) {
    return getLaneScore(hero, lane) > 6
      ? `Référence ${LANE_FR[lane]} · Verrouillé`
      : `Assigné en ${LANE_FR[lane]} · Verrouillé`;
  }

  const parts: string[] = [];
  const countered = enemyPicks.filter((e) => hero.counters.includes(e.id));
  if (countered.length >= 2) parts.push(`Contre ${countered.map((e) => e.name).join(' & ')}`);
  else if (countered.length === 1) parts.push(`Avantage sur ${countered[0].name}`);

  const arcFit = heroArchetypeFit(hero, archetype);
  if (arcFit > 0.70) parts.push(`Pilier ${ARCHETYPE_FR[archetype]}`);

  const tier = getLaneScore(hero, lane);
  if (tier > 7) parts.push(`Tier S/A ${LANE_FR[lane]}`);

  const synergies = allyPicks.filter(
    (a) => hero.synergies.includes(a.id) || a.synergies.includes(hero.id)
  );
  if (synergies.length > 0) parts.push(`Synergie avec ${synergies[0].name}`);

  // Avertissement hors-rôle
  const laneFitMult = getLaneFitMultiplier(hero, lane);
  if (laneFitMult < 0.5) {
    parts.push(`⚠️ Hors rôle (${hero.roles[0]} en ${LANE_FR[lane]})`);
  }

  if (parts.length === 0) parts.push(`Meilleur disponible en ${LANE_FR[lane]}`);
  return parts.join(' · ');
}

function buildDetailedReasonFR(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
  isLocked:   boolean,
): string {
  const sentences: string[] = [];

  // 1. Rôle + objectif de lane
  sentences.push(
    `**${hero.name}** occupe la ${LANE_FR[lane]} en tant que ${LANE_ROLE_FR[lane]}.`
  );
  sentences.push(`🎯 Objectif : ${LANE_OBJECTIVE_FR[lane]}.`);

  if (isLocked) {
    sentences.push(`Ce héros est déjà verrouillé dans votre draft.`);
    return sentences.join(' ');
  }

  // 2. Counter relationships
  const countered   = enemyPicks.filter((e) => hero.counters.includes(e.id));
  const counteredBy = enemyPicks.filter((e) => hero.counteredBy.includes(e.id));

  if (countered.length >= 2) {
    sentences.push(
      `Il contrecarre directement **${countered.map((e) => e.name).join('** et **')}**, réduisant leur impact en team fight grâce à ses capacités de ${getHeroStrengthsFR(hero)[0] ?? 'pression'}.`
    );
  } else if (countered.length === 1) {
    sentences.push(
      `Il a un avantage direct sur **${countered[0].name}**, pick clé de l'adversaire.`
    );
  }

  if (counteredBy.length > 0) {
    sentences.push(
      `⚠️ Faites attention : **${counteredBy.map((e) => e.name).join('** et **')}** peut le contrer — protégez-le avec du CC ou des soins.`
    );
  }

  // 3. Archetype fit
  const arcFit = heroArchetypeFit(hero, archetype);
  if (arcFit > 0.70) {
    sentences.push(
      `C'est un pilier de votre stratégie **${ARCHETYPE_FR[archetype]}** avec ${Math.round(arcFit * 100)}% de compatibilité.`
    );
  } else if (arcFit > 0.50) {
    sentences.push(
      `Compatible avec votre plan **${ARCHETYPE_FR[archetype]}** (${Math.round(arcFit * 100)}%).`
    );
  }

  // 4. Strengths + adéquation stats/rôle
  const strengths = getHeroStrengthsFR(hero);
  if (strengths.length >= 2) {
    sentences.push(`Forces principales : ${strengths.slice(0, 3).join(', ')}.`);
  } else if (strengths.length === 1) {
    sentences.push(`Point fort : ${strengths[0]}.`);
  }
  // Adéquation stats vs profil du rôle
  const laneStatScore = getLaneStatScore(hero, lane);
  if (laneStatScore >= 7.5) {
    sentences.push(`📊 Profil de stats excellent pour ce poste (${laneStatScore.toFixed(1)}/10).`);
  } else if (laneStatScore >= 5.5) {
    sentences.push(`📊 Profil de stats correct pour ce poste (${laneStatScore.toFixed(1)}/10).`);
  } else if (laneStatScore < 4.0) {
    sentences.push(`📊 Profil de stats en dessous de l'idéal pour ce poste (${laneStatScore.toFixed(1)}/10) — à considérer seulement si d'autres facteurs le justifient.`);
  }

  // 5. Synergy
  const synergies = allyPicks.filter(
    (a) => hero.synergies.includes(a.id) || a.synergies.includes(hero.id)
  );
  if (synergies.length >= 2) {
    sentences.push(
      `Synergie confirmée avec **${synergies.map((a) => a.name).join('** et **')}** — combinez leurs skills pour maximiser l'impact.`
    );
  } else if (synergies.length === 1) {
    sentences.push(
      `Joue bien avec **${synergies[0].name}** — exploitez leur synergie en team fight.`
    );
  }

  // 6. Avertissement hors-rôle
  const laneFitMult = getLaneFitMultiplier(hero, lane);
  if (laneFitMult < 0.5 && !isLocked) {
    const expectedRole = LANE_PRIMARY_ROLES[lane][0];
    sentences.push(
      `⚠️ **${hero.name}** est un(e) **${hero.roles[0]}**, pas ${expectedRole} — la ${LANE_FR[lane]} est normalement tenue par un(e) ${expectedRole}. Ce pick n'est suggéré que faute de mieux disponible, ou si l'ennemi impose ce choix.`
    );
  }

  // 7. Meta status
  if (hero.banRate > 0.20) {
    sentences.push(
      `Ce héros est actuellement très présent en compétition (${Math.round(hero.banRate * 100)}% de ban rate) — priorité haute.`
    );
  }

  return sentences.join(' ');
}

// ─── Ban threat analysis ──────────────────────────────────────────────────────

function scoreBanThreat(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
): number {
  let score = 0;

  // Meta priority — enemy will ban high-rate heroes
  if (hero.banRate > 0.25) score += 5;
  else if (hero.banRate > 0.15) score += 3;
  else if (hero.banRate > 0.08) score += 1;

  // Counter value — enemy bans heroes who counter their picks
  const counterCount = enemyPicks.filter((e) => hero.counters.includes(e.id)).length;
  score += counterCount * 3;

  // Win rate
  if (hero.winRate > 0.535) score += 2;
  else if (hero.winRate > 0.515) score += 1;

  // Lane tier
  if (getLaneScore(hero, lane) > 7) score += 2;

  // Archetype pillar
  if (heroArchetypeFit(hero, archetype) > 0.70) score += 1;

  return score;
}

function buildBanThreatReasonFR(
  hero:       HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
): string {
  const reasons: string[] = [];

  const countered = enemyPicks.filter((e) => hero.counters.includes(e.id));
  if (countered.length >= 2) {
    reasons.push(`contrecarre ${countered.map((e) => e.name).join(' et ')} simultanément`);
  } else if (countered.length === 1) {
    reasons.push(`domine ${countered[0].name}, pick clé de l'adversaire`);
  }

  if (hero.banRate > 0.20) {
    reasons.push(`héros très banni en compétition (${Math.round(hero.banRate * 100)}% ban rate)`);
  }

  if (getLaneScore(hero, lane) > 7) {
    reasons.push(`référence S/A-tier en ${LANE_FR[lane]}`);
  }

  if (heroArchetypeFit(hero, archetype) > 0.70) {
    reasons.push(`pilier de votre stratégie ${ARCHETYPE_FR[archetype]}`);
  }

  if (reasons.length === 0) reasons.push(`fort potentiel dans votre composition`);

  return `L'adversaire ciblera **${hero.name}** car il ${reasons.join(', ')}.`;
}

function buildBackupReasonFR(
  backup:     HeroData,
  lane:       LaneRole,
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
): string {
  const parts: string[] = [];

  const arcFit = heroArchetypeFit(backup, archetype);
  if (arcFit > 0.60) parts.push(`compatible ${ARCHETYPE_FR[archetype]} (${Math.round(arcFit * 100)}%)`);

  const tier = getLaneScore(backup, lane);
  if (tier > 6) parts.push(`bon niveau en ${LANE_FR[lane]}`);

  const countered = enemyPicks.filter((e) => backup.counters.includes(e.id));
  if (countered.length > 0) parts.push(`contre ${countered[0].name}`);

  if (parts.length === 0) parts.push(`alternative viable en ${LANE_FR[lane]}`);

  return parts.join(' · ');
}

function buildBanThreats(
  slots:      WinningLineupSlot[],
  archetype:  DraftArchetype,
  enemyPicks: HeroData[],
  available:  HeroData[],
  usedIds:    Set<number>,
): BanThreat[] {
  // Only recommended (non-locked) picks are ban targets worth highlighting
  const candidates = slots.filter((s) => !s.isLocked);

  const scored = candidates.map((s) => ({
    slot:  s,
    score: scoreBanThreat(s.hero, s.laneRole, archetype, enemyPicks),
  }));
  scored.sort((a, b) => b.score - a.score);

  const threats: BanThreat[] = [];

  for (const { slot, score } of scored.slice(0, 3)) {
    if (score < 3) break;  // not significant enough

    // Find best backup for same lane
    const backup = available
      .filter((h) => !usedIds.has(h.id) && h.id !== slot.hero.id)
      .map((h) => ({
        hero:  h,
        score: scoreHeroForSlot(h, slot.laneRole, archetype, enemyPicks, []),
      }))
      .sort((a, b) => b.score - a.score)[0] ?? null;

    threats.push({
      hero:         slot.hero,
      banReason:    buildBanThreatReasonFR(slot.hero, slot.laneRole, archetype, enemyPicks),
      priority:     score >= 6 ? 'high' : 'medium',
      backupPick:   backup?.hero ?? null,
      backupReason: backup
        ? buildBackupReasonFR(backup.hero, slot.laneRole, archetype, enemyPicks)
        : 'Aucune alternative disponible actuellement.',
    });
  }

  return threats;
}

// ─── Archetype selection ──────────────────────────────────────────────────────

function chooseBestArchetype(
  enemyPicks: HeroData[],
  allyPicks:  HeroData[],
): DraftArchetype {
  const ALL: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];
  const enemyArch      = enemyPicks.length >= 2 ? detectTeamArchetype(enemyPicks) : null;
  const validArchetypes = enemyArch
    ? ALL.filter((a) => ARCHETYPE_BEATS[a].includes(enemyArch.primary))
    : ALL;

  if (allyPicks.length >= 1) {
    const scored = validArchetypes.map((arch) => ({
      arch,
      fit: allyPicks.reduce((s, h) => s + heroArchetypeFit(h, arch), 0) / allyPicks.length,
    }));
    scored.sort((a, b) => b.fit - a.fit);
    return scored[0].arch;
  }
  return validArchetypes[0];
}

// ─── Lane assignment for locked picks ────────────────────────────────────────

function assignLockedPicksToLanes(lockedPicks: HeroData[]): Map<LaneRole, HeroData> {
  const result    = new Map<LaneRole, HeroData>();
  const usedIds   = new Set<number>();
  const usedLanes = new Set<LaneRole>();

  const heroScores = lockedPicks.map((h) => ({
    hero:   h,
    ranked: LANES
      .map((lane) => ({ lane, score: getLaneScore(h, lane) }))
      .sort((a, b) => b.score - a.score),
  }));
  heroScores.sort((a, b) => b.ranked[0].score - a.ranked[0].score);

  for (const { hero, ranked } of heroScores) {
    if (usedIds.has(hero.id)) continue;
    for (const { lane } of ranked) {
      if (!usedLanes.has(lane)) {
        result.set(lane, hero);
        usedIds.add(hero.id);
        usedLanes.add(lane);
        break;
      }
    }
  }
  return result;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function buildWinningLineup(
  allHeroes:  HeroData[],
  allyPicks:  HeroData[],
  enemyPicks: HeroData[],
  bannedIds:  Set<number>,
  pickedIds:  Set<number>,
): WinningLineup | null {
  const archetype        = chooseBestArchetype(enemyPicks, allyPicks);
  const lockedAssignment = assignLockedPicksToLanes(allyPicks);

  const usedIds  = new Set<number>(allyPicks.map((h) => h.id));
  const available = allHeroes.filter(
    (h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)
  );

  const slots: WinningLineupSlot[] = [];

  for (const lane of LANES) {
    const locked = lockedAssignment.get(lane);
    if (locked) {
      slots.push({
        hero:           locked,
        laneRole:       lane,
        reason:         buildShortReasonFR(locked, lane, archetype, enemyPicks, allyPicks, true),
        detailedReason: buildDetailedReasonFR(locked, lane, archetype, enemyPicks, allyPicks, true),
        isLocked:       true,
      });
    } else {
      const candidates = available.filter((h) => !usedIds.has(h.id));
      if (candidates.length === 0) break;

      const scored = candidates
        .map((h) => ({
          hero:  h,
          score: scoreHeroForSlot(h, lane, archetype, enemyPicks, allyPicks),
        }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      usedIds.add(best.hero.id);
      slots.push({
        hero:           best.hero,
        laneRole:       lane,
        reason:         buildShortReasonFR(best.hero, lane, archetype, enemyPicks, allyPicks, false),
        detailedReason: buildDetailedReasonFR(best.hero, lane, archetype, enemyPicks, allyPicks, false),
        isLocked:       false,
      });
    }
  }

  if (slots.length < 5) return null;

  // Strength
  const avgScore = slots.reduce(
    (s, sl) => s + scoreHeroForSlot(sl.hero, sl.laneRole, archetype, enemyPicks, allyPicks), 0
  ) / slots.length;
  const strength = clamp(Math.round((avgScore / 90) * 100), 0, 100);

  // Archetype reason (French)
  const enemyArch = enemyPicks.length >= 2 ? detectTeamArchetype(enemyPicks) : null;
  const archetypeReason = enemyArch
    ? `Stratégie **${ARCHETYPE_LABELS[archetype]}** — contrecarre le **${ARCHETYPE_LABELS[enemyArch.primary]}** ennemi (${enemyArch.confidence}% de confiance)`
    : allyPicks.length >= 1
      ? `Stratégie **${ARCHETYPE_LABELS[archetype]}** — meilleure cohérence avec vos picks actuels`
      : `Stratégie **${ARCHETYPE_LABELS[archetype]}** — archétype le plus fort en ouverture`;

  // Ban threats
  const banThreats = buildBanThreats(slots, archetype, enemyPicks, available, usedIds);

  return {
    slots,
    archetype,
    archetypeReason,
    winCondition: WIN_CONDITIONS_FR[archetype],
    strength,
    banThreats,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
