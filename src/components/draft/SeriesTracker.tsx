'use client';

import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import type { SeriesMode } from '@/types/draft';

const SERIES_LABELS: Record<SeriesMode, string> = {
  none: 'Single Game',
  bo3:  'Best of 3',
  bo5:  'Best of 5',
};

const MAX_GAMES: Record<SeriesMode, number> = { none: 1, bo3: 3, bo5: 5 };

export function SeriesTracker() {
  const seriesMode     = useDraftStore((s) => s.seriesMode);
  const currentGame    = useDraftStore((s) => s.currentGame);
  const gamesHistory   = useDraftStore((s) => s.gamesHistory);
  const currentStep    = useDraftStore((s) => s.currentStep);
  const gameMode       = useDraftStore((s) => s.gameMode);
  const recordGameWinner = useDraftStore((s) => s.recordGameWinner);
  const resetDraft     = useDraftStore((s) => s.resetDraft);

  const seq  = getDraftSequence(gameMode);
  const isDraftDone = currentStep >= seq.length;

  if (seriesMode === 'none') return null;

  const maxGames  = MAX_GAMES[seriesMode];
  const blueWins  = gamesHistory.filter((g) => g.winner === 'blue').length;
  const redWins   = gamesHistory.filter((g) => g.winner === 'red').length;
  const winsNeeded = seriesMode === 'bo3' ? 2 : 3;
  const seriesOver  = blueWins >= winsNeeded || redWins >= winsNeeded;

  return (
    <div
      className="glass flex items-center gap-3 px-3 py-2 rounded-lg"
    >
      {/* Series label */}
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
          {SERIES_LABELS[seriesMode]}
        </span>
        <span className="text-[11px] font-bold text-slate-300">
          Game {Math.min(currentGame, maxGames)}
          {seriesOver && ' — OVER'}
        </span>
      </div>

      {/* Game dots */}
      <div className="flex gap-1">
        {Array.from({ length: maxGames }).map((_, i) => {
          const g = gamesHistory[i];
          return (
            <div
              key={i}
              className={clsx(
                'w-4 h-4 rounded-full border text-[8px] font-black flex items-center justify-center',
                g?.winner === 'blue' ? 'bg-blue-600/40 border-blue-500/60 text-blue-300' :
                g?.winner === 'red'  ? 'bg-red-600/40  border-red-500/60  text-red-300'  :
                i === currentGame - 1 && !seriesOver
                  ? 'bg-slate-700/60 border-slate-500/50 text-slate-400 animate-pulse'
                  : 'bg-slate-800/40 border-slate-700/30 text-slate-700'
              )}
            >
              {g?.winner === 'blue' ? 'B' : g?.winner === 'red' ? 'R' : i === currentGame - 1 && !seriesOver ? '▶' : '○'}
            </div>
          );
        })}
      </div>

      {/* Score */}
      <div className="flex items-center gap-1">
        <span className="text-blue-400 font-black text-sm">{blueWins}</span>
        <span className="text-slate-600 text-xs">-</span>
        <span className="text-red-400 font-black text-sm">{redWins}</span>
      </div>

      {/* Record result (only when draft is done and series isn't over) */}
      {isDraftDone && !seriesOver && (
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => recordGameWinner('blue')}
            className="px-2 py-0.5 text-[10px] font-bold rounded border border-blue-600/40 text-blue-300 bg-blue-950/30 hover:bg-blue-800/40 transition-colors"
          >
            Blue Win
          </button>
          <button
            onClick={() => recordGameWinner('red')}
            className="px-2 py-0.5 text-[10px] font-bold rounded border border-red-600/40 text-red-300 bg-red-950/30 hover:bg-red-800/40 transition-colors"
          >
            Red Win
          </button>
        </div>
      )}

      {/* Reset series (when over) */}
      {seriesOver && (
        <button
          onClick={() => {
            useDraftStore.setState({ gamesHistory: [], currentGame: 1 });
            resetDraft();
          }}
          className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded border border-slate-700/40 text-slate-400 hover:text-white transition-colors"
        >
          New Series
        </button>
      )}
    </div>
  );
}
