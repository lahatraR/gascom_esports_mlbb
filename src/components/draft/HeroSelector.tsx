'use client';

import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
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

export interface HeroSelectorHandle {
  focusSearch: () => void;
}

export const HeroSelector = forwardRef<HeroSelectorHandle>(function HeroSelector(_, ref) {
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
  const restrictedEnemyIds  = useDraftStore((s) => s.restrictedEnemyIds);
  const toggleRestrictedEnemy = useDraftStore((s) => s.toggleRestrictedEnemy);

  const gameMode   = useDraftStore((s) => s.gameMode);
  const sequence   = getDraftSequence(gameMode);
  const isDone     = currentStep >= sequence.length;
  const activeStep = isDone ? null : sequence[currentStep];

  const searchRef = useRef<HTMLInputElement>(null);

  // Expose focusSearch to parent via ref
  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  const usedIds = useMemo(() => {
    const ids = new Set<number>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => h && ids.add(h.id));
    return ids;
  }, [blueBans, redBans, bluePicks, redPicks]);

  const filteredHeroes = useMemo(() => {
    const q = search.toLowerCase();
    return heroPool.filter((h) => {
      const matchSearch = !q || h.name.toLowerCase().includes(q);
      const matchRole   = roleFilter === 'All' || h.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });
  }, [heroPool, search, roleFilter]);

  // Available heroes (not used) — first 9 get keyboard number hints
  const availableHeroes = useMemo(
    () => filteredHeroes.filter((h) => !usedIds.has(h.id)),
    [filteredHeroes, usedIds]
  );

  const restrictedSet = useMemo(
    () => new Set(restrictedEnemyIds),
    [restrictedEnemyIds]
  );

  return (
    <div className="flex flex-col gap-3 glass p-3 h-full">
      {/* Search */}
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search hero… (press /)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy-800 border border-slate-700/40 rounded-lg px-3 py-2 pl-8 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
          style={{ borderColor: 'rgba(124,26,15,0.3)' }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(124,26,15,0.7)')}
          onBlur={(e)  => (e.target.style.borderColor = 'rgba(124,26,15,0.3)')}
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
        {restrictedEnemyIds.length > 0 && (
          <button
            onClick={() => useDraftStore.getState().clearRestrictedEnemies()}
            className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium border-red-700/50 text-red-400 hover:border-red-500"
            title="Clear all enemy pool restrictions"
          >
            🚫 {restrictedEnemyIds.length} restricted · clear
          </button>
        )}
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
          <span className="hidden sm:inline ml-2 opacity-40 text-[10px] font-normal">
            press 1-9 to quick-select
          </span>
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
              const isUsed       = usedIds.has(hero.id);
              const isRestricted = restrictedSet.has(hero.id);
              // Index among available heroes for keyboard shortcut badge
              const kbIdx = !isUsed ? availableHeroes.indexOf(hero) : -1;
              const kbLabel = kbIdx >= 0 && kbIdx < 9 ? String(kbIdx + 1) : null;

              return (
                <div key={hero.id} className="relative group/heroitem">
                  <HeroCard
                    hero={hero}
                    variant="selector"
                    disabled={isUsed || isDone}
                    onClick={() => !isUsed && !isDone && selectHero(hero)}
                    showTooltip
                    size="md"
                  />

                  {/* Keyboard number badge */}
                  {kbLabel && !isDone && (
                    <span className="absolute top-0.5 left-0.5 z-10 w-4 h-4 rounded text-[9px] font-black bg-slate-900/80 text-slate-300 border border-slate-700/40 flex items-center justify-center pointer-events-none">
                      {kbLabel}
                    </span>
                  )}

                  {/* Enemy pool restriction overlay */}
                  {isRestricted && (
                    <div className="absolute inset-0 rounded-lg bg-red-900/30 border-2 border-red-600/50 flex items-center justify-center pointer-events-none">
                      <span className="text-red-400 text-lg font-black opacity-80">🚫</span>
                    </div>
                  )}

                  {/* Restrict / unrestrict button on hover */}
                  {!isUsed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRestrictedEnemy(hero.id); }}
                      title={isRestricted ? 'Remove restriction' : 'Mark: not in enemy pool'}
                      className={clsx(
                        'absolute top-0.5 right-0.5 z-20 w-5 h-5 rounded text-[9px] font-black border transition-all',
                        'opacity-0 group-hover/heroitem:opacity-100',
                        isRestricted
                          ? 'bg-red-800/60 border-red-600/60 text-red-200'
                          : 'bg-slate-900/70 border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-600/40'
                      )}
                    >
                      🚫
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero count */}
      <div className="text-center text-xs text-slate-600">
        {availableHeroes.length} available
        {' / '}
        {heroPool.length} total
        {restrictedEnemyIds.length > 0 && (
          <span className="ml-2 text-red-500/60">· {restrictedEnemyIds.length} restricted</span>
        )}
      </div>
    </div>
  );
});
