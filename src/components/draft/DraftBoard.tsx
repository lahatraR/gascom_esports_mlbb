'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import type { HeroData, DraftAnalysis } from '@/types/draft';
import { PhaseIndicator }           from './PhaseIndicator';
import { TeamColumn }               from './TeamColumn';
import { HeroSelector }             from './HeroSelector';
import { SuggestionPanel }          from '@/components/analysis/SuggestionPanel';
import { WinProbabilityGauge }      from '@/components/analysis/WinProbabilityGauge';
import { TeamComparisonPanel }      from '@/components/analysis/TeamComparisonPanel';
import { EnemyPredictionPanel }     from '@/components/analysis/EnemyPredictionPanel';
import { ArchetypePanel }           from '@/components/analysis/ArchetypePanel';
import { CounterCompositionPanel }  from '@/components/analysis/CounterCompositionPanel';
import { WinningLineupPanel }       from '@/components/analysis/WinningLineupPanel';
import { BanIntelligencePanel }     from '@/components/analysis/BanIntelligencePanel';
import { CompositionHolesPanel }    from '@/components/analysis/CompositionHolesPanel';
import { StrategyPanel }           from './StrategyPanel';

// ─── Analysis tab types ───────────────────────────────────────────────────────

type AnalysisTab = 'picks' | 'intel' | 'matchup' | 'strat';
type MobileTab   = 'draft' | 'blue' | 'red' | 'analysis';

const ANALYSIS_TABS: { id: AnalysisTab; label: string; icon: string; desc: string }[] = [
  { id: 'picks',   icon: '⚔️',  label: 'Picks',    desc: 'Suggestions IA + meilleur lineup'            },
  { id: 'intel',   icon: '🔍',  label: 'Déduction', desc: 'Que prépare l\'ennemi ? Bans + picks prévus' },
  { id: 'matchup', icon: '📊',  label: 'Bilan',   desc: 'Probabilité de victoire + forces des équipes' },
  { id: 'strat',   icon: '📋',  label: 'Strat',   desc: 'Compositions prêtes + livret de bans'         },
];

const MOBILE_TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'blue',     icon: '🔵', label: 'Bleue'    },
  { id: 'draft',    icon: '⚔️', label: 'Draft'    },
  { id: 'red',      icon: '🔴', label: 'Rouge'    },
  { id: 'analysis', icon: '📊', label: 'Analyse'  },
];

// ─── Mini team strip (Fix #4) — compact snapshot above analysis ──────────────

function MiniSlot({ hero, size = 'pick', team }: { hero: HeroData | null; size?: 'pick' | 'ban'; team: 'blue' | 'red' }) {
  const dim  = size === 'pick' ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-5 h-5 sm:w-6 sm:h-6';
  const border = size === 'pick'
    ? team === 'blue' ? 'border border-blue-500/50' : 'border border-red-500/50'
    : 'border border-slate-700/40';

  if (!hero) return (
    <div className={clsx(dim, border, 'rounded bg-slate-900/60 opacity-40', size === 'ban' && 'rounded-sm')} />
  );

  const isOdd = hero.image && hero.image.length > 0;
  return (
    <div className={clsx('relative rounded overflow-hidden shrink-0', dim, border, size === 'ban' && 'opacity-60 grayscale rounded-sm')}>
      {isOdd ? (
        <Image src={hero.image} alt={hero.name} fill className="object-cover object-top" unoptimized />
      ) : (
        <div className={clsx('w-full h-full flex items-center justify-center text-[9px] font-bold', team === 'blue' ? 'text-blue-300' : 'text-red-300')}>
          {hero.name.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function MiniTeamStrip({
  blueBans, redBans, bluePicks, redPicks, winProbability,
}: {
  blueBans: (HeroData | null)[];
  redBans:  (HeroData | null)[];
  bluePicks: (HeroData | null)[];
  redPicks:  (HeroData | null)[];
  winProbability: number;
}) {
  const blueWin = winProbability >= 50;
  const pct     = winProbability;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ background: 'rgba(5,5,8,0.92)', borderColor: 'rgba(60,60,80,0.35)' }}
    >
      {/* Blue side */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex gap-0.5">
          {blueBans.map((h, i) => <MiniSlot key={i} hero={h} size="ban" team="blue" />)}
        </div>
        <div className="w-px h-5 bg-slate-700/50 mx-0.5" />
        <div className="flex gap-0.5">
          {bluePicks.map((h, i) => <MiniSlot key={i} hero={h} size="pick" team="blue" />)}
        </div>
      </div>

      {/* Win probability bar */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[9px] font-bold mb-0.5">
          <span className={blueWin ? 'text-blue-400' : 'text-slate-600'}>{pct}%</span>
          <span className={!blueWin ? 'text-red-400' : 'text-slate-600'}>{100 - pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: blueWin
                ? 'linear-gradient(to right, rgba(59,130,246,0.8), rgba(59,130,246,0.5))'
                : 'linear-gradient(to right, rgba(59,130,246,0.3), rgba(239,68,68,0.5))',
            }}
          />
        </div>
        <div className="text-center text-[8px] text-slate-600 mt-0.5">Proba. de victoire</div>
      </div>

      {/* Red side */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex gap-0.5">
          {redPicks.map((h, i) => <MiniSlot key={i} hero={h} size="pick" team="red" />)}
        </div>
        <div className="w-px h-5 bg-slate-700/50 mx-0.5" />
        <div className="flex gap-0.5">
          {redBans.map((h, i) => <MiniSlot key={i} hero={h} size="ban" team="red" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Fix #2 : Contextual analysis panels per tab ─────────────────────────────

function AnalysisContent({
  tab, analysis, enemyTeam, allyTeam, isPickPhase,
}: {
  tab:        AnalysisTab;
  analysis:   DraftAnalysis | null;
  enemyTeam:  'blue' | 'red';
  allyTeam:   'blue' | 'red';
  isPickPhase: boolean;
}) {
  if (tab === 'picks') return (
    <div className="flex flex-col gap-3">
      <CompositionHolesPanel holes={analysis?.compositionHoles ?? []} allyTeam={allyTeam} />
      <WinningLineupPanel lineup={analysis?.winningLineup ?? null} allyTeam={allyTeam} />
      {isPickPhase && analysis && (
        <SuggestionPanel suggestions={analysis.suggestions} currentTeam={allyTeam} isPickPhase={isPickPhase} />
      )}
      {!isPickPhase && (
        <div className="glass p-4 text-center text-slate-500 text-xs">
          Les suggestions IA apparaissent en phase de pick
        </div>
      )}
    </div>
  );

  if (tab === 'intel') return (
    <div className="flex flex-col gap-3">
      <BanIntelligencePanel
        banAnalysis={analysis?.banAnalysis ?? null}
        archetypeProbability={analysis?.archetypeProbability ?? null}
        enemyTeam={enemyTeam}
      />
      <EnemyPredictionPanel predictions={analysis?.enemyPredictions ?? []} enemyTeam={enemyTeam} />
      <CounterCompositionPanel analysis={analysis?.enemyCompAnalysis ?? null} enemyTeam={enemyTeam} />
    </div>
  );

  if (tab === 'strat') return <StrategyPanel />;

  return (
    <div className="flex flex-col gap-3">
      <ArchetypePanel blueArchetype={analysis?.blueArchetype ?? null} redArchetype={analysis?.redArchetype ?? null} />
      <WinProbabilityGauge probability={analysis?.winProbability ?? 50} blueRating={analysis?.blueRating} redRating={analysis?.redRating} />
      {analysis ? (
        <TeamComparisonPanel blueMetrics={analysis.blueMetrics} redMetrics={analysis.redMetrics} counterIndex={analysis.counterIndex} />
      ) : (
        <div className="glass p-4 text-center text-slate-500 text-xs">La comparaison d&apos;équipes s&apos;affiche au fil des picks</div>
      )}
    </div>
  );
}

// ─── Main DraftBoard ─────────────────────────────────────────────────────────

export function DraftBoard() {
  const { blueBans, redBans, bluePicks, redPicks, currentStep, analysis, gameMode } = useDraftStore();

  const [mobileTab,   setMobileTab]   = useState<MobileTab>('draft');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('picks');

  const sequence    = getDraftSequence(gameMode);
  const isDone      = currentStep >= sequence.length;
  const activeStep  = isDone ? null : sequence[currentStep];
  const isPickPhase = activeStep?.action === 'pick';
  const currentTeam = activeStep?.team ?? 'blue';
  const enemyTeam   = currentTeam === 'blue' ? 'red' : 'blue';

  // Fix #2 — Auto-switch analysis tab based on phase
  useEffect(() => {
    if (isDone)         setAnalysisTab('matchup');
    else if (isPickPhase) setAnalysisTab('picks');
    else                setAnalysisTab('intel');
  }, [isPickPhase, isDone]);

  const activeTeamTab = !isDone && activeStep ? activeStep.team : null;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Phase Indicator ── */}
      <div className="glass p-3">
        <PhaseIndicator currentStep={currentStep} sequence={sequence} />
      </div>

      {/* ══════════ DESKTOP LAYOUT ══════════ */}
      <div className="hidden md:flex gap-3 flex-1 min-h-0">

        <div className="w-44 lg:w-48 flex-shrink-0">
          <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          <div className="flex-1 min-h-0" style={{ maxHeight: 460 }}>
            <HeroSelector />
          </div>
        </div>

        <div className="w-44 lg:w-48 flex-shrink-0">
          <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
        </div>
      </div>

      {/* ── Fix #4 : Mini team strip — desktop only ── */}
      <div className="hidden md:block">
        <MiniTeamStrip
          blueBans={blueBans} redBans={redBans}
          bluePicks={bluePicks} redPicks={redPicks}
          winProbability={analysis?.winProbability ?? 50}
        />
      </div>

      {/* ── Fix #2 : Contextual analysis tabs — desktop ── */}
      <div className="hidden md:flex flex-col gap-3">

        {/* Tab bar */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border"
          style={{ background: 'rgba(5,5,8,0.9)', borderColor: 'rgba(60,60,80,0.3)' }}
        >
          {ANALYSIS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAnalysisTab(t.id)}
              title={t.desc}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all',
                analysisTab === t.id
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              )}
              style={analysisTab === t.id ? {
                background: 'linear-gradient(135deg, rgba(124,26,15,0.55), rgba(80,16,8,0.4))',
                boxShadow:  '0 0 12px rgba(124,26,15,0.3)',
              } : {}}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {/* Pulse dot on 'intel' during ban phase, on 'picks' during pick phase */}
              {((t.id === 'intel' && !isPickPhase && !isDone) || (t.id === 'picks' && isPickPhase)) && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnalysisContent
          tab={analysisTab}
          analysis={analysis}
          enemyTeam={enemyTeam}
          allyTeam={currentTeam}
          isPickPhase={isPickPhase}
        />
      </div>

      {/* ══════════ MOBILE LAYOUT ══════════ */}
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
          <div className="flex flex-col gap-3">
            {/* Mini strip on mobile too */}
            <MiniTeamStrip
              blueBans={blueBans} redBans={redBans}
              bluePicks={bluePicks} redPicks={redPicks}
              winProbability={analysis?.winProbability ?? 50}
            />
            {/* Mobile analysis tabs */}
            <div className="flex gap-1">
              {ANALYSIS_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAnalysisTab(t.id)}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                    analysisTab === t.id ? 'text-white' : 'text-slate-500'
                  )}
                  style={analysisTab === t.id ? {
                    background: 'rgba(124,26,15,0.5)',
                    border: '1px solid rgba(124,26,15,0.6)',
                  } : {
                    background: 'rgba(15,15,20,0.6)',
                    border: '1px solid rgba(60,60,80,0.3)',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <AnalysisContent
              tab={analysisTab}
              analysis={analysis}
              enemyTeam={enemyTeam}
              allyTeam={currentTeam}
              isPickPhase={isPickPhase}
            />
          </div>
        )}
      </div>

      {/* Mobile tab bar */}
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
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all text-[10px] font-bold relative',
                isActive
                  ? tab.id === 'blue'     ? 'text-blue-400'
                  : tab.id === 'red'      ? 'text-red-400'
                  : tab.id === 'analysis' ? 'text-violet-400'
                  : 'text-yellow-400'
                  : 'text-slate-600 hover:text-slate-400'
              )}
            >
              <span className={clsx('text-lg leading-none', isPulse && 'animate-pulse')}>{tab.icon}</span>
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
