'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { HeroData, DraftStep } from '@/types/draft';
import { getHeroArchetypeTags } from '@/data/tierList';
import { ARCHETYPE_ICON } from '@/engine/archetypeEngine';

// ─── Lane config ──────────────────────────────────────────────────────────────

type LaneKey = 'EXP' | 'Gold' | 'Jungle' | 'Mid' | 'Roam';

const LANE_ORDER: LaneKey[] = ['EXP', 'Jungle', 'Mid', 'Gold', 'Roam'];

const LANE_CFG: Record<LaneKey, { icon: string; label: string; color: string; bg: string }> = {
  EXP:    { icon: '⚡', label: 'EXP',  color: '#fb923c', bg: 'rgba(251,146,60,0.18)'  },
  Gold:   { icon: '💰', label: 'Gold', color: '#facc15', bg: 'rgba(250,204,21,0.18)'  },
  Jungle: { icon: '🌿', label: 'JG',   color: '#4ade80', bg: 'rgba(74,222,128,0.18)'  },
  Mid:    { icon: '🔮', label: 'Mid',  color: '#c084fc', bg: 'rgba(192,132,252,0.18)' },
  Roam:   { icon: '🛡', label: 'Roam', color: '#60a5fa', bg: 'rgba(96,165,250,0.18)'  },
};

const ROLE_COLOR: Record<string, string> = {
  Fighter: '#fb923c', Assassin: '#a78bfa', Mage:     '#c084fc',
  Marksman:'#facc15', Tank:     '#60a5fa', Support:  '#2dd4bf',
};

// ─── Lane assignment helpers ──────────────────────────────────────────────────

function heroToLane(hero: HeroData): LaneKey {
  const r = hero.roles;
  if (r.includes('Marksman')) return 'Gold';
  if (r.includes('Support'))  return 'Roam';
  if (r.includes('Tank'))     return 'Roam';
  if (r.includes('Mage'))     return 'Mid';
  if (r.includes('Assassin')) return 'Jungle';
  return 'EXP';
}

export function assignHeroesToLanes(
  picks: (HeroData | null)[],
): Partial<Record<LaneKey, HeroData>> {
  const result: Partial<Record<LaneKey, HeroData>> = {};
  const ALL: LaneKey[] = ['EXP', 'Gold', 'Mid', 'Jungle', 'Roam'];
  for (const hero of picks) {
    if (!hero) continue;
    const pref = heroToLane(hero);
    if (!result[pref]) { result[pref] = hero; continue; }
    for (const lane of ALL) {
      if (!result[lane]) { result[lane] = hero; break; }
    }
  }
  return result;
}

// ─── Synergy score (0–1) ──────────────────────────────────────────────────────

function heroSynergy(a: HeroData, b: HeroData): number {
  const tA = getHeroArchetypeTags(a.name);
  const tB = getHeroArchetypeTags(b.name);
  if (!tA.length || !tB.length) return 0.2;
  const shared  = tA.filter(t => tB.includes(t)).length;
  const roleDiv = a.roles.filter(r => b.roles.includes(r)).length === 0 ? 1 : 0.4;
  const pair    = Math.min(0.3, ((a.synergyPairs?.[b.id] ?? 0) + (b.synergyPairs?.[a.id] ?? 0)) / 20);
  return Math.min(0.95, Math.max(0.05,
    (1 - shared / Math.max(tA.length, tB.length)) * 0.5 + roleDiv * 0.3 + pair,
  ));
}

// ─── Mini-map positions (viewBox 0 0 699 314 — matches Sanctum_Island_Map) ───
// Calibrated on the real MLBB map image (blue base bottom-left, red top-right)

const BLUE_MAP: Record<LaneKey, [number, number]> = {
  EXP:    [118,  92],   // top lane, blue side (upper-left path)
  Jungle: [198, 178],   // blue jungle center
  Mid:    [258, 190],   // mid lane, blue half
  Gold:   [185, 255],   // bot lane, blue side (lower-left)
  Roam:   [142, 228],   // near gold
};
const RED_MAP: Record<LaneKey, [number, number]> = {
  Gold:   [568,  72],   // top lane, red side (upper-right)
  Jungle: [488, 152],   // red jungle center
  Mid:    [432, 158],   // mid lane, red half
  EXP:    [514, 250],   // bot lane, red side (lower-right)
  Roam:   [542, 108],   // near red gold
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── ArenaFormationPanel  (replaces TeamColumn in arena mode) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface FormationPanelProps {
  team:    'blue' | 'red';
  picks:   (HeroData | null)[];
  bans:    (HeroData | null)[];
  rating?: number;
}

export function ArenaFormationPanel({ team, picks, bans, rating }: FormationPanelProps) {
  const assign      = useMemo(() => assignHeroesToLanes(picks), [picks]);
  const isBlue      = team === 'blue';
  const teamRgb     = isBlue ? '30,111,255' : '232,53,53';
  const teamColor   = isBlue ? '#3b82f6' : '#ef4444';
  const borderColor = `rgba(${teamRgb},0.35)`;

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: 'rgba(8,10,20,0.92)', border: `1px solid ${borderColor}` }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, rgba(${teamRgb},0.22) 0%, rgba(${teamRgb},0.06) 100%)`,
          borderBottom: `1px solid rgba(${teamRgb},0.2)`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamColor, boxShadow: `0 0 6px ${teamColor}` }} />
          <span
            className="font-display text-base tracking-widest uppercase"
            style={{ color: teamColor }}
          >
            {isBlue ? 'Bleue' : 'Rouge'}
          </span>
        </div>
        {rating !== undefined && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: teamColor, background: `rgba(${teamRgb},0.18)`, border: `1px solid rgba(${teamRgb},0.35)` }}
          >
            {rating.toFixed(1)} ★
          </span>
        )}
      </div>

      {/* ── Formation slots ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0 divide-y" style={{ divideColor: `rgba(${teamRgb},0.08)` } as React.CSSProperties}>
        {LANE_ORDER.map((lane) => {
          const hero = assign[lane];
          const lc   = LANE_CFG[lane];
          return (
            <FormationSlot
              key={lane}
              lane={lane}
              hero={hero ?? null}
              team={team}
              teamRgb={teamRgb}
            />
          );
        })}
      </div>

      {/* ── Bans strip ── */}
      <div
        className="flex-shrink-0 px-2.5 py-2"
        style={{ borderTop: `1px solid rgba(${teamRgb},0.15)`, background: 'rgba(0,0,0,0.3)' }}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Bans</p>
        <div className="flex gap-1.5 flex-wrap">
          {bans.map((hero, i) => (
            <BanPortrait key={i} hero={hero} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Formation slot (one lane row) ───────────────────────────────────────────

function FormationSlot({
  lane, hero, team, teamRgb,
}: {
  lane: LaneKey; hero: HeroData | null; team: 'blue' | 'red'; teamRgb: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  const lc         = LANE_CFG[lane];
  const primaryRole = hero?.roles[0] ?? '';
  const roleColor   = ROLE_COLOR[primaryRole] ?? '#94a3b8';
  const archetypes  = hero ? getHeroArchetypeTags(hero.name) : [];

  if (!hero) {
    return (
      <div className="flex items-center gap-2.5 px-2.5 py-2.5 opacity-35">
        {/* Empty portrait */}
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed"
          style={{ borderColor: lc.color, background: lc.bg }}
        >
          <span className="text-base">{lc.icon}</span>
        </div>
        {/* Lane label */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: lc.color }}
          >
            {lc.label}
          </span>
          <span className="text-[9px] text-slate-700">— vide —</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 group transition-colors duration-150 hover:bg-white/[0.03] lock-in"
      style={{ borderLeft: `2px solid ${lc.color}` }}
    >
      {/* Portrait */}
      <div className="relative flex-shrink-0 w-10 h-10">
        <div
          className="w-10 h-10 rounded-lg overflow-hidden"
          style={{ border: `2px solid ${roleColor}60` }}
        >
          {hero.image && !imgErr ? (
            <img
              src={hero.image}
              alt={hero.name}
              className="w-full h-full object-cover object-top"
              onError={() => setImgErr(true)}
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-base font-black"
              style={{ background: `${roleColor}20`, color: roleColor }}
            >
              {hero.name.charAt(0)}
            </div>
          )}
          {/* Portrait gradient */}
          <div className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        </div>
        {/* Lane icon badge */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
          style={{ background: lc.color, boxShadow: `0 0 4px ${lc.color}` }}
        >
          {lc.icon}
        </div>
        {/* Archetype badge (first tag) */}
        {archetypes[0] && (
          <div
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
            style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(100,100,150,0.4)' }}
            title={archetypes[0]}
          >
            {ARCHETYPE_ICON[archetypes[0]]}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] leading-none truncate font-display tracking-wide"
          style={{ color: 'rgba(240,240,255,0.92)' }}
        >
          {hero.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span
            className="text-[8px] font-bold px-1 py-0.5 rounded"
            style={{ color: roleColor, background: `${roleColor}18` }}
          >
            {primaryRole}
          </span>
          <span
            className="text-[9px] font-black"
            style={{ color: hero.winRate >= 0.52 ? '#4ade80' : hero.winRate >= 0.48 ? '#facc15' : '#f87171' }}
          >
            {(hero.winRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Ban portrait ─────────────────────────────────────────────────────────────

function BanPortrait({ hero }: { hero: HeroData | null }) {
  const [imgErr, setImgErr] = useState(false);
  if (!hero) {
    return (
      <div className="w-7 h-7 rounded border border-dashed border-slate-700/40 flex-shrink-0" />
    );
  }
  return (
    <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0 grayscale opacity-55 flex-shrink-0" title={hero.name}>
      {hero.image && !imgErr
        ? <img src={hero.image} alt={hero.name} className="w-full h-full object-cover object-top" onError={() => setImgErr(true)} />
        : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500">{hero.name.charAt(0)}</div>
      }
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(120,0,0,0.5)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="rgba(255,80,80,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="rgba(255,80,80,0.9)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ArenaMiniMap  (compact strip placed BELOW the 3 columns) ─────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface MiniMapProps {
  bluePicks:      (HeroData | null)[];
  redPicks:       (HeroData | null)[];
  winProbability: number;
}

export function ArenaMiniMap({ bluePicks, redPicks, winProbability }: MiniMapProps) {
  const blueAssign = useMemo(() => assignHeroesToLanes(bluePicks), [bluePicks]);
  const redAssign  = useMemo(() => assignHeroesToLanes(redPicks),  [redPicks]);
  const synLines   = useMemo(() => [
    ...buildSynLines(blueAssign, BLUE_MAP, 'blue'),
    ...buildSynLines(redAssign,  RED_MAP,  'red'),
  ], [blueAssign, redAssign]);

  const blueAdv = winProbability - 50;

  // Container height derived from real map ratio: 699×314 → ratio ≈ 2.226
  // We fix the height and let width be 100% → positions stay proportionally correct
  const MAP_W = 699;
  const MAP_H = 314;

  return (
    <div
      className="w-full rounded-xl overflow-hidden relative flex-shrink-0"
      style={{ border: '1px solid rgba(40,60,100,0.5)', background: '#0a0e1a' }}
    >
      {/* ── Real MLBB map image ── */}
      <div
        className="relative w-full"
        style={{ paddingBottom: `${(MAP_H / MAP_W) * 100}%` }}
      >
        {/* Map background */}
        <img
          src="/mlbb-map.webp"
          alt="MLBB Arena Map"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.82 }}
          draggable={false}
        />

        {/* Dark vignette to push hero nodes forward */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Win-prob atmosphere tint */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: blueAdv > 6
              ? `radial-gradient(ellipse 50% 100% at 12% 50%, rgba(30,111,255,${Math.min(0.18, blueAdv / 320)}) 0%, transparent 65%)`
              : blueAdv < -6
              ? `radial-gradient(ellipse 50% 100% at 88% 50%, rgba(232,53,53,${Math.min(0.18, Math.abs(blueAdv) / 320)}) 0%, transparent 65%)`
              : 'none',
          }}
        />

        {/* ── SVG overlay — same coordinate space as the image (699×314) ── */}
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Clip paths for hero portraits */}
            {(Object.entries(BLUE_MAP) as [LaneKey, [number,number]][]).map(([lane, [x,y]]) => (
              <clipPath key={`cbm-${lane}`} id={`cbm-${lane}`}>
                <circle cx={x} cy={y} r={18} />
              </clipPath>
            ))}
            {(Object.entries(RED_MAP) as [LaneKey, [number,number]][]).map(([lane, [x,y]]) => (
              <clipPath key={`crm-${lane}`} id={`crm-${lane}`}>
                <circle cx={x} cy={y} r={18} />
              </clipPath>
            ))}
            {/* Node glow filter */}
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Synergy lines ── */}
          {synLines.map((sl, i) => (
            <line key={i}
              x1={sl.x1} y1={sl.y1} x2={sl.x2} y2={sl.y2}
              stroke={sl.team === 'blue'
                ? `rgba(30,111,255,${sl.strength * 0.55})`
                : `rgba(232,53,53,${sl.strength * 0.55})`
              }
              strokeWidth={1 + sl.strength * 2.2}
              strokeDasharray={sl.strength < 0.55 ? '5,6' : undefined}
              strokeLinecap="round"
            />
          ))}

          {/* ── Blue hero nodes ── */}
          {(Object.keys(BLUE_MAP) as LaneKey[]).map((lane) => {
            const hero = blueAssign[lane];
            const [x, y] = BLUE_MAP[lane];
            return hero
              ? <MapHeroNode key={`bm-${lane}`} hero={hero} x={x} y={y} team="blue" lane={lane} clipId={`cbm-${lane}`} />
              : <MapEmptyNode key={`bme-${lane}`} x={x} y={y} team="blue" lane={lane} />;
          })}

          {/* ── Red hero nodes ── */}
          {(Object.keys(RED_MAP) as LaneKey[]).map((lane) => {
            const hero = redAssign[lane];
            const [x, y] = RED_MAP[lane];
            return hero
              ? <MapHeroNode key={`rm-${lane}`} hero={hero} x={x} y={y} team="red" lane={lane} clipId={`crm-${lane}`} />
              : <MapEmptyNode key={`rme-${lane}`} x={x} y={y} team="red" lane={lane} />;
          })}
        </svg>
      </div>

      {/* ── Win probability bar — below the map ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'rgba(4,6,14,0.95)', borderTop: '1px solid rgba(40,60,100,0.4)' }}
      >
        <span className="text-[11px] font-black text-blue-400 tabular-nums">🔵 {winProbability.toFixed(0)}%</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(30,30,50,0.8)' }}>
          <div
            className="h-full transition-all duration-700 rounded-l-full"
            style={{ width: `${winProbability}%`, background: 'linear-gradient(to right, #1e4fff, #3b82f6)' }}
          />
          <div
            className="absolute inset-y-0 rounded-r-full transition-all duration-700"
            style={{ left: `${winProbability}%`, right: 0, background: 'linear-gradient(to right, #ef444490, #e83535)' }}
          />
          <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: '50%' }} />
        </div>
        <span className="text-[11px] font-black text-red-400 tabular-nums">{(100 - winProbability).toFixed(0)}% 🔴</span>
      </div>
    </div>
  );
}

// ─── Map hero/empty nodes ─────────────────────────────────────────────────────

function MapHeroNode({
  hero, x, y, team, lane, clipId,
}: { hero: HeroData; x: number; y: number; team: 'blue'|'red'; lane: LaneKey; clipId: string }) {
  const [imgErr, setImgErr] = useState(false);
  const rgb = team === 'blue' ? '30,111,255' : '232,53,53';
  const lc  = LANE_CFG[lane];

  return (
    <g>
      {/* Glow ring */}
      <circle cx={x} cy={y} r={21}
        fill={`rgba(${rgb},0.10)`}
        stroke={`rgba(${rgb},0.45)`}
        strokeWidth="1.5"
      />
      {/* Portrait */}
      {hero.image && !imgErr ? (
        <image
          href={hero.image}
          x={x - 17} y={y - 17} width={34} height={34}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          onError={() => setImgErr(true)}
        />
      ) : (
        <circle cx={x} cy={y} r={17}
          fill={`rgba(${rgb},0.25)`} />
      )}
      {/* Portrait border */}
      <circle cx={x} cy={y} r={17}
        fill="none"
        stroke={`rgba(${rgb},0.75)`}
        strokeWidth="1.5"
      />
      {/* Lane icon badge */}
      <circle cx={x + 13} cy={y + 13} r={7}
        fill={lc.color}
        style={{ filter: `drop-shadow(0 0 3px ${lc.color})` }}
      />
      <text x={x + 13} y={y + 17} textAnchor="middle" fontSize="7">{lc.icon}</text>
    </g>
  );
}

function MapEmptyNode({ x, y, team, lane }: { x:number; y:number; team:'blue'|'red'; lane:LaneKey }) {
  const rgb = team === 'blue' ? '30,111,255' : '232,53,53';
  const lc  = LANE_CFG[lane];
  return (
    <g>
      <circle cx={x} cy={y} r={17}
        fill={`rgba(${rgb},0.04)`}
        stroke={`rgba(${rgb},0.18)`}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <text x={x} y={y + 3} textAnchor="middle" fontSize="9" fill={lc.color}>{lc.icon}</text>
    </g>
  );
}

// ─── Synergy line builder ─────────────────────────────────────────────────────

interface SynLine { x1:number; y1:number; x2:number; y2:number; strength:number; team:'blue'|'red'; }

function buildSynLines(
  assign: Partial<Record<LaneKey, HeroData>>,
  pos: Record<LaneKey, [number, number]>,
  team: 'blue' | 'red',
): SynLine[] {
  const entries = Object.entries(assign) as [LaneKey, HeroData][];
  const lines: SynLine[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const syn = heroSynergy(entries[i][1], entries[j][1]);
      if (syn < 0.28) continue;
      const [x1, y1] = pos[entries[i][0]];
      const [x2, y2] = pos[entries[j][0]];
      lines.push({ x1, y1, x2, y2, strength: syn, team });
    }
  }
  return lines;
}
