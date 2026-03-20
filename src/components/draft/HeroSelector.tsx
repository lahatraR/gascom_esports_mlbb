'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { DRAFT_SEQUENCE } from '@/types/draft';
import { HeroCard } from '@/components/ui/HeroCard';

const ALL_ROLES = ['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];

const ROLE_PILL_COLORS: Record<string, string> = {
  All:      'border-slate-500 text-slate-300 hover:border-white',
  Tank:     'border-blue-500/60  text-blue-300  hover:border-blue-400',
  Fighter:  'border-orange-500/60 text-orange-300 hover:border-orange-400',
  Assassin: 'border-purple-500/60 text-purple-300 hover:border-purple-400',
  Mage:     'border-violet-500/60 text-violet-300 hover:border-violet-400',
  Marksman: 'border-yellow-500/60 text-yellow-300 hover:border-yellow-400',
  Support:  'border-teal-500/60  text-teal-300  hover:border-teal-400',
};

export function HeroSelector() {
  // Atomic selectors — only re-renders when the specific slice changes
  const heroPool    = useDraftStore((s) => s.heroPool);
  const search      = useDraftStore((s) => s.search);
  const roleFilter  = useDraftStore((s) => s.roleFilter);
  const currentStep = useDraftStore((s) => s.currentStep);
  const blueBans    = useDraftStore((s) => s.blueBans);
  const redBans     = useDraftStore((s) => s.redBans);
  const bluePicks   = useDraftStore((s) => s.bluePicks);
  const redPicks    = useDraftStore((s) => s.redPicks);
  const setSearch      = useDraftStore((s) => s.setSearch);
  const setRoleFilter  = useDraftStore((s) => s.setRoleFilter);
  const selectHero     = useDraftStore((s) => s.selectHero);

  const isDone     = currentStep >= DRAFT_SEQUENCE.length;
  const activeStep = isDone ? null : DRAFT_SEQUENCE[currentStep];

  // Set of used hero IDs (banned or picked)
  const usedIds = useMemo(() => {
    const ids = new Set<number>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => h && ids.add(h.id));
    return ids;
  }, [blueBans, redBans, bluePicks, redPicks]);

  // Filtered hero list
  const filteredHeroes = useMemo(() => {
    const q = search.toLowerCase();
    return heroPool.filter((h) => {
      const matchSearch = !q || h.name.toLowerCase().includes(q);
      const matchRole   = roleFilter === 'All' || h.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });
  }, [heroPool, search, roleFilter]);

  return (
    <div className="flex flex-col gap-3 glass p-3 h-full">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search hero…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy-800 border border-slate-700/60 rounded-lg px-3 py-2 pl-8 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={clsx(
              'px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all',
              ROLE_PILL_COLORS[role],
              roleFilter === role ? 'bg-white/10 scale-105' : 'bg-transparent'
            )}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Phase hint */}
      {!isDone && activeStep && (
        <div
          className={clsx(
            'text-center py-1.5 rounded-lg text-xs font-bold tracking-wide border',
            activeStep.team === 'blue'
              ? 'bg-blue-950/50 border-blue-600/40 text-blue-300'
              : 'bg-red-950/50  border-red-600/40  text-red-300'
          )}
        >
          {activeStep.action === 'ban' ? '🚫 Select hero to BAN' : '⚔️ Select hero to PICK'}
          {' · '}
          <span className="opacity-80">{activeStep.label}</span>
        </div>
      )}

      {/* Hero grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {heroPool.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
            Loading heroes…
          </div>
        ) : filteredHeroes.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
            No heroes found
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

      {/* Hero count */}
      <div className="text-center text-xs text-slate-600">
        {filteredHeroes.filter((h) => !usedIds.has(h.id)).length} available
        {' / '}
        {heroPool.length} total
      </div>
    </div>
  );
}
