'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import { PhaseIndicator }          from './PhaseIndicator';
import { ActionAnnouncement }      from './ActionAnnouncement';
import { TeamColumn }              from './TeamColumn';
import { HeroSelector }            from './HeroSelector';
import { SuggestionPanel }         from '@/components/analysis/SuggestionPanel';
import { WinProbabilityGauge }     from '@/components/analysis/WinProbabilityGauge';
import { TeamComparisonPanel }     from '@/components/analysis/TeamComparisonPanel';
import { EnemyPredictionPanel }    from '@/components/analysis/EnemyPredictionPanel';
import { ArchetypePanel }          from '@/components/analysis/ArchetypePanel';
import { CounterCompositionPanel } from '@/components/analysis/CounterCompositionPanel';
import { WinningLineupPanel }      from '@/components/analysis/WinningLineupPanel';
import { BanIntelligencePanel }    from '@/components/analysis/BanIntelligencePanel';
import { CompositionHolesPanel }   from '@/components/analysis/CompositionHolesPanel';
import type { DraftAnalysis } from '@/types/draft';

// ─── Mobile tabs ──────────────────────────────────────────────────────────────

type MobileTab = 'draft' | 'blue' | 'red' | 'analysis';

const MOBILE_TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'blue',     icon: '🔵', label: 'Blue'     },
  { id: 'draft',    icon: '⚔️', label: 'Draft'    },
  { id: 'red',      icon: '🔴', label: 'Red'      },
  { id: 'analysis', icon: '📊', label: 'Analyse'  },
];

// ─── Right-column analysis stack ──────────────────────────────────────────────

function AnalysisPanels({
  analysis,
  enemyTeam,
  allyTeam,
}: {
  analysis:  DraftAnalysis | null;
  enemyTeam: 'blue' | 'red';
  allyTeam:  'blue' | 'red';
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <CompositionHolesPanel
        holes={analysis?.compositionHoles ?? []}
        allyTeam={allyTeam}
      />
      <WinningLineupPanel
        lineup={analysis?.winningLineup ?? null}
        allyTeam={allyTeam}
      />
      <BanIntelligencePanel
        banAnalysis={analysis?.banAnalysis ?? null}
        archetypeProbability={analysis?.archetypeProbability ?? null}
        enemyTeam={enemyTeam}
      />
      <WinProbabilityGauge
        probability={analysis?.winProbability ?? 50}
        blueRating={analysis?.blueRating}
        redRating={analysis?.redRating}
      />
      <ArchetypePanel
        blueArchetype={analysis?.blueArchetype ?? null}
        redArchetype={analysis?.redArchetype ?? null}
      />
      {analysis ? (
        <TeamComparisonPanel
          blueMetrics={analysis.blueMetrics}
          redMetrics={analysis.redMetrics}
          counterIndex={analysis.counterIndex}
        />
      ) : (
        <div className="glass p-3 flex items-center justify-center">
          <p className="text-slate-600 text-[11px] text-center">
            Les métriques apparaissent dès que des héros sont pickés
          </p>
        </div>
      )}
      <EnemyPredictionPanel
        predictions={analysis?.enemyPredictions ?? []}
        enemyTeam={enemyTeam}
      />
      <CounterCompositionPanel
        analysis={analysis?.enemyCompAnalysis ?? null}
        enemyTeam={enemyTeam}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DraftBoard() {
  const store = useDraftStore();
  const { blueBans, redBans, bluePicks, redPicks, currentStep, analysis, gameMode } = store;

  const [mobileTab, setMobileTab] = useState<MobileTab>('draft');

  const sequence    = getDraftSequence(gameMode);
  const isDone      = currentStep >= sequence.length;
  const activeStep  = isDone ? null : sequence[currentStep];
  const isPickPhase = activeStep?.action === 'pick';
  const currentTeam = activeStep?.team ?? 'blue';
  const enemyTeam   = currentTeam === 'blue' ? 'red' : 'blue';
  const activeTeamTab = !isDone && activeStep ? activeStep.team : null;

  // Badge: critical holes on allied team → pulse on Analysis tab
  const hasCriticalHoles = (analysis?.compositionHoles ?? []).some(
    (h) => h.severity === 'critical'
  );

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* ══════════════════ DESKTOP 2-COLUMN LAYOUT (lg+) ══════════════════ */}
      <div className="hidden lg:flex gap-3 flex-1 min-h-0">

        {/* ── LEFT COLUMN: Phase header + Draft + Suggestions ── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

          {/* Compact phase bar */}
          <ActionAnnouncement
            currentStep={currentStep}
            activeStep={activeStep}
            isDone={isDone}
          />
          <div className="glass px-3 py-2">
            <PhaseIndicator currentStep={currentStep} sequence={sequence} />
          </div>

          {/* Draft area: Blue | Hero grid | Red */}
          <div className="flex gap-2 flex-1 min-h-0">

            <div className="w-40 xl:w-44 flex-shrink-0 min-h-0">
              <TeamColumn
                team="blue"
                bans={blueBans}
                picks={bluePicks}
                currentStep={currentStep}
                rating={analysis?.blueRating}
              />
            </div>

            {/* Hero grid + suggestions (fills remaining width) */}
            <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
              <div className="flex-1 min-h-0">
                <HeroSelector />
              </div>
              {/* Suggestions appear right below the grid — no scroll needed */}
              {isPickPhase && analysis && (
                <div className="flex-shrink-0">
                  <SuggestionPanel
                    suggestions={analysis.suggestions}
                    currentTeam={currentTeam}
                    isPickPhase={isPickPhase}
                  />
                </div>
              )}
            </div>

            <div className="w-40 xl:w-44 flex-shrink-0 min-h-0">
              <TeamColumn
                team="red"
                bans={redBans}
                picks={redPicks}
                currentStep={currentStep}
                rating={analysis?.redRating}
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Analysis panel (sticky, scrolls independently) ── */}
        <div
          className="w-[320px] xl:w-[360px] flex-shrink-0 overflow-y-auto flex flex-col gap-2.5 pb-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,26,15,0.4) transparent' }}
        >
          {/* Section label */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
              Analyse en direct
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(124,26,15,0.2)' }} />
            <span className="text-[9px] text-slate-700">
              {currentTeam === 'blue' ? '🔵 Blue POV' : '🔴 Red POV'}
            </span>
          </div>

          <AnalysisPanels
            analysis={analysis}
            enemyTeam={enemyTeam}
            allyTeam={currentTeam}
          />
        </div>
      </div>

      {/* ══════════════════ TABLET LAYOUT (md to lg) ══════════════════ */}
      <div className="hidden md:flex lg:hidden flex-col gap-2 flex-1 min-h-0">

        <ActionAnnouncement
          currentStep={currentStep}
          activeStep={activeStep}
          isDone={isDone}
        />
        <div className="glass px-3 py-2 flex-shrink-0">
          <PhaseIndicator currentStep={currentStep} sequence={sequence} />
        </div>

        {/* Draft row */}
        <div className="flex gap-2 flex-shrink-0" style={{ height: '420px' }}>
          <div className="w-36 flex-shrink-0">
            <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex-1 min-h-0">
              <HeroSelector />
            </div>
          </div>
          <div className="w-36 flex-shrink-0">
            <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
          </div>
        </div>

        {/* Suggestions below draft */}
        {isPickPhase && analysis && (
          <div className="flex-shrink-0">
            <SuggestionPanel suggestions={analysis.suggestions} currentTeam={currentTeam} isPickPhase={isPickPhase} />
          </div>
        )}

        {/* Analysis panels in a compact 2-col grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <CompositionHolesPanel holes={analysis?.compositionHoles ?? []} allyTeam={currentTeam} />
              <WinningLineupPanel lineup={analysis?.winningLineup ?? null} allyTeam={currentTeam} />
              <BanIntelligencePanel banAnalysis={analysis?.banAnalysis ?? null} archetypeProbability={analysis?.archetypeProbability ?? null} enemyTeam={enemyTeam} />
            </div>
            <div className="space-y-2">
              <WinProbabilityGauge probability={analysis?.winProbability ?? 50} blueRating={analysis?.blueRating} redRating={analysis?.redRating} />
              <ArchetypePanel blueArchetype={analysis?.blueArchetype ?? null} redArchetype={analysis?.redArchetype ?? null} />
              {analysis
                ? <TeamComparisonPanel blueMetrics={analysis.blueMetrics} redMetrics={analysis.redMetrics} counterIndex={analysis.counterIndex} />
                : null}
              <EnemyPredictionPanel predictions={analysis?.enemyPredictions ?? []} enemyTeam={enemyTeam} />
              <CounterCompositionPanel analysis={analysis?.enemyCompAnalysis ?? null} enemyTeam={enemyTeam} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ MOBILE LAYOUT (< md) ══════════════════ */}

      {/* Phase header — always visible on mobile */}
      <div className="md:hidden flex flex-col gap-2 flex-shrink-0">
        <ActionAnnouncement
          currentStep={currentStep}
          activeStep={activeStep}
          isDone={isDone}
        />
        <div className="glass px-3 py-2">
          <PhaseIndicator currentStep={currentStep} sequence={sequence} />
        </div>
      </div>

      {/* Mobile tab content */}
      <div className="md:hidden flex-1 overflow-y-auto min-h-0 pb-16">
        {mobileTab === 'draft' && (
          <div className="flex flex-col gap-2">
            <HeroSelector />
            {isPickPhase && analysis && (
              <SuggestionPanel suggestions={analysis.suggestions} currentTeam={currentTeam} isPickPhase={isPickPhase} />
            )}
          </div>
        )}

        {mobileTab === 'blue' && (
          <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
        )}

        {mobileTab === 'red' && (
          <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
        )}

        {mobileTab === 'analysis' && (
          <AnalysisPanels analysis={analysis} enemyTeam={enemyTeam} allyTeam={currentTeam} />
        )}
      </div>

      {/* Mobile tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch backdrop-blur border-t"
        style={{ background: 'rgba(9,9,9,0.97)', borderColor: 'rgba(124,26,15,0.4)' }}
      >
        {MOBILE_TABS.map((tab) => {
          const isActive = mobileTab === tab.id;
          const isPulse  = !isDone && tab.id !== 'draft' && tab.id !== 'analysis' && activeTeamTab === tab.id;
          const showAlert = tab.id === 'analysis' && hasCriticalHoles && !isActive;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={clsx(
                'flex-1 relative flex flex-col items-center justify-center py-2 gap-0.5 transition-all text-[10px] font-bold',
                isActive
                  ? tab.id === 'blue'     ? 'text-blue-400'
                  : tab.id === 'red'      ? 'text-red-400'
                  : tab.id === 'analysis' ? 'text-violet-400'
                  : 'text-yellow-400'
                  : 'text-slate-600 hover:text-slate-400',
              )}
            >
              <span className={clsx('text-lg leading-none relative', isPulse && 'animate-pulse')}>
                {tab.icon}
                {/* Red dot badge for critical alerts */}
                {showAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border border-black animate-pulse" />
                )}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className={clsx(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-full',
                  tab.id === 'blue'     ? 'bg-blue-400'
                  : tab.id === 'red'    ? 'bg-red-400'
                  : tab.id === 'analysis' ? 'bg-violet-400'
                  : 'bg-yellow-400'
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
