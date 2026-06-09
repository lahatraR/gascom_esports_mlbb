'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { SeriesTracker } from '@/components/draft/SeriesTracker';
import { TIER_LIST_PATCH, TIER_LIST_DATE } from '@/data/tierList';
import type { GameMode, SeriesMode } from '@/types/draft';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

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

const SERIES_OPTIONS: { value: SeriesMode; label: string }[] = [
  { value: 'none', label: '1G' },
  { value: 'bo3',  label: 'BO3' },
  { value: 'bo5',  label: 'BO5' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const loadHeroPool   = useDraftStore((s) => s.loadHeroPool);
  const loadFromUrl    = useDraftStore((s) => s.loadFromUrl);
  const resetDraft     = useDraftStore((s) => s.resetDraft);
  const undoLastAction = useDraftStore((s) => s.undoLastAction);
  const setGameMode    = useDraftStore((s) => s.setGameMode);
  const setSeriesMode  = useDraftStore((s) => s.setSeriesMode);
  const gameMode       = useDraftStore((s) => s.gameMode);
  const seriesMode     = useDraftStore((s) => s.seriesMode);
  const isLoading      = useDraftStore((s) => s.isLoadingPool);
  const poolError      = useDraftStore((s) => s.poolError);
  const currentStep    = useDraftStore((s) => s.currentStep);
  const heroPoolLen    = useDraftStore((s) => s.heroPool.length);

  const [confirmReset, setConfirmReset] = useState(false);
  const [castMode,     setCastMode]     = useState(false);
  const [copyMsg,      setCopyMsg]      = useState<string | null>(null);

  // Load heroes then restore URL state
  useEffect(() => {
    loadHeroPool().then(() => {
      loadFromUrl();
    });
  }, [loadHeroPool, loadFromUrl]);

  // ── Reset handler ─────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2500);
      return;
    }
    resetDraft();
    setConfirmReset(false);
  }

  // ── Share handler ─────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(null), 2000);
    }).catch(() => {
      setCopyMsg('Link ready — share manually');
      setTimeout(() => setCopyMsg(null), 3000);
    });
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#030304' }}
    >
      {/* Background gradient */}
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

      {/* GES watermark */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.04,
          width: 520, height: 520,
        }}
      >
        <Image
          src={`${BASE}/ges-logo.png`}
          alt=""
          width={520} height={520}
          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          priority={false}
          draggable={false}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">

        {/* ══ BRAND HERO ══════════════════════════════════════════════════ */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, rgba(100,18,8,0.55) 0%, rgba(50,9,4,0.35) 40%, transparent 100%)`,
            paddingTop:    'clamp(18px, 3vw, 32px)',
            paddingBottom: 'clamp(14px, 2.5vw, 26px)',
            borderBottom:  '1px solid rgba(124,26,15,0.45)',
          }}
        >
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

          <div
            className="relative"
            style={{
              filter: 'drop-shadow(0 0 18px rgba(180,40,20,0.85)) drop-shadow(0 0 48px rgba(120,20,10,0.45))',
            }}
          >
            <Image
              src={`${BASE}/ges-logo.png`}
              alt="Gascom Esports Logo"
              width={90} height={106}
              className="object-contain"
              style={{ width: 'clamp(64px, 9vw, 104px)', height: 'auto' }}
              priority
            />
          </div>

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
              style={{ fontSize: 'clamp(10px, 1.8vw, 14px)', color: 'rgba(210,100,70,0.90)' }}
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

        {/* ══ CONTROLS BAR ════════════════════════════════════════════════ */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b flex-wrap"
          style={{
            background: 'rgba(3,3,4,0.94)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(124,26,15,0.35)',
            boxShadow: '0 2px 24px rgba(80,14,6,0.20)',
          }}
        >
          {/* Mini logo */}
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src={`${BASE}/ges-logo.png`}
              alt="GES"
              width={28} height={33}
              style={{ width: 28, height: 'auto', filter: 'drop-shadow(0 0 5px rgba(160,32,14,0.8))' }}
            />
            <span
              className="font-display tracking-widest text-white hidden sm:block"
              style={{ fontSize: 13 }}
            >
              GASCOM ESPORTS
            </span>
          </div>

          {/* Center controls group */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* Game mode selector */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 rounded-lg p-1 border"
              style={{ background: 'rgba(10,3,2,0.85)', borderColor: 'rgba(124,26,15,0.35)' }}
            >
              {MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.value}
                  title={mode.desc}
                  onClick={() => { setGameMode(mode.value); }}
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

            {/* Series mode selector */}
            <div
              className="flex items-center gap-0.5 rounded-lg p-1 border"
              style={{ background: 'rgba(10,3,2,0.85)', borderColor: 'rgba(124,26,15,0.25)' }}
              title="Series format"
            >
              {SERIES_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeriesMode(s.value)}
                  className={clsx(
                    'px-2 py-1 rounded text-[10px] font-bold tracking-wide transition-all',
                    seriesMode === s.value ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                  )}
                  style={seriesMode === s.value ? {
                    background: 'linear-gradient(135deg, #4a1a8c, #2a0e5a)',
                    boxShadow:  '0 0 10px rgba(80,40,140,0.4)',
                  } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Status */}
            {isLoading ? (
              <span className="hidden sm:flex text-[10px] text-slate-500 items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />Loading…
              </span>
            ) : poolError ? (
              <span className="hidden sm:flex text-[10px] text-orange-400/80 items-center gap-1.5" title={poolError}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Offline ({heroPoolLen})
              </span>
            ) : heroPoolLen > 0 ? (
              <span className="hidden sm:flex text-[10px] text-emerald-400/75 items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{heroPoolLen} heroes
              </span>
            ) : null}

            {/* Cast mode toggle */}
            <button
              onClick={() => setCastMode(true)}
              title="Live Cast Mode — clean fullscreen view"
              className="hidden sm:flex px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border border-violet-700/30 text-violet-400 hover:bg-violet-900/20 transition-all"
              style={{ background: 'rgba(15,5,4,0.8)' }}
            >
              📺 Cast
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              title="Copy shareable URL to clipboard"
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border border-teal-700/30 text-teal-400 hover:bg-teal-900/20 transition-all relative"
              style={{ background: 'rgba(15,5,4,0.8)' }}
            >
              {copyMsg
                ? <span className="text-emerald-400">{copyMsg}</span>
                : <>🔗 <span className="hidden sm:inline">Share</span></>
              }
            </button>

            {/* Undo */}
            {currentStep > 0 && (
              <button
                onClick={undoLastAction}
                title="Undo last action (Ctrl+Z)"
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
        </div>

        {/* ── Series tracker (shown only when BO3/BO5 active) ── */}
        <div className="px-3 sm:px-4 pt-2">
          <SeriesTracker />
        </div>

        {/* ── Draft tool ── */}
        <main className="flex-1 p-2 sm:p-3 flex flex-col min-h-0 overflow-auto lg:overflow-hidden pb-20 md:pb-3">
          <DraftBoard castMode={castMode} onExitCast={() => setCastMode(false)} />
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
            {' '}·{' '}
            <span className="text-slate-700">
              Patch {TIER_LIST_PATCH} ({TIER_LIST_DATE})
            </span>
            {' '}·{' '}
            <span className="text-slate-700 text-[9px]">
              Press / to search · 1-9 quick-select · Ctrl+Z undo
            </span>
          </span>
          <div className="flex items-center gap-2 opacity-60">
            <Image
              src={`${BASE}/ges-logo.png`}
              alt="GES"
              width={16} height={19}
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
