'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { EnemyPrediction, DraftTeam } from '@/types/draft';

interface EnemyPredictionPanelProps {
  predictions: EnemyPrediction[];
  enemyTeam: DraftTeam;
}

export function EnemyPredictionPanel({ predictions, enemyTeam }: EnemyPredictionPanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const isRed = enemyTeam === 'red';

  if (predictions.length === 0) {
    return (
      <div className="glass p-4 flex items-center justify-center">
        <p className="text-slate-500 text-xs text-center">
          Les prédictions de picks ennemis<br />apparaissent dès que les picks commencent
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 glass p-4">
      <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
        Ce que l&apos;équipe{' '}
        <span className={isRed ? 'text-red-400' : 'text-blue-400'}>
          {isRed ? 'Rouge' : 'Bleue'}
        </span>{' '}
        va probablement picker
      </h3>

      <div className="flex flex-col gap-2">
        {predictions.map((pred, i) => {
          const isOpen = expanded === i;
          const probColor =
            pred.probability >= 60 ? 'text-red-400' :
            pred.probability >= 35 ? 'text-amber-400' :
            'text-slate-400';

          return (
            <div
              key={pred.hero.id}
              className={clsx(
                'rounded-lg border transition-all duration-200 overflow-hidden',
                isRed
                  ? 'border-red-700/30 bg-red-950/20 hover:border-red-600/50'
                  : 'border-blue-700/30 bg-blue-950/20 hover:border-blue-600/50'
              )}
            >
              <button
                className="w-full flex items-center gap-3 p-2.5 text-left"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                {/* Rank */}
                <span className="text-slate-600 font-black text-sm w-4">#{i + 1}</span>

                {/* Hero image */}
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700/50">
                  {pred.hero.image ? (
                    <img
                      src={pred.hero.image}
                      alt={pred.hero.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-black text-sm">
                      {pred.hero.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{pred.hero.name}</div>
                  <div className="text-[10px] text-slate-500">{pred.hero.roles.join(' / ')}</div>
                </div>

                {/* Probability */}
                <div className="flex flex-col items-end gap-1">
                  <span className={clsx('text-lg font-black tabular-nums', probColor)}>
                    {pred.probability}%
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-navy-800">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', isRed ? 'bg-red-500' : 'bg-blue-500')}
                      style={{ width: `${pred.probability}%` }}
                    />
                  </div>
                </div>

                {/* Chevron */}
                <span className={clsx('text-slate-600 text-xs transition-transform', isOpen ? 'rotate-180' : '')}>
                  ▼
                </span>
              </button>

              {/* Expanded reasons */}
              {isOpen && (
                <div className="px-3 pb-3 border-t border-white/5">
                  <ul className="mt-2 space-y-1">
                    {pred.reasons.map((r, j) => (
                      <li key={j} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <span className="text-slate-600 mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
