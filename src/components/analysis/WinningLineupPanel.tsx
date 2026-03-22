'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { WinningLineup, WinningLineupSlot, BanThreat, LaneRole } from '@/types/draft';
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

// ─── Markdown bold renderer (converts **text** to <strong>) ──────────────────

function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-white font-semibold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// ─── Hero avatar ─────────────────────────────────────────────────────────────

function HeroAvatar({ hero, size = 8 }: { hero: { name: string; image: string }; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const sizeClass = size === 6 ? 'w-6 h-6' : size === 8 ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={clsx(sizeClass, 'rounded overflow-hidden shrink-0 border border-slate-700/40')}>
      {hero.image && !imgErr ? (
        <img
          src={hero.image}
          alt={hero.name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <span className="text-slate-400 font-bold" style={{ fontSize: '10px' }}>
            {hero.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Slot row with expandable detail ─────────────────────────────────────────

function SlotRow({ slot }: { slot: WinningLineupSlot }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={clsx(
        'rounded-lg border overflow-hidden transition-all',
        slot.isLocked ? 'border-emerald-600/40' : 'border-slate-700/30 border-dashed'
      )}
      style={{ background: slot.isLocked ? 'rgba(5,30,15,0.7)' : 'rgba(8,8,12,0.5)' }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5 p-1.5">
        {/* Lane badge */}
        <span className={clsx(
          'text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 w-9 text-center',
          LANE_COLORS[slot.laneRole]
        )}>
          {LANE_SHORT[slot.laneRole]}
        </span>

        <HeroAvatar hero={slot.hero} size={8} />

        {/* Name + short reason */}
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
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[9px] font-bold text-yellow-400 border border-yellow-600/40 bg-yellow-900/20 px-1.5 py-0.5 rounded shrink-0 hover:bg-yellow-900/40 transition-colors flex items-center gap-1"
          >
            → PICK
            <span className="text-[8px] opacity-70">{expanded ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && !slot.isLocked && (
        <div
          className="px-3 py-2.5 border-t text-[11px] leading-relaxed space-y-1"
          style={{ borderColor: 'rgba(255,200,50,0.15)', background: 'rgba(0,0,0,0.3)' }}
        >
          <RichText text={slot.detailedReason} className="text-slate-300" />
        </div>
      )}

      {/* Locked detail (always visible, compact) */}
      {slot.isLocked && (
        <div className="px-3 pb-2 text-[10px] text-slate-500 leading-snug">
          <RichText text={slot.detailedReason} className="text-slate-500" />
        </div>
      )}
    </div>
  );
}

// ─── Ban threat card ──────────────────────────────────────────────────────────

function BanThreatCard({ threat }: { threat: BanThreat }) {
  const [imgErr, setImgErr] = useState(false);
  const [backupImgErr, setBackupImgErr] = useState(false);

  return (
    <div
      className="rounded-lg p-2.5 border space-y-2"
      style={{
        background:   threat.priority === 'high' ? 'rgba(40,10,10,0.8)' : 'rgba(25,15,5,0.8)',
        borderColor:  threat.priority === 'high' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)',
      }}
    >
      {/* Hero + priority */}
      <div className="flex items-center gap-2">
        <div className={clsx(
          'w-6 h-6 rounded overflow-hidden shrink-0 border',
          threat.priority === 'high' ? 'border-red-500/50' : 'border-yellow-600/50'
        )}>
          {threat.hero.image && !imgErr ? (
            <img src={threat.hero.image} alt={threat.hero.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <span className="text-[9px] font-bold text-slate-400">{threat.hero.name.charAt(0)}</span>
            </div>
          )}
        </div>

        <span className="text-white text-xs font-bold">{threat.hero.name}</span>

        <span className={clsx(
          'ml-auto text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wide',
          threat.priority === 'high'
            ? 'text-red-400 border-red-500/40 bg-red-900/30'
            : 'text-yellow-400 border-yellow-600/40 bg-yellow-900/20'
        )}>
          {threat.priority === 'high' ? '🎯 Ban prioritaire' : '⚠️ Cible probable'}
        </span>
      </div>

      {/* Why they'd ban */}
      <div className="text-[10px] text-slate-400 leading-snug">
        <RichText text={threat.banReason} className="text-slate-400" />
      </div>

      {/* Backup pick */}
      {threat.backupPick && (
        <div
          className="flex items-center gap-2 rounded p-1.5 border"
          style={{ background: 'rgba(20,40,5,0.6)', borderColor: 'rgba(34,197,94,0.25)' }}
        >
          <span className="text-emerald-400 text-[10px] font-bold shrink-0">Alternative :</span>

          <div className="w-5 h-5 rounded overflow-hidden shrink-0 border border-emerald-700/40">
            {threat.backupPick.image && !backupImgErr ? (
              <img src={threat.backupPick.image} alt={threat.backupPick.name} className="w-full h-full object-cover" onError={() => setBackupImgErr(true)} />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <span className="text-[8px] text-slate-400">{threat.backupPick.name.charAt(0)}</span>
              </div>
            )}
          </div>

          <span className="text-emerald-300 text-[10px] font-semibold">{threat.backupPick.name}</span>
          <span className="text-slate-500 text-[9px] truncate">— {threat.backupReason}</span>
        </div>
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
  lineup:   WinningLineup | null;
  allyTeam: 'blue' | 'red';
}

export function WinningLineupPanel({ lineup, allyTeam }: Props) {
  const [showBans, setShowBans] = useState(true);

  if (!lineup) {
    return (
      <div className="glass p-4 flex items-center justify-center min-h-20">
        <p className="text-slate-600 text-xs text-center">
          Le lineup gagnant s'affiche dès que les héros sont chargés
        </p>
      </div>
    );
  }

  const ac    = ARCHETYPE_CLASSES[lineup.archetype];
  const icon  = ARCHETYPE_ICON[lineup.archetype];
  const label = ARCHETYPE_LABELS[lineup.archetype];

  const lockedCount = lineup.slots.filter((s) => s.isLocked).length;
  const pickCount   = lineup.slots.filter((s) => !s.isLocked).length;

  const teamColor  = allyTeam === 'blue' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)';
  const teamBorder = allyTeam === 'blue' ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)';

  return (
    <div className="glass overflow-hidden">

      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b" style={{ background: teamColor, borderColor: teamBorder }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              🏆 Lineup Gagnant
            </span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-bold', ac.badge)}>
              {icon} {label}
            </span>
            <span className={clsx(
              'text-[9px] px-1.5 py-0.5 rounded font-bold',
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
        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
          <RichText text={lineup.archetypeReason} className="text-slate-400" />
        </p>

        {lockedCount > 0 && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            {lockedCount} verrouillé{lockedCount > 1 ? 's' : ''} · {pickCount} à picker
          </p>
        )}
      </div>

      {/* ── Slots with detailed explanations ── */}
      <div className="p-3 space-y-1.5">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Composition recommandée
          {pickCount > 0 && <span className="text-yellow-600 ml-1">— cliquez sur → PICK pour les détails</span>}
        </p>
        {lineup.slots.map((slot) => (
          <SlotRow key={`${slot.laneRole}-${slot.hero.id}`} slot={slot} />
        ))}
      </div>

      {/* ── Win condition ── */}
      <div className="px-3">
        <div
          className="flex items-start gap-1.5 rounded-lg p-2.5"
          style={{ background: 'rgba(20,40,20,0.4)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span className="text-emerald-400 text-sm shrink-0 mt-0.5">✓</span>
          <p className="text-[11px] text-emerald-300/80 leading-snug">{lineup.winCondition}</p>
        </div>
      </div>

      {/* ── Ban threats section ── */}
      {lineup.banThreats.length > 0 && (
        <div className="px-3 pb-3 mt-3">
          <button
            onClick={() => setShowBans((v) => !v)}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              🚫 Bans adverses à anticiper
              <span className="text-[9px] text-slate-600 font-normal normal-case tracking-normal">
                (héros que l'ennemi devrait cibler)
              </span>
            </span>
            <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors">
              {showBans ? '▲ masquer' : '▼ afficher'}
            </span>
          </button>

          {showBans && (
            <div className="space-y-2">
              {lineup.banThreats.map((threat) => (
                <BanThreatCard key={threat.hero.id} threat={threat} />
              ))}
              <p className="text-[10px] text-slate-600 italic mt-1">
                💡 Préparez des alternatives pour ces héros et picketez-les tôt si possible.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
