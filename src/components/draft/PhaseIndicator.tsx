'use client';

import clsx from 'clsx';
import { DRAFT_SEQUENCE } from '@/types/draft';

interface PhaseIndicatorProps {
  currentStep: number;
}

const PHASE_LABELS: Record<string, string> = {
  ban1:  'BAN PHASE 1',
  pick1: 'PICK PHASE 1',
  ban2:  'BAN PHASE 2',
  pick2: 'PICK PHASE 2',
};

const PHASE_LABELS_SHORT: Record<string, string> = {
  ban1:  'BAN 1',
  pick1: 'PICK 1',
  ban2:  'BAN 2',
  pick2: 'PICK 2',
};

const PHASE_ORDER = ['ban1', 'pick1', 'ban2', 'pick2'];

export function PhaseIndicator({ currentStep }: PhaseIndicatorProps) {
  const isDone     = currentStep >= DRAFT_SEQUENCE.length;
  const activeStep = isDone ? null : DRAFT_SEQUENCE[currentStep];
  const activePhase = activeStep?.phase ?? 'pick2';

  return (
    <div className="flex flex-col gap-2">
      {/* Phase labels — hidden on xs, visible sm+ */}
      <div className="hidden sm:flex justify-center gap-4">
        {PHASE_ORDER.map((phase) => {
          const isActive  = phase === activePhase && !isDone;
          const isPast    = PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(activePhase) || isDone;
          return (
            <div key={phase} className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  'text-[10px] font-bold tracking-widest uppercase',
                  isActive ? 'text-yellow-400' : isPast ? 'text-slate-600' : 'text-slate-500'
                )}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact phase pills */}
      <div className="flex sm:hidden justify-center gap-1.5">
        {PHASE_ORDER.map((phase) => {
          const isActive = phase === activePhase && !isDone;
          const isPast   = PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(activePhase) || isDone;
          return (
            <span
              key={phase}
              className={clsx(
                'text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full border',
                isActive ? 'border-yellow-400/60 text-yellow-400 bg-yellow-900/30'
                : isPast ? 'border-slate-700 text-slate-600 bg-transparent'
                : 'border-slate-700/50 text-slate-500 bg-transparent'
              )}
            >
              {PHASE_LABELS_SHORT[phase]}
            </span>
          );
        })}
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
        {DRAFT_SEQUENCE.map((step, i) => {
          const isActive = i === currentStep && !isDone;
          const isPast   = i < currentStep;
          const isBlue   = step.team === 'blue';
          const isBan    = step.action === 'ban';

          return (
            <div
              key={i}
              title={step.label}
              className={clsx(
                'rounded-sm transition-all duration-300 flex items-center justify-center font-black',
                // Smaller dots on mobile
                isBan
                  ? 'w-4 h-4 sm:w-5 sm:h-5 text-[7px] sm:text-[8px]'
                  : 'w-5 h-5 sm:w-6 sm:h-6 text-[7px] sm:text-[8px]',
                isActive
                  ? clsx(
                      'scale-125 ring-2',
                      isBlue
                        ? 'bg-blue-500 ring-blue-300 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-red-500  ring-red-300  text-white shadow-lg shadow-red-500/50'
                    )
                  : isPast
                    ? clsx(
                        'opacity-60',
                        isBlue ? 'bg-blue-800/70' : 'bg-red-800/70',
                        isBan  ? 'text-red-300'   : 'text-white'
                      )
                    : 'bg-navy-700 text-slate-600',
              )}
            >
              {isBan ? '✕' : (isBlue ? 'B' : 'R')}
            </div>
          );
        })}
      </div>

      {/* Current action banner */}
      <div className="text-center">
        {isDone ? (
          <span className="text-yellow-400 font-bold tracking-wide text-sm">
            ✓ DRAFT COMPLETE
          </span>
        ) : (
          <span
            className={clsx(
              'font-bold tracking-wide text-xs sm:text-sm',
              activeStep?.team === 'blue' ? 'text-blue-400' : 'text-red-400'
            )}
          >
            {activeStep?.action === 'ban' ? '🚫' : '⚔️'}{' '}
            <span className="hidden sm:inline">{activeStep?.label?.toUpperCase()}</span>
            <span className="sm:hidden">
              {activeStep?.team === 'blue' ? 'BLUE' : 'RED'}{' '}
              {activeStep?.action === 'ban' ? 'BAN' : 'PICK'}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
