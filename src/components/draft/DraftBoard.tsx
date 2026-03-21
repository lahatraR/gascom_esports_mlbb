'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import { PhaseIndicator }        from './PhaseIndicator';
import { ActionAnnouncement }   from './ActionAnnouncement';
import { TeamColumn }         from './TeamColumn';
import { HeroSelector }       from './HeroSelector';
import { SuggestionPanel }    from '@/components/analysis/SuggestionPanel';
import { WinProbabilityGauge }  from '@/components/analysis/WinProbabilityGauge';
import { TeamComparisonPanel }  from '@/components/analysis/TeamComparisonPanel';
import { EnemyPredictionPanel } from '@/components/analysis/EnemyPredictionPanel';
import { ArchetypePanel }             from '@/components/analysis/ArchetypePanel';
import { CounterCompositionPanel }   from '@/components/analysis/CounterCompositionPanel';
import type { DraftAnalysis } from '@/types/draft';

type MobileTab = 'draft' | 'blue' | 'red' | 'analysis';

const MOBILE_TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'blue',     icon: '🔵', label: 'Blue'     },
  { id: 'draft',    icon: '⚔️', label: 'Draft'    },
  { id: 'red',      icon: '🔴', label: 'Red'      },
  { id: 'analysis', icon: '📊', label: 'Analysis' },
];

// ─── Analysis panels (shared between mobile & desktop) ───────────────────────

function AnalysisPanels({
  analysis,
  enemyTeam,
}: {
  analysis: DraftAnalysis | null;
  enemyTeam: 'blue' | 'red';
}) {
  return (
    <div className="flex flex-col gap-3">
      <ArchetypePanel
        blueArchetype={analysis?.blueArchetype ?? null}
        redArchetype={analysis?.redArchetype ?? null}
      />
      <WinProbabilityGauge
        probability={analysis?.winProbability ?? 50}
        blueRating={analysis?.blueRating}
        redRating={analysis?.redRating}
      />
      {analysis ? (
        <TeamComparisonPanel
          blueMetrics={analysis.blueMetrics}
          redMetrics={analysis.redMetrics}
          counterIndex={analysis.counterIndex}
        />
      ) : (
        <div className="glass p-4 flex items-center justify-center">
          <p className="text-slate-500 text-xs text-center">
            Team comparison appears as heroes are picked
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

  // Highlight the active team tab on mobile
  const activeTeamTab = !isDone && activeStep ? activeStep.team : null;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Action Announcement banner ── */}
      <ActionAnnouncement
        currentStep={currentStep}
        activeStep={activeStep}
        isDone={isDone}
      />

      {/* ── Phase Indicator ── */}
      <div className="glass p-3">
        <PhaseIndicator currentStep={currentStep} sequence={sequence} />
      </div>

      {/* ══════════════════ DESKTOP LAYOUT (md+) ══════════════════ */}
      <div className="hidden md:flex gap-3 flex-1 min-h-0">

        {/* Blue team */}
        <div className="w-44 lg:w-48 flex-shrink-0">
          <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
        </div>

        {/* Center: hero selector + suggestions */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          <div className="flex-1 min-h-0" style={{ maxHeight: '460px' }}>
            <HeroSelector />
          </div>
          {isPickPhase && analysis && (
            <SuggestionPanel suggestions={analysis.suggestions} currentTeam={currentTeam} isPickPhase={isPickPhase} />
          )}
        </div>

        {/* Red team */}
        <div className="w-44 lg:w-48 flex-shrink-0">
          <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
        </div>
      </div>

      {/* Desktop archetype + analysis bar */}
      <div className="hidden md:flex flex-col gap-3">
        <ArchetypePanel blueArchetype={analysis?.blueArchetype ?? null} redArchetype={analysis?.redArchetype ?? null} />
        <div className="grid grid-cols-3 gap-3">
          <WinProbabilityGauge probability={analysis?.winProbability ?? 50} blueRating={analysis?.blueRating} redRating={analysis?.redRating} />
          {analysis ? (
            <TeamComparisonPanel blueMetrics={analysis.blueMetrics} redMetrics={analysis.redMetrics} counterIndex={analysis.counterIndex} />
          ) : (
            <div className="glass p-4 flex items-center justify-center">
              <p className="text-slate-500 text-xs text-center">Team comparison appears as heroes are picked</p>
            </div>
          )}
          <EnemyPredictionPanel predictions={analysis?.enemyPredictions ?? []} enemyTeam={enemyTeam} />
        </div>
        {/* Counter composition — full width below */}
        <CounterCompositionPanel
          analysis={analysis?.enemyCompAnalysis ?? null}
          enemyTeam={enemyTeam}
        />
      </div>

      {/* ══════════════════ MOBILE LAYOUT (< md) ══════════════════ */}

      {/* Mobile content area */}
      <div className="md:hidden flex-1 overflow-y-auto min-h-0 pb-16">

        {mobileTab === 'draft' && (
          <div className="flex flex-col gap-3">
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
          <AnalysisPanels analysis={analysis} enemyTeam={enemyTeam} />
        )}
      </div>

      {/* Mobile tab bar — fixed at bottom */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch backdrop-blur border-t safe-bottom"
        style={{ background: 'rgba(9,9,9,0.97)', borderColor: 'rgba(124,26,15,0.4)' }}
      >
        {MOBILE_TABS.map((tab) => {
          const isActive = mobileTab === tab.id;
          const isPulse  = !isDone && tab.id !== 'draft' && tab.id !== 'analysis' && activeTeamTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all text-[10px] font-bold',
                isActive
                  ? tab.id === 'blue'  ? 'text-blue-400'
                  : tab.id === 'red'   ? 'text-red-400'
                  : tab.id === 'analysis' ? 'text-violet-400'
                  : 'text-yellow-400'
                  : 'text-slate-600 hover:text-slate-400',
              )}
            >
              <span className={clsx('text-lg leading-none', isPulse && 'animate-pulse')}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className={clsx(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-full',
                  tab.id === 'blue'  ? 'bg-blue-400'
                  : tab.id === 'red' ? 'bg-red-400'
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
