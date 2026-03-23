'use client';

import clsx from 'clsx';
import type { BanAnalysis, ArchetypeProbability, DraftArchetype, HeroData } from '@/types/draft';
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_ICON,
  ARCHETYPE_CLASSES,
} from '@/engine/archetypeEngine';
import { useDraftStore } from '@/store/draftStore';

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
  banAnalysis:          BanAnalysis | null;
  archetypeProbability: ArchetypeProbability | null;
  enemyTeam:            'blue' | 'red';
}

export function BanIntelligencePanel({ banAnalysis, archetypeProbability, enemyTeam }: Props) {
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                📵 Pourquoi ils bannent ces héros
              </p>
              {enemyBans.length > 0 && (
                <div className="flex gap-1.5">
                  {enemyBans.map((h) => <BannedHeroChip key={h.id} hero={h} />)}
                </div>
              )}
            </div>
            <div
              className="rounded-lg p-2.5 border"
              style={{ background: 'rgba(10,5,20,0.7)', borderColor: 'rgba(168,85,247,0.25)' }}
            >
              {/* Banned archetype badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] text-slate-500">Ils bannent :</span>
                <span className={clsx(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded border',
                  ARCHETYPE_CLASSES[banAnalysis.bannedThreat].badge,
                )}>
                  {ARCHETYPE_ICON[banAnalysis.bannedThreat]} {banAnalysis.bannedThreatLabel}
                </span>
                <span className="text-[9px] text-slate-600 ml-auto">
                  {banAnalysis.banCount} ban{banAnalysis.banCount > 1 ? 's' : ''}
                </span>
              </div>

              {/* Insight text */}
              <p className="text-[10px] text-slate-300 leading-snug mb-2">{banAnalysis.insight}</p>

              {/* Inferred strategies */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-slate-500">Leur objectif :</span>
                {banAnalysis.inferredStrategies.map((a) => (
                  <span
                    key={a}
                    className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', ARCHETYPE_CLASSES[a].badge)}
                  >
                    {ARCHETYPE_ICON[a]} {ARCHETYPE_LABELS[a]}
                  </span>
                ))}
                <span className="text-[9px] text-slate-600 ml-auto">
                  Certitude {banAnalysis.confidence}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Archetype probability distribution */}
        {archetypeProbability && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                📊 Composition ennemie probable
              </p>
              <span className="text-[9px] text-slate-600">
                {archetypeProbability.signalCount} indice{archetypeProbability.signalCount > 1 ? 's' : ''}
              </span>
            </div>

            {archetypeProbability.dominantArchetype && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] text-slate-400">Leur style de jeu :</span>
                <span className={clsx(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded border',
                  ARCHETYPE_CLASSES[archetypeProbability.dominantArchetype].badge,
                )}>
                  {ARCHETYPE_ICON[archetypeProbability.dominantArchetype]}{' '}
                  {ARCHETYPE_LABELS[archetypeProbability.dominantArchetype]}
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
          </div>
        )}
      </div>
    </div>
  );
}
