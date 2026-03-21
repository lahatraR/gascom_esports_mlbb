'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { DraftStep } from '@/types/draft';

interface ActionAnnouncementProps {
  currentStep: number;
  activeStep: DraftStep | null;
  isDone: boolean;
}

export function ActionAnnouncement({ currentStep, activeStep, isDone }: ActionAnnouncementProps) {
  const [visible, setVisible] = useState(true);
  const prevStepRef = useRef(currentStep);

  // Flash whenever the step changes
  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      prevStepRef.current = currentStep;
      setVisible(false);
      // tiny timeout so the re-mount triggers the CSS transition
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  if (isDone) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center gap-3 rounded-xl px-4 py-3 border transition-all duration-500',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(20,40,10,0.9), rgba(10,30,10,0.9))',
          borderColor: 'rgba(34,197,94,0.5)',
          boxShadow: '0 0 24px rgba(34,197,94,0.15)',
        }}
      >
        <span className="text-2xl">✓</span>
        <div className="text-center">
          <p className="text-emerald-400 font-black text-base tracking-widest uppercase">Draft Complete</p>
          <p className="text-emerald-600 text-[11px] tracking-wide">All picks & bans locked in</p>
        </div>
      </div>
    );
  }

  if (!activeStep) return null;

  const isBan   = activeStep.action === 'ban';
  const isBlue  = activeStep.team === 'blue';

  const teamLabel = isBlue ? 'BLUE' : 'RED';
  const actionLabel = isBan ? 'BAN' : 'PICK';

  // Colors
  const teamColor  = isBlue  ? 'rgba(59,130,246,' : 'rgba(239,68,68,';
  const actionGlow = isBan   ? 'rgba(239,68,68,0.25)' : (isBlue ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)');
  const borderCol  = isBan   ? `rgba(239,68,68,0.6)` : `${teamColor}0.5)`;
  const bg         = isBan
    ? 'linear-gradient(135deg, rgba(40,8,8,0.95), rgba(20,5,5,0.95))'
    : isBlue
      ? 'linear-gradient(135deg, rgba(8,20,50,0.95), rgba(5,12,35,0.95))'
      : 'linear-gradient(135deg, rgba(45,8,8,0.95), rgba(30,5,5,0.95))';

  const actionIcon = isBan ? '🚫' : '⚔️';
  const actionTextColor = isBan ? 'text-red-400' : (isBlue ? 'text-blue-400' : 'text-red-400');
  const teamTextColor   = isBlue ? 'text-blue-300' : 'text-red-300';

  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
      style={{
        background: bg,
        borderColor: borderCol,
        boxShadow: `0 0 28px ${actionGlow}`,
      }}
    >
      <span className="text-3xl leading-none">{actionIcon}</span>

      <div className="flex flex-col items-center">
        {/* Main action line */}
        <div className="flex items-center gap-2">
          <span className={clsx('font-black text-lg tracking-widest uppercase', teamTextColor)}>
            {teamLabel}
          </span>
          <span className="text-slate-500 font-light text-sm">·</span>
          <span className={clsx('font-black text-lg tracking-widest uppercase', actionTextColor)}>
            {actionLabel}
          </span>
        </div>

        {/* Sub-label */}
        <p className="text-slate-400 text-[11px] tracking-wide">
          {isBan
            ? `${teamLabel} team is banning a hero`
            : `${teamLabel} team is picking a hero`}
        </p>
      </div>

      {/* Step counter badge */}
      <div
        className="rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-slate-700/50"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        {activeStep.step + 1} / {/* total shown by PhaseIndicator */}
        <span className="text-slate-600">{activeStep.label}</span>
      </div>
    </div>
  );
}
