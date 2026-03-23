'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { DRAFT_SEQUENCE } from '@/types/draft';
import type { DraftSuggestion, ArchetypeResult } from '@/types/draft';
import { HeroCard } from '@/components/ui/HeroCard';

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

// ─── Inline suggestion bar — top 3 portrait cards ────────────────────────────
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

  const isBlue = team === 'blue';
  const teamBorder = isBlue ? 'rgba(59,130,246,0.45)' : 'rgba(239,68,68,0.45)';
  const teamGlow   = isBlue ? 'rgba(59,130,246,0.14)' : 'rgba(239,68,68,0.14)';
  const teamFill   = isBlue ? 'rgba(59,130,246,0.55)' : 'rgba(239,68,68,0.55)';
  const RANK = ['🥇', '🥈', '🥉'];

  return (
    <div
      className="rounded-xl border p-2.5 flex flex-col gap-2"
      style={{ background: 'rgba(5,5,10,0.92)', borderColor: teamBorder, boxShadow: `0 0 18px ${teamGlow}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold tracking-wide text-slate-400 shrink-0">Meilleurs picks</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${teamBorder}, transparent)` }} />
        <span className="text-[8px] text-slate-600 shrink-0">cliquer pour picker</span>
      </div>

      {/* Enemy archetype detection banner */}
      {enemyArchetype && (
        <div
          className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          style={{
            background: `${ARCH_COLOR[enemyArchetype.primary]}12`,
            border:     `1px solid ${ARCH_COLOR[enemyArchetype.primary]}35`,
          }}
        >
          <span className="text-[10px] shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] text-slate-400">
              Ennemi construit du{' '}
              <span
                className="font-bold"
                style={{ color: ARCH_COLOR[enemyArchetype.primary] }}
              >
                {ARCH_LABEL[enemyArchetype.primary]}
              </span>
              {enemyArchetype.confidence >= 55 ? ' (confirmé)' : ' (probable)'}
              {' '}—{' '}
              <span className="text-slate-500">
                privilégiez{' '}
                <span className="font-semibold text-slate-300">
                  {ARCH_COUNTER_HINT[enemyArchetype.primary]}
                </span>
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Portrait cards */}
      <div className="grid grid-cols-3 gap-2">
        {top3.map((s, i) => {
          const lane       = mainLane(s.hero.roles);
          const scoreColor = s.score >= 80 ? '#4ade80' : s.score >= 65 ? '#facc15' : '#f87171';
          const scoreGlow  = s.score >= 80 ? 'rgba(74,222,128,0.22)' : s.score >= 65 ? 'rgba(250,204,21,0.18)' : 'rgba(248,113,113,0.18)';

          return (
            <button
              key={s.hero.id}
              onClick={() => onPick(s.hero)}
              className="relative flex flex-col rounded-xl overflow-hidden border transition-all duration-200 group"
              style={{
                background:  'rgba(8,8,14,0.95)',
                borderColor: `${scoreColor}44`,
                boxShadow:   `0 0 10px ${scoreGlow}`,
              }}
            >
              {/* Portrait */}
              <div className="relative w-full" style={{ height: 68 }}>
                {s.hero.image ? (
                  <img
                    src={s.hero.image}
                    alt={s.hero.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-2xl font-black"
                    style={{ background: 'rgba(20,20,32,0.9)', color: scoreColor }}
                  >
                    {s.hero.name.charAt(0)}
                  </div>
                )}
                {/* Rank badge */}
                <span className="absolute top-0.5 left-0.5 text-[11px] leading-none drop-shadow">{RANK[i]}</span>
                {/* Score badge */}
                <span
                  className="absolute top-0.5 right-0.5 text-[9px] font-black px-1 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.80)', color: scoreColor }}
                >
                  {s.score}
                </span>
                {/* Bottom gradient */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-8"
                  style={{ background: `linear-gradient(to top, rgba(8,8,14,0.95), transparent)` }}
                />
              </div>

              {/* Name + lane */}
              <div className="px-1.5 pb-1.5 pt-0.5 flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-white leading-none truncate w-full text-center">
                  {s.hero.name}
                </span>
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px]">{lane.icon}</span>
                  <span className="text-[8px] text-slate-500">{lane.label}</span>
                </div>
              </div>

              {/* PICK hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-xl"
                style={{ background: teamFill.replace('0.55', '0.50'), backdropFilter: 'blur(3px)' }}
              >
                <span className="text-white font-black text-sm tracking-[0.2em]">PICK</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reason for #1 pick */}
      {top3[0]?.reason && (
        <p className="text-[9px] text-slate-600 leading-snug truncate">
          <span className="text-slate-500 font-semibold">#{1} {top3[0].hero.name}:</span>{' '}
          {top3[0].reason}
        </p>
      )}
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
  const heroPool    = useDraftStore((s) => s.heroPool);
  const search      = useDraftStore((s) => s.search);
  const roleFilter  = useDraftStore((s) => s.roleFilter);
  const currentStep = useDraftStore((s) => s.currentStep);
  const blueBans    = useDraftStore((s) => s.blueBans);
  const redBans     = useDraftStore((s) => s.redBans);
  const bluePicks   = useDraftStore((s) => s.bluePicks);
  const redPicks    = useDraftStore((s) => s.redPicks);
  const analysis    = useDraftStore((s) => s.analysis);
  const setSearch     = useDraftStore((s) => s.setSearch);
  const setRoleFilter = useDraftStore((s) => s.setRoleFilter);
  const selectHero    = useDraftStore((s) => s.selectHero);

  const isDone      = currentStep >= DRAFT_SEQUENCE.length;
  const activeStep  = isDone ? null : DRAFT_SEQUENCE[currentStep];
  const isBan       = activeStep?.action === 'ban';
  const isPickPhase = activeStep?.action === 'pick';
  const isBlue      = activeStep?.team === 'blue';

  const usedIds = useMemo(() => {
    const ids = new Set<number>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => h && ids.add(h.id));
    return ids;
  }, [blueBans, redBans, bluePicks, redPicks]);

  // Fix #5 — Suggest missing role during pick phase
  const suggestedRole = useMemo(() => {
    if (!activeStep || activeStep.action !== 'pick') return null;
    const picks = (activeStep.team === 'blue' ? bluePicks : redPicks).filter(Boolean);
    const covered = new Set(picks.flatMap((h) => h!.roles));
    return ROLE_PRIORITY.find((r) => !covered.has(r)) ?? null;
  }, [activeStep, bluePicks, redPicks]);

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
      {/* ── Fix #1 : Prominent action banner ── */}
      {!isDone && activeStep && (
        <div className={clsx(
          'flex items-center justify-center gap-2 py-2 rounded-lg font-black tracking-widest text-sm border',
          isBlue
            ? 'bg-blue-950/70 border-blue-500/50 text-blue-100'
            : 'bg-red-950/70  border-red-500/50  text-red-100'
        )}>
          <span className="text-lg">{isBan ? '🚫' : '⚔️'}</span>
          <span>{isBlue ? 'BLUE' : 'RED'} TEAM</span>
          <span className={clsx(
            'px-2 py-0.5 rounded text-xs font-black tracking-widest',
            isBan ? 'bg-red-500/25 text-red-300' : 'bg-green-500/25 text-green-300'
          )}>
            {isBan ? 'BAN' : 'PICK'}
          </span>
        </div>
      )}

      {isDone && (
        <div className="flex items-center justify-center py-2 rounded-lg border border-yellow-500/30 bg-yellow-950/30 text-yellow-300 font-bold tracking-widest text-sm">
          ✓ DRAFT COMPLETE
        </div>
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

      {/* ── Search ── */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search hero…"
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
                <HeroCard
                  key={hero.id}
                  hero={hero}
                  variant="selector"
                  disabled={isUsed || isDone}
                  onClick={() => !isUsed && !isDone && selectHero(hero)}
                  showTooltip
                  size="md"
                />
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
