'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ArchetypeResult, DraftArchetype } from '@/types/draft';
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_SHORT,
  ARCHETYPE_ICON,
  ARCHETYPE_DESCRIPTION,
  ARCHETYPE_BEATS,
  ARCHETYPE_LOSES_TO,
  ARCHETYPE_CLASSES,
  getMatchupTip,
} from '@/engine/archetypeEngine';

// ─── Glossaire des 5 styles de draft ──────────────────────────────────────────

const ARCHETYPE_ORDER: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

function ArchetypeGlossary() {
  return (
    <div className="rounded-lg border border-slate-700/40 overflow-hidden">
      {ARCHETYPE_ORDER.map((a, i) => {
        const cls = ARCHETYPE_CLASSES[a];
        return (
          <div
            key={a}
            className={clsx(
              'flex items-start gap-2.5 px-3 py-2 text-[10px]',
              i !== 0 && 'border-t border-slate-800/60',
            )}
          >
            <span className={clsx('shrink-0 font-bold px-1.5 py-0.5 rounded border text-[9px] mt-0.5', cls.badge)}>
              {ARCHETYPE_ICON[a]} {ARCHETYPE_SHORT[a]}
            </span>
            <p className="text-slate-400 leading-relaxed">{ARCHETYPE_DESCRIPTION[a]}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Single team archetype card ───────────────────────────────────────────────

function ArchetypeCard({
  result,
  team,
}: {
  result: ArchetypeResult | null;
  team: 'blue' | 'red';
}) {
  const teamColor = team === 'blue'
    ? 'border-blue-500/30 bg-blue-950/20'
    : 'border-red-500/30 bg-red-950/20';
  const teamText = team === 'blue' ? 'text-blue-300' : 'text-red-300';

  if (!result) {
    return (
      <div className={clsx('rounded-lg border p-3 flex flex-col gap-1.5', teamColor)}>
        <p className={clsx('text-[10px] font-bold uppercase tracking-widest', teamText)}>
          {team === 'blue' ? 'Blue' : 'Red'} Team
        </p>
        <p className="text-slate-600 text-xs italic">Pickez 2 héros pour analyser votre style</p>
      </div>
    );
  }

  const { primary, secondary, confidence, scores } = result;
  const cls = ARCHETYPE_CLASSES[primary];
  const archetypes: DraftArchetype[] = ['poke', 'engage', 'protect', 'split', 'catch'];

  return (
    <div className={clsx('rounded-lg border p-3 flex flex-col gap-2', teamColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className={clsx('text-[10px] font-bold uppercase tracking-widest', teamText)}>
          {team === 'blue' ? 'Blue' : 'Red'} Team
        </p>
        <span className={clsx('text-[9px] font-medium', confidence >= 70 ? 'text-emerald-400' : confidence >= 45 ? 'text-yellow-400' : 'text-slate-500')}>
          {confidence}% de certitude
        </span>
      </div>

      {/* Primary archetype badge */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{ARCHETYPE_ICON[primary]}</span>
        <div>
          <p className={clsx('text-sm font-black', cls.text)}>
            {ARCHETYPE_LABELS[primary]}
          </p>
          {secondary && (
            <p className="text-[10px] text-slate-500">
              + tendance {ARCHETYPE_SHORT[secondary]}
            </p>
          )}
        </div>
      </div>

      {/* Archetype description */}
      <p className="text-[10px] text-slate-400 leading-relaxed">
        {ARCHETYPE_DESCRIPTION[primary]}
      </p>

      {/* Beats / loses to */}
      <div className="flex gap-3 text-[10px]">
        <div>
          <p className="text-slate-600 mb-0.5">Écrase</p>
          <div className="flex gap-1 flex-wrap">
            {ARCHETYPE_BEATS[primary].map((a) => (
              <span key={a} className={clsx('px-1.5 py-0.5 rounded border text-[9px] font-medium', ARCHETYPE_CLASSES[a].badge)}>
                {ARCHETYPE_ICON[a]} {ARCHETYPE_SHORT[a]}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-slate-600 mb-0.5">Perd face à</p>
          <div className="flex gap-1 flex-wrap">
            {ARCHETYPE_LOSES_TO[primary].map((a) => (
              <span key={a} className={clsx('px-1.5 py-0.5 rounded border text-[9px] font-medium', ARCHETYPE_CLASSES[a].badge)}>
                {ARCHETYPE_ICON[a]} {ARCHETYPE_SHORT[a]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Score bar chart */}
      <div className="flex flex-col gap-1 mt-1">
        {archetypes.map((a) => (
          <div key={a} className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 w-12 shrink-0">{ARCHETYPE_SHORT[a]}</span>
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', ARCHETYPE_CLASSES[a].bar)}
                style={{ width: `${scores[a]}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 w-6 text-right">{scores[a]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Matchup banner ───────────────────────────────────────────────────────────

function MatchupBanner({
  blue,
  red,
}: {
  blue: ArchetypeResult | null;
  red:  ArchetypeResult | null;
}) {
  if (!blue || !red) return null;

  const tip = getMatchupTip(blue.primary, red.primary);
  const bannerColor =
    tip.type === 'advantage'    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
    : tip.type === 'disadvantage' ? 'bg-amber-950/40   border-amber-500/30   text-amber-300'
    : 'bg-slate-900/40 border-slate-700/30 text-slate-400';

  return (
    <div className={clsx('rounded-lg border px-3 py-2 text-xs font-medium flex items-start gap-2', bannerColor)}>
      <span className="text-base leading-none shrink-0">{tip.icon}</span>
      <span>{tip.message}</span>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface ArchetypePanelProps {
  blueArchetype: ArchetypeResult | null;
  redArchetype:  ArchetypeResult | null;
}

export function ArchetypePanel({ blueArchetype, redArchetype }: ArchetypePanelProps) {
  const [showGlossary, setShowGlossary] = useState(false);

  return (
    <div className="glass p-3 flex flex-col gap-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Styles de Draft des équipes
        </p>
        <button
          onClick={() => setShowGlossary((v) => !v)}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 border border-slate-700/40 rounded px-1.5 py-0.5"
          title="Qu'est-ce que ces styles de draft ?"
        >
          {showGlossary ? '✕' : '?'} <span>Légende</span>
        </button>
      </div>

      {/* Glossary */}
      {showGlossary && <ArchetypeGlossary />}

      {/* Two team cards side by side */}
      <div className="grid grid-cols-2 gap-3">
        <ArchetypeCard result={blueArchetype} team="blue" />
        <ArchetypeCard result={redArchetype}  team="red"  />
      </div>

      {/* Matchup banner */}
      <MatchupBanner blue={blueArchetype} red={redArchetype} />
    </div>
  );
}
