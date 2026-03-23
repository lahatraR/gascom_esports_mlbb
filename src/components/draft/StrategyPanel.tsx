'use client';

import { useState } from 'react';
import { useDraftStore } from '@/store/draftStore';
import { DRAFT_TEMPLATES } from '@/data/draftTemplates';
import type { DraftTemplate } from '@/data/draftTemplates';

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

function TemplateCard({
  template,
  isRecommended,
  isExpanded,
  onToggle,
  bannedNames,
  pickedNames,
}: {
  template:      DraftTemplate;
  isRecommended: boolean;
  isExpanded:    boolean;
  onToggle:      () => void;
  bannedNames:   Set<string>;
  pickedNames:   Set<string>;
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
                    {/* Lane label */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5" style={{ minWidth: 36 }}>
                      <span className="text-sm leading-none">{LANE_ICON[lane]}</span>
                      <span className="text-[8px] tracking-wide" style={{ color: 'rgba(100,120,160,0.80)' }}>
                        {LANE_LABEL[lane]}
                      </span>
                    </div>

                    {/* Hero + details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <HeroBadge name={opt.primary} status={status} />
                        <span className="text-[9px] italic" style={{ color: 'rgba(120,130,150,0.80)' }}>
                          {opt.role}
                        </span>
                      </div>

                      {/* Backups */}
                      {opt.backup.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[9px] text-slate-600">backup:</span>
                          {opt.backup.map((b) => (
                            <HeroBadge key={b} name={b} status={heroStatus(b)} size="small" />
                          ))}
                        </div>
                      )}

                      {/* Why */}
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
                const ps  = PRIORITY_STYLE[ban.priority];
                const bs  = heroStatus(ban.heroName);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full tracking-wide whitespace-nowrap"
                      style={{
                        background: `${ps.color}22`,
                        color:      ps.color,
                        border:     `1px solid ${ps.color}40`,
                      }}
                    >
                      {ps.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="font-semibold text-[11px]"
                          style={{
                            color:          bs === 'banned' ? '#64748b' : '#e2e8f0',
                            textDecoration: bs === 'banned' ? 'line-through' : 'none',
                          }}
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
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {template.winCondition}
            </p>
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
                    <span className="text-[9px] text-slate-500 tracking-widest uppercase">
                      {phase === 'early' ? 'Early' : phase === 'mid' ? 'Mid' : 'Late'}
                    </span>
                    <PhaseDots rating={rating} />
                    <span className="text-[11px] font-bold" style={{ color: col }}>
                      {rating}/5
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Phase notes carousel — show current expanded phase note on hover impossible in static, show all small */}
            <div className="flex flex-col gap-1 mt-1">
              {(['early', 'mid', 'late'] as const).map((phase) => (
                <p key={phase} className="text-[9px] leading-snug" style={{ color: 'rgba(80,90,110,0.90)' }}>
                  <span className="font-bold" style={{ color: 'rgba(120,130,160,0.90)' }}>
                    {phase === 'early' ? 'Early' : phase === 'mid' ? 'Mid' : 'Late'}:{' '}
                  </span>
                  {template.phaseNotes[phase]}
                </p>
              ))}
            </div>
          </Section>

          {/* ── Execution tips ── */}
          {template.tips.length > 0 && (
            <Section title="Conseils d'Exécution">
              <ul className="flex flex-col gap-1.5">
                {template.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="shrink-0 text-[10px] mt-0.5" style={{ color: s.text }}>▸</span>
                    <span className="text-[10px] text-slate-400 leading-snug">{tip}</span>
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

// ─── Main export ─────────────────────────────────────────────────────────────

export function StrategyPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const blueBans  = useDraftStore((s) => s.blueBans);
  const redBans   = useDraftStore((s) => s.redBans);
  const bluePicks = useDraftStore((s) => s.bluePicks);
  const redPicks  = useDraftStore((s) => s.redPicks);
  const analysis  = useDraftStore((s) => s.analysis);

  const bannedNames = new Set(
    [...blueBans, ...redBans].filter(Boolean).map((h) => h!.name)
  );
  const pickedNames = new Set(
    [...bluePicks, ...redPicks].filter(Boolean).map((h) => h!.name)
  );

  const currentArchetype = analysis?.blueArchetype?.primary ?? null;

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Panel header ── */}
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{ background: 'rgba(8,8,14,0.92)', borderColor: 'rgba(38,38,58,0.60)' }}
      >
        <h3 className="text-white font-bold text-sm tracking-wide">
          📋 Livret Stratégique
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">
          5 compositions prêtes avec bans, picks, analyses de phases et conseils d&apos;exécution.
        </p>
        {currentArchetype && (
          <div
            className="mt-2 flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: ARCHETYPE_STYLE[currentArchetype]?.text ?? '#94a3b8' }}
          >
            <span>{ARCHETYPE_STYLE[currentArchetype]?.icon}</span>
            <span>
              Votre draft tend vers{' '}
              <strong>
                {currentArchetype === 'engage'  ? 'l\'Engage'
                : currentArchetype === 'poke'    ? 'le Poke'
                : currentArchetype === 'protect' ? 'le Protect'
                : currentArchetype === 'split'   ? 'le Split Push'
                :                                  'le Catch'
                }
              </strong>{' '}
              — stratégie correspondante mise en avant.
            </span>
          </div>
        )}
      </div>

      {/* ── Template cards — recommended first ── */}
      {[
        ...DRAFT_TEMPLATES.filter((t) => t.archetype === currentArchetype),
        ...DRAFT_TEMPLATES.filter((t) => t.archetype !== currentArchetype),
      ].map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isRecommended={template.archetype === currentArchetype}
          isExpanded={expandedId === template.id}
          onToggle={() => toggle(template.id)}
          bannedNames={bannedNames}
          pickedNames={pickedNames}
        />
      ))}
    </div>
  );
}
