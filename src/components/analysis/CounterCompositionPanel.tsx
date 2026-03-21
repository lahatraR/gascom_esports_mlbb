'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { EnemyCompAnalysis, CounterComposition, LaneRole } from '@/types/draft';
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

// ─── Hero slot row (needs own component for useState) ─────────────────────────

function SlotRow({ slot }: { slot: import('@/types/draft').CompositionSlot }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg p-1.5 border"
      style={{ background: 'rgba(8,8,12,0.6)', borderColor: 'rgba(50,50,70,0.3)' }}
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

      {/* Role badge */}
      <span className="text-[9px] text-slate-500 shrink-0 hidden sm:block">
        {slot.hero.roles[0]}
      </span>
    </div>
  );
}

// ─── Single composition card ──────────────────────────────────────────────────

function CompCard({ comp }: { comp: CounterComposition }) {
  return (
    <div className="space-y-3">

      {/* Counter reason */}
      <p className="text-[11px] text-slate-300 leading-snug italic border-l-2 pl-2"
        style={{ borderColor: 'rgba(124,26,15,0.6)' }}>
        {comp.counterReason}
      </p>

      {/* 5 hero slots */}
      <div className="space-y-1.5">
        {comp.slots.map((slot) => (
          <SlotRow key={slot.hero.id} slot={slot} />
        ))}
      </div>

      {/* Win condition */}
      <div className="flex items-start gap-1.5 rounded-lg p-2"
        style={{ background: 'rgba(20,40,20,0.4)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <span className="text-emerald-400 text-sm shrink-0">✓</span>
        <p className="text-[11px] text-emerald-300/80 leading-snug">{comp.winCondition}</p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  analysis:   EnemyCompAnalysis | null;
  enemyTeam:  'blue' | 'red';
}

export function CounterCompositionPanel({ analysis, enemyTeam }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  if (!analysis) {
    return (
      <div className="glass p-4 flex items-center justify-center min-h-20">
        <p className="text-slate-600 text-xs text-center">
          Counter composition appears after the enemy picks at least 2 heroes
        </p>
      </div>
    );
  }

  const { predictedArchetype, confidence, reasoning, counterComps } = analysis;
  const ac       = ARCHETYPE_CLASSES[predictedArchetype];
  const icon     = ARCHETYPE_ICON[predictedArchetype];
  const label    = ARCHETYPE_LABELS[predictedArchetype];
  const activeComp = counterComps[activeTab] ?? counterComps[0];

  const enemyColor = enemyTeam === 'red'
    ? 'rgba(239,68,68,0.15)'
    : 'rgba(59,130,246,0.15)';

  return (
    <div className="glass overflow-hidden">

      {/* ── Enemy archetype header ── */}
      <div
        className="px-3 py-2.5 border-b flex items-start gap-2"
        style={{ background: enemyColor, borderColor: 'rgba(50,50,70,0.4)' }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Enemy draft detected
            </span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-bold', ac.badge)}>
              {icon} {label}
            </span>
            <span className="text-[10px] text-slate-500">{confidence}% confidence</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">{reasoning}</p>
        </div>
      </div>

      {/* ── Counter composition tabs ── */}
      <div className="p-3 space-y-3">

        {/* Tab selector (if multiple counter archetypes) */}
        {counterComps.length > 1 && (
          <div className="flex gap-1">
            <span className="text-[10px] text-slate-500 self-center mr-1">Counter with:</span>
            {counterComps.map((comp, i) => {
              const cac  = ARCHETYPE_CLASSES[comp.archetype];
              const icon = ARCHETYPE_ICON[comp.archetype];
              return (
                <button
                  key={comp.archetype}
                  onClick={() => setActiveTab(i)}
                  className={clsx(
                    'text-[10px] px-2 py-1 rounded border font-bold transition-all',
                    activeTab === i ? cac.badge : 'bg-transparent border-slate-700/40 text-slate-500 hover:text-slate-300'
                  )}
                >
                  {icon} {ARCHETYPE_LABELS[comp.archetype]}
                  {i === 0 && (
                    <span className="ml-1 text-yellow-400 text-[8px]">★</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Active composition header */}
        {activeComp && (
          <>
            <div className="flex items-center gap-2">
              <span className={clsx('text-xs px-2 py-1 rounded border font-bold', ARCHETYPE_CLASSES[activeComp.archetype].badge)}>
                {ARCHETYPE_ICON[activeComp.archetype]} {ARCHETYPE_LABELS[activeComp.archetype]} composition
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(50,50,70,0.5)' }} />
              <span className="text-[10px] text-slate-500">strength {activeComp.strength}%</span>
            </div>

            <CompCard comp={activeComp} />
          </>
        )}
      </div>
    </div>
  );
}
