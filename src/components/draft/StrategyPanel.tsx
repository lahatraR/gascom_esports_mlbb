'use client';

import { useState, useMemo } from 'react';
import { useDraftStore } from '@/store/draftStore';
import { DRAFT_TEMPLATES } from '@/data/draftTemplates';
import { getDraftSequence } from '@/types/draft';
import type { HeroData, DraftAnalysis } from '@/types/draft';
import type { DraftTemplate } from '@/data/draftTemplates';
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_ICON,
  ARCHETYPE_CLASSES,
} from '@/engine/archetypeEngine';

// ─── Visual config per archetype ─────────────────────────────────────────────

const ARCHETYPE_STYLE: Record<string, {
  icon: string; bg: string; border: string; text: string; glow: string;
}> = {
  engage:  { icon: '⚔️', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.55)',  text: '#fb923c', glow: 'rgba(234,88,12,0.20)'  },
  poke:    { icon: '🎯', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.55)', text: '#a78bfa', glow: 'rgba(139,92,246,0.20)' },
  protect: { icon: '🛡️', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.55)', text: '#2dd4bf', glow: 'rgba(20,184,166,0.20)' },
  split:   { icon: '🌊', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.55)',  text: '#facc15', glow: 'rgba(234,179,8,0.20)'  },
  catch:   { icon: '🪤', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.55)',  text: '#f87171', glow: 'rgba(239,68,68,0.20)'  },
};

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  mandatory:   { label: 'OBLIGATOIRE',  color: '#f87171' },
  high:        { label: 'PRIORITAIRE',  color: '#fb923c' },
  situational: { label: 'SITUATIONNEL', color: '#facc15' },
};

const LANE_ICON:  Record<string, string> = {
  exp: '⚡', jungle: '🌿', mid: '🔮', gold: '💰', roam: '🛡',
};
const LANE_LABEL: Record<string, string> = {
  exp: 'EXP', jungle: 'Jungle', mid: 'Mid', gold: 'Gold', roam: 'Roam',
};
const LANE_ROLE_ICON: Record<string, string> = {
  Gold: '💰', Roam: '🛡', Jungle: '🌿', Mid: '🔮', EXP: '⚡',
};
const LANES = ['exp', 'jungle', 'mid', 'gold', 'roam'] as const;

// ─── Phase dot bar ────────────────────────────────────────────────────────────

function PhaseDots({ rating }: { rating: number }) {
  const color = rating >= 4 ? '#4ade80' : rating >= 3 ? '#facc15' : '#f87171';
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 7, height: 7,
            background: i <= rating ? color : 'rgba(80,80,100,0.30)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-slate-500 tracking-[0.15em] uppercase shrink-0">
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(60,60,80,0.45)' }} />
      </div>
      {children}
    </div>
  );
}

// ─── Hero status badge ────────────────────────────────────────────────────────

function HeroBadge({
  name,
  status,
  size = 'normal',
}: {
  name:   string;
  status: 'available' | 'banned' | 'picked';
  size?:  'normal' | 'small';
}) {
  const base = size === 'small'
    ? 'text-[9px] px-1 py-0.5 rounded'
    : 'text-[11px] font-semibold px-1.5 py-0.5 rounded';

  const styleMap = {
    available: { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' },
    banned:    { background: 'rgba(239,68,68,0.15)',   color: '#f87171', textDecoration: 'line-through' as const },
    picked:    { background: 'rgba(74,222,128,0.12)',  color: '#86efac' },
  };

  const prefix = status === 'banned' ? '🚫 ' : status === 'picked' ? '✓ ' : '';

  return (
    <span className={base} style={styleMap[status]}>
      {prefix}{name}
    </span>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function HeroPortrait({ name, heroMap, size = 32 }: {
  name:    string;
  heroMap: Map<string, HeroData>;
  size?:   number;
}) {
  const key  = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hero = heroMap.get(key);
  return (
    <div
      className="rounded overflow-hidden shrink-0 border border-slate-700/40"
      style={{ width: size, height: size * 1.15 }}
    >
      {hero?.image ? (
        <img
          src={hero.image}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400 bg-slate-800/70">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  isRecommended,
  isExpanded,
  onToggle,
  bannedNames,
  pickedNames,
  heroMap,
}: {
  template:      DraftTemplate;
  isRecommended: boolean;
  isExpanded:    boolean;
  onToggle:      () => void;
  bannedNames:   Set<string>;
  pickedNames:   Set<string>;
  heroMap:       Map<string, HeroData>;
}) {
  const s = ARCHETYPE_STYLE[template.archetype];

  function heroStatus(name: string): 'available' | 'banned' | 'picked' {
    if (bannedNames.has(name)) return 'banned';
    if (pickedNames.has(name)) return 'picked';
    return 'available';
  }

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-300"
      style={{
        background:  isRecommended ? s.bg : 'rgba(8,8,14,0.92)',
        borderColor: isRecommended ? s.border : isExpanded ? 'rgba(80,80,110,0.55)' : 'rgba(38,38,58,0.60)',
        boxShadow:   isRecommended ? `0 0 22px ${s.glow}` : 'none',
      }}
    >
      {/* ── Header (always visible) ── */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
        onClick={onToggle}
      >
        <span className="text-xl shrink-0">{s.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white leading-none">{template.name}</span>
            {isRecommended && (
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full tracking-widest"
                style={{ background: s.border, color: '#fff' }}
              >
                ✦ RECOMMANDÉ
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: s.text }}>
            {template.tagline}
          </p>
        </div>

        {/* Phase quick view — desktop */}
        <div className="hidden sm:flex flex-col gap-1 items-end shrink-0">
          <span className="text-[8px] text-slate-600 tracking-widest">E · M · L</span>
          <div className="flex gap-1 items-center">
            <PhaseDots rating={template.phaseRating.early} />
            <span className="text-slate-700 text-[8px]">·</span>
            <PhaseDots rating={template.phaseRating.mid} />
            <span className="text-slate-700 text-[8px]">·</span>
            <PhaseDots rating={template.phaseRating.late} />
          </div>
        </div>

        {/* Expand arrow */}
        <span
          className="shrink-0 text-slate-500 text-xs transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </button>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div
          className="border-t flex flex-col gap-4 px-3 pb-4 pt-3"
          style={{ borderColor: 'rgba(50,50,70,0.40)' }}
        >
          {/* Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {template.description}
          </p>

          {/* ── Composition ── */}
          <Section title="Composition par Lane">
            <div className="flex flex-col gap-2.5">
              {LANES.map((lane) => {
                const opt    = template.lanes[lane];
                const status = heroStatus(opt.primary);
                return (
                  <div key={lane} className="flex gap-2 items-start">
                    <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5" style={{ minWidth: 36 }}>
                      <span className="text-sm leading-none">{LANE_ICON[lane]}</span>
                      <span className="text-[8px] tracking-wide" style={{ color: 'rgba(100,120,160,0.80)' }}>
                        {LANE_LABEL[lane]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <HeroPortrait name={opt.primary} heroMap={heroMap} size={28} />
                        <HeroBadge name={opt.primary} status={status} />
                        <span className="text-[9px] italic" style={{ color: 'rgba(120,130,150,0.80)' }}>
                          {opt.role}
                        </span>
                      </div>
                      {opt.backup.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[9px] text-slate-600">backup:</span>
                          {opt.backup.map((b) => (
                            <HeroBadge key={b} name={b} status={heroStatus(b)} size="small" />
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'rgba(100,110,130,0.90)' }}>
                        {opt.why}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Ban priorities ── */}
          <Section title="Bans Prioritaires">
            <div className="flex flex-col gap-2">
              {template.bans.map((ban, i) => {
                const ps = PRIORITY_STYLE[ban.priority];
                const bs = heroStatus(ban.heroName);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full tracking-wide whitespace-nowrap"
                      style={{ background: `${ps.color}22`, color: ps.color, border: `1px solid ${ps.color}40` }}
                    >
                      {ps.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="font-semibold text-[11px]"
                          style={{ color: bs === 'banned' ? '#64748b' : '#e2e8f0', textDecoration: bs === 'banned' ? 'line-through' : 'none' }}
                        >
                          {ban.heroName}
                        </span>
                        {bs === 'banned' && (
                          <span className="text-[9px] text-emerald-500 font-bold">✓ déjà banni</span>
                        )}
                      </div>
                      <p className="text-[10px] leading-snug" style={{ color: 'rgba(100,110,130,0.90)' }}>
                        {ban.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Win condition ── */}
          <Section title="Condition de Victoire">
            <p className="text-[11px] text-slate-300 leading-relaxed">{template.winCondition}</p>
          </Section>

          {/* ── Phase breakdown ── */}
          <Section title="Puissance par Phase">
            <div className="grid grid-cols-3 gap-2">
              {(['early', 'mid', 'late'] as const).map((phase) => {
                const rating = template.phaseRating[phase];
                const note   = template.phaseNotes[phase];
                const col    = rating >= 4 ? '#4ade80' : rating >= 3 ? '#facc15' : '#f87171';
                return (
                  <div
                    key={phase}
                    className="flex flex-col items-center gap-1.5 rounded-lg p-2"
                    style={{ background: 'rgba(12,12,20,0.75)' }}
                    title={note}
                  >
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                      {phase === 'early' ? 'Début' : phase === 'mid' ? 'Milieu' : 'Fin'}
                    </span>
                    <PhaseDots rating={rating} />
                    <span className="text-[8px] text-center leading-tight" style={{ color: col }}>
                      {note}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Tips ── */}
          {template.tips.length > 0 && (
            <Section title="Conseils d'Exécution">
              <ul className="space-y-1">
                {template.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                    <span className="text-slate-600 mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Strategy Panel ──────────────────────────────────────────────────────

function LiveStrategy({
  analysis,
  allyTeam,
  heroMap,
}: {
  analysis:  DraftAnalysis | null;
  allyTeam:  'blue' | 'red';
  heroMap:   Map<string, HeroData>;
}) {
  const enemyTeam = allyTeam === 'blue' ? 'red' : 'blue';
  const enemyArchetype = allyTeam === 'blue' ? analysis?.redArchetype : analysis?.blueArchetype;
  const allyArchetype  = allyTeam === 'blue' ? analysis?.blueArchetype : analysis?.redArchetype;
  const lineup         = analysis?.winningLineup ?? null;
  const banThreats     = lineup?.banThreats ?? [];
  const remainingSlots = lineup?.slots.filter((s) => !s.isLocked) ?? [];
  const lockedSlots    = lineup?.slots.filter((s) => s.isLocked) ?? [];
  const allSlots       = lineup?.slots ?? [];

  if (!analysis && !lineup) {
    return (
      <div
        className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2 min-h-28"
        style={{ background: 'rgba(5,5,12,0.85)', borderColor: 'rgba(60,60,80,0.35)' }}
      >
        <span className="text-2xl">🎯</span>
        <p className="text-slate-500 text-xs text-center leading-relaxed">
          Lancez le draft pour voir la stratégie en temps réel.<br />
          <span className="text-slate-600">L&apos;analyse s&apos;adapte à chaque ban et pick.</span>
        </p>
      </div>
    );
  }

  const enemyColor  = enemyTeam === 'red' ? 'rgba(239,68,68,0.15)'  : 'rgba(59,130,246,0.15)';
  const enemyBorder = enemyTeam === 'red' ? 'rgba(239,68,68,0.35)'  : 'rgba(59,130,246,0.35)';
  const allyColor   = allyTeam  === 'blue' ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)';
  const allyBorder  = allyTeam  === 'blue' ? 'rgba(59,130,246,0.30)' : 'rgba(239,68,68,0.30)';

  return (
    <div className="flex flex-col gap-3">

      {/* ── Enemy threat header ── */}
      {enemyArchetype && (
        <div
          className="rounded-xl border px-3 py-2.5 flex items-center gap-2.5"
          style={{ background: enemyColor, borderColor: enemyBorder }}
        >
          <span className="text-xl shrink-0">{ARCHETYPE_ICON[enemyArchetype.primary]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Ennemi construit :
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${ARCHETYPE_CLASSES[enemyArchetype.primary].badge}`}>
                {ARCHETYPE_ICON[enemyArchetype.primary]} {ARCHETYPE_LABELS[enemyArchetype.primary]}
              </span>
              <span className="text-[9px] text-slate-500">{enemyArchetype.confidence}% de certitude</span>
            </div>
            {allyArchetype && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Votre contre optimal :{' '}
                <span className={`font-bold ${ARCHETYPE_CLASSES[allyArchetype.primary].text}`}>
                  {ARCHETYPE_ICON[allyArchetype.primary]} {ARCHETYPE_LABELS[allyArchetype.primary]}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Bans prioritaires ── */}
      {banThreats.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'rgba(8,8,14,0.92)', borderColor: 'rgba(60,40,40,0.55)' }}
        >
          <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)' }}>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400">🚫 Bans à anticiper</span>
            <span className="text-[9px] text-slate-600">héros que l&apos;ennemi ciblera probablement</span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {banThreats.map((threat) => {
              const key   = threat.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const hero  = heroMap.get(key);
              return (
                <div key={threat.hero.id} className="flex items-start gap-2.5">
                  {/* Portrait */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-red-700/40">
                    {hero?.image ? (
                      <img src={hero.image} alt={threat.hero.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {threat.hero.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white text-xs font-bold">{threat.hero.name}</span>
                      <span
                        className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                        style={{
                          color:      threat.priority === 'high' ? '#f87171' : '#fb923c',
                          background: threat.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(234,88,12,0.12)',
                          borderColor:threat.priority === 'high' ? 'rgba(239,68,68,0.4)' : 'rgba(234,88,12,0.35)',
                        }}
                      >
                        {threat.priority === 'high' ? '🎯 Prioritaire' : '⚠️ À surveiller'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                      {/* Show reason as plain text, strip markdown */}
                      {threat.banReason.replace(/\*\*/g, '')}
                    </p>
                    {threat.backupPick && (
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">
                        → Alternative : <span className="font-semibold text-emerald-300">{threat.backupPick.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Composition à construire ── */}
      {allSlots.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: allyColor, borderColor: allyBorder }}
        >
          <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: allyBorder }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: allyTeam === 'blue' ? '#93c5fd' : '#fca5a5' }}>
              ⚔️ Composition à construire
            </span>
            {lineup && (
              <span className="text-[9px] text-slate-500">
                {lockedSlots.length} verrouillé{lockedSlots.length > 1 ? 's' : ''} · {remainingSlots.length} à picker
              </span>
            )}
          </div>
          <div className="p-3 flex flex-col gap-2">
            {allSlots.map((slot) => {
              const key  = slot.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const hero = heroMap.get(key);
              const laneIcon = LANE_ROLE_ICON[slot.laneRole] ?? '•';
              return (
                <div
                  key={`${slot.laneRole}-${slot.hero.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 border"
                  style={{
                    background:  slot.isLocked ? 'rgba(5,30,15,0.7)' : 'rgba(8,8,16,0.6)',
                    borderColor: slot.isLocked ? 'rgba(74,222,128,0.35)' : 'rgba(60,60,80,0.30)',
                    borderStyle: slot.isLocked ? 'solid' : 'dashed',
                  }}
                >
                  {/* Lane badge */}
                  <span className="text-[9px] font-bold text-slate-500 w-7 text-center shrink-0">{laneIcon} {slot.laneRole}</span>

                  {/* Portrait */}
                  <div className="w-8 h-8 rounded overflow-hidden shrink-0 border border-slate-700/40">
                    {hero?.image ? (
                      <img src={hero.image} alt={slot.hero.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {slot.hero.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Name + reason */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{slot.hero.name}</p>
                    <p className="text-slate-500 text-[10px] truncate leading-tight">
                      {slot.reason.replace(/⚠️\s*/g, '').replace(/Pilier\s+/g, '')}
                    </p>
                  </div>

                  {/* Lock status */}
                  {slot.isLocked ? (
                    <span className="text-[9px] font-bold text-emerald-400 border border-emerald-600/40 bg-emerald-900/30 px-1.5 py-0.5 rounded shrink-0">
                      ✓ Pris
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-yellow-400 border border-yellow-600/30 bg-yellow-900/10 px-1.5 py-0.5 rounded shrink-0">
                      → À picker
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Win condition */}
          {lineup?.winCondition && (
            <div className="px-3 pb-3">
              <div
                className="flex items-start gap-1.5 rounded-lg p-2"
                style={{ background: 'rgba(20,40,20,0.4)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <span className="text-emerald-400 text-sm shrink-0 mt-0.5">✓</span>
                <p className="text-[11px] text-emerald-300/80 leading-snug">{lineup.winCondition}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback when no lineup yet */}
      {allSlots.length === 0 && (
        <div className="rounded-xl border px-3 py-2.5 text-center" style={{ background: 'rgba(5,5,12,0.85)', borderColor: 'rgba(60,60,80,0.35)' }}>
          <p className="text-slate-600 text-xs">La composition optimale s&apos;affiche dès que des héros sont chargés</p>
        </div>
      )}
    </div>
  );
}

// ─── Main StrategyPanel ────────────────────────────────────────────────────────

export function StrategyPanel() {
  const { bluePicks, redPicks, blueBans, redBans, heroPool, analysis, currentStep, gameMode } = useDraftStore();
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Determine ally team from current step
  const sequence  = getDraftSequence(gameMode);
  const isDone    = currentStep >= sequence.length;
  const step      = isDone ? null : sequence[currentStep];
  const allyTeam: 'blue' | 'red' = step?.team ?? 'blue';

  // Build hero lookup map
  const heroMap = useMemo(() => {
    const m = new Map<string, HeroData>();
    for (const h of heroPool) {
      m.set(h.name.toLowerCase().replace(/[^a-z0-9]/g, ''), h);
    }
    return m;
  }, [heroPool]);

  // Build banned/picked name sets for template status
  const bannedNames = useMemo(() => {
    const s = new Set<string>();
    [...blueBans, ...redBans].forEach((h) => { if (h) s.add(h.name); });
    return s;
  }, [blueBans, redBans]);

  const pickedNames = useMemo(() => {
    const s = new Set<string>();
    [...bluePicks, ...redPicks].forEach((h) => { if (h) s.add(h.name); });
    return s;
  }, [bluePicks, redPicks]);

  // Recommended template: one that counters enemy archetype or best fits ally picks
  const enemyArchetype = allyTeam === 'blue' ? analysis?.redArchetype : analysis?.blueArchetype;
  const recommendedArchetype = analysis?.winningLineup?.archetype ?? enemyArchetype?.primary ?? null;

  const sortedTemplates = useMemo(() => {
    if (!recommendedArchetype) return DRAFT_TEMPLATES;
    return [...DRAFT_TEMPLATES].sort((a, b) =>
      a.archetype === recommendedArchetype ? -1 : b.archetype === recommendedArchetype ? 1 : 0
    );
  }, [recommendedArchetype]);

  return (
    <div className="flex flex-col gap-3">

      {/* ── LIVE STRATEGY (top — always visible) ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'rgba(5,5,12,0.92)', borderColor: 'rgba(124,26,15,0.45)' }}
      >
        <div
          className="px-3 py-2 border-b flex items-center gap-2"
          style={{ background: 'rgba(124,26,15,0.12)', borderColor: 'rgba(124,26,15,0.35)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
            🧠 Stratégie en temps réel
          </span>
          <span className="text-[9px] text-slate-600">
            · se met à jour à chaque pick / ban
          </span>
        </div>
        <div className="p-3">
          <LiveStrategy analysis={analysis} allyTeam={allyTeam} heroMap={heroMap} />
        </div>
      </div>

      {/* ── TEMPLATES DE RÉFÉRENCE (collapsible) ── */}
      <div>
        <button
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
          style={{
            background:  showTemplates ? 'rgba(20,20,35,0.85)' : 'rgba(10,10,18,0.75)',
            borderColor: 'rgba(60,60,80,0.40)',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            📋 Templates de référence
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(60,60,80,0.35)' }} />
          <span className="text-[9px] text-slate-600">{showTemplates ? '▲ masquer' : '▼ afficher'}</span>
        </button>

        {showTemplates && (
          <div className="mt-2 flex flex-col gap-2">
            {sortedTemplates.map((template, i) => (
              <TemplateCard
                key={template.archetype}
                template={template}
                isRecommended={i === 0 && !!recommendedArchetype}
                isExpanded={expandedId === template.archetype}
                onToggle={() => setExpandedId(expandedId === template.archetype ? null : template.archetype)}
                bannedNames={bannedNames}
                pickedNames={pickedNames}
                heroMap={heroMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
