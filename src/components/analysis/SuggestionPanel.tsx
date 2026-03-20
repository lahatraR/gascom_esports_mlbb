'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { DraftSuggestion, DraftTeam, DraftArchetype } from '@/types/draft';
import { MetricBar } from '@/components/ui/MetricBar';
import { useDraftStore } from '@/store/draftStore';
import { heroArchetypeFit, ARCHETYPE_ICON, ARCHETYPE_SHORT, ARCHETYPE_CLASSES } from '@/engine/archetypeEngine';

const ALL_ARCHETYPES: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

function heroPrimaryArchetype(hero: import('@/types/draft').HeroData): DraftArchetype {
  return ALL_ARCHETYPES.reduce((best, a) =>
    heroArchetypeFit(hero, a) > heroArchetypeFit(hero, best) ? a : best,
    ALL_ARCHETYPES[0]
  );
}

interface SuggestionPanelProps {
  suggestions: DraftSuggestion[];
  currentTeam: DraftTeam;
  isPickPhase?: boolean;
}

export function SuggestionPanel({ suggestions, currentTeam, isPickPhase }: SuggestionPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectHero = useDraftStore((s) => s.selectHero);

  if (!isPickPhase || suggestions.length === 0) {
    return (
      <div className="glass p-4 flex items-center justify-center min-h-[120px]">
        <p className="text-slate-500 text-xs text-center">
          {isPickPhase ? 'Loading suggestions…' : 'Suggestions appear during pick phases'}
        </p>
      </div>
    );
  }

  const isBlue = currentTeam === 'blue';

  return (
    <div className="flex flex-col gap-2 glass p-3">
      <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
        💡 Top Suggestions —{' '}
        <span className={isBlue ? 'text-blue-400' : 'text-red-400'}>
          {currentTeam.toUpperCase()} TEAM
        </span>
      </h3>

      <div className="flex flex-col gap-1.5">
        {suggestions.slice(0, 5).map((s, i) => {
          const isSelected = selectedIdx === i;
          const scoreColor =
            s.score >= 80 ? 'text-emerald-400' :
            s.score >= 60 ? 'text-amber-400'   :
            'text-red-400';

          return (
            <div key={s.hero.id}>
              <button
                className={clsx(
                  'w-full rounded-lg border p-2 flex items-center gap-2.5 text-left transition-all duration-150',
                  isSelected
                    ? isBlue
                      ? 'border-blue-500/60 bg-blue-950/40'
                      : 'border-red-500/60  bg-red-950/40'
                    : 'border-slate-700/40 hover:border-slate-500/50 bg-navy-800/40'
                )}
                onClick={() => setSelectedIdx(isSelected ? null : i)}
              >
                {/* Rank badge */}
                <div
                  className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0',
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                    i === 1 ? 'bg-slate-600/30 text-slate-300 border border-slate-500/40'    :
                    i === 2 ? 'bg-orange-800/30 text-orange-400 border border-orange-600/40' :
                    'bg-navy-800 text-slate-500 border border-slate-700/30'
                  )}
                >
                  {i + 1}
                </div>

                {/* Hero image */}
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-slate-700/30">
                  {s.hero.image ? (
                    <img src={s.hero.image} alt={s.hero.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-black text-xs">
                      {s.hero.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs text-white truncate">{s.hero.name}</span>
                      {(() => {
                        const arch = heroPrimaryArchetype(s.hero);
                        const cls = ARCHETYPE_CLASSES[arch];
                        return (
                          <span className={clsx('text-[9px] px-1 py-0.5 rounded border font-medium shrink-0', cls.badge)}>
                            {ARCHETYPE_ICON[arch]} {ARCHETYPE_SHORT[arch]}
                          </span>
                        );
                      })()}
                    </div>
                    <span className={clsx('font-black text-sm tabular-nums flex-shrink-0', scoreColor)}>
                      {s.score}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{s.reason}</p>
                </div>

                {/* Pick button */}
                <button
                  onClick={(e) => { e.stopPropagation(); selectHero(s.hero); }}
                  className={clsx(
                    'flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-colors',
                    isBlue
                      ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-600/30'
                      : 'bg-red-600/20  text-red-300  hover:bg-red-600/40  border border-red-600/30'
                  )}
                >
                  Pick
                </button>
              </button>

              {/* Expanded breakdown */}
              {isSelected && (
                <div className="mt-1 ml-10 mr-2 p-2 rounded bg-navy-900/60 border border-slate-700/30 grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Counter',  val: s.breakdown.counter  },
                    { label: 'Synergy',  val: s.breakdown.synergy  },
                    { label: 'Meta',     val: s.breakdown.meta     },
                    { label: 'Phase',    val: s.breakdown.phase    },
                    { label: 'Pressure',val: s.breakdown.pressure  },
                  ].map(({ label, val }) => (
                    <MetricBar key={label} label={label} value={val} size="sm" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
