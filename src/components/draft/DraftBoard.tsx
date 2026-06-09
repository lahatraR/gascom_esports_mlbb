'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useDraftStore } from '@/store/draftStore';
import { getDraftSequence } from '@/types/draft';
import { PhaseIndicator }          from './PhaseIndicator';
import { ActionAnnouncement }      from './ActionAnnouncement';
import { TeamColumn }              from './TeamColumn';
import { DraftTimer }              from './DraftTimer';
import { HeroSelector }            from './HeroSelector';
import type { HeroSelectorHandle } from './HeroSelector';
import { SuggestionPanel }         from '@/components/analysis/SuggestionPanel';
import { BanSuggestionPanel }      from '@/components/analysis/BanSuggestionPanel';
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
  { id: 'blue',     icon: '🔵', label: 'Blue'    },
  { id: 'draft',    icon: '⚔️', label: 'Draft'   },
  { id: 'red',      icon: '🔴', label: 'Red'     },
  { id: 'analysis', icon: '📊', label: 'Analyse' },
];

// ─── Analysis sidebar tab definitions ────────────────────────────────────────

type SidebarTab = 'suggest' | 'stats' | 'intel' | 'lineup';

const SIDEBAR_TABS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: 'suggest', icon: '💡', label: 'Picks/Bans' },
  { id: 'stats',   icon: '📊', label: 'Stats'      },
  { id: 'intel',   icon: '🔍', label: 'Intel'      },
  { id: 'lineup',  icon: '⚔️', label: 'Compo'      },
];

// ─── Tabbed analysis panel ────────────────────────────────────────────────────

function TabbedAnalysis({
  analysis,
  enemyTeam,
  allyTeam,
  isBanPhase,
  currentTeam,
  hasCriticalHoles,
}: {
  analysis:         DraftAnalysis | null;
  enemyTeam:        'blue' | 'red';
  allyTeam:         'blue' | 'red';
  isBanPhase:       boolean;
  currentTeam:      'blue' | 'red';
  hasCriticalHoles: boolean;
}) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('suggest');

  // Auto-switch to suggest tab when action changes
  useEffect(() => {
    setActiveTab('suggest');
  }, [isBanPhase]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div
        className="flex items-stretch border-b flex-shrink-0"
        style={{ borderColor: 'rgba(124,26,15,0.25)' }}
      >
        {SIDEBAR_TABS.map((tab) => {
          const isActive  = activeTab === tab.id;
          const showBadge = tab.id === 'intel' && hasCriticalHoles && !isActive;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'relative flex-1 py-2 text-[10px] font-bold tracking-wide transition-all flex flex-col items-center gap-0.5',
                isActive
                  ? 'text-white border-b-2'
                  : 'text-slate-600 hover:text-slate-400'
              )}
              style={isActive ? { borderColor: '#7c1a0f' } : {}}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {showBadge && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-y-auto pt-2 flex flex-col gap-2.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,26,15,0.4) transparent' }}
      >
        {activeTab === 'suggest' && (
          <>
            {isBanPhase ? (
              <BanSuggestionPanel
                banSuggestions={analysis?.banSuggestions ?? []}
                currentTeam={currentTeam}
              />
            ) : (
              <SuggestionPanel
                suggestions={analysis?.suggestions ?? []}
                currentTeam={currentTeam}
                isPickPhase={!isBanPhase}
              />
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <>
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
          </>
        )}

        {activeTab === 'intel' && (
          <>
            <CompositionHolesPanel
              holes={analysis?.compositionHoles ?? []}
              allyTeam={allyTeam}
            />
            <BanIntelligencePanel
              banAnalysis={analysis?.banAnalysis ?? null}
              archetypeProbability={analysis?.archetypeProbability ?? null}
              enemyTeam={enemyTeam}
            />
            <EnemyPredictionPanel
              predictions={analysis?.enemyPredictions ?? []}
              enemyTeam={enemyTeam}
            />
          </>
        )}

        {activeTab === 'lineup' && (
          <>
            <WinningLineupPanel
              lineup={analysis?.winningLineup ?? null}
              allyTeam={allyTeam}
            />
            <CounterCompositionPanel
              analysis={analysis?.enemyCompAnalysis ?? null}
              enemyTeam={enemyTeam}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cast mode overlay ────────────────────────────────────────────────────────

function CastView({
  onExit,
}: {
  onExit: () => void;
}) {
  const bluePicks  = useDraftStore((s) => s.bluePicks);
  const redPicks   = useDraftStore((s) => s.redPicks);
  const blueBans   = useDraftStore((s) => s.blueBans);
  const redBans    = useDraftStore((s) => s.redBans);
  const analysis   = useDraftStore((s) => s.analysis);

  const winProb    = analysis?.winProbability ?? 50;
  const blueArch   = analysis?.blueArchetype;
  const redArch    = analysis?.redArchetype;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#030304' }}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-60 px-3 py-1.5 rounded border border-slate-700/50 text-slate-400 hover:text-white text-xs font-bold transition-colors"
        style={{ background: 'rgba(10,5,4,0.9)' }}
      >
        EXIT CAST ✕
      </button>

      <div className="flex-1 flex items-center justify-center px-8 gap-6">
        {/* Blue team */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="text-blue-400 font-display text-lg tracking-widest text-center uppercase mb-2">
            Blue Team
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {bluePicks.map((h, i) =>
              h ? (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-500/60">
                    {h.image
                      ? <img src={h.image} alt={h.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-blue-900 flex items-center justify-center text-white font-black">{h.name[0]}</div>
                    }
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">{h.name}</span>
                </div>
              ) : null
            )}
          </div>
          {blueArch && (
            <div className="text-center text-xs text-blue-300/70 font-medium capitalize">
              {blueArch.primary} comp
            </div>
          )}
          {/* Bans */}
          <div className="flex gap-1 justify-center mt-2 opacity-50">
            {blueBans.filter(Boolean).map((h, i) => h && (
              <div key={i} className="w-8 h-8 rounded overflow-hidden grayscale border border-slate-700/40">
                {h.image ? <img src={h.image} alt={h.name} className="w-full h-full object-cover" /> : null}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Win probability */}
        <div className="flex flex-col items-center gap-4 w-48">
          <div className="text-slate-600 font-display text-2xl tracking-widest">VS</div>
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400 font-black">{winProb}%</span>
              <span className="text-red-400 font-black">{100 - winProb}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${winProb}%`,
                  background: 'linear-gradient(to right, #1e6fff, #4a9eff)',
                }}
              />
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-1">Win Probability</p>
          </div>
        </div>

        {/* Red team */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="text-red-400 font-display text-lg tracking-widest text-center uppercase mb-2">
            Red Team
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {redPicks.map((h, i) =>
              h ? (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-red-500/60">
                    {h.image
                      ? <img src={h.image} alt={h.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-red-900 flex items-center justify-center text-white font-black">{h.name[0]}</div>
                    }
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">{h.name}</span>
                </div>
              ) : null
            )}
          </div>
          {redArch && (
            <div className="text-center text-xs text-red-300/70 font-medium capitalize">
              {redArch.primary} comp
            </div>
          )}
          {/* Bans */}
          <div className="flex gap-1 justify-center mt-2 opacity-50">
            {redBans.filter(Boolean).map((h, i) => h && (
              <div key={i} className="w-8 h-8 rounded overflow-hidden grayscale border border-slate-700/40">
                {h.image ? <img src={h.image} alt={h.name} className="w-full h-full object-cover" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DraftBoardProps {
  castMode:    boolean;
  onExitCast:  () => void;
}

export function DraftBoard({ castMode, onExitCast }: DraftBoardProps) {
  const store = useDraftStore();
  const { blueBans, redBans, bluePicks, redPicks, currentStep, analysis, gameMode } = store;
  const undoLastAction   = useDraftStore((s) => s.undoLastAction);
  const selectHero       = useDraftStore((s) => s.selectHero);
  const getFilteredHeroes = useDraftStore((s) => s.getFilteredHeroes);
  const setSearch        = useDraftStore((s) => s.setSearch);

  const [mobileTab, setMobileTab] = useState<MobileTab>('draft');
  const heroSelectorRef = useRef<HeroSelectorHandle>(null);

  const sequence    = getDraftSequence(gameMode);
  const isDone      = currentStep >= sequence.length;
  const activeStep  = isDone ? null : sequence[currentStep];
  const isBanPhase  = activeStep?.action === 'ban';
  const isPickPhase = activeStep?.action === 'pick';
  const currentTeam = activeStep?.team ?? 'blue';
  const enemyTeam   = currentTeam === 'blue' ? 'red' : 'blue';
  const activeTeamTab = !isDone && activeStep ? activeStep.team : null;

  const hasCriticalHoles = (analysis?.compositionHoles ?? []).some(
    (h) => h.severity === 'critical'
  );

  // ── Feature 4: Keyboard shortcuts ─────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // Ctrl+Z → undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undoLastAction();
      return;
    }

    // / → focus search (when not already in an input)
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      heroSelectorRef.current?.focusSearch();
      return;
    }

    // Escape → clear search
    if (e.key === 'Escape' && isInput) {
      (target as HTMLInputElement).blur();
      setSearch('');
      return;
    }

    // 1-9 → quick-pick the Nth available hero
    if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && !isDone) {
        const heroes = getFilteredHeroes();
        const hero   = heroes[n - 1];
        if (hero) { e.preventDefault(); selectHero(hero); }
      }
    }
  }, [undoLastAction, selectHero, getFilteredHeroes, isDone, setSearch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Cast mode overlay ──────────────────────────────────────────────────────
  if (castMode) {
    return <CastView onExit={onExitCast} />;
  }

  // ── Shared suggestion/ban panel for inline use ─────────────────────────────
  const InlineSuggestPanel = isPickPhase && analysis ? (
    <SuggestionPanel
      suggestions={analysis.suggestions}
      currentTeam={currentTeam}
      isPickPhase={isPickPhase}
    />
  ) : isBanPhase && analysis ? (
    <BanSuggestionPanel
      banSuggestions={analysis.banSuggestions}
      currentTeam={currentTeam}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* ══════════════════ DESKTOP 2-COLUMN LAYOUT (lg+) ══════════════════ */}
      <div className="hidden lg:flex gap-3 flex-1 min-h-0">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

          {/* Phase + Timer row */}
          <div className="flex items-center gap-2">
            <ActionAnnouncement
              currentStep={currentStep}
              activeStep={activeStep}
              isDone={isDone}
            />
            <div className="flex-shrink-0">
              <DraftTimer currentStep={currentStep} isDone={isDone} />
            </div>
          </div>

          <div className="glass px-3 py-2 flex-shrink-0">
            <PhaseIndicator currentStep={currentStep} sequence={sequence} />
          </div>

          {/* Draft area */}
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

            <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
              <div className="flex-1 min-h-0">
                <HeroSelector ref={heroSelectorRef} />
              </div>
              {/* Suggest/ban panel below grid */}
              {InlineSuggestPanel && (
                <div className="flex-shrink-0">{InlineSuggestPanel}</div>
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

        {/* ── RIGHT COLUMN: Tabbed analysis ── */}
        <div
          className="w-[320px] xl:w-[360px] flex-shrink-0 flex flex-col min-h-0"
          style={{ height: '100%' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-1 mb-1 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
              Analyse en direct
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(124,26,15,0.2)' }} />
            <span className="text-[9px] text-slate-700">
              {currentTeam === 'blue' ? '🔵 Blue POV' : '🔴 Red POV'}
            </span>
          </div>

          <div className="glass flex-1 min-h-0 overflow-hidden rounded-lg">
            <TabbedAnalysis
              analysis={analysis}
              enemyTeam={enemyTeam}
              allyTeam={currentTeam}
              isBanPhase={isBanPhase}
              currentTeam={currentTeam}
              hasCriticalHoles={hasCriticalHoles}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════ TABLET LAYOUT (md to lg) ══════════════════ */}
      <div className="hidden md:flex lg:hidden flex-col gap-2 flex-1 min-h-0">

        <div className="flex items-center gap-2">
          <ActionAnnouncement currentStep={currentStep} activeStep={activeStep} isDone={isDone} />
          <DraftTimer currentStep={currentStep} isDone={isDone} />
        </div>
        <div className="glass px-3 py-2 flex-shrink-0">
          <PhaseIndicator currentStep={currentStep} sequence={sequence} />
        </div>

        <div className="flex gap-2 flex-shrink-0" style={{ height: '420px' }}>
          <div className="w-36 flex-shrink-0">
            <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex-1 min-h-0">
              <HeroSelector ref={heroSelectorRef} />
            </div>
          </div>
          <div className="w-36 flex-shrink-0">
            <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
          </div>
        </div>

        {InlineSuggestPanel && (
          <div className="flex-shrink-0">{InlineSuggestPanel}</div>
        )}

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
              {analysis && <TeamComparisonPanel blueMetrics={analysis.blueMetrics} redMetrics={analysis.redMetrics} counterIndex={analysis.counterIndex} />}
              <EnemyPredictionPanel predictions={analysis?.enemyPredictions ?? []} enemyTeam={enemyTeam} />
              <CounterCompositionPanel analysis={analysis?.enemyCompAnalysis ?? null} enemyTeam={enemyTeam} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ MOBILE LAYOUT (< md) ══════════════════ */}
      <div className="md:hidden flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ActionAnnouncement currentStep={currentStep} activeStep={activeStep} isDone={isDone} />
          <DraftTimer currentStep={currentStep} isDone={isDone} />
        </div>
        <div className="glass px-3 py-2">
          <PhaseIndicator currentStep={currentStep} sequence={sequence} />
        </div>
      </div>

      <div className="md:hidden flex-1 overflow-y-auto min-h-0 pb-16">
        {mobileTab === 'draft' && (
          <div className="flex flex-col gap-2">
            <HeroSelector ref={heroSelectorRef} />
            {InlineSuggestPanel}
          </div>
        )}
        {mobileTab === 'blue' && (
          <TeamColumn team="blue" bans={blueBans} picks={bluePicks} currentStep={currentStep} rating={analysis?.blueRating} />
        )}
        {mobileTab === 'red' && (
          <TeamColumn team="red" bans={redBans} picks={redPicks} currentStep={currentStep} rating={analysis?.redRating} />
        )}
        {mobileTab === 'analysis' && (
          <TabbedAnalysis
            analysis={analysis}
            enemyTeam={enemyTeam}
            allyTeam={currentTeam}
            isBanPhase={isBanPhase}
            currentTeam={currentTeam}
            hasCriticalHoles={hasCriticalHoles}
          />
        )}
      </div>

      {/* Mobile tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch backdrop-blur border-t"
        style={{ background: 'rgba(9,9,9,0.97)', borderColor: 'rgba(124,26,15,0.4)' }}
      >
        {MOBILE_TABS.map((tab) => {
          const isActive    = mobileTab === tab.id;
          const isPulse     = !isDone && tab.id !== 'draft' && tab.id !== 'analysis' && activeTeamTab === tab.id;
          const showAlert   = tab.id === 'analysis' && hasCriticalHoles && !isActive;
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
                {showAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border border-black animate-pulse" />
                )}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className={clsx(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-full',
                  tab.id === 'blue'       ? 'bg-blue-400'
                  : tab.id === 'red'      ? 'bg-red-400'
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
