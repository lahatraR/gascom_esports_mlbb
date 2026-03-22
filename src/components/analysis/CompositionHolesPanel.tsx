'use client';

import clsx from 'clsx';
import type { CompositionHole } from '@/types/draft';

interface Props {
  holes:    CompositionHole[];
  allyTeam: 'blue' | 'red';
}

const LANE_ICONS: Record<string, string> = {
  Gold:   '🪙',
  Roam:   '🌐',
  Jungle: '🌿',
  Mid:    '✨',
  EXP:    '⚔️',
};

export function CompositionHolesPanel({ holes, allyTeam }: Props) {
  if (holes.length === 0) return null;

  const teamBorderCls = allyTeam === 'blue'
    ? 'rgba(59,130,246,0.25)'
    : 'rgba(239,68,68,0.25)';

  return (
    <div
      className="glass overflow-hidden"
      style={{ borderColor: holes.some((h) => h.severity === 'critical') ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.3)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{
          background: holes.some((h) => h.severity === 'critical')
            ? 'rgba(40,8,8,0.7)'
            : 'rgba(30,20,0,0.7)',
          borderColor: teamBorderCls,
        }}
      >
        <span className="text-[10px] font-black uppercase tracking-wider">
          {holes.some((h) => h.severity === 'critical') ? '🚨' : '⚠️'} Trous dans la composition
        </span>
        <span className={clsx(
          'text-[9px] font-bold px-1.5 py-0.5 rounded border ml-auto',
          allyTeam === 'blue'
            ? 'text-blue-400 bg-blue-900/20 border-blue-600/30'
            : 'text-red-400 bg-red-900/20 border-red-600/30'
        )}>
          {allyTeam === 'blue' ? 'BLUE' : 'RED'} TEAM
        </span>
      </div>

      <div className="p-2.5 space-y-1.5">
        {holes.map((hole) => (
          <div
            key={hole.id}
            className="flex items-start gap-2 rounded-lg px-2.5 py-2 border"
            style={{
              background:   hole.severity === 'critical' ? 'rgba(40,5,5,0.8)'   : 'rgba(25,15,0,0.7)',
              borderColor:  hole.severity === 'critical' ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.3)',
            }}
          >
            {/* Severity icon */}
            <span className="text-sm shrink-0 mt-0.5">
              {hole.severity === 'critical' ? '🚨' : '⚠️'}
            </span>

            <div className="flex-1 min-w-0">
              <p className={clsx(
                'text-[10px] leading-snug',
                hole.severity === 'critical' ? 'text-red-300' : 'text-yellow-300',
              )}>
                {hole.message}
              </p>
            </div>

            {/* Lane role suggestion */}
            <span className={clsx(
              'text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded border',
              hole.severity === 'critical'
                ? 'text-red-400 bg-red-900/20 border-red-600/30'
                : 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30'
            )}>
              {LANE_ICONS[hole.roleToFill] ?? '🎯'} {hole.roleToFill}
            </span>
          </div>
        ))}

        {holes.length > 0 && (
          <p className="text-[9px] text-slate-600 italic text-center pt-0.5">
            Corrigez ces failles avant de finaliser votre draft.
          </p>
        )}
      </div>
    </div>
  );
}
