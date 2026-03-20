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
          <div className="w-12 h-12 rounded-full border-2 border-[#7c1a0f] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Loading draft engine…</p>
        </div>
      </div>
    ),
  }
);

// ─── GES Shield Logo ──────────────────────────────────────────────────────────

function GESLogo({ size = 36, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.1)}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gascom Esports Logo"
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(124,26,15,0.9)) drop-shadow(0 0 24px rgba(200,50,30,0.5))' } : undefined}
    >
      {/* Crown */}
      <path d="M26 28 L14 6 L36 20 L50 3 L64 20 L86 6 L74 28 Z" fill="#ffffff" />
      {/* Shield body — crimson fill */}
      <path d="M12 32 L88 32 L88 74 L50 108 L12 74 Z" fill="#7c1a0f" />
      {/* Shield inner bevel */}
      <path d="M18 38 L82 38 L82 72 L50 100 L18 72 Z" fill="#5a1208" />
      {/* Shield outline */}
      <path d="M12 32 L88 32 L88 74 L50 108 L12 74 Z" stroke="#ffffff" strokeWidth="2" fill="none" />
      {/* GES text */}
      <text
        x="50"
        y="79"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="31"
        fontWeight="900"
        fontFamily="'Bebas Neue', 'Arial Black', Impact, sans-serif"
        letterSpacing="2"
      >
        GES
      </text>
    </svg>
  );
}

// ─── Mode options ─────────────────────────────────────────────────────────────

const MODE_OPTIONS: { value: GameMode; label: string; desc: string }[] = [
  { value: 'ranked',     label: 'Ranked',     desc: 'Comfort & flexibility' },
  { value: 'tournament', label: 'Tournament', desc: 'Meta & coordination' },
  { value: 'custom',     label: 'Custom',     desc: 'Scrim simulation' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(160deg, #120302 0%, #030304 25%, #030304 100%)',
    }}>
      {/* GES watermark — faint logo centred behind all content */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
        style={{ opacity: 0.03 }}
      >
        <GESLogo size={500} />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex flex-col flex-1">
      <header
        className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(3,3,4,0.92)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(124,26,15,0.35)',
        }}
      >
        {/* GES Logo + title */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Logo with crimson glow */}
          <div className="relative">
            <GESLogo size={42} glow />
          </div>
          <div className="flex flex-col">
            <h1
              className="font-display text-white leading-none tracking-widest"
              style={{ fontSize: 'clamp(15px, 2.8vw, 20px)' }}
            >
              GASCOM ESPORTS
            </h1>
            <p className="text-[9px] sm:text-[11px] font-bold tracking-[0.2em] uppercase"
               style={{ color: '#a05040' }}>
              MLBB · Draft Simulator
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 rounded-lg p-1 border"
          style={{ background: 'rgba(20,5,3,0.8)', borderColor: 'rgba(124,26,15,0.3)' }}
        >
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.value}
              title={mode.desc}
              onClick={() => { setGameMode(mode.value); resetDraft(); }}
              className={clsx(
                'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all',
                gameMode === mode.value
                  ? 'text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              )}
              style={gameMode === mode.value
                ? { background: 'var(--brand-crimson)', boxShadow: '0 0 14px rgba(124,26,15,0.5)' }
                : {}
              }
            >
              <span className="sm:hidden">{mode.label.slice(0, 4)}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Status dot (mobile) */}
          {isLoading ? (
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block sm:hidden" />
          ) : poolError ? (
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block sm:hidden" title={poolError} />
          ) : heroPoolLen > 0 ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block sm:hidden" />
          ) : null}

          {/* Full status text (desktop) */}
          <span className="hidden sm:flex">
            {isLoading ? (
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse inline-block" />
                Loading…
              </span>
            ) : poolError ? (
              <span className="text-[10px] text-orange-400/80 flex items-center gap-1.5" title={poolError}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                Offline ({heroPoolLen})
              </span>
            ) : heroPoolLen > 0 ? (
              <span className="text-[10px] text-emerald-400/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {heroPoolLen} heroes
              </span>
            ) : null}
          </span>

          {/* Undo */}
          {currentStep > 0 && (
            <button
              onClick={undoLastAction}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-500"
              style={{ background: 'rgba(20,5,3,0.7)' }}
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
                ? 'border-red-500/60 text-red-400 animate-pulse'
                : 'border-slate-700/40 text-slate-400 hover:text-red-400 hover:border-red-500/40'
            )}
            style={{ background: confirmReset ? 'rgba(124,26,15,0.25)' : 'rgba(20,5,3,0.7)' }}
          >
            {confirmReset
              ? <><span className="hidden sm:inline">⚠ Confirm </span>Reset</>
              : <><span className="hidden sm:inline">↺ </span>Reset</>
            }
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-2 sm:p-4 overflow-auto flex flex-col pb-20 md:pb-4">
        <DraftBoard />
      </main>

      {/* ── Footer ── */}
      <footer
        className="hidden md:flex px-6 py-2 border-t items-center justify-between"
        style={{ background: 'rgba(3,3,4,0.85)', borderColor: 'rgba(124,26,15,0.2)' }}
      >
        <span className="text-[10px] text-slate-600">
          Data:{' '}
          <a
            href="https://mlbb-stats.rone.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400"
          >
            mlbb-stats.rone.dev
          </a>
          {' '}· Tier list: @gosugamersmlbb
        </span>
        <span className="text-[10px]" style={{ color: 'rgba(124,26,15,0.7)' }}>
          GASCOM ESPORTS · MLBB Draft Simulator
        </span>
      </footer>
      </div>{/* end z-10 wrapper */}
    </div>
  );
}
