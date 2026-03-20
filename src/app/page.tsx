'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import type { GameMode } from '@/types/draft';

// ─── Disable SSR for the draft board (uses Zustand singleton — avoid hydration mismatch)
const DraftBoard = dynamic(
  () => import('@/components/draft/DraftBoard').then((m) => m.DraftBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading draft engine…</p>
        </div>
      </div>
    ),
  }
);

const MODE_OPTIONS: { value: GameMode; label: string; desc: string }[] = [
  { value: 'ranked',     label: 'Ranked',     desc: 'Comfort & flexibility' },
  { value: 'tournament', label: 'Tournament', desc: 'Meta & coordination' },
  { value: 'custom',     label: 'Custom',     desc: 'Scrim simulation' },
];

export default function Home() {
  const loadHeroPool   = useDraftStore((s) => s.loadHeroPool);
  const resetDraft     = useDraftStore((s) => s.resetDraft);
  const undoLastAction = useDraftStore((s) => s.undoLastAction);
  const setGameMode    = useDraftStore((s) => s.setGameMode);
  const gameMode       = useDraftStore((s) => s.gameMode);
  const isLoading      = useDraftStore((s) => s.isLoadingPool);
  const poolError      = useDraftStore((s) => s.poolError);
  const currentStep    = useDraftStore((s) => s.currentStep);
  const heroPoolLen    = useDraftStore((s) => s.heroPool.length);

  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    loadHeroPool();
  }, [loadHeroPool]);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2500);
      return;
    }
    resetDraft();
    setConfirmReset(false);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #03071280 0%, #050b18 30%, #030712 100%)' }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 border-b border-white/5 bg-navy-900/80 backdrop-blur sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-900/50">
            <span className="text-white font-black text-sm">G</span>
          </div>
          <div>
            <h1 className="font-black text-white text-xs sm:text-sm tracking-wide">GASCOM ESPORTS</h1>
            <p className="text-[9px] sm:text-[10px] text-blue-400/80 tracking-widest uppercase font-medium hidden xs:block">
              MLBB Draft Simulator
            </p>
          </div>
        </div>

        {/* Mode selector — abbreviated on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-navy-800/80 rounded-lg p-1 border border-slate-700/40">
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.value}
              title={mode.desc}
              onClick={() => { setGameMode(mode.value); resetDraft(); }}
              className={clsx(
                'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all',
                gameMode === mode.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {/* Show first 3 chars on very small screens */}
              <span className="sm:hidden">{mode.label.slice(0, 4)}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Status dot — icon only on mobile */}
          {isLoading ? (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse inline-block sm:hidden" />
          ) : poolError ? (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block sm:hidden" title={poolError} />
          ) : heroPoolLen > 0 ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block sm:hidden" />
          ) : null}

          {/* Full status text — hidden on mobile */}
          <span className="hidden sm:flex">
            {isLoading ? (
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse inline-block" />
                Loading {heroPoolLen > 0 ? `${heroPoolLen}` : ''} heroes…
              </span>
            ) : poolError ? (
              <span className="text-[10px] text-amber-500/80 flex items-center gap-1.5" title={poolError}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Offline ({heroPoolLen} heroes)
              </span>
            ) : heroPoolLen > 0 ? (
              <span className="text-[10px] text-emerald-500/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {heroPoolLen} heroes loaded
              </span>
            ) : null}
          </span>

          {/* Undo */}
          {currentStep > 0 && (
            <button
              onClick={undoLastAction}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-navy-800 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500 text-[10px] sm:text-xs font-medium transition-all"
            >
              ↩ <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className={clsx(
              'px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border',
              confirmReset
                ? 'bg-red-600/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-navy-800 border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/40'
            )}
          >
            {confirmReset
              ? <><span className="hidden sm:inline">⚠️ Confirm </span>Reset</>
              : <><span className="hidden sm:inline">↺ </span>Reset</>
            }
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-2 sm:p-4 overflow-auto flex flex-col pb-20 md:pb-4">
        <DraftBoard />
      </main>

      {/* ── Footer — hidden on mobile (covered by tab bar) ── */}
      <footer className="hidden md:flex px-6 py-2 border-t border-white/5 bg-navy-900/60 items-center justify-between">
        <span className="text-[10px] text-slate-600">
          Data:{' '}
          <a
            href="https://mlbb-stats.rone.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400"
          >
            mlbb-stats.rone.dev
          </a>{' '}
          by ridwaanhall
        </span>
        <span className="text-[10px] text-slate-600">
          GASCOM Esports MLBB Draft Simulator v1.0
        </span>
      </footer>
    </div>
  );
}
