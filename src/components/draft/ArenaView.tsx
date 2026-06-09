'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { HeroData } from '@/types/draft';
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

// ─── Mini-map positions  ──────────────────────────────────────────────────────
// SVG viewBox 0 0 800 400.
// Top lane:  L-shape hugging LEFT wall (x=100) then TOP wall (y=50)
// Bot lane:  L-shape hugging BOTTOM wall (y=370) then RIGHT wall (x=700)
// Mid lane:  diagonal from (100,375) to (700,50)
// Blue base: bottom-left  ·  Red base: top-right

const BLUE_MAP: Record<LaneKey, [number, number]> = {
  EXP:    [100, 190],   // left wall, upper portion (top lane - blue side)
  Jungle: [215, 205],   // blue jungle camp (upper-left quadrant)
  Mid:    [253, 296],   // diagonal mid, blue half
  Gold:   [255, 370],   // bottom wall, left portion (bot lane - blue side)
  Roam:   [168, 348],   // near gold lane / support position
};
const RED_MAP: Record<LaneKey, [number, number]> = {
  Gold:   [545,  50],   // top wall, right portion (top lane - red side)
  Jungle: [572, 220],   // red jungle camp (lower-right quadrant)
  Mid:    [548, 158],   // diagonal mid, red half
  EXP:    [700, 262],   // right wall, lower portion (bot lane - red side)
  Roam:   [638,  88],   // near red gold / support position
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
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed"
          style={{ borderColor: lc.color, background: lc.bg }}
        >
          <span className="text-base">{lc.icon}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: lc.color }}>
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
    <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0 grayscale opacity-55" title={hero.name}>
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

// SVG coordinate space: 800 × 400
// Map play area: x 80–720, y 30–390
// Lanes:
//   Top lane  (EXP blue / Gold red): L-shape along LEFT wall (x=100) + TOP wall (y=50)
//   Bot lane  (Gold blue / EXP red): L-shape along BOTTOM wall (y=370) + RIGHT wall (x=700)
//   Mid lane: diagonal (80,385) → (720,40)
// Bases:
//   Blue: bottom-left ~(80,320)–(150,390)
//   Red:  top-right   ~(650,30)–(720,100)

const W = 800;
const H = 400;

export function ArenaMiniMap({ bluePicks, redPicks, winProbability }: MiniMapProps) {
  const blueAssign = useMemo(() => assignHeroesToLanes(bluePicks), [bluePicks]);
  const redAssign  = useMemo(() => assignHeroesToLanes(redPicks),  [redPicks]);
  const synLines   = useMemo(() => [
    ...buildSynLines(blueAssign, BLUE_MAP, 'blue'),
    ...buildSynLines(redAssign,  RED_MAP,  'red'),
  ], [blueAssign, redAssign]);

  const blueAdv = winProbability - 50;

  return (
    <div
      className="w-full rounded-xl overflow-hidden flex-shrink-0"
      style={{ border: '1px solid rgba(30,60,110,0.45)', background: '#040810' }}
    >
      {/* ── Fixed-height map container ── */}
      <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Terrain gradients */}
            <linearGradient id="map-terrain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#162b16" />
              <stop offset="50%"  stopColor="#1c3618" />
              <stop offset="100%" stopColor="#122412" />
            </linearGradient>
            <linearGradient id="map-lane" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#5a4520" />
              <stop offset="100%" stopColor="#6e5528" />
            </linearGradient>

            {/* Base gradients */}
            <radialGradient id="blue-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(30,111,255,0.75)" />
              <stop offset="60%"  stopColor="rgba(15,60,180,0.45)" />
              <stop offset="100%" stopColor="rgba(5,20,80,0.0)" />
            </radialGradient>
            <radialGradient id="red-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(232,53,53,0.75)" />
              <stop offset="60%"  stopColor="rgba(160,20,20,0.45)" />
              <stop offset="100%" stopColor="rgba(60,5,5,0.0)" />
            </radialGradient>

            {/* Jungle camp glows */}
            <radialGradient id="jg-blue-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(32,196,220,0.55)" />
              <stop offset="100%" stopColor="rgba(10,80,120,0.0)" />
            </radialGradient>
            <radialGradient id="jg-red-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(255,140,30,0.55)" />
              <stop offset="100%" stopColor="rgba(120,40,0,0.0)" />
            </radialGradient>

            {/* Glow filters */}
            <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Portrait clip circles — Blue heroes */}
            {(Object.entries(BLUE_MAP) as [LaneKey,[number,number]][]).map(([l,[x,y]])=>(
              <clipPath key={`cb-${l}`} id={`cb-${l}`}><circle cx={x} cy={y} r={17}/></clipPath>
            ))}
            {/* Portrait clip circles — Red heroes */}
            {(Object.entries(RED_MAP) as [LaneKey,[number,number]][]).map(([l,[x,y]])=>(
              <clipPath key={`cr-${l}`} id={`cr-${l}`}><circle cx={x} cy={y} r={17}/></clipPath>
            ))}
          </defs>

          {/* ── Background ── */}
          <rect width={W} height={H} fill="#030608" />

          {/* ── Outer border — map wall ── */}
          <rect x={75} y={28} width={650} height={344}
            rx={4} fill="#0a1020"
            stroke="#1e3050" strokeWidth="2"
          />

          {/* ── Terrain fill ── */}
          <rect x={82} y={35} width={636} height={330}
            fill="url(#map-terrain)"
          />

          {/* ── Subtle grid overlay ── */}
          {[...Array(13)].map((_,i) => (
            <line key={`gv-${i}`}
              x1={82 + i * 53} y1={35} x2={82 + i * 53} y2={365}
              stroke="rgba(255,255,255,0.012)" strokeWidth="1"
            />
          ))}
          {[...Array(7)].map((_,i) => (
            <line key={`gh-${i}`}
              x1={82} y1={35 + i * 55} x2={718} y2={35 + i * 55}
              stroke="rgba(255,255,255,0.012)" strokeWidth="1"
            />
          ))}

          {/* ══ LANES ══ */}

          {/* ── Top lane: LEFT wall (x≈100) + TOP wall (y≈50)  ── */}
          {/* Shadow */}
          <path d="M 100,385 L 100,50 L 720,50"
            fill="none" stroke="rgba(40,28,10,0.7)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
          {/* Stone surface */}
          <path d="M 100,385 L 100,50 L 720,50"
            fill="none" stroke="#5a4520" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          {/* Lighter center */}
          <path d="M 100,385 L 100,50 L 720,50"
            fill="none" stroke="#7a6030" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          {/* Center highlight */}
          <path d="M 100,385 L 100,50 L 720,50"
            fill="none" stroke="rgba(200,165,90,0.18)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* ── Bot lane: BOTTOM wall (y≈370) + RIGHT wall (x≈700) ── */}
          <path d="M 80,370 L 700,370 L 700,50"
            fill="none" stroke="rgba(40,28,10,0.7)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 80,370 L 700,370 L 700,50"
            fill="none" stroke="#5a4520" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 80,370 L 700,370 L 700,50"
            fill="none" stroke="#7a6030" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 80,370 L 700,370 L 700,50"
            fill="none" stroke="rgba(200,165,90,0.18)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* ── Mid lane: diagonal ── */}
          <line x1="100" y1="380" x2="700" y2="45"
            stroke="rgba(40,28,10,0.7)" strokeWidth="28" strokeLinecap="round" />
          <line x1="100" y1="380" x2="700" y2="45"
            stroke="#5a4520" strokeWidth="18" strokeLinecap="round" />
          <line x1="100" y1="380" x2="700" y2="45"
            stroke="#7a6030" strokeWidth="10" strokeLinecap="round" />
          <line x1="100" y1="380" x2="700" y2="45"
            stroke="rgba(200,165,90,0.18)" strokeWidth="3" strokeLinecap="round" />

          {/* ── River (diagonal strip, perpendicular to mid) ── */}
          <line x1="330" y1="28" x2="470" y2="372"
            stroke="rgba(10,70,180,0.22)" strokeWidth="24" strokeLinecap="round" />
          <line x1="330" y1="28" x2="470" y2="372"
            stroke="rgba(30,120,255,0.10)" strokeWidth="12" strokeLinecap="round" />
          <line x1="330" y1="28" x2="470" y2="372"
            stroke="rgba(80,160,255,0.07)" strokeWidth="4" strokeLinecap="round" />

          {/* ── Jungle areas ── */}

          {/* Blue jungle — upper-left quadrant */}
          <ellipse cx="215" cy="208" rx="68" ry="50"
            fill="rgba(5,22,14,0.75)" stroke="rgba(20,80,45,0.5)" strokeWidth="1.5" />
          <circle cx="215" cy="208" r="28"
            fill="url(#jg-blue-glow)" filter="url(#glow-lg)" />
          {/* Blue camp rocks */}
          {[[190,195],[238,192],[202,225],[232,220]].map(([rx,ry],i)=>(
            <ellipse key={`bjr-${i}`} cx={rx} cy={ry} rx={8} ry={5}
              fill="#12251a" stroke="#1e4028" strokeWidth="1" />
          ))}
          {/* Blue buff icon */}
          <circle cx="215" cy="208" r="11"
            fill="rgba(20,180,210,0.3)" stroke="rgba(30,200,240,0.6)" strokeWidth="1.5" />
          <text x="215" y="213" textAnchor="middle" fontSize="10">🌀</text>

          {/* Red jungle — lower-right quadrant */}
          <ellipse cx="578" cy="222" rx="68" ry="50"
            fill="rgba(22,8,5,0.75)" stroke="rgba(80,25,15,0.5)" strokeWidth="1.5" />
          <circle cx="578" cy="222" r="28"
            fill="url(#jg-red-glow)" filter="url(#glow-lg)" />
          {[[554,208],[600,205],[566,240],[594,236]].map(([rx,ry],i)=>(
            <ellipse key={`rjr-${i}`} cx={rx} cy={ry} rx={8} ry={5}
              fill="#251212" stroke="#402018" strokeWidth="1" />
          ))}
          <circle cx="578" cy="222" r="11"
            fill="rgba(220,100,20,0.3)" stroke="rgba(255,140,30,0.6)" strokeWidth="1.5" />
          <text x="578" y="227" textAnchor="middle" fontSize="10">🔥</text>

          {/* ── Decorative bushes / rocks on terrain ── */}
          {[
            [155,115,10,6],[300,160,8,5],[490,245,10,6],[620,318,9,5],
            [165,285,8,5],[340,320,10,6],[455,115,9,5],[620,145,8,5],
          ].map(([cx,cy,rx,ry],i)=>(
            <ellipse key={`bush-${i}`} cx={cx} cy={cy} rx={rx} ry={ry}
              fill="rgba(15,35,18,0.8)" stroke="rgba(22,50,25,0.5)" strokeWidth="1" />
          ))}

          {/* ══ BASES ══ */}

          {/* Blue base — bottom-left */}
          <circle cx="100" cy="365" r="38"
            fill="url(#blue-base)" filter="url(#glow-lg)" />
          <polygon points="80,340 140,340 140,390 80,390"
            fill="rgba(5,15,45,0.88)" stroke="rgba(30,111,255,0.5)" strokeWidth="1.5" rx={3} />
          <circle cx="110" cy="365" r="22"
            fill="rgba(8,25,90,0.9)" stroke="rgba(60,150,255,0.8)" strokeWidth="2" />
          <circle cx="110" cy="365" r="14"
            fill="rgba(15,50,170,0.7)" stroke="rgba(100,180,255,0.6)" strokeWidth="1.5" />
          <text x="110" y="370" textAnchor="middle" fontSize="10" fill="rgba(120,180,255,0.9)" fontFamily="monospace" fontWeight="bold">B</text>

          {/* Red base — top-right */}
          <circle cx="698" cy="60" r="38"
            fill="url(#red-base)" filter="url(#glow-lg)" />
          <polygon points="658,35 718,35 718,85 658,85"
            fill="rgba(45,5,5,0.88)" stroke="rgba(232,53,53,0.5)" strokeWidth="1.5" rx={3} />
          <circle cx="688" cy="60" r="22"
            fill="rgba(80,10,10,0.9)" stroke="rgba(255,80,80,0.8)" strokeWidth="2" />
          <circle cx="688" cy="60" r="14"
            fill="rgba(160,20,20,0.7)" stroke="rgba(255,120,120,0.6)" strokeWidth="1.5" />
          <text x="688" y="65" textAnchor="middle" fontSize="10" fill="rgba(255,140,140,0.9)" fontFamily="monospace" fontWeight="bold">R</text>

          {/* ── Towers on lanes ── */}
          {[
            // Blue towers (top lane - left wall)
            [100, 148, 'blue'], [100, 265, 'blue'],
            // Blue towers (bot lane - bottom wall)
            [200, 370, 'blue'], [350, 370, 'blue'],
            // Red towers (top lane - top wall)
            [450, 50, 'red'], [580, 50, 'red'],
            // Red towers (bot lane - right wall)
            [700, 165, 'red'], [700, 290, 'red'],
          ].map(([tx,ty,team],i) => (
            <g key={`tw-${i}`}>
              <rect x={Number(tx)-5} y={Number(ty)-5} width={10} height={10} rx={2}
                fill={team === 'blue' ? 'rgba(20,70,200,0.7)' : 'rgba(200,30,30,0.7)'}
                stroke={team === 'blue' ? 'rgba(70,150,255,0.65)' : 'rgba(255,80,80,0.65)'}
                strokeWidth="1.2"
              />
              <rect x={Number(tx)-2} y={Number(ty)-2} width={4} height={4}
                fill={team === 'blue' ? 'rgba(100,180,255,0.8)' : 'rgba(255,140,140,0.8)'}
              />
            </g>
          ))}

          {/* ── Win-probability atmosphere overlay ── */}
          {blueAdv > 8 && (
            <rect x={82} y={35} width={636} height={330}
              fill={`rgba(30,111,255,${Math.min(0.07, blueAdv / 600)})`}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {blueAdv < -8 && (
            <rect x={82} y={35} width={636} height={330}
              fill={`rgba(232,53,53,${Math.min(0.07, Math.abs(blueAdv) / 600)})`}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* ── Synergy lines ── */}
          {synLines.map((sl, i) => (
            <line key={i}
              x1={sl.x1} y1={sl.y1} x2={sl.x2} y2={sl.y2}
              stroke={sl.team === 'blue'
                ? `rgba(50,130,255,${sl.strength * 0.55})`
                : `rgba(255,70,70,${sl.strength * 0.55})`}
              strokeWidth={1 + sl.strength * 2.2}
              strokeDasharray={sl.strength < 0.55 ? '5,6' : undefined}
              strokeLinecap="round"
              filter="url(#glow-sm)"
            />
          ))}

          {/* ── Hero nodes — Blue ── */}
          {(Object.keys(BLUE_MAP) as LaneKey[]).map((lane) => {
            const hero = blueAssign[lane];
            const [x, y] = BLUE_MAP[lane];
            return hero
              ? <MapHeroNode key={`bm-${lane}`} hero={hero} x={x} y={y} team="blue" lane={lane} clipId={`cb-${lane}`} />
              : <MapEmptyNode key={`bme-${lane}`} x={x} y={y} team="blue" lane={lane} />;
          })}

          {/* ── Hero nodes — Red ── */}
          {(Object.keys(RED_MAP) as LaneKey[]).map((lane) => {
            const hero = redAssign[lane];
            const [x, y] = RED_MAP[lane];
            return hero
              ? <MapHeroNode key={`rm-${lane}`} hero={hero} x={x} y={y} team="red" lane={lane} clipId={`cr-${lane}`} />
              : <MapEmptyNode key={`rme-${lane}`} x={x} y={y} team="red" lane={lane} />;
          })}

          {/* ── Lane labels (subtle watermarks) ── */}
          <text x="100" y="147" textAnchor="middle" fontSize="7.5"
            fill="rgba(255,255,255,0.18)" fontFamily="monospace" letterSpacing="1" transform="rotate(-90,100,147)">
            TOP
          </text>
          <text x="390" y="218" textAnchor="middle" fontSize="7.5"
            fill="rgba(255,255,255,0.18)" fontFamily="monospace" letterSpacing="1" transform="rotate(-33,390,218)">
            MID
          </text>
          <text x="400" y="371" textAnchor="middle" fontSize="7.5"
            fill="rgba(255,255,255,0.18)" fontFamily="monospace" letterSpacing="1">
            BOT
          </text>
        </svg>
      </div>

      {/* ── Win probability bar ── */}
      <div className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'rgba(3,5,12,0.97)', borderTop: '1px solid rgba(25,45,85,0.6)' }}
      >
        <span className="text-[11px] font-black text-blue-400 tabular-nums w-10 shrink-0">
          🔵 {winProbability.toFixed(0)}%
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden relative" style={{ background: 'rgba(15,20,40,0.9)' }}>
          <div className="h-full transition-all duration-700 rounded-l-full"
            style={{
              width: `${winProbability}%`,
              background: 'linear-gradient(to right, #1a3de0, #3b82f6)',
              boxShadow: '2px 0 8px rgba(59,130,246,0.5)',
            }}
          />
          <div className="absolute inset-y-0 rounded-r-full transition-all duration-700"
            style={{
              left: `${winProbability}%`,
              right: 0,
              background: 'linear-gradient(to right, rgba(232,53,53,0.6), #e83535)',
            }}
          />
          <div className="absolute inset-y-0 w-0.5 bg-white/20" style={{ left: '50%' }} />
        </div>
        <span className="text-[11px] font-black text-red-400 tabular-nums w-10 shrink-0 text-right">
          {(100 - winProbability).toFixed(0)}% 🔴
        </span>
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
      {/* Outer glow */}
      <circle cx={x} cy={y} r={23}
        fill={`rgba(${rgb},0.08)`}
        stroke={`rgba(${rgb},0.25)`}
        strokeWidth="1"
        filter="url(#glow-sm)"
      />
      {/* Portrait */}
      {hero.image && !imgErr ? (
        <image
          href={hero.image}
          x={x - 15} y={y - 15} width={30} height={30}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          onError={() => setImgErr(true)}
        />
      ) : (
        <circle cx={x} cy={y} r={15}
          fill={`rgba(${rgb},0.3)`} />
      )}
      {/* Portrait border ring */}
      <circle cx={x} cy={y} r={17}
        fill="none"
        stroke={`rgba(${rgb},0.85)`}
        strokeWidth="1.8"
      />
      {/* Lane icon badge */}
      <circle cx={x + 12} cy={y + 12} r={7}
        fill="#080c1a"
        stroke={lc.color}
        strokeWidth="1.2"
      />
      <text x={x + 12} y={y + 16} textAnchor="middle" fontSize="7">{lc.icon}</text>
    </g>
  );
}

function MapEmptyNode({ x, y, team, lane }: { x:number; y:number; team:'blue'|'red'; lane:LaneKey }) {
  const rgb = team === 'blue' ? '30,111,255' : '232,53,53';
  const lc  = LANE_CFG[lane];
  return (
    <g>
      <circle cx={x} cy={y} r={15}
        fill={`rgba(${rgb},0.04)`}
        stroke={`rgba(${rgb},0.22)`}
        strokeWidth="1.2"
        strokeDasharray="3,3"
      />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill={`rgba(${lc.color},0.7)`}>{lc.icon}</text>
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
