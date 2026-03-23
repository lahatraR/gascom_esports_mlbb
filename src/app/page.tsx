'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import type { GameMode } from '@/types/draft';

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

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODE_LOBBY: {
  value: GameMode;
  icon: string;
  label: string;
  subLabel: string;
  desc: string;
  accent: string;
}[] = [
  {
    value: 'custom',
    icon: '🎮',
    label: 'CUSTOM',
    subLabel: 'Simulation de Scrim',
    desc: 'Draft libre entre équipes. Testez vos compositions et préparez vos stratégies sans contraintes.',
    accent: 'rgba(100,180,255,0.18)',
  },
  {
    value: 'ranked',
    icon: '🏆',
    label: 'RANKED',
    subLabel: 'Mode Classé',
    desc: 'Optimisé pour le solo & duo. Confort, flexibilité et picks sûrs face à toutes les compositions.',
    accent: 'rgba(255,200,60,0.18)',
  },
  {
    value: 'tournament',
    icon: '⚔️',
    label: 'TOURNAMENT',
    subLabel: 'Mode Tournoi',
    desc: 'Draft compétitif pro. Méta, coordination et picks high-level pour dominer la scène.',
    accent: 'rgba(220,80,50,0.20)',
  },
];

const MODE_LABEL: Record<GameMode, string> = {
  custom: 'Custom', ranked: 'Ranked', tournament: 'Tournament',
};

// ─── Shared background layers ─────────────────────────────────────────────────
function Background() {
  return (
    <>
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
      {/* GES watermark — very subtle */}
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
          src={`${BASE}/ges-logo.png`}
          alt=""
          width={520}
          height={520}
          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          priority={false}
          draggable={false}
        />
      </div>
    </>
  );
}

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

  const [phase, setPhase]         = useState<'lobby' | 'draft'>('lobby');
  const [confirmReset, setConfirmReset] = useState(false);
  // Track hovered card for imperative styles
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);

  useEffect(() => { loadHeroPool(); }, [loadHeroPool]);

  function handleSelectMode(mode: GameMode) {
    setGameMode(mode);
    resetDraft();
    setPhase('draft');
  }

  function handleBackToLobby() {
    resetDraft();
    setConfirmReset(false);
    setPhase('lobby');
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2500);
      return;
    }
    resetDraft();
    setConfirmReset(false);
  }

  // ── LOBBY SCREEN ─────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: '#030304' }}
      >
        <Background />

        <div className="relative z-10 flex flex-col flex-1 min-h-screen items-center justify-center px-4 py-10 sm:py-14">

          {/* ── Brand identity ── */}
          <div className="flex flex-col items-center text-center mb-10 sm:mb-14">

            {/* Crimson halo behind logo */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 340,
                height: 220,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(160,34,16,0.50) 0%, transparent 70%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
              }}
            />

            {/* GES Logo — large & glowing */}
            <div
              style={{
                filter: 'drop-shadow(0 0 28px rgba(200,50,22,1)) drop-shadow(0 0 72px rgba(120,20,10,0.60))',
                position: 'relative',
              }}
            >
              <Image
                src={`${BASE}/ges-logo.png`}
                alt="Gascom Esports Logo"
                width={140}
                height={165}
                className="object-contain"
                style={{ width: 'clamp(88px, 16vw, 148px)', height: 'auto' }}
                priority
              />
            </div>

            {/* Brand name */}
            <h1
              className="font-display text-white tracking-[0.22em] leading-none mt-5"
              style={{ fontSize: 'clamp(24px, 5.5vw, 52px)' }}
            >
              GASCOM ESPORTS
            </h1>

            <div
              className="my-2.5"
              style={{
                height: 1,
                width: 'clamp(100px, 30vw, 220px)',
                background: 'linear-gradient(to right, transparent, #7c1a0f, transparent)',
              }}
            />

            <p
              className="font-display tracking-[0.30em] leading-none"
              style={{ fontSize: 'clamp(10px, 1.8vw, 15px)', color: 'rgba(210,100,70,0.92)' }}
            >
              MLBB · DRAFT SIMULATOR
            </p>

            <p
              className="text-[10px] sm:text-xs italic font-medium tracking-wider mt-1.5"
              style={{ color: 'rgba(150,60,40,0.72)' }}
            >
              « UNIS PAR UNE SEULE PASSION, L&apos;ESPORTS »
            </p>
          </div>

          {/* ── Mode selection ── */}
          <div className="w-full max-w-4xl flex flex-col items-center gap-6 sm:gap-8">

            {/* Question */}
            <div className="flex flex-col items-center gap-2">
              <p
                className="text-white font-bold tracking-widest text-center"
                style={{ fontSize: 'clamp(13px, 2.2vw, 18px)' }}
              >
                Vous allez draft pour quel mode de jeu ?
              </p>
              <div
                style={{
                  height: 1,
                  width: 60,
                  background: 'linear-gradient(to right, transparent, rgba(124,26,15,0.70), transparent)',
                }}
              />
            </div>

            {/* Mode cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 w-full">
              {MODE_LOBBY.map((mode) => {
                const isHovered = hoveredMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => handleSelectMode(mode.value)}
                    onMouseEnter={() => setHoveredMode(mode.value)}
                    onMouseLeave={() => setHoveredMode(null)}
                    className="group relative flex flex-col items-center rounded-2xl border text-center cursor-pointer transition-all duration-300 overflow-hidden"
                    style={{
                      background: isHovered
                        ? `linear-gradient(160deg, rgba(16,5,3,0.98), rgba(10,3,2,0.98))`
                        : 'rgba(9,3,2,0.92)',
                      borderColor: isHovered ? 'rgba(180,50,20,0.75)' : 'rgba(124,26,15,0.38)',
                      boxShadow: isHovered
                        ? `0 0 40px rgba(124,26,15,0.45), 0 0 80px rgba(80,14,6,0.20), inset 0 0 24px rgba(80,14,6,0.12)`
                        : '0 2px 16px rgba(0,0,0,0.50)',
                      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                      padding: 'clamp(20px, 3vw, 36px) clamp(16px, 2.5vw, 28px)',
                    }}
                  >
                    {/* Accent glow strip at top */}
                    <div
                      aria-hidden="true"
                      className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(to right, transparent, ${mode.accent.replace('0.18', '0.9').replace('0.20', '0.9')}, transparent)`,
                        opacity: isHovered ? 1 : 0,
                      }}
                    />

                    {/* Icon */}
                    <div
                      className="mb-3 transition-transform duration-300"
                      style={{
                        fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                        transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                        filter: isHovered ? 'drop-shadow(0 0 12px rgba(220,100,60,0.6))' : 'none',
                      }}
                    >
                      {mode.icon}
                    </div>

                    {/* Mode name */}
                    <div
                      className="font-display tracking-[0.20em] leading-tight transition-colors duration-300"
                      style={{
                        fontSize: 'clamp(15px, 2.8vw, 20px)',
                        color: isHovered ? '#ffffff' : 'rgba(230,210,200,0.92)',
                      }}
                    >
                      {mode.label}
                    </div>

                    {/* Sub-label */}
                    <div
                      className="mt-1 font-medium tracking-wider transition-colors duration-300"
                      style={{
                        fontSize: 'clamp(9px, 1.3vw, 11px)',
                        color: isHovered ? 'rgba(220,130,90,0.95)' : 'rgba(160,80,55,0.80)',
                      }}
                    >
                      {mode.subLabel}
                    </div>

                    {/* Divider */}
                    <div
                      className="my-3 transition-opacity duration-300"
                      style={{
                        height: 1,
                        width: '60%',
                        background: 'linear-gradient(to right, transparent, rgba(124,26,15,0.60), transparent)',
                        opacity: isHovered ? 1 : 0.4,
                      }}
                    />

                    {/* Description */}
                    <p
                      className="leading-relaxed transition-colors duration-300"
                      style={{
                        fontSize: 'clamp(10px, 1.4vw, 12px)',
                        color: isHovered ? 'rgba(180,130,110,0.90)' : 'rgba(120,75,55,0.75)',
                        maxWidth: 240,
                      }}
                    >
                      {mode.desc}
                    </p>

                    {/* CTA button */}
                    <div
                      className="mt-4 px-5 py-1.5 rounded-full font-bold tracking-[0.18em] transition-all duration-300"
                      style={{
                        fontSize: 'clamp(9px, 1.3vw, 11px)',
                        background: isHovered
                          ? 'linear-gradient(135deg, #8c1e10, #5a1208)'
                          : 'rgba(124,26,15,0.22)',
                        color: isHovered ? '#ffffff' : 'rgba(200,110,80,0.85)',
                        border: `1px solid ${isHovered ? 'rgba(180,60,30,0.80)' : 'rgba(124,26,15,0.45)'}`,
                        boxShadow: isHovered ? '0 0 16px rgba(124,26,15,0.55)' : 'none',
                      }}
                    >
                      LANCER LE DRAFT →
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hero pool loading hint */}
            <div className="h-5 flex items-center">
              {isLoading ? (
                <span className="text-[10px] text-slate-500 flex items-center gap-2 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  Chargement des héros…
                </span>
              ) : poolError ? (
                <span className="text-[10px] text-orange-400/70 flex items-center gap-2 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Mode hors-ligne — {heroPoolLen} héros disponibles
                </span>
              ) : heroPoolLen > 0 ? (
                <span className="text-[10px] text-emerald-400/60 flex items-center gap-2 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {heroPoolLen} héros prêts
                </span>
              ) : null}
            </div>
          </div>

          {/* Footer hint */}
          <p
            className="absolute bottom-4 text-[9px] sm:text-[10px] tracking-widest text-center"
            style={{ color: 'rgba(100,40,30,0.55)' }}
          >
            Data: mlbb-stats.rone.dev · Tier list: @gosugamersmlbb
          </p>
        </div>
      </div>
    );
  }

  // ── DRAFT SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#030304' }}
    >
      <Background />

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">

        {/* ── Brand hero strip ── */}
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
            paddingTop:    'clamp(14px, 2.5vw, 26px)',
            paddingBottom: 'clamp(10px, 2vw, 20px)',
            borderBottom:  '1px solid rgba(124,26,15,0.45)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300, height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(140,30,15,0.40) 0%, transparent 70%)',
              filter: 'blur(28px)',
            }}
          />

          <div
            style={{ filter: 'drop-shadow(0 0 16px rgba(180,40,20,0.85)) drop-shadow(0 0 40px rgba(120,20,10,0.45))' }}
          >
            <Image
              src={`${BASE}/ges-logo.png`}
              alt="Gascom Esports Logo"
              width={90}
              height={106}
              className="object-contain"
              style={{ width: 'clamp(52px, 7vw, 84px)', height: 'auto' }}
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-0.5 mt-2.5 text-center px-4">
            <h1
              className="font-display text-white tracking-[0.20em] leading-none"
              style={{ fontSize: 'clamp(18px, 3.5vw, 34px)' }}
            >
              GASCOM ESPORTS
            </h1>
            <div
              className="h-px w-20 sm:w-28 my-1"
              style={{ background: 'linear-gradient(to right, transparent, #7c1a0f, transparent)' }}
            />
            <p
              className="font-display tracking-[0.25em] leading-none"
              style={{ fontSize: 'clamp(9px, 1.5vw, 12px)', color: 'rgba(210,100,70,0.90)' }}
            >
              MLBB · DRAFT SIMULATOR
            </p>
          </div>
        </div>

        {/* ── Controls bar ── */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b"
          style={{
            background: 'rgba(3,3,4,0.94)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(124,26,15,0.35)',
            boxShadow: '0 2px 24px rgba(80,14,6,0.20)',
          }}
        >
          {/* Left: mini logo + back button */}
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src={`${BASE}/ges-logo.png`}
              alt="GES"
              width={28}
              height={33}
              style={{
                width: 26, height: 'auto',
                filter: 'drop-shadow(0 0 5px rgba(160,32,14,0.8))',
              }}
            />
            {/* Back to lobby button */}
            <button
              onClick={handleBackToLobby}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all border border-slate-700/30 text-slate-400 hover:text-white hover:border-slate-500/50"
              style={{ background: 'rgba(15,5,4,0.8)' }}
              title="Retour à la sélection du mode"
            >
              ← <span className="hidden sm:inline ml-1">Mode</span>
            </button>
            {/* Current mode badge */}
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest"
              style={{
                background: 'linear-gradient(135deg, rgba(124,26,15,0.55), rgba(80,14,7,0.55))',
                color: 'rgba(220,150,120,0.90)',
                border: '1px solid rgba(124,26,15,0.45)',
              }}
            >
              {MODE_LABEL[gameMode]}
            </span>
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
              src={`${BASE}/ges-logo.png`}
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
