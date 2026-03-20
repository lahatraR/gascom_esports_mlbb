'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { HeroData } from '@/types/draft';

const ROLE_COLORS: Record<string, string> = {
  Tank:      'bg-blue-900/60   text-blue-300   border-blue-700/40',
  Support:   'bg-teal-900/60   text-teal-300   border-teal-700/40',
  Fighter:   'bg-orange-900/60 text-orange-300 border-orange-700/40',
  Assassin:  'bg-purple-900/60 text-purple-300 border-purple-700/40',
  Mage:      'bg-violet-900/60 text-violet-300 border-violet-700/40',
  Marksman:  'bg-yellow-900/60 text-yellow-300 border-yellow-700/40',
};

const ROLE_BORDER: Record<string, string> = {
  Tank:      'border-blue-500/50',
  Support:   'border-teal-500/50',
  Fighter:   'border-orange-500/50',
  Assassin:  'border-purple-500/50',
  Mage:      'border-violet-500/50',
  Marksman:  'border-yellow-500/50',
};

type CardVariant = 'selector' | 'pick' | 'ban';

interface HeroCardProps {
  hero: HeroData;
  variant?: CardVariant;
  disabled?: boolean;       // hero is banned/picked
  active?: boolean;         // current slot is active
  onClick?: () => void;
  showTooltip?: boolean;
  team?: 'blue' | 'red';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  xs: { container: 'w-10 h-10',  img: 'w-10 h-10',  text: 'text-[9px]'  },
  sm: { container: 'w-14 h-14',  img: 'w-14 h-14',  text: 'text-[10px]' },
  md: { container: 'w-16 h-20',  img: 'w-16 h-16',  text: 'text-xs'     },
  lg: { container: 'w-20 h-24',  img: 'w-20 h-20',  text: 'text-xs'     },
};

export function HeroCard({
  hero,
  variant = 'selector',
  disabled = false,
  active   = false,
  onClick,
  showTooltip = false,
  team,
  size = 'md',
}: HeroCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sz = SIZE_CONFIG[size];
  const primaryRole = hero.roles[0] ?? 'Fighter';
  const roleBorder  = ROLE_BORDER[primaryRole] ?? 'border-slate-500/50';

  const teamBorder = team === 'blue' ? 'border-blue-500' : team === 'red' ? 'border-red-500' : roleBorder;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        className={clsx(
          'relative flex flex-col items-center gap-1 rounded-lg border-2 overflow-hidden transition-all duration-200',
          sz.container,
          disabled
            ? 'opacity-30 cursor-not-allowed border-slate-700/30 grayscale'
            : active
              ? `cursor-pointer border-yellow-400 ${team === 'blue' ? 'glow-blue' : team === 'red' ? 'glow-red' : 'glow-gold'}`
              : `cursor-pointer hover:border-white/40 hover:scale-105 ${teamBorder}`,
        )}
      >
        {/* Hero image or fallback */}
        <div className={clsx('flex-shrink-0 overflow-hidden', sz.img)}>
          {hero.image && !imgError ? (
            <img
              src={hero.image}
              alt={hero.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <HeroFallbackImage hero={hero} size={size} />
          )}
        </div>

        {/* Ban overlay */}
        {variant === 'ban' && !disabled && (
          <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
            <span className="text-red-400 text-lg font-black">✕</span>
          </div>
        )}
      </button>

      {/* Hero name label (for selector cards) */}
      {variant === 'selector' && (
        <p className={clsx('text-center mt-0.5 text-slate-300 leading-tight truncate w-full px-0.5', sz.text)}>
          {hero.name}
        </p>
      )}

      {/* Tooltip on hover */}
      {showTooltip && hovered && !disabled && (
        <HeroTooltip hero={hero} />
      )}
    </div>
  );
}

// ─── Fallback image ───────────────────────────────────────────────────────────

const ROLE_BG: Record<string, string> = {
  Tank:      'from-blue-900 to-blue-700',
  Support:   'from-teal-900 to-teal-700',
  Fighter:   'from-orange-900 to-orange-700',
  Assassin:  'from-purple-900 to-purple-700',
  Mage:      'from-violet-900 to-violet-700',
  Marksman:  'from-yellow-900 to-yellow-700',
};

function HeroFallbackImage({ hero, size }: { hero: HeroData; size: string }) {
  const role = hero.roles[0] ?? 'Fighter';
  const bg   = ROLE_BG[role] ?? 'from-slate-800 to-slate-700';
  const sz   = SIZE_CONFIG[size as keyof typeof SIZE_CONFIG];

  return (
    <div className={clsx('w-full h-full bg-gradient-to-br flex items-center justify-center', bg)}>
      <span className="text-white font-black select-none" style={{ fontSize: size === 'xs' ? 14 : size === 'sm' ? 18 : 22 }}>
        {hero.name.charAt(0)}
      </span>
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function HeroTooltip({ hero }: { hero: HeroData }) {
  const primaryRole = hero.roles[0] ?? 'Fighter';
  const roleTag = ROLE_COLORS[primaryRole] ?? '';

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 glass p-3 slide-in pointer-events-none">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm text-white">{hero.name}</span>
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-medium', roleTag)}>
          {primaryRole}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400">
        {[
          ['WR',    `${(hero.winRate  * 100).toFixed(1)}%`],
          ['Pick',  `${(hero.pickRate * 100).toFixed(1)}%`],
          ['Ban',   `${(hero.banRate  * 100).toFixed(1)}%`],
          ['Dmg',   `${hero.damage}/10`],
          ['Tank',  `${hero.tankiness}/10`],
          ['CC',    `${hero.cc}/10`],
          ['Early', `${hero.early}/10`],
          ['Late',  `${hero.late}/10`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-slate-500">{k}</span>
            <span className="text-slate-200 font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty slot card ─────────────────────────────────────────────────────────

interface EmptySlotProps {
  label?: string;
  active?: boolean;
  team?: 'blue' | 'red';
  variant?: 'ban' | 'pick';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function EmptySlot({ label, active, team, variant = 'pick', size = 'md' }: EmptySlotProps) {
  const sz = SIZE_CONFIG[size];
  const activeBorder = team === 'blue' ? 'border-blue-500/70 glow-blue active-pulse'
                     : team === 'red'  ? 'border-red-500/70 glow-red active-pulse'
                     : 'border-yellow-500/70 glow-gold active-pulse';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={clsx(
          'rounded-lg border-2 border-dashed flex items-center justify-center',
          sz.container,
          active ? activeBorder : 'border-slate-700/50',
          variant === 'ban' ? 'bg-red-950/20' : 'bg-navy-800/50',
        )}
      >
        {active && (
          <span className={clsx('font-bold', team === 'blue' ? 'text-blue-400' : 'text-red-400', 'text-lg')}>
            ?
          </span>
        )}
      </div>
      {label && (
        <p className={clsx('text-center text-[10px]', active ? 'text-yellow-400' : 'text-slate-600')}>
          {label}
        </p>
      )}
    </div>
  );
}
