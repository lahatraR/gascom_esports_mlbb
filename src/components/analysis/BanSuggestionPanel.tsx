'use client';

import clsx from 'clsx';
import type { BanSuggestion, DraftTeam } from '@/types/draft';
import { useDraftStore } from '@/store/draftStore';

interface BanSuggestionPanelProps {
  banSuggestions: BanSuggestion[];
  currentTeam:    DraftTeam;
}

export function BanSuggestionPanel({ banSuggestions, currentTeam }: BanSuggestionPanelProps) {
  const selectHero = useDraftStore((s) => s.selectHero);
  const isBlue     = currentTeam === 'blue';

  if (banSuggestions.length === 0) {
    return (
      <div className="glass p-4 flex items-center justify-center min-h-[100px]">
        <p className="text-slate-500 text-xs text-center">Calculating ban priorities…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 glass p-3">
      <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
        🚫 Top Bans —{' '}
        <span className={isBlue ? 'text-blue-400' : 'text-red-400'}>
          {currentTeam.toUpperCase()} TEAM
        </span>
      </h3>

      <div className="flex flex-col gap-1.5">
        {banSuggestions.slice(0, 5).map((s, i) => {
          const scoreColor =
            s.score >= 80 ? 'text-red-400'   :
            s.score >= 60 ? 'text-amber-400' :
            'text-slate-400';

          return (
            <div
              key={s.hero.id}
              className="flex items-center gap-2.5 rounded-lg border border-slate-700/40 bg-red-950/10 p-2 hover:border-red-700/30 transition-colors"
            >
              {/* Rank badge */}
              <div
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 border',
                  i === 0 ? 'bg-red-900/40 text-red-300 border-red-700/50' :
                  i === 1 ? 'bg-red-950/30 text-red-400 border-red-800/40' :
                  'bg-slate-800/50 text-slate-500 border-slate-700/30'
                )}
              >
                {i + 1}
              </div>

              {/* Hero image */}
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-red-900/30">
                {s.hero.image ? (
                  <img src={s.hero.image} alt={s.hero.name} className="w-full h-full object-cover grayscale-[30%]" />
                ) : (
                  <div className="w-full h-full bg-red-900/40 flex items-center justify-center text-red-300 font-black text-xs">
                    {s.hero.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-white truncate">{s.hero.name}</span>
                  <span className={clsx('font-black text-sm tabular-nums flex-shrink-0', scoreColor)}>
                    {s.score}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-500 truncate flex-1">{s.reason}</p>
                  {/* Mini metrics */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="text-[9px] text-red-400/70">
                      ⚠{Math.round(s.threatScore * 10)}%
                    </span>
                    <span className="text-[9px] text-amber-400/70">
                      ★{Math.round(s.metaScore * 10)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Ban button */}
              <button
                onClick={() => selectHero(s.hero)}
                className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-colors bg-red-900/25 text-red-300 hover:bg-red-700/40 border border-red-800/40"
              >
                Ban
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-slate-700 text-center">
        ⚠ Threat to our team · ★ Meta priority
      </p>
    </div>
  );
}
