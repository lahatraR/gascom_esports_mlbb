'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import type { DraftSuggestion, ArchetypeResult, HeroData } from '@/types/draft';
import { getTournamentPickTip, PICK_ORDER_TIPS } from '@/data/pickOrderGuide';
import { HeroCard } from '@/components/ui/HeroCard';
import { computeBanSuggestions } from '@/engine/archetypeDraftGenerator';
import type { GeneratedBan } from '@/engine/archetypeDraftGenerator';
import { difficultyColor } from '@/data/executionDifficulty';
import { simulateWhatIf } from '@/engine/whatIfEngine';
import type { WhatIfTree } from '@/engine/whatIfEngine';

const ARCH_LABEL: Record<string, string> = {
  engage: 'Engage', poke: 'Poke', protect: 'Protect', split: 'Split Push', catch: 'Catch',
};
const ARCH_COLOR: Record<string, string> = {
  engage: '#fb923c', poke: '#a78bfa', protect: '#2dd4bf', split: '#facc15', catch: '#f87171',
};
const ARCH_COUNTER_HINT: Record<string, string> = {
  engage:  'Poke · Catch',
  poke:    'Engage · Split',
  protect: 'Poke · Split',
  split:   'Catch · Engage',
  catch:   'Protect · Poke',
};

const ALL_ROLES = ['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];

// ─── Lane mapping for suggestion display ──────────────────────────────────────
const ROLE_TO_LANE: Record<string, { icon: string; label: string }> = {
  Marksman: { icon: '💰', label: 'Gold'   },
  Support:  { icon: '🛡', label: 'Roam'  },
  Tank:     { icon: '🛡', label: 'Roam'  },
  Mage:     { icon: '🔮', label: 'Mid'   },
  Assassin: { icon: '🌿', label: 'Jungle' },
  Fighter:  { icon: '⚡', label: 'EXP'   },
};
function mainLane(roles: string[]) {
  for (const r of ['Marksman', 'Support', 'Tank', 'Mage', 'Assassin', 'Fighter']) {
    if (roles.includes(r)) return ROLE_TO_LANE[r] ?? { icon: '⚔️', label: '—' };
  }
  return { icon: '⚔️', label: '—' };
}

// ─── Inline ban suggestion bar ────────────────────────────────────────────────
function InlineBanSuggestionBar({
  bans,
  team,
  onBan,
}: {
  bans:  GeneratedBan[];
  team:  'blue' | 'red';
  onBan: (hero: HeroData) => void;
}) {
  const top3 = bans.slice(0, 3);
  if (top3.length === 0) return null;

  const isBlue     = team === 'blue';
  const teamBorder = isBlue ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)';
  const teamGlow   = isBlue ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)';

  const priorityColor: Record<GeneratedBan['priority'], string> = {
    'must-ban':    '#f87171',
    'high':        '#fb923c',
    'situational': '#facc15',
  };
  const priorityLabel: Record<GeneratedBan['priority'], string> = {
    'must-ban':    '🚫 OBLIGATOIRE',
    'high':        '⚠️ PRIORITAIRE',
    'situational': '🎯 SITUATIONNEL',
  };
  const RANK = ['🥇', '🥈', '🥉'];

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: 'rgba(5,5,10,0.95)', borderColor: teamBorder, boxShadow: `0 0 12px ${teamGlow}` }}
    >
      {/* Header strip */}
      <div
        className="flex items-center gap-2 px-2.5 py-1"
        style={{ background: `linear-gradient(to right, rgba(248,113,113,0.12), transparent)`, borderBottom: `1px solid rgba(248,113,113,0.20)` }}
      >
        <span className="text-[9px]" style={{ color: '#f87171' }}>🚫</span>
        <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase shrink-0">
          Meilleurs bans
        </span>
        <span className="ml-auto text-[8px] text-slate-600 shrink-0">cliquer pour bannir</span>
      </div>

      {/* Hero chips row */}
      <div className="flex gap-0">
        {top3.map((ban, i) => {
          const c       = priorityColor[ban.priority];
          const isFirst = i === 0;
          return (
            <button
              key={ban.hero.id}
              onClick={() => onBan(ban.hero)}
              className="relative flex-1 flex items-center gap-2 px-2.5 py-1.5 group transition-all duration-150 hover:brightness-125"
              style={{
                background: isFirst ? 'rgba(248,113,113,0.06)' : 'transparent',
                borderLeft: i > 0 ? `1px solid ${teamBorder}` : undefined,
              }}
            >
              {/* Avatar with grayscale + X overlay */}
              <div
                className="relative shrink-0 rounded overflow-hidden"
                style={{ width: 30, height: 30, border: `1px solid ${c}45` }}
              >
                {ban.hero.image ? (
                  <img
                    src={ban.hero.image}
                    alt={ban.hero.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 15%', filter: 'grayscale(0.4) brightness(0.85)' }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[11px] font-black"
                    style={{ background: 'rgba(20,20,32,0.9)', color: c }}
                  >
                    {ban.hero.name.charAt(0)}
                  </div>
                )}
                {/* X badge bottom-right */}
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center rounded-tl"
                  style={{ background: c, color: '#0a0a14' }}
                >
                  <span className="text-[7px] font-black leading-none">✕</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] leading-none">{RANK[i]}</span>
                  <span className="text-[10px] font-black text-white truncate leading-none">{ban.hero.name}</span>
                </div>
                <span
                  className="text-[8px] font-bold leading-none"
                  style={{ color: c }}
                >
                  {priorityLabel[ban.priority]}
                </span>
              </div>

              {/* BAN hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ background: 'rgba(180,20,20,0.55)', backdropFilter: 'blur(2px)' }}
              >
                <span className="text-white font-black text-xs tracking-[0.2em] drop-shadow-lg">BAN</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inline suggestion bar — compact horizontal strip ────────────────────────
function InlineSuggestionBar({
  suggestions,
  team,
  onPick,
  enemyArchetype,
}: {
  suggestions:    DraftSuggestion[];
  team:           'blue' | 'red';
  onPick:         (hero: import('@/types/draft').HeroData) => void;
  enemyArchetype: ArchetypeResult | null;
}) {
  const top3 = suggestions.slice(0, 3);
  if (top3.length === 0) return null;

  const isBlue     = team === 'blue';
  const teamColor  = isBlue ? '#3b82f6' : '#ef4444';
  const teamBorder = isBlue ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)';
  const teamGlow   = isBlue ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)';
  const RANK = ['🥇', '🥈', '🥉'];

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: 'rgba(5,5,10,0.95)', borderColor: teamBorder, boxShadow: `0 0 12px ${teamGlow}` }}
    >
      {/* ── Header strip ── */}
      <div
        className="flex items-center gap-2 px-2.5 py-1"
        style={{ background: `linear-gradient(to right, ${teamColor}18, transparent)`, borderBottom: `1px solid ${teamBorder}` }}
      >
        <span style={{ color: teamColor }} className="text-[9px]">⚡</span>
        <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase shrink-0">
          Meilleurs picks
        </span>
        {/* Inline enemy archetype badge */}
        {enemyArchetype && (
          <>
            <div className="w-px h-3 bg-slate-700 shrink-0" />
            <span className="text-[8px] text-slate-500 shrink-0">vs</span>
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{
                color:      ARCH_COLOR[enemyArchetype.primary],
                background: `${ARCH_COLOR[enemyArchetype.primary]}18`,
                border:     `1px solid ${ARCH_COLOR[enemyArchetype.primary]}35`,
              }}
            >
              ⚠️ {ARCH_LABEL[enemyArchetype.primary]}{enemyArchetype.confidence >= 55 ? ' ✓' : '?'}
            </span>
            <span className="text-[8px] text-slate-600 truncate">
              → {ARCH_COUNTER_HINT[enemyArchetype.primary]}
            </span>
          </>
        )}
        <span className="ml-auto text-[8px] text-slate-600 shrink-0">cliquer pour picker</span>
      </div>

      {/* ── Hero chips row ── */}
      <div className="flex gap-0">
        {top3.map((s, i) => {
          const lane       = mainLane(s.hero.roles);
          const scoreColor = s.score >= 80 ? '#4ade80' : s.score >= 65 ? '#facc15' : '#f87171';
          const isFirst    = i === 0;

          return (
            <button
              key={s.hero.id}
              onClick={() => onPick(s.hero)}
              className="relative flex-1 flex items-center gap-2 px-2.5 py-1.5 group transition-all duration-150 hover:brightness-125"
              style={{
                background: isFirst ? `${scoreColor}08` : 'transparent',
                borderLeft: i > 0 ? `1px solid ${teamBorder}` : undefined,
              }}
            >
              {/* Avatar */}
              <div
                className="shrink-0 rounded overflow-hidden"
                style={{ width: 30, height: 30, border: `1px solid ${scoreColor}45` }}
              >
                {s.hero.image ? (
                  <img
                    src={s.hero.image}
                    alt={s.hero.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 15%' }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[11px] font-black"
                    style={{ background: 'rgba(20,20,32,0.9)', color: scoreColor }}
                  >
                    {s.hero.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] leading-none">{RANK[i]}</span>
                  <span className="text-[10px] font-black text-white truncate leading-none">{s.hero.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] leading-none">{lane.icon}</span>
                  <span className="text-[9px] font-semibold leading-none" style={{ color: scoreColor }}>{lane.label}</span>
                  {/* Difficulty badge */}
                  {s.hero.difficulty && s.hero.difficulty >= 4 && (
                    <span
                      className="text-[8px] font-black leading-none px-0.5 rounded shrink-0"
                      style={{ color: difficultyColor(s.hero.difficulty), background: `${difficultyColor(s.hero.difficulty)}18` }}
                      title={`Difficulté ${s.hero.difficulty}/5`}
                    >
                      {'⚡'.repeat(s.hero.difficulty)}
                    </span>
                  )}
                  {/* Patch momentum badge */}
                  {s.hero.wrTrend && s.hero.wrTrend !== 'stable' && (
                    <span
                      className="text-[8px] font-black leading-none shrink-0"
                      style={{ color: s.hero.wrTrend === 'rising' ? '#4ade80' : '#f87171' }}
                      title={`Momentum patch: ${s.hero.wrTrend === 'rising' ? '+' : ''}${((s.hero.wrDelta ?? 0) * 100).toFixed(1)}% WR`}
                    >
                      {s.hero.wrTrend === 'rising' ? '▲' : '▼'}
                    </span>
                  )}
                  <span
                    className="ml-auto text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0"
                    style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40` }}
                  >
                    {s.score}
                  </span>
                </div>
              </div>

              {/* PICK hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ background: isBlue ? 'rgba(59,130,246,0.55)' : 'rgba(239,68,68,0.55)', backdropFilter: 'blur(2px)' }}
              >
                <span className="text-white font-black text-xs tracking-[0.2em] drop-shadow-lg">PICK</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
// ─── What-If simulation panel ─────────────────────────────────────────────────
function WhatIfPanel({ tree, team }: { tree: WhatIfTree; team: 'blue' | 'red' }) {
  const isBlue     = team === 'blue';
  const teamBorder = isBlue ? 'rgba(59,130,246,0.30)' : 'rgba(239,68,68,0.30)';
  const teamGlow   = isBlue ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)';

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: 'rgba(5,5,10,0.97)', borderColor: teamBorder, boxShadow: `0 0 14px ${teamGlow}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1"
        style={{ background: 'rgba(250,204,21,0.06)', borderBottom: '1px solid rgba(250,204,21,0.15)' }}
      >
        <span className="text-[9px]">🌳</span>
        <span className="text-[9px] font-black tracking-widest text-yellow-300 uppercase">
          Simulation What-If
        </span>
        <span className="text-[8px] text-slate-500 ml-1 truncate">
          si vous pickez {tree.candidate.name}…
        </span>
      </div>

      {/* Branches */}
      <div className="flex flex-col divide-y divide-slate-800/60">
        {tree.branches.map((branch, i) => {
          const threatColor = branch.threatScore >= 70 ? '#f87171' : branch.threatScore >= 50 ? '#fb923c' : '#facc15';
          const counterColor = branch.bestCounter
            ? branch.bestCounter.fitScore >= 70 ? '#4ade80' : branch.bestCounter.fitScore >= 50 ? '#facc15' : '#94a3b8'
            : '#64748b';
          return (
            <div key={branch.threatHero.id} className="flex items-center gap-2 px-2.5 py-1.5">
              {/* Threat */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[8px] text-slate-600 shrink-0">#{i + 1}</span>
                {branch.threatHero.image ? (
                  <img
                    src={branch.threatHero.image}
                    alt={branch.threatHero.name}
                    className="shrink-0 rounded overflow-hidden object-cover"
                    style={{ width: 20, height: 20, filter: 'grayscale(0.3)' }}
                  />
                ) : (
                  <div
                    className="shrink-0 rounded flex items-center justify-center text-[9px] font-black"
                    style={{ width: 20, height: 20, background: 'rgba(20,20,32,0.9)', color: threatColor }}
                  >
                    {branch.threatHero.name.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black leading-none" style={{ color: threatColor }}>
                    {branch.threatHero.name}
                  </span>
                  <span className="text-[7px] text-slate-500 leading-none truncate">
                    {branch.threatReason}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <span className="text-[9px] text-slate-600 shrink-0">→</span>

              {/* Counter */}
              {branch.bestCounter ? (
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {branch.bestCounter.hero.image ? (
                    <img
                      src={branch.bestCounter.hero.image}
                      alt={branch.bestCounter.hero.name}
                      className="shrink-0 rounded overflow-hidden object-cover"
                      style={{ width: 20, height: 20 }}
                    />
                  ) : (
                    <div
                      className="shrink-0 rounded flex items-center justify-center text-[9px] font-black"
                      style={{ width: 20, height: 20, background: 'rgba(20,20,32,0.9)', color: counterColor }}
                    >
                      {branch.bestCounter.hero.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black leading-none" style={{ color: counterColor }}>
                      {branch.bestCounter.hero.name}
                    </span>
                    <span className="text-[7px] text-slate-500 leading-none truncate">
                      {branch.bestCounter.reason}
                    </span>
                  </div>
                  <span
                    className="ml-auto text-[8px] font-black shrink-0 px-1 py-0.5 rounded leading-none"
                    style={{ background: `${counterColor}18`, color: counterColor }}
                  >
                    {branch.bestCounter.fitScore}
                  </span>
                </div>
              ) : (
                <span className="text-[8px] text-slate-600 flex-1">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ROLE_PRIORITY = ['Tank', 'Marksman', 'Support', 'Mage', 'Fighter', 'Assassin'];

const ROLE_ICON: Record<string, string> = {
  All: '⚔️', Tank: '🛡', Fighter: '💪', Assassin: '🗡',
  Mage: '🔮', Marksman: '🏹', Support: '💚',
};

const ROLE_ACTIVE: Record<string, string> = {
  All:      'bg-white/20 border-white/60 text-white',
  Tank:     'bg-blue-900/60 border-blue-400 text-blue-200',
  Fighter:  'bg-orange-900/60 border-orange-400 text-orange-200',
  Assassin: 'bg-purple-900/60 border-purple-400 text-purple-200',
  Mage:     'bg-violet-900/60 border-violet-400 text-violet-200',
  Marksman: 'bg-yellow-900/60 border-yellow-400 text-yellow-200',
  Support:  'bg-teal-900/60 border-teal-400 text-teal-200',
};

const ROLE_IDLE: Record<string, string> = {
  All:      'border-slate-600/50 text-slate-400 hover:border-slate-400',
  Tank:     'border-blue-700/40 text-blue-500 hover:border-blue-400',
  Fighter:  'border-orange-700/40 text-orange-500 hover:border-orange-400',
  Assassin: 'border-purple-700/40 text-purple-500 hover:border-purple-400',
  Mage:     'border-violet-700/40 text-violet-500 hover:border-violet-400',
  Marksman: 'border-yellow-700/40 text-yellow-500 hover:border-yellow-400',
  Support:  'border-teal-700/40 text-teal-500 hover:border-teal-400',
};

export function HeroSelector() {
  const heroPool         = useDraftStore((s) => s.heroPool);
  const search           = useDraftStore((s) => s.search);
  const roleFilter       = useDraftStore((s) => s.roleFilter);
  const currentStep      = useDraftStore((s) => s.currentStep);
  const blueBans         = useDraftStore((s) => s.blueBans);
  const redBans          = useDraftStore((s) => s.redBans);
  const bluePicks        = useDraftStore((s) => s.bluePicks);
  const redPicks         = useDraftStore((s) => s.redPicks);
  const analysis         = useDraftStore((s) => s.analysis);
  const gameMode         = useDraftStore((s) => s.gameMode);
  const mySide           = useDraftStore((s) => s.mySide);
  const plannedArchetype = useDraftStore((s) => s.plannedArchetype);

  const [hoveredHero, setHoveredHero] = useState<HeroData | null>(null);
  const setSearch       = useDraftStore((s) => s.setSearch);
  const setRoleFilter   = useDraftStore((s) => s.setRoleFilter);
  const selectHero      = useDraftStore((s) => s.selectHero);
  const undoLastAction  = useDraftStore((s) => s.undoLastAction);

  const sequence    = getDraftSequence(gameMode);
  const isDone      = currentStep >= sequence.length;
  const activeStep  = isDone ? null : sequence[currentStep];
  const isBan       = activeStep?.action === 'ban';
  const isPickPhase = activeStep?.action === 'pick';
  const isBlue      = activeStep?.team === 'blue';

  const usedIds = useMemo(() => {
    const ids = new Set<number>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => h && ids.add(h.id));
    return ids;
  }, [blueBans, redBans, bluePicks, redPicks]);

  // Ban suggestions — works with or without a planned archetype.
  // With archetype: 3-phase strategic bans targeting our execution counter.
  // Without archetype: top meta threats by ban rate + tier score.
  const banSuggestions = useMemo((): GeneratedBan[] => {
    if (heroPool.length === 0) return [];
    const excluded = new Set<string>(
      [...blueBans, ...redBans].filter(Boolean).map((h) => String(h!.id))
    );
    return computeBanSuggestions(plannedArchetype, heroPool, excluded);
  }, [plannedArchetype, heroPool, blueBans, redBans]);

  // Fix #5 — Suggest missing role during pick phase
  const suggestedRole = useMemo(() => {
    if (!activeStep || activeStep.action !== 'pick') return null;
    const picks = (activeStep.team === 'blue' ? bluePicks : redPicks).filter(Boolean);
    const covered = new Set(picks.flatMap((h) => h!.roles));
    return ROLE_PRIORITY.find((r) => !covered.has(r)) ?? null;
  }, [activeStep, bluePicks, redPicks]);

  // Pick order tip — tournament mode only
  const myPickNumber = useMemo(() => {
    if (gameMode !== 'tournament' || !activeStep || !isPickPhase) return null;
    const seq = getDraftSequence('tournament');
    let count = 0;
    for (let i = 0; i < currentStep; i++) {
      if (seq[i].action === 'pick' && seq[i].team === activeStep.team) count++;
    }
    return count + 1; // 1-indexed
  }, [gameMode, activeStep, currentStep, isPickPhase]);

  const pickTipKey = gameMode === 'tournament' && isPickPhase && myPickNumber !== null && activeStep
    ? getTournamentPickTip(myPickNumber, activeStep.team)
    : null;
  const pickTip = pickTipKey ? PICK_ORDER_TIPS[pickTipKey] : null;

  // What-If simulation — computed on hover during pick phase
  const whatIfTree = useMemo((): WhatIfTree | null => {
    if (!hoveredHero || !isPickPhase || !activeStep || !plannedArchetype) return null;
    const alliedTeam = (activeStep.team === 'blue' ? bluePicks : redPicks).filter(Boolean) as HeroData[];
    const enemyTeam  = (activeStep.team === 'blue' ? redPicks  : bluePicks).filter(Boolean) as HeroData[];
    return simulateWhatIf(hoveredHero, alliedTeam, enemyTeam, heroPool, plannedArchetype, activeStep.team);
  }, [hoveredHero, isPickPhase, activeStep, plannedArchetype, bluePicks, redPicks, heroPool]);

  // Suppress unused variable warning when mySide is read but not directly rendered
  void mySide;

  const filteredHeroes = useMemo(() => {
    const q = search.toLowerCase();
    return heroPool.filter((h) => {
      const matchSearch = !q || h.name.toLowerCase().includes(q);
      const matchRole   = roleFilter === 'All' || h.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });
  }, [heroPool, search, roleFilter]);

  // Fix #1 — Active team border + glow
  const containerStyle = isDone || !activeStep
    ? { borderColor: 'rgba(124,26,15,0.25)' }
    : isBlue
      ? { borderColor: 'rgba(59,130,246,0.55)', boxShadow: '0 0 28px rgba(59,130,246,0.13), inset 0 0 14px rgba(59,130,246,0.04)' }
      : { borderColor: 'rgba(239,68,68,0.55)',  boxShadow: '0 0 28px rgba(239,68,68,0.13),  inset 0 0 14px rgba(239,68,68,0.04)'  };

  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border p-3 h-full transition-all duration-300"
      style={{ background: 'rgba(8,8,12,0.85)', ...containerStyle }}
    >
      {/* ── Action banner + undo button ── */}
      {!isDone && activeStep && (
        <div className="flex items-center gap-2">
          <div className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black tracking-widest text-sm border',
            isBlue
              ? 'bg-blue-950/70 border-blue-500/50 text-blue-100'
              : 'bg-red-950/70  border-red-500/50  text-red-100'
          )}>
            <span className="text-lg">{isBan ? '🚫' : '⚔️'}</span>
            <span>Équipe {isBlue ? 'Bleue' : 'Rouge'}</span>
            <span className={clsx(
              'px-2 py-0.5 rounded text-xs font-black tracking-widest',
              isBan ? 'bg-red-500/25 text-red-300' : 'bg-green-500/25 text-green-300'
            )}>
              {isBan ? 'Ban' : 'Pick'}
            </span>
          </div>
          {currentStep > 0 && (
            <button
              onClick={undoLastAction}
              title="Annuler le dernier ban/pick"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[11px] font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-all shrink-0"
              style={{ background: 'rgba(15,15,20,0.8)', borderColor: 'rgba(80,80,100,0.35)' }}
            >
              ↩ Annuler
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div className="flex items-center justify-center py-2 rounded-lg border border-yellow-500/30 bg-yellow-950/30 text-yellow-300 font-bold tracking-widest text-sm">
          ✓ DRAFT TERMINÉ
        </div>
      )}

      {/* ── Draft progress bar ── */}
      {!isDone && activeStep && (
        <div className="flex flex-col gap-1">
          {/* Step dots */}
          <div className="flex items-center gap-0.5">
            {sequence.map((s, i) => {
              const isPast    = i < currentStep;
              const isCurrent = i === currentStep;
              const isBanStep = s.action === 'ban';
              const dotColor  = isBanStep
                ? (s.team === 'blue' ? '#3b82f6' : '#ef4444')
                : (s.team === 'blue' ? '#60a5fa' : '#f87171');
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-300"
                  style={{
                    height:     isCurrent ? 5 : 3,
                    background: isPast    ? `${dotColor}80`
                              : isCurrent ? dotColor
                              : 'rgba(60,60,80,0.35)',
                    boxShadow:  isCurrent ? `0 0 6px ${dotColor}` : 'none',
                  }}
                />
              );
            })}
          </div>
          {/* Step label */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-600">
              Étape {currentStep + 1} / {sequence.length}
            </span>
            <span className="text-[9px] font-bold" style={{ color: isBlue ? '#60a5fa' : '#f87171' }}>
              {activeStep.phase.toUpperCase().replace('1', ' Phase 1').replace('2', ' Phase 2')}
            </span>
          </div>
        </div>
      )}

      {/* ── Pick order tip — tournament mode only ── */}
      {pickTip && (
        <div className="rounded-lg border px-3 py-2" style={{ background: 'rgba(30,20,5,0.85)', borderColor: 'rgba(234,179,8,0.30)' }}>
          <p className="text-[10px] font-bold text-yellow-400 mb-1">{pickTip.title}</p>
          <ul className="space-y-0.5">
            {pickTip.advice.map((a, i) => (
              <li key={i} className="text-[9px] text-slate-400 flex gap-1.5">
                <span className="text-yellow-600 shrink-0">›</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Inline ban suggestion bar — visible during ban phase ── */}
      {isBan && activeStep && banSuggestions.length > 0 && (
        <InlineBanSuggestionBar
          bans={banSuggestions}
          team={activeStep.team}
          onBan={(hero) => selectHero(hero)}
        />
      )}

      {/* ── Inline AI suggestion bar — visible during pick phase without scrolling ── */}
      {isPickPhase && activeStep && (analysis?.suggestions ?? []).length > 0 && (
        <InlineSuggestionBar
          suggestions={analysis!.suggestions}
          team={activeStep.team}
          onPick={(hero) => selectHero(hero)}
          enemyArchetype={
            activeStep.team === 'blue'
              ? (analysis?.redArchetype ?? null)
              : (analysis?.blueArchetype ?? null)
          }
        />
      )}

      {/* ── What-If simulation panel — appears when hovering a hero during pick phase ── */}
      {whatIfTree && activeStep && (
        <WhatIfPanel tree={whatIfTree} team={activeStep.team} />
      )}

      {/* ── Search ── */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher un héros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/40 border rounded-lg px-3 py-1.5 pl-8 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
          style={{ borderColor: 'rgba(124,26,15,0.3)' }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(124,26,15,0.7)')}
          onBlur={(e)  => (e.target.style.borderColor = 'rgba(124,26,15,0.3)')}
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">✕</button>
        )}
      </div>

      {/* ── Fix #5 : Role filter with missing-role suggestion ── */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROLES.map((role) => {
          const isActive    = roleFilter === role;
          const isSuggested = role === suggestedRole && roleFilter === 'All' && !search;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              title={isSuggested ? `Missing role in your team: ${role}` : undefined}
              className={clsx(
                'px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1',
                isActive ? ROLE_ACTIVE[role] : ROLE_IDLE[role],
                isSuggested && !isActive && 'ring-1 ring-yellow-400/60 !border-yellow-500/60 !text-yellow-300 animate-pulse'
              )}
            >
              <span>{ROLE_ICON[role]}</span>
              <span>{role}</span>
              {isSuggested && <span className="text-yellow-400 text-[9px] font-black">!</span>}
            </button>
          );
        })}
      </div>

      {/* ── Hero grid ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {heroPool.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-slate-400 text-sm">Loading heroes…</div>
        ) : filteredHeroes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <span className="text-slate-500 text-sm">No heroes found</span>
            {roleFilter !== 'All' && (
              <button onClick={() => setRoleFilter('All')} className="text-xs text-slate-600 hover:text-slate-400 underline">Clear filter</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 pb-2">
            {filteredHeroes.map((hero) => {
              const isUsed = usedIds.has(hero.id);
              return (
                <div
                  key={hero.id}
                  onMouseEnter={() => isPickPhase && !isUsed && setHoveredHero(hero)}
                  onMouseLeave={() => setHoveredHero(null)}
                >
                  <HeroCard
                    hero={hero}
                    variant="selector"
                    disabled={isUsed || isDone}
                    onClick={() => !isUsed && !isDone && selectHero(hero)}
                    showTooltip
                    size="md"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Count ── */}
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{filteredHeroes.filter((h) => !usedIds.has(h.id)).length} available{roleFilter !== 'All' ? ` · ${roleFilter}` : ''}</span>
        <span>{heroPool.length} total</span>
      </div>
    </div>
  );
}
