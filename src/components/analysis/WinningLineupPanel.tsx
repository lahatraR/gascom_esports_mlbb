'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { WinningLineup, WinningLineupSlot, LaneRole } from '@/types/draft';
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_ICON,
  ARCHETYPE_CLASSES,
} from '@/engine/archetypeEngine';

// ─── Lane badges ──────────────────────────────────────────────────────────────

const LANE_COLORS: Record<LaneRole, string> = {
  Gold:   'bg-yellow-900/70 text-yellow-300 border-yellow-600/40',
  Roam:   'bg-teal-900/70   text-teal-300   border-teal-600/40',
  Jungle: 'bg-green-900/70  text-green-300  border-green-600/40',
  Mid:    'bg-violet-900/70 text-violet-300 border-violet-600/40',
  EXP:    'bg-orange-900/70 text-orange-300 border-orange-600/40',
};

const LANE_SHORT: Record<LaneRole, string> = {
  Gold:   'Gold',
  Roam:   'Roam',
  Jungle: 'JGL',
  Mid:    'Mid',
  EXP:    'EXP',
};

// ─── Slot row ─────────────────────────────────────────────────────────────────

function SlotRow({ slot }: { slot: WinningLineupSlot }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 rounded-lg p-1.5 border transition-all',
        slot.isLocked
          ? 'border-emerald-600/40'
          : 'border-slate-700/30 border-dashed'
      )}
      style={{
        background: slot.isLocked
          ? 'rgba(5,30,15,0.7)'
          : 'rgba(8,8,12,0.5)',
      }}
    >
      {/* Lane badge */}
      <span className={clsx(
        'text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 w-9 text-center',
        LANE_COLORS[slot.laneRole]
      )}>
        {LANE_SHORT[slot.laneRole]}
      </span>

      {/* Hero image */}
      <div className="w-8 h-8 rounded overflow-hidden shrink-0 border border-slate-700/40">
        {slot.hero.image && !imgErr ? (
          <img
            src={slot.hero.image}
            alt={slot.hero.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <span className="text-slate-400 text-[11px] font-bold">
              {slot.hero.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Hero info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{slot.hero.name}</p>
        <p className="text-slate-500 text-[10px] truncate leading-tight">{slot.reason}</p>
      </div>

      {/* Status badge */}
      {slot.isLocked ? (
        <span className="text-[9px] font-bold text-emerald-400 border border-emerald-600/40 bg-emerald-900/30 px-1.5 py-0.5 rounded shrink-0">
          ✓ LOCKED
        </span>
      ) : (
        <span className="text-[9px] font-bold text-yellow-400 border border-yellow-600/40 bg-yellow-900/20 px-1.5 py-0.5 rounded shrink-0">
          → PICK
        </span>
      )}
    </div>
  );
}

// ─── Strength bar ─────────────────────────────────────────────────────────────

function StrengthBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 shrink-0">{value}%</span>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  lineup:    WinningLineup | null;
  allyTeam:  'blue' | 'red';
}

export function WinningLineupPanel({ lineup, allyTeam }: Props) {
  if (!lineup) {
    return (
      <div className="glass p-4 flex items-center justify-center min-h-20">
        <p className="text-slate-600 text-xs text-center">
          Winning lineup appears once heroes are loaded
        </p>
      </div>
    );
  }

  const ac    = ARCHETYPE_CLASSES[lineup.archetype];
  const icon  = ARCHETYPE_ICON[lineup.archetype];
  const label = ARCHETYPE_LABELS[lineup.archetype];

  const lockedCount = lineup.slots.filter((s) => s.isLocked).length;
  const pickCount   = lineup.slots.filter((s) => !s.isLocked).length;

  const teamColor = allyTeam === 'blue'
    ? 'rgba(59,130,246,0.12)'
    : 'rgba(239,68,68,0.12)';
  const teamBorder = allyTeam === 'blue'
    ? 'rgba(59,130,246,0.35)'
    : 'rgba(239,68,68,0.35)';

  return (
    <div className="glass overflow-hidden">

      {/* ── Header ── */}
      <div
        className="px-3 py-2.5 border-b"
        style={{ background: teamColor, borderColor: teamBorder }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              🏆 Winning Lineup
            </span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-bold', ac.badge)}>
              {icon} {label}
            </span>
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-bold',
              allyTeam === 'blue'
                ? 'text-blue-400 bg-blue-900/30 border border-blue-600/30'
                : 'text-red-400 bg-red-900/30 border border-red-600/30'
            )}>
              {allyTeam === 'blue' ? 'BLUE' : 'RED'} TEAM
            </span>
          </div>
          <StrengthBar value={lineup.strength} />
        </div>

        {/* Archetype reason */}
        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{lineup.archetypeReason}</p>

        {/* Slot summary */}
        {lockedCount > 0 && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            {lockedCount} locked · {pickCount} to pick
          </p>
        )}
      </div>

      {/* ── Slots ── */}
      <div className="p-3 space-y-1.5">
        {lineup.slots.map((slot) => (
          <SlotRow key={`${slot.laneRole}-${slot.hero.id}`} slot={slot} />
        ))}
      </div>

      {/* ── Win condition ── */}
      <div className="px-3 pb-3">
        <div
          className="flex items-start gap-1.5 rounded-lg p-2"
          style={{ background: 'rgba(20,40,20,0.4)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span className="text-emerald-400 text-sm shrink-0">✓</span>
          <p className="text-[11px] text-emerald-300/80 leading-snug">{lineup.winCondition}</p>
        </div>
      </div>
    </div>
  );
}
