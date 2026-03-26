'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { generateArchetypeDrafts, COMBO_ICONS, COMBO_LABELS } from '@/engine/archetypeDraftGenerator';
import type { GeneratedDraft, GeneratedDraftSlot, GeneratedBan, DraftCombo, CompositionHealthCheck } from '@/engine/archetypeDraftGenerator';

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

// ─── Hero stat tooltip ────────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-slate-500 w-14 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(40,40,60,0.8)' }}>
        <div className="h-full rounded-full" style={{ width: `${value * 10}%`, background: color }} />
      </div>
      <span className="text-[8px] font-bold shrink-0" style={{ color, minWidth: 12, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function HeroStatTooltip({ hero, children }: { hero: HeroData; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-36 rounded-lg p-2 flex flex-col gap-1 pointer-events-none"
          style={{ background: 'rgba(8,6,18,0.97)', border: '1px solid rgba(80,80,120,0.55)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}
        >
          <p className="text-[9px] font-bold text-white truncate mb-0.5">{hero.name}</p>
          <StatBar label="CC"        value={hero.cc}        color="#a78bfa" />
          <StatBar label="Dégâts"    value={hero.damage}    color="#f87171" />
          <StatBar label="Mobilité"  value={hero.mobility}  color="#4ade80" />
          <StatBar label="Résistance" value={hero.tankiness} color="#60a5fa" />
        </div>
      )}
    </div>
  );
}

// ─── Export draft summary ─────────────────────────────────────────────────────

function buildDraftSummaryText(draft: GeneratedDraft): string {
  const laneIcon: Record<string, string> = { EXP: '⚡', Jungle: '🌿', Mid: '🔮', Gold: '💰', Roam: '🛡' };
  const lines: string[] = [
    `=== Composition #${draft.rank} — ${draft.archetype.toUpperCase()} ===`,
    '',
    '🧩 COMPOSITION PAR LANE',
    ...draft.slots.map((s) => `  ${laneIcon[s.lane] ?? '•'} ${s.lane.padEnd(7)} ${s.hero.name}  [${s.role}]`),
    '',
  ];
  if (draft.topCombos.length > 0) {
    lines.push('🔗 COMBOS CLÉS');
    for (const c of draft.topCombos) {
      lines.push(`  ${c.heroA} + ${c.heroB} → ${c.label} (${c.score}%)`);
    }
    lines.push('');
  }
  if (draft.pickOrder.length > 0) {
    lines.push('🎯 ORDRE DE PICK RECOMMANDÉ');
    for (const p of draft.pickOrder) {
      lines.push(`  ${p.order}. ${p.lane.padEnd(7)} — ${p.reason}`);
    }
    lines.push('');
  }
  lines.push('🚫 BANS RECOMMANDÉS');
  for (const b of draft.bans) {
    const tag = b.priority === 'must-ban' ? '[OBLIGATOIRE]' : b.priority === 'high' ? '[PRIORITAIRE]' : '[SITUATIONNEL]';
    lines.push(`  ${tag} ${b.hero.name}`);
  }
  lines.push('');
  lines.push('✅ CONDITION DE VICTOIRE');
  lines.push(`  ${draft.winCondition}`);
  lines.push('');
  lines.push('— Généré par GES Draft Simulator —');
  return lines.join('\n');
}

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton({ draft }: { draft: GeneratedDraft }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = buildDraftSummaryText(draft);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* clipboard denied */ });
  }, [draft]);

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition-all duration-200"
      style={{
        background:  copied ? 'rgba(74,222,128,0.12)' : 'rgba(30,30,50,0.7)',
        border:      `1px solid ${copied ? 'rgba(74,222,128,0.35)' : 'rgba(80,80,110,0.40)'}`,
        color:       copied ? '#4ade80' : '#94a3b8',
      }}
    >
      <span>{copied ? '✓' : '📋'}</span>
      {copied ? 'Résumé copié !' : 'Copier le résumé du draft'}
    </button>
  );
}

// ─── Generated Draft Panel ────────────────────────────────────────────────────

const LANE_ICON_GEN: Record<string, string> = {
  EXP: '⚡', Jungle: '🌿', Mid: '🔮', Gold: '💰', Roam: '🛡',
};

const BAN_PRIORITY_COLOR: Record<GeneratedBan['priority'], string> = {
  'must-ban':   '#f87171',
  'high':       '#fb923c',
  'situational':'#facc15',
};

const BAN_PRIORITY_LABEL: Record<GeneratedBan['priority'], string> = {
  'must-ban':   'BAN OBLIGATOIRE',
  'high':       'PRIORITAIRE',
  'situational':'SITUATIONNEL',
};

// Phase labels and descriptions shown above each ban group
const BAN_PHASE_META: Record<GeneratedBan['priority'], { phase: string; desc: string; icon: string }> = {
  'must-ban':    { phase: 'Phase 1', desc: 'Neutralise votre core — bannir en premier',         icon: '🚫' },
  'high':        { phase: 'Phase 2', desc: 'S+ flex picks — trop polyvalents pour laisser passer', icon: '⚠️' },
  'situational': { phase: 'Phase 3', desc: 'Menaces ciblées — exploitent vos failles naturelles',   icon: '🎯' },
};

// ─── Composition health check display ────────────────────────────────────────

function HealthCheckDisplay({ check }: { check: CompositionHealthCheck }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {check.functions.map((fn) => (
          <div
            key={fn.key}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5"
            style={{
              background: fn.covered
                ? 'rgba(74,222,128,0.06)'
                : fn.severity === 'critical' ? 'rgba(248,113,113,0.10)' : 'rgba(250,204,21,0.08)',
              border: `1px solid ${fn.covered ? 'rgba(74,222,128,0.20)' : fn.severity === 'critical' ? 'rgba(248,113,113,0.35)' : 'rgba(250,204,21,0.25)'}`,
            }}
          >
            <span className="text-sm shrink-0 leading-none mt-0.5">{fn.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className="text-[9px] font-bold leading-none"
                  style={{ color: fn.covered ? '#4ade80' : fn.severity === 'critical' ? '#f87171' : '#facc15' }}
                >
                  {fn.covered ? '✓' : fn.severity === 'critical' ? '✗' : '⚠'} {fn.name}
                </span>
              </div>
              {fn.covered && fn.coveredBy.length > 0 && (
                <p className="text-[8px] text-slate-500 leading-tight mt-0.5 truncate">
                  via {fn.coveredBy.join(', ')}
                </p>
              )}
              {!fn.covered && (
                <p className="text-[8px] leading-tight mt-0.5" style={{ color: fn.severity === 'critical' ? '#f87171' : '#facc15', opacity: 0.8 }}>
                  {fn.severity === 'critical' ? 'Critique — pick en priorité' : 'À renforcer'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratedDraftCard({
  draft,
  isExpanded,
  onToggle,
  heroMap,
}: {
  draft:      GeneratedDraft;
  isExpanded: boolean;
  onToggle:   () => void;
  heroMap:    Map<string, HeroData>;
}) {
  const s = ARCHETYPE_STYLE[draft.archetype];
  const scoreColor = draft.teamScore >= 70 ? '#4ade80' : draft.teamScore >= 50 ? '#facc15' : '#f87171';

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-300"
      style={{
        background:  draft.rank === 1 ? s.bg : 'rgba(8,8,14,0.92)',
        borderColor: draft.rank === 1 ? s.border : isExpanded ? 'rgba(80,80,110,0.55)' : 'rgba(38,38,58,0.60)',
        boxShadow:   draft.rank === 1 ? `0 0 22px ${s.glow}` : 'none',
      }}
    >
      {/* Header */}
      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left" onClick={onToggle}>
        {/* Rank badge */}
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
          style={{
            background: draft.rank === 1 ? s.border : 'rgba(50,50,70,0.8)',
            color: draft.rank === 1 ? '#fff' : 'rgba(160,160,190,0.9)',
          }}
        >
          #{draft.rank}
        </span>

        <div className="flex-1 min-w-0">
          {/* Pick strip — portraits instead of text names */}
          <div className="flex items-center gap-1 flex-wrap">
            {draft.slots.map((sl) => {
              const k = sl.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const h = heroMap.get(k);
              return (
                <div
                  key={sl.lane}
                  className="rounded overflow-hidden shrink-0 border"
                  style={{ width: 26, height: 30, borderColor: 'rgba(80,80,110,0.55)' }}
                  title={`${sl.lane}: ${sl.hero.name}`}
                >
                  {h?.image
                    ? <img src={h.image} alt={sl.hero.name} className="w-full h-full object-cover object-top" />
                    : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400 bg-slate-800/80">{sl.hero.name.charAt(0)}</div>
                  }
                </div>
              );
            })}
            {/* Separator */}
            <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: 'rgba(80,80,110,0.45)' }} />
            {/* Ban mini-strip — top 3 must-ban heroes */}
            {draft.bans.filter((b) => b.priority === 'must-ban').slice(0, 3).map((ban, i) => {
              const bk = ban.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const bh = heroMap.get(bk);
              return (
                <div
                  key={i}
                  className="relative rounded overflow-hidden shrink-0"
                  style={{ width: 22, height: 25, border: '1px solid rgba(248,113,113,0.40)' }}
                  title={`Ban: ${ban.hero.name}`}
                >
                  {bh?.image
                    ? <img src={bh.image} alt={ban.hero.name} className="w-full h-full object-cover object-top" style={{ filter: 'grayscale(0.6)' }} />
                    : <div className="w-full h-full flex items-center justify-center text-[7px] font-bold bg-red-950/60 text-red-400">{ban.hero.name.charAt(0)}</div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(180,20,20,0.30)' }}>
                    <span className="text-red-400 font-black text-[9px] leading-none">✕</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 max-w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(40,40,60,0.8)' }}>
                <div className="h-full rounded-full" style={{ width: `${draft.teamScore}%`, background: scoreColor }} />
              </div>
              <span className="text-[9px] font-bold" style={{ color: scoreColor }}>{draft.teamScore}/100</span>
            </div>
            {draft.synergyScore !== undefined && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: draft.synergyScore >= 60 ? 'rgba(74,222,128,0.15)' : 'rgba(100,100,130,0.2)',
                  color:      draft.synergyScore >= 60 ? '#4ade80' : '#64748b',
                  border:     `1px solid ${draft.synergyScore >= 60 ? 'rgba(74,222,128,0.3)' : 'rgba(100,100,130,0.2)'}`,
                }}
              >
                🔗 synergie {draft.synergyScore}%
              </span>
            )}
            {/* Health check badge */}
            {draft.healthCheck && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{
                  background: draft.healthCheck.overallHealth === 'good'     ? 'rgba(74,222,128,0.15)'
                            : draft.healthCheck.overallHealth === 'warning'  ? 'rgba(250,204,21,0.15)'
                            : 'rgba(248,113,113,0.15)',
                  color: draft.healthCheck.overallHealth === 'good'     ? '#4ade80'
                       : draft.healthCheck.overallHealth === 'warning'  ? '#facc15'
                       : '#f87171',
                  border: `1px solid ${draft.healthCheck.overallHealth === 'good' ? 'rgba(74,222,128,0.3)' : draft.healthCheck.overallHealth === 'warning' ? 'rgba(250,204,21,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}
              >
                {draft.healthCheck.overallHealth === 'good' ? '✓' : draft.healthCheck.overallHealth === 'warning' ? '⚠' : '✗'} {draft.healthCheck.summary}
              </span>
            )}
          </div>
        </div>

        <span
          className="shrink-0 text-slate-500 text-xs transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </button>

      {/* Expanded */}
      {isExpanded && (
        <div className="border-t flex flex-col gap-4 px-3 pb-4 pt-3" style={{ borderColor: 'rgba(50,50,70,0.40)' }}>
          {/* Lane slots */}
          <Section title="Composition par Lane">
            <div className="flex flex-col gap-2.5">
              {draft.slots.map((slot: GeneratedDraftSlot) => {
                const key  = slot.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const hero = heroMap.get(key);
                const fitColor = slot.archetypeFit >= 70 ? '#4ade80' : slot.archetypeFit >= 50 ? '#facc15' : '#f87171';
                return (
                  <div key={slot.lane} className="flex gap-2 items-start">
                    <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5" style={{ minWidth: 36 }}>
                      <span className="text-sm leading-none">{LANE_ICON_GEN[slot.lane] ?? '•'}</span>
                      <span className="text-[8px] tracking-wide" style={{ color: 'rgba(100,120,160,0.80)' }}>{slot.lane}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Portrait with stat tooltip */}
                        <HeroStatTooltip hero={slot.hero}>
                          <div className="rounded overflow-hidden shrink-0 border border-slate-700/40 cursor-help" style={{ width: 28, height: 32 }}>
                            {hero?.image ? (
                              <img src={hero.image} alt={slot.hero.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400 bg-slate-800/70">
                                {slot.hero.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </HeroStatTooltip>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }}>
                          {slot.hero.name}
                        </span>
                        <span className="text-[8px] font-medium text-slate-500">{slot.role}</span>
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: fitColor, background: `${fitColor}22`, border: `1px solid ${fitColor}40` }}>
                          {slot.archetypeFit}/100
                        </span>
                        {slot.isFlexPick && (
                          <span
                            className="text-[8px] font-black px-1 py-0.5 rounded tracking-wide"
                            style={{ background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.35)' }}
                            title={`Flex pick — fort dans : ${slot.flexArchetypes.join(', ')}`}
                          >
                            FLEX
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'rgba(100,110,130,0.90)' }}>{slot.why}</p>
                      {/* Battle spell recommendation */}
                      {slot.battleSpell && (
                        <div className="flex items-start gap-1.5 mt-1 rounded-lg px-2 py-1" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.20)' }}>
                          <span className="text-[9px] shrink-0 mt-0.5">⚡</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] font-black" style={{ color: '#fbbf24' }}>
                                {slot.battleSpell.primary}
                              </span>
                              {slot.battleSpell.secondary && (
                                <>
                                  <span className="text-[8px] text-slate-600">ou</span>
                                  <span className="text-[9px] font-semibold text-slate-400">
                                    {slot.battleSpell.secondary}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-[8px] leading-snug mt-0.5" style={{ color: 'rgba(150,120,60,0.85)' }}>
                              {slot.battleSpell.note}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Alternatives if banned */}
                      {slot.alternatives && slot.alternatives.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className="text-[9px] text-slate-600 shrink-0">Si banni :</span>
                          {slot.alternatives.map((alt) => {
                            const altKey  = alt.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const altHero = heroMap.get(altKey);
                            return (
                              <div key={alt.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(40,40,60,0.7)', border: '1px solid rgba(60,60,90,0.5)' }}>
                                {altHero?.image && (
                                  <div className="rounded overflow-hidden shrink-0" style={{ width: 14, height: 16 }}>
                                    <img src={altHero.image} alt={alt.name} className="w-full h-full object-cover object-top" />
                                  </div>
                                )}
                                <span className="text-[9px] text-slate-400 font-medium">{alt.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Bans — 3-phase visual layout */}
          <Section title="Stratégie de Ban">
            <div className="flex flex-col gap-2.5">
              {(['must-ban', 'high', 'situational'] as GeneratedBan['priority'][]).map((priority) => {
                const phaseBans = draft.bans.filter((b) => b.priority === priority);
                if (phaseBans.length === 0) return null;
                const c     = BAN_PRIORITY_COLOR[priority];
                const meta  = BAN_PHASE_META[priority];
                return (
                  <div
                    key={priority}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${c}28`, background: `${c}09` }}
                  >
                    {/* Phase header */}
                    <div
                      className="flex items-center gap-2 px-2.5 py-1.5"
                      style={{ background: `${c}18`, borderBottom: `1px solid ${c}22` }}
                    >
                      <span className="text-sm leading-none">{meta.icon}</span>
                      <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: c }}>
                        {meta.phase}
                      </span>
                      <span className="text-[8px] text-slate-500 leading-none">{meta.desc}</span>
                    </div>

                    {/* Hero cards in a horizontal row */}
                    <div className="flex gap-2 px-2.5 py-2 flex-wrap">
                      {phaseBans.map((ban, i) => {
                        const bk   = ban.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const bh   = heroMap.get(bk);
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg flex-1 min-w-[110px]"
                            style={{
                              padding:    '6px 8px',
                              background: 'rgba(8,8,18,0.70)',
                              border:     `1px solid ${c}25`,
                            }}
                          >
                            {/* Portrait with grayscale + X overlay */}
                            <div
                              className="relative shrink-0 rounded-lg overflow-hidden"
                              style={{ width: 38, height: 44 }}
                            >
                              {bh?.image
                                ? <img
                                    src={bh.image}
                                    alt={ban.hero.name}
                                    className="w-full h-full object-cover object-top"
                                    style={{ filter: 'grayscale(0.45) brightness(0.85)' }}
                                  />
                                : <div
                                    className="w-full h-full flex items-center justify-center text-[11px] font-black"
                                    style={{ background: `${c}22`, color: c }}
                                  >
                                    {ban.hero.name.charAt(0)}
                                  </div>
                              }
                              {/* X overlay */}
                              <div
                                className="absolute inset-0 flex items-end justify-end p-0.5"
                                style={{ background: `${c}18` }}
                              >
                                <span
                                  className="rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black leading-none"
                                  style={{ background: c, color: '#0a0a14' }}
                                >✕</span>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <span
                                className="block text-[11px] font-bold leading-snug"
                                style={{ color: '#e2e8f0' }}
                              >
                                {ban.hero.name}
                              </span>
                              <p
                                className="text-[9px] leading-snug mt-0.5"
                                style={{ color: 'rgba(100,110,140,0.85)' }}
                              >
                                {/* Show only the tactical part (after the " — " if present) */}
                                {ban.reason.includes(' — ')
                                  ? ban.reason.split(' — ').slice(1).join(' — ')
                                  : ban.reason}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Top combos */}
          {draft.topCombos && draft.topCombos.length > 0 && (
            <Section title="Combos Clés">
              <div className="flex flex-col gap-1.5">
                {draft.topCombos.map((combo: DraftCombo, i: number) => {
                  const scoreColor = combo.score >= 65 ? '#4ade80' : combo.score >= 45 ? '#facc15' : '#94a3b8';
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                      style={{ background: 'rgba(12,12,24,0.80)', border: '1px solid rgba(60,60,90,0.40)' }}
                    >
                      <span className="text-sm shrink-0">{COMBO_ICONS[combo.comboType]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-white">{combo.heroA}</span>
                          <span className="text-[9px] text-slate-600">+</span>
                          <span className="text-[10px] font-bold text-white">{combo.heroB}</span>
                          <span
                            className="text-[8px] font-bold px-1 py-0.5 rounded ml-1"
                            style={{ color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}35` }}
                          >
                            {combo.label}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-none mt-0.5">
                          {combo.laneA} + {combo.laneB} · Synergie {combo.score}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Pick order */}
          {draft.pickOrder && draft.pickOrder.length > 0 && (
            <Section title="Ordre de Pick Recommandé">
              <div className="flex flex-col gap-1">
                {draft.pickOrder.map((step) => {
                  const laneHero = draft.slots.find((s) => s.lane === step.lane);
                  const stepKey  = laneHero?.hero.name.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
                  const stepHero = heroMap.get(stepKey);
                  return (
                    <div key={step.order} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(12,12,24,0.70)', border: '1px solid rgba(60,60,90,0.35)' }}>
                      <span
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                        style={{ background: step.order === 1 ? 'rgba(251,191,36,0.25)' : 'rgba(60,60,80,0.7)', color: step.order === 1 ? '#fbbf24' : '#64748b' }}
                      >
                        {step.order}
                      </span>
                      {stepHero?.image && (
                        <div className="rounded overflow-hidden shrink-0" style={{ width: 18, height: 20 }}>
                          <img src={stepHero.image} alt={laneHero?.hero.name} className="w-full h-full object-cover object-top" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-300">{LANE_ICON_GEN[step.lane]} {step.lane}</span>
                          {laneHero && <span className="text-[9px] text-slate-500">· {laneHero.hero.name}</span>}
                        </div>
                        <p className="text-[9px] text-slate-600 leading-tight">{step.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Win condition */}
          <Section title="Condition de Victoire">
            <p className="text-[11px] text-slate-300 leading-relaxed">{draft.winCondition}</p>
          </Section>

          {/* Composition health check */}
          {draft.healthCheck && (
            <Section title="Santé de la Composition">
              <HealthCheckDisplay check={draft.healthCheck} />
            </Section>
          )}

          {/* Export button */}
          <ExportButton draft={draft} />
        </div>
      )}
    </div>
  );
}

function GeneratedDraftView({
  drafts,
  heroMap,
}: {
  drafts:  GeneratedDraft[];
  heroMap: Map<string, HeroData>;
}) {
  const [expandedRank, setExpandedRank] = useState<number>(1);

  if (drafts.length === 0) {
    return (
      <div
        className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2 min-h-28"
        style={{ background: 'rgba(5,5,12,0.85)', borderColor: 'rgba(60,60,80,0.35)' }}
      >
        <span className="text-2xl">⚙️</span>
        <p className="text-slate-500 text-xs text-center">Génération des compositions en cours…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-bold text-slate-500 tracking-[0.15em] uppercase shrink-0">
          Top {drafts.length} compositions générées
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(60,60,80,0.45)' }} />
      </div>
      {drafts.map((draft) => (
        <GeneratedDraftCard
          key={draft.rank}
          draft={draft}
          isExpanded={expandedRank === draft.rank}
          onToggle={() => setExpandedRank(expandedRank === draft.rank ? -1 : draft.rank)}
          heroMap={heroMap}
        />
      ))}
    </div>
  );
}

// ─── Main StrategyPanel ────────────────────────────────────────────────────────

export function StrategyPanel() {
  const heroPool         = useDraftStore((s) => s.heroPool);
  const plannedArchetype = useDraftStore((s) => s.plannedArchetype);
  const blueBans         = useDraftStore((s) => s.blueBans);
  const redBans          = useDraftStore((s) => s.redBans);
  const bluePicks        = useDraftStore((s) => s.bluePicks);
  const redPicks         = useDraftStore((s) => s.redPicks);
  const analysis         = useDraftStore((s) => s.analysis);
  const currentStep      = useDraftStore((s) => s.currentStep);
  const gameMode         = useDraftStore((s) => s.gameMode);
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

  // Excluded hero IDs (banned + picked) for the generator
  const excludedSet = useMemo(() => {
    const s = new Set<string>();
    [...blueBans, ...redBans, ...bluePicks, ...redPicks].forEach((h) => { if (h) s.add(String(h.id)); });
    return s;
  }, [blueBans, redBans, bluePicks, redPicks]);

  // Enemy picks (already confirmed on the board) for reactive counter scoring
  const enemyPicks = useMemo((): HeroData[] => {
    const enemySlots = allyTeam === 'blue' ? redPicks : bluePicks;
    return enemySlots.filter((h): h is HeroData => h !== null);
  }, [allyTeam, bluePicks, redPicks]);

  // Generated drafts when a planned archetype is set
  const generatedDrafts = useMemo(() => {
    if (!plannedArchetype) return [];
    return generateArchetypeDrafts(plannedArchetype, heroPool, excludedSet, enemyPicks, allyTeam);
  }, [plannedArchetype, heroPool, excludedSet, enemyPicks, allyTeam]);

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

      {/* ── GENERATED DRAFTS (when planned archetype is set) or TEMPLATES DE RÉFÉRENCE ── */}
      {plannedArchetype ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'rgba(5,5,12,0.92)', borderColor: 'rgba(124,26,15,0.45)' }}
        >
          <div
            className="px-3 py-2 border-b flex items-center gap-2"
            style={{ background: 'rgba(124,26,15,0.12)', borderColor: 'rgba(124,26,15,0.35)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
              {ARCHETYPE_ICON[plannedArchetype]} Compositions {ARCHETYPE_LABELS[plannedArchetype]} générées
            </span>
            <span className="text-[9px] text-slate-600">· top {generatedDrafts.length}</span>
          </div>
          <div className="p-3">
            <GeneratedDraftView drafts={generatedDrafts} heroMap={heroMap} />
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
