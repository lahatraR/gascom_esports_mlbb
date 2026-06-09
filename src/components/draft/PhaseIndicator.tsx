'use client';

import clsx from 'clsx';
import type { DraftStep, DraftPhase } from '@/types/draft';

interface PhaseIndicatorProps {
  currentStep: number;
  sequence:    DraftStep[];
}

const PHASE_LABELS: Record<DraftPhase, string> = {
  ban1:  'BAN PHASE 1',
  pick1: 'PICK PHASE 1',
  ban2:  'BAN PHASE 2',
  pick2: 'PICK PHASE 2',
};

const PHASE_SHORT: Record<DraftPhase, string> = {
  ban1: 'BAN 1', pick1: 'PICK 1', ban2: 'BAN 2', pick2: 'PICK 2',
};

function getPhaseOrder(sequence: DraftStep[]): DraftPhase[] {
  const seen = new Set<DraftPhase>();
  const order: DraftPhase[] = [];
  for (const step of sequence) {
    if (!seen.has(step.phase)) { seen.add(step.phase); order.push(step.phase); }
  }
  return order;
}

export function PhaseIndicator({ currentStep, sequence }: PhaseIndicatorProps) {
  const isDone            = currentStep >= sequence.length;
  const activeStep        = isDone ? null : sequence[currentStep];
  const activePhase       = activeStep?.phase ?? sequence[sequence.length - 1]?.phase ?? 'pick2';
  const phaseOrder        = getPhaseOrder(sequence);
  const phaseStart        = sequence.findIndex((s) => s.phase === activePhase);
  const currentPhaseSteps = sequence.filter((s) => s.phase === activePhase);
  const stepInPhase       = currentStep - phaseStart;
  const isBlueActive      = activeStep?.team === 'blue';

  if (isDone) {
    return (
      <div className="flex items-center justify-center gap-2 py-1 flex-wrap">
        {phaseOrder.map((p, i) => (
          <div key={p} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-700 text-xs">›</span>}
            <span className="text-[10px] font-bold text-slate-600 line-through tracking-wider">{PHASE_SHORT[p]}</span>
          </div>
        ))}
        <span className="ml-3 text-yellow-400 font-bold tracking-widest text-sm">✓ DRAFT COMPLETE</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">

      {/* ── Row 1 : Breadcrumb ────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {phaseOrder.map((phase, i) => {
          const phaseIdx  = phaseOrder.indexOf(phase);
          const activeIdx = phaseOrder.indexOf(activePhase);
          const isActive  = phase === activePhase;
          const isPast    = phaseIdx < activeIdx;
          const isBan     = phase.startsWith('ban');

          return (
            <div key={phase} className="flex items-center gap-1">
              {i > 0 && (
                <span className={clsx('text-xs', (isPast || isActive) ? 'text-slate-500' : 'text-slate-700')}>›</span>
              )}
              <span className={clsx(
                'text-[10px] sm:text-xs font-bold tracking-widest px-2 py-0.5 rounded border transition-all',
                isActive
                  ? isBan
                    ? 'bg-red-900/40 border-red-500/60 text-red-300 shadow-sm shadow-red-900/30'
                    : 'bg-blue-900/40 border-blue-500/60 text-blue-300 shadow-sm shadow-blue-900/30'
                  : isPast
                    ? 'border-slate-700/40 text-slate-600'
                    : 'border-slate-800/40 text-slate-700'
              )}>
                {isPast ? '✓ ' : ''}{PHASE_SHORT[phase]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Row 2 : Phase name + step dots for current phase only ─────────── */}
      <div className="flex flex-col items-center gap-1.5">

        <div className="flex items-center gap-3">
          <span className={clsx(
            'font-bold tracking-wide text-xs sm:text-sm',
            isBlueActive ? 'text-blue-300' : 'text-red-300'
          )}>
            {PHASE_LABELS[activePhase]}
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {Math.min(stepInPhase + 1, currentPhaseSteps.length)}/{currentPhaseSteps.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {currentPhaseSteps.map((step, i) => {
            const globalIdx    = phaseStart + i;
            const isStepActive = globalIdx === currentStep;
            const isStepPast   = globalIdx < currentStep;
            const isStepBlue   = step.team === 'blue';
            const isStepBan    = step.action === 'ban';

            return (
              <div
                key={i}
                title={step.label}
                className={clsx(
                  'rounded transition-all duration-300 flex items-center justify-center font-black text-[8px]',
                  isStepBan ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6 sm:w-7 sm:h-7',
                  isStepActive ? clsx(
                    'scale-125 ring-2 shadow-lg',
                    isStepBlue
                      ? 'bg-blue-500 ring-blue-300 text-white shadow-blue-500/50'
                      : 'bg-red-500  ring-red-300  text-white shadow-red-500/50'
                  ) : isStepPast ? clsx(
                    'opacity-70',
                    isStepBlue ? 'bg-blue-700 text-blue-200' : 'bg-red-700 text-red-200'
                  ) : clsx(
                    'border-2 bg-slate-900/60',
                    isStepBlue ? 'border-blue-800/50 text-blue-900/80' : 'border-red-800/50 text-red-900/80'
                  )
                )}
              >
                {isStepBan ? '✕' : (isStepBlue ? 'B' : 'R')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
