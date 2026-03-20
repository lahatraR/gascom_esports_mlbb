'use client';

import clsx from 'clsx';
import type { HeroData } from '@/types/draft';
import { DRAFT_SEQUENCE } from '@/types/draft';
import { HeroCard, EmptySlot } from '@/components/ui/HeroCard';

interface TeamColumnProps {
  team: 'blue' | 'red';
  bans:  (HeroData | null)[];
  picks: (HeroData | null)[];
  currentStep: number;
  rating?: number;
}

export function TeamColumn({ team, bans, picks, currentStep, rating }: TeamColumnProps) {
  const isDone = currentStep >= DRAFT_SEQUENCE.length;
  const activeStep = isDone ? null : DRAFT_SEQUENCE[currentStep];

  const isActiveBan  = activeStep?.team === team && activeStep?.action === 'ban';
  const isActivePick = activeStep?.team === team && activeStep?.action === 'pick';

  const activeBanSlot  = isActiveBan  ? bans.findIndex((s)  => s === null) : -1;
  const activePickSlot = isActivePick ? picks.findIndex((s) => s === null) : -1;

  const isBlue      = team === 'blue';
  const headerColor = isBlue ? 'text-blue-400' : 'text-red-400';
  const borderColor = isBlue ? 'border-blue-500/30' : 'border-red-500/30';
  const activeBg    = isBlue
    ? 'bg-blue-950/40 border-blue-500/50'
    : 'bg-red-950/40  border-red-500/50';

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 glass p-3 transition-all duration-300',
        (isActiveBan || isActivePick) ? activeBg : `border ${borderColor} bg-navy-800/40`,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={clsx('font-black text-base sm:text-lg tracking-widest uppercase', headerColor)}>
          {isBlue ? '🔵 BLUE' : '🔴 RED'}
        </h2>
        {rating !== undefined && (
          <div className={clsx(
            'text-xs font-bold px-2 py-0.5 rounded-full border',
            isBlue ? 'border-blue-500/50 text-blue-300' : 'border-red-500/50 text-red-300'
          )}>
            {rating.toFixed(1)} ★
          </div>
        )}
      </div>

      {/* ── BANS ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          — BANS —
        </p>
        {/* Mobile: horizontal scroll row / Desktop: wrap */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
          {bans.map((hero, i) => {
            const isSlotActive = i === activeBanSlot;
            if (hero) {
              return (
                <div key={i} className="relative flex-shrink-0">
                  <HeroCard hero={hero} variant="ban" team={team} size="sm" showTooltip />
                  <div className="absolute inset-0 bg-red-950/60 rounded-lg flex items-center justify-center">
                    <span className="text-red-400 font-black text-base">✕</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex-shrink-0">
                <EmptySlot active={isSlotActive} team={team} variant="ban" size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={clsx('h-px w-full', isBlue ? 'bg-blue-900/50' : 'bg-red-900/50')} />

      {/* ── PICKS ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          — PICKS —
        </p>
        <div className="flex flex-col gap-1.5">
          {picks.map((hero, i) => {
            const isSlotActive = i === activePickSlot;
            if (hero) {
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={clsx('w-1 h-12 rounded-full flex-shrink-0', isBlue ? 'bg-blue-500' : 'bg-red-500')} />
                  <HeroCard hero={hero} variant="pick" team={team} size="sm" showTooltip />
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-bold text-xs truncate">{hero.name}</span>
                    <span className="text-slate-500 text-[10px]">{hero.roles[0]}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={clsx(
                  'w-1 h-12 rounded-full flex-shrink-0',
                  isSlotActive ? (isBlue ? 'bg-blue-500/70 active-pulse' : 'bg-red-500/70 active-pulse') : 'bg-slate-800'
                )} />
                <EmptySlot
                  active={isSlotActive}
                  team={team}
                  variant="pick"
                  size="sm"
                  label={isSlotActive ? 'Picking…' : `Pick ${i + 1}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
