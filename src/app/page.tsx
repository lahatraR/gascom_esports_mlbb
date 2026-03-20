'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import type { GameMode } from '@/types/draft';

// ─── DraftBoard — SSR disabled ────────────────────────────────────────────────
const DraftBoard = dynamic(
  () => import('@/components/draft/DraftBoard').then((m) => m.DraftBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-48">
        <div className="text-center space-y-4">
          <div
            className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: '#7c1a0f', borderTopColor: 'transparent' }}
          />
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
            Loading draft engine…
          </p>
        </div>
      </div>
    ),
  }
);

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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#030304' }}
    >

      {/* ══════════════════════════════════════════════════════════════════
          BACKGROUND — cinematic crimson radial (matches brand image)
          ════════════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 130% 85% at 18% -10%,
              rgba(110,22,12,0.95) 0%,
              rgba(70,14,7,0.65)   20%,
              rgba(20,4,2,0.30)    42%,
              transparent          60%
            ),
            radial-gradient(ellipse 55% 35% at 90% 108%,
              rgba(55,11,5,0.35) 0%,
              transparent        50%
            )
          `,
        }}
      />

      {/* GES watermark — large logo centred, very subtle */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.04,
          width: 520,
          height: 520,
        }}
      >
        <Image
          src="/ges-logo.png"
          alt=""
          width={520}
          height={520}
          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          priority={false}
          draggable={false}
        />
      </div>

      {/* ── All content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">

        {/* ══════════════════════════════════════════════════════════════
            BRAND HERO — seen immediately on load, full identity
            ════════════════════════════════════════════════════════════ */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `
              linear-gradient(
                to bottom,
                rgba(100,18,8,0.55) 0%,
                rgba(50,9,4,0.35)   40%,
                transparent         100%
              )
            `,
            paddingTop:    'clamp(18px, 3vw, 32px)',
            paddingBottom: 'clamp(14px, 2.5vw, 26px)',
            borderBottom:  '1px solid rgba(124,26,15,0.45)',
          }}
        >
          {/* Crimson glow halo behind logo */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(140,30,15,0.45) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          {/* GES Logo — real PNG, prominent */}
          <div
            className="relative"
            style={{
              filter: 'drop-shadow(0 0 18px rgba(180,40,20,0.85)) drop-shadow(0 0 48px rgba(120,20,10,0.45))',
            }}
          >
            <Image
              src="/ges-logo.png"
              alt="Gascom Esports Logo"
              width={90}
              height={106}
              className="object-contain"
              style={{
                width:  'clamp(64px, 9vw, 104px)',
                height: 'auto',
              }}
              priority
            />
          </div>

          {/* Brand text */}
          <div className="flex flex-col items-center gap-1 mt-3 text-center px-4">
            <h1
              className="font-display text-white tracking-[0.20em] leading-none"
              style={{ fontSize: 'clamp(22px, 4.5vw, 42px)' }}
            >
              GASCOM ESPORTS
            </h1>
            <div
              className="h-px w-24 sm:w-36 my-1"
              style={{ background: 'linear-gradient(to right, transparent, #7c1a0f, transparent)' }}
            />
            <p
              className="font-display tracking-[0.25em] leading-none"
              style={{
                fontSize: 'clamp(10px, 1.8vw, 14px)',
                color: 'rgba(210,100,70,0.90)',
              }}
            >
              MLBB · DRAFT SIMULATOR
            </p>
            <p
              className="text-[10px] sm:text-[11px] italic font-medium tracking-wider mt-0.5"
              style={{ color: 'rgba(150,60,40,0.75)' }}
            >
              « UNIS PAR UNE SEULE PASSION, L&apos;ESPORTS »
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CONTROLS BAR — compact, sticky
            ════════════════════════════════════════════════════════════ */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b"
          style={{
            background: 'rgba(3,3,4,0.94)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(124,26,15,0.35)',
            boxShadow: '0 2px 24px rgba(80,14,6,0.20)',
          }}
        >
          {/* Mini logo + title — visible once hero scrolls away */}
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src="/ges-logo.png"
              alt="GES"
              width={28}
              height={33}
              style={{
                width: 28, height: 'auto',
                filter: 'drop-shadow(0 0 5px rgba(160,32,14,0.8))',
              }}
            />
            <span
              className="font-display tracking-widest text-white hidden sm:block"
              style={{ fontSize: 13 }}
            >
              GASCOM ESPORTS
            </span>
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
                  gameMode === mode.value ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                )}
                style={gameMode === mode.value ? {
                  background: 'linear-gradient(135deg, #8c1e10, #5a1208)',
                  boxShadow:  '0 0 14px rgba(124,26,15,0.55)',
                } : {}}
              >
                <span className="sm:hidden">{mode.label.slice(0, 4)}</span>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Status + actions */}
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

            {currentStep > 0 && (
              <button
                onClick={undoLastAction}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all border border-slate-700/30 text-slate-400 hover:text-white"
                style={{ background: 'rgba(15,5,4,0.8)' }}
              >
                ↩ <span className="hidden sm:inline">Undo</span>
              </button>
            )}

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
        </div>

        {/* ── Draft tool ── */}
        <main className="flex-1 p-2 sm:p-4 overflow-auto flex flex-col pb-20 md:pb-4">
          <DraftBoard />
        </main>

        {/* ── Footer ── */}
        <footer
          className="hidden md:flex px-6 py-2 border-t items-center justify-between"
          style={{
            background: 'rgba(3,3,4,0.92)',
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
          <div className="flex items-center gap-2 opacity-60">
            <Image
              src="/ges-logo.png"
              alt="GES"
              width={16}
              height={19}
              style={{ width: 16, height: 'auto' }}
            />
            <span
              className="text-[10px] font-display tracking-widest"
              style={{ color: 'rgba(180,60,40,0.8)' }}
            >
              GASCOM ESPORTS
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
