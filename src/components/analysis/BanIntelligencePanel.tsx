'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { BanAnalysis, ArchetypeProbability, DraftArchetype, HeroData } from '@/types/draft';
import type { StrategicRead, AdaptiveBanSuggestion, CounterplayTip } from '@/engine/intelligenceEngine';
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_ICON,
  ARCHETYPE_CLASSES,
} from '@/engine/archetypeEngine';
import { useDraftStore } from '@/store/draftStore';

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title:       string;
  defaultOpen?: boolean;
  children:    React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        className="w-full flex items-center gap-2 mb-1.5 group"
        onClick={() => setOpen((o) => !o)}
      >
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(60,60,80,0.4)' }} />
        <span
          className="text-[9px] text-slate-600 transition-transform duration-200 shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >▾</span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Mini portrait d'un héros banni ───────────────────────────────────────────

function BannedHeroChip({ hero }: { hero: HeroData }) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div className="w-9 h-9 rounded-lg overflow-hidden border border-red-700/50 relative">
        {hero.image ? (
          <img src={hero.image} alt={hero.name} className="w-full h-full object-cover grayscale opacity-70" />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
            {hero.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-red-400 text-base leading-none drop-shadow">🚫</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-500 truncate max-w-[36px] text-center leading-tight">{hero.name}</span>
    </div>
  );
}

// ─── Probability bar row ───────────────────────────────────────────────────────

function ProbabilityBar({
  archetype,
  pct,
  isDominant,
}: {
  archetype: DraftArchetype;
  pct: number;
  isDominant: boolean;
}) {
  const ac = ARCHETYPE_CLASSES[archetype];
  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          'text-[9px] font-bold shrink-0 w-14 text-right',
          isDominant ? ac.text : 'text-slate-500',
        )}
      >
        {ARCHETYPE_ICON[archetype]} {ARCHETYPE_LABELS[archetype]}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', ac.bar)}
          style={{ width: `${pct}%`, opacity: isDominant ? 1 : 0.45 }}
        />
      </div>
      <span
        className={clsx(
          'text-[10px] font-bold shrink-0 w-7 text-right',
          isDominant ? ac.text : 'text-slate-600',
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  banAnalysis:             BanAnalysis | null;
  archetypeProbability:    ArchetypeProbability | null;
  enemyTeam:               'blue' | 'red';
  strategicRead?:          StrategicRead | null;
  adaptiveBanSuggestions?: AdaptiveBanSuggestion[];
  counterplayTips?:        CounterplayTip[];
}

export function BanIntelligencePanel({ banAnalysis, archetypeProbability, enemyTeam, strategicRead, adaptiveBanSuggestions, counterplayTips }: Props) {
  const { blueBans, redBans } = useDraftStore((s) => ({ blueBans: s.blueBans, redBans: s.redBans }));
  const enemyBans = (enemyTeam === 'blue' ? blueBans : redBans).filter((h): h is HeroData => h !== null);

  const hasData = banAnalysis || archetypeProbability;

  if (!hasData) {
    return (
      <div className="glass p-3 flex items-center justify-center min-h-12">
        <p className="text-slate-600 text-[10px] text-center">
          L&apos;analyse apparaît dès que l&apos;ennemi commence à baner
        </p>
      </div>
    );
  }

  const enemyColor  = enemyTeam === 'blue' ? 'rgba(59,130,246,0.08)'  : 'rgba(239,68,68,0.08)';
  const enemyBorder = enemyTeam === 'blue' ? 'rgba(59,130,246,0.25)'  : 'rgba(239,68,68,0.25)';
  const enemyLabel  = enemyTeam === 'blue' ? 'BLUE'                   : 'RED';
  const enemyTextCls = enemyTeam === 'blue' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ background: enemyColor, borderColor: enemyBorder }}
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
          🔍 Que prépare l&apos;ennemi ?
        </span>
        <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', enemyTextCls,
          enemyTeam === 'blue'
            ? 'bg-blue-900/20 border-blue-600/30'
            : 'bg-red-900/20 border-red-600/30'
        )}>
          Équipe {enemyTeam === 'blue' ? 'Bleue' : 'Rouge'}
        </span>
      </div>

      <div className="p-3 space-y-3">

        {/* Ban Analysis block */}
        {banAnalysis && (
          <CollapsibleSection title="📵 Pourquoi ils bannent ces héros">
            {enemyBans.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {enemyBans.map((h) => <BannedHeroChip key={h.id} hero={h} />)}
              </div>
            )}
            <div
              className="rounded-lg p-2.5 border"
              style={{ background: 'rgba(10,5,20,0.7)', borderColor: 'rgba(168,85,247,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] text-slate-500">Ils bannent :</span>
                <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', ARCHETYPE_CLASSES[banAnalysis.bannedThreat].badge)}>
                  {ARCHETYPE_ICON[banAnalysis.bannedThreat]} {banAnalysis.bannedThreatLabel}
                </span>
                <span className="text-[9px] text-slate-600 ml-auto">{banAnalysis.banCount} ban{banAnalysis.banCount > 1 ? 's' : ''}</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug mb-2">{banAnalysis.insight}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-slate-500">Leur objectif :</span>
                {banAnalysis.inferredStrategies.map((a) => (
                  <span key={a} className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', ARCHETYPE_CLASSES[a].badge)}>
                    {ARCHETYPE_ICON[a]} {ARCHETYPE_LABELS[a]}
                  </span>
                ))}
                <span className="text-[9px] text-slate-600 ml-auto">Certitude {banAnalysis.confidence}%</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Archetype probability distribution */}
        {archetypeProbability && (
          <CollapsibleSection title={`📊 Composition ennemie probable · ${archetypeProbability.signalCount} indice${archetypeProbability.signalCount > 1 ? 's' : ''}`}>
            {archetypeProbability.dominantArchetype && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] text-slate-400">Leur style de jeu :</span>
                <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', ARCHETYPE_CLASSES[archetypeProbability.dominantArchetype].badge)}>
                  {ARCHETYPE_ICON[archetypeProbability.dominantArchetype]}{' '}{ARCHETYPE_LABELS[archetypeProbability.dominantArchetype]}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              {archetypeProbability.sorted.map((a) => (
                <ProbabilityBar
                  key={a}
                  archetype={a}
                  pct={archetypeProbability.distribution[a]}
                  isDominant={a === archetypeProbability.dominantArchetype || archetypeProbability.distribution[a] >= 25}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Strategic Read */}
        {strategicRead && (strategicRead.enemyPlan || strategicRead.trapOpportunity) && (
          <CollapsibleSection title="♟️ Lecture stratégique">
            <div
              className="rounded-lg p-2.5 border space-y-2"
              style={{
                background:   strategicRead.pivotNeeded ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.06)',
                borderColor:  strategicRead.pivotNeeded ? 'rgba(239,68,68,0.30)' : 'rgba(74,222,128,0.20)',
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-wide"
                  style={{
                    background: strategicRead.confidence === 'high' ? 'rgba(74,222,128,0.20)' : strategicRead.confidence === 'medium' ? 'rgba(250,204,21,0.18)' : 'rgba(100,116,139,0.25)',
                    color:      strategicRead.confidence === 'high' ? '#4ade80'                : strategicRead.confidence === 'medium' ? '#facc15'                : '#94a3b8',
                  }}
                >
                  {strategicRead.confidence === 'high' ? '● CONFIRMÉ' : strategicRead.confidence === 'medium' ? '● PROBABLE' : '● INCERTAIN'}
                </span>
                {strategicRead.counterStrategy && (
                  <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', ARCHETYPE_CLASSES[strategicRead.counterStrategy].badge)}>
                    → {ARCHETYPE_ICON[strategicRead.counterStrategy]} {ARCHETYPE_LABELS[strategicRead.counterStrategy]}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">{strategicRead.insight}</p>
              {strategicRead.trapOpportunity && (
                <div className="rounded px-2 py-1.5 flex items-start gap-1.5" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)' }}>
                  <span className="text-yellow-400 text-[10px] shrink-0">⚡</span>
                  <p className="text-[9px] text-yellow-300/80 leading-snug">{strategicRead.trapOpportunity}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Adaptive ban suggestions */}
        {adaptiveBanSuggestions && adaptiveBanSuggestions.length > 0 && (
          <CollapsibleSection title="🚫 Bans à prioritiser maintenant">
            <div className="flex flex-col gap-1.5">
              {adaptiveBanSuggestions.map((s, i) => {
                const urgencyColor = s.urgency === 'critical' ? '#f87171' : s.urgency === 'high' ? '#fb923c' : '#facc15';
                const urgencyLabel = s.urgency === 'critical' ? 'URGENT' : s.urgency === 'high' ? 'PRIORITAIRE' : 'SITUATIONNEL';
                return (
                  <div key={i} className="rounded-lg px-2 py-1.5 flex items-start gap-2" style={{ background: 'rgba(10,5,20,0.7)', border: `1px solid ${urgencyColor}30` }}>
                    <span className="shrink-0 text-[8px] font-black px-1 py-0.5 rounded tracking-wide whitespace-nowrap mt-0.5" style={{ color: urgencyColor, background: `${urgencyColor}18`, border: `1px solid ${urgencyColor}35` }}>
                      {urgencyLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-200 leading-none">{s.hero.name}</p>
                      <p className="text-[9px] text-slate-500 leading-snug mt-0.5">{s.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Counterplay tips */}
        {counterplayTips && counterplayTips.length > 0 && (
          <CollapsibleSection title="🎯 Comment les contrer" defaultOpen={false}>
            <div className="flex flex-col gap-1.5">
              {counterplayTips.map((tip, i) => {
                const prioColor = tip.priority === 'critical' ? '#f87171' : tip.priority === 'high' ? '#fb923c' : '#94a3b8';
                return (
                  <div key={i} className="rounded-lg px-2 py-1.5 flex items-start gap-2" style={{ background: 'rgba(10,5,20,0.7)', border: '1px solid rgba(100,100,130,0.25)' }}>
                    <span className="text-sm shrink-0 mt-0.5" style={{ color: prioColor }}>
                      {tip.priority === 'critical' ? '⚠️' : tip.priority === 'high' ? '●' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-0.5">{tip.targetHero}</p>
                      <p className="text-[10px] text-slate-300 leading-snug">{tip.tip}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

      </div>
    </div>
  );
}
