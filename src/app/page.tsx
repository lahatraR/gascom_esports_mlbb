'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import type { GameMode } from '@/types/draft';

// ─── DraftBoard — SSR disabled (Zustand singleton hydration) ─────────────────
const DraftBoard = dynamic(
  () => import('@/components/draft/DraftBoard').then((m) => m.DraftBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div
            className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: '#7c1a0f', borderTopColor: 'transparent' }}
          />
          <p className="text-slate-400 text-sm font-medium tracking-wide">Loading draft engine…</p>
        </div>
      </div>
    ),
  }
);

// ─── GES Shield Logo SVG ──────────────────────────────────────────────────────
// Matches the real GES logo shape: pentagon shield + 3-point crown + GES lettering

function GESLogo({
  size    = 40,
  white   = true,  // true = white logo, false = crimson logo
  glow    = false,
  opacity = 1,
}: {
  size?:    number;
  white?:   boolean;
  glow?:    boolean;
  opacity?: number;
}) {
  const h = Math.round(size * 1.18);
  const fill   = white ? '#ffffff' : '#7c1a0f';
  const shadow = glow
    ? 'drop-shadow(0 0 12px rgba(180,40,20,0.95)) drop-shadow(0 0 30px rgba(120,20,10,0.6))'
    : undefined;

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 120 142"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gascom Esports — GES"
      style={{ filter: shadow, opacity }}
    >
      {/* ── Crown (3 points) ── */}
      {/* Left point */}
      <polygon points="14,8 22,36 38,36 30,20" fill={fill} />
      {/* Centre point (taller pentagon) */}
      <polygon points="60,2 72,28 60,22 48,28" fill={fill} />
      {/* Right point */}
      <polygon points="106,8 98,36 82,36 90,20" fill={fill} />
      {/* Crown base bar connecting all 3 */}
      <rect x="22" y="30" width="76" height="10" rx="1" fill={fill} />

      {/* ── Shield body ── */}
      {/*
        Pentagon shield:
          top-left (16,42) → top-right (104,42)
          → right-notch (104,96) → right-lower (90,96) → bottom-tip (60,138)
          → left-lower (30,96) → left-notch (16,96) → close
        The notch creates the "G2-style" angular base before the bottom point
      */}
      <path
        d="M16,42 L104,42 L104,94 L78,94 L60,136 L42,94 L16,94 Z"
        fill={fill}
      />

      {/* ── GES cut-outs (negative space letters inside shield) ──
          Only shown on white/large logo for visual accuracy
          Uses dark cut-outs to reveal the crimson bg behind
      */}
      {white && (
        <g fill="#7c1a0f">
          {/* G — left portion */}
          <path d="M26,56 L26,80 L45,80 L45,72 L36,72 L36,64 L45,64 L45,56 Z" />
          <rect x="36" y="72" width="9" height="8" />
          {/* E — centre */}
          <rect x="50" y="56" width="20" height="8" />
          <rect x="50" y="68" width="15" height="8" />
          <rect x="50" y="80" width="20" height="8" />
          <rect x="50" y="56" width="4" height="32" />
          {/* S — right portion */}
          <path d="M76,56 L76,64 L90,64 L90,72 L76,72 L76,88 L94,88 L94,80 L82,80 L82,72 L94,72 L94,56 Z" />
        </g>
      )}
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

  useEffect(() => { loadHeroPool(); }, [loadHeroPool]);

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
    <div className="min-h-screen flex flex-col" style={{ background: '#030304' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          CINEMATIC BACKGROUND — matches the GES brand image exactly:
          Deep crimson radial glow top-left, fading to brand black
          ════════════════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 130% 80% at 18% -8%,
              rgba(110,22,12,0.92) 0%,
              rgba(70,14,7,0.65)   18%,
              rgba(25,5,3,0.35)    38%,
              transparent          58%
            ),
            radial-gradient(ellipse 60% 40% at 88% 105%,
              rgba(60,12,6,0.30) 0%,
              transparent        45%
            )
          `,
        }}
      />

      {/* GES shield watermark — centered, same as brand image */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -52%)',
          opacity: 0.055,
        }}
      >
        <GESLogo size={520} white={false} />
      </div>

      {/* ── All content above background ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sticky top-0 z-40 border-b"
          style={{
            background: 'rgba(3,3,4,0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(124,26,15,0.40)',
            boxShadow: '0 1px 30px rgba(100,18,8,0.25)',
          }}
        >
          {/* GES Logo + title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <GESLogo size={44} glow />
            <div className="flex flex-col justify-center">
              <h1
                className="font-display text-white leading-tight tracking-widest"
                style={{ fontSize: 'clamp(14px, 2.6vw, 19px)' }}
              >
                GASCOM ESPORTS
              </h1>
              <p
                className="text-[9px] sm:text-[10px] font-bold tracking-[0.22em] uppercase leading-none"
                style={{ color: 'rgba(180,80,55,0.9)' }}
              >
                MLBB · Draft Simulator
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div
            className="flex items-center gap-0.5 sm:gap-1 rounded-lg p-1 border"
            style={{
              background: 'rgba(10,3,2,0.85)',
              borderColor: 'rgba(124,26,15,0.35)',
            }}
          >
            {MODE_OPTIONS.map((mode) => (
              <button
                key={mode.value}
                title={mode.desc}
                onClick={() => { setGameMode(mode.value); resetDraft(); }}
                className={clsx(
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide transition-all',
                  gameMode === mode.value
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                )}
                style={gameMode === mode.value ? {
                  background: 'linear-gradient(135deg, #8c1e10, #5a1208)',
                  boxShadow: '0 0 16px rgba(124,26,15,0.6)',
                } : {}}
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
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse sm:hidden" />
            ) : poolError ? (
              <span className="w-2 h-2 rounded-full bg-orange-500 sm:hidden" title={poolError} />
            ) : heroPoolLen > 0 ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 sm:hidden" />
            ) : null}

            {/* Full status (desktop) */}
            <span className="hidden sm:flex">
              {isLoading ? (
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  Loading…
                </span>
              ) : poolError ? (
                <span className="text-[10px] text-orange-400/80 flex items-center gap-1.5" title={poolError}>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Offline ({heroPoolLen})
                </span>
              ) : heroPoolLen > 0 ? (
                <span className="text-[10px] text-emerald-400/75 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {heroPoolLen} heroes
                </span>
              ) : null}
            </span>

            {/* Undo */}
            {currentStep > 0 && (
              <button
                onClick={undoLastAction}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all border border-slate-700/30 text-slate-400 hover:text-white"
                style={{ background: 'rgba(15,5,4,0.8)' }}
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
                  : 'border-slate-700/30 text-slate-400 hover:text-red-400 hover:border-red-500/40'
              )}
              style={{ background: confirmReset ? 'rgba(124,26,15,0.3)' : 'rgba(15,5,4,0.8)' }}
            >
              {confirmReset
                ? <><span className="hidden sm:inline">⚠ Confirm </span>Reset</>
                : <><span className="hidden sm:inline">↺ </span>Reset</>
              }
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 p-2 sm:p-4 overflow-auto flex flex-col pb-20 md:pb-4">
          <DraftBoard />
        </main>

        {/* ── Footer ── */}
        <footer
          className="hidden md:flex px-6 py-2 border-t items-center justify-between"
          style={{
            background: 'rgba(3,3,4,0.90)',
            borderColor: 'rgba(124,26,15,0.25)',
          }}
        >
          <span className="text-[10px] text-slate-600">
            Data:{' '}
            <a
              href="https://mlbb-stats.rone.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors"
              style={{ color: 'rgba(124,26,15,0.7)' }}
            >
              mlbb-stats.rone.dev
            </a>
            {' '}· Tier list: @gosugamersmlbb
          </span>
          <div className="flex items-center gap-2">
            <GESLogo size={18} glow={false} />
            <span
              className="text-[10px] font-display tracking-widest"
              style={{ color: 'rgba(124,26,15,0.65)' }}
            >
              GASCOM ESPORTS
            </span>
          </div>
        </footer>

      </div>{/* end z-10 */}
    </div>
  );
}
