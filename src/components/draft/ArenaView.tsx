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

  // SVG viewBox — isometric map coordinate space
  const W = 800;
  const H = 460;
  const blueAdv = winProbability - 50;

  return (
    <div
      className="w-full rounded-xl overflow-hidden flex-shrink-0"
      style={{ border: '1px solid rgba(30,60,110,0.5)', background: '#04080f' }}
    >
      {/* ── Isometric SVG Map ── */}
      <div className="relative w-full" style={{ paddingBottom: `${(H / W) * 100}%` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Terrain gradient fills */}
            <linearGradient id="grass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#1a3d1a" />
              <stop offset="40%"  stopColor="#1f4a1a" />
              <stop offset="100%" stopColor="#152f14" />
            </linearGradient>
            <linearGradient id="path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#5c4a2a" />
              <stop offset="100%" stopColor="#4a3820" />
            </linearGradient>
            <radialGradient id="blue-base-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(30,111,255,0.6)" />
              <stop offset="100%" stopColor="rgba(10,40,120,0.2)" />
            </radialGradient>
            <radialGradient id="red-base-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(232,53,53,0.6)" />
              <stop offset="100%" stopColor="rgba(100,15,15,0.2)" />
            </radialGradient>
            <radialGradient id="jungle-blue-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(40,180,200,0.35)" />
              <stop offset="100%" stopColor="rgba(20,80,100,0.1)" />
            </radialGradient>
            <radialGradient id="jungle-red-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(200,100,40,0.35)" />
              <stop offset="100%" stopColor="rgba(100,40,10,0.1)" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="iso-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Hero portrait clips */}
            {(Object.entries(BLUE_MAP) as [LaneKey,[number,number]][]).map(([l,[x,y]])=>(
              <clipPath key={`iso-cb-${l}`} id={`iso-cb-${l}`}><circle cx={x} cy={y} r={19}/></clipPath>
            ))}
            {(Object.entries(RED_MAP) as [LaneKey,[number,number]][]).map(([l,[x,y]])=>(
              <clipPath key={`iso-cr-${l}`} id={`iso-cr-${l}`}><circle cx={x} cy={y} r={19}/></clipPath>
            ))}
          </defs>

          {/* ── Sky / outer background ── */}
          <rect width={W} height={H} fill="#04080f" />

          {/* ── Outer border / walls (isometric perspective trapezoidal shape) ── */}
          {/* Main map boundary — slightly tilted rectangle to suggest perspective */}
          <polygon
            points="55,28 745,28 745,432 55,432"
            fill="#0c1824"
            stroke="#1e3a5a"
            strokeWidth="2"
          />

          {/* ── Terrain — grass base ── */}
          <polygon
            points="80,52 720,52 720,408 80,408"
            fill="url(#grass-grad)"
          />

          {/* Grass texture overlay (subtle) */}
          {[...Array(18)].map((_,i) => (
            <line key={`gt-${i}`}
              x1={80 + i * 36} y1={52} x2={80 + i * 36} y2={408}
              stroke="rgba(255,255,255,0.014)" strokeWidth="1"
            />
          ))}
          {[...Array(10)].map((_,i) => (
            <line key={`gth-${i}`}
              x1={80} y1={52 + i * 36} x2={720} y2={52 + i * 36}
              stroke="rgba(255,255,255,0.014)" strokeWidth="1"
            />
          ))}

          {/* ── Stone wall border (inner) ── */}
          <polygon
            points="80,52 720,52 720,408 80,408"
            fill="none"
            stroke="#3a2e18"
            strokeWidth="8"
          />
          <polygon
            points="80,52 720,52 720,408 80,408"
            fill="none"
            stroke="#5c4a28"
            strokeWidth="2"
          />

          {/* ── Wall corner ornaments ── */}
          {[[80,52],[720,52],[720,408],[80,408]].map(([cx,cy],i) => (
            <g key={`corner-${i}`}>
              <rect x={cx-12} y={cy-12} width={24} height={24} rx={3}
                fill="#2a2010" stroke="#6b5530" strokeWidth="1.5" />
              <rect x={cx-6} y={cy-6} width={12} height={12} rx={1}
                fill="#3d3018" stroke="#8a6e3a" strokeWidth="1" />
            </g>
          ))}

          {/* ── LANES (stone paths) ── */}

          {/* Top lane — along top edge */}
          <path d="M 80,52 L 80,230 Q 80,260 110,275 L 400,275 Q 430,275 430,245 L 430,52"
            fill="none" stroke="rgba(92,74,42,0.5)" strokeWidth="28" />
          <path d="M 80,52 L 80,230 Q 80,260 110,275 L 400,275 Q 430,275 430,245 L 430,52"
            fill="none" stroke="#6b5530" strokeWidth="16" />
          <path d="M 80,52 L 80,230 Q 80,260 110,275 L 400,275 Q 430,275 430,245 L 430,52"
            fill="none" stroke="#7a6238" strokeWidth="10" />
          <path d="M 80,52 L 80,230 Q 80,260 110,275 L 400,275 Q 430,275 430,245 L 430,52"
            fill="none" stroke="rgba(180,150,80,0.15)" strokeWidth="4" />

          {/* Bottom lane — along bottom edge */}
          <path d="M 720,408 L 720,230 Q 720,200 690,185 L 400,185 Q 370,185 370,215 L 370,408"
            fill="none" stroke="rgba(92,74,42,0.5)" strokeWidth="28" />
          <path d="M 720,408 L 720,230 Q 720,200 690,185 L 400,185 Q 370,185 370,215 L 370,408"
            fill="none" stroke="#6b5530" strokeWidth="16" />
          <path d="M 720,408 L 720,230 Q 720,200 690,185 L 400,185 Q 370,185 370,215 L 370,408"
            fill="none" stroke="#7a6238" strokeWidth="10" />
          <path d="M 720,408 L 720,230 Q 720,200 690,185 L 400,185 Q 370,185 370,215 L 370,408"
            fill="none" stroke="rgba(180,150,80,0.15)" strokeWidth="4" />

          {/* Mid lane — diagonal */}
          <line x1="80" y1="408" x2="720" y2="52"
            stroke="rgba(92,74,42,0.5)" strokeWidth="28" />
          <line x1="80" y1="408" x2="720" y2="52"
            stroke="#6b5530" strokeWidth="16" />
          <line x1="80" y1="408" x2="720" y2="52"
            stroke="#7a6238" strokeWidth="10" />
          <line x1="80" y1="408" x2="720" y2="52"
            stroke="rgba(180,150,80,0.15)" strokeWidth="4" />

          {/* ── River (diagonal water strip) ── */}
          <line x1="340" y1="52" x2="460" y2="408"
            stroke="rgba(20,80,160,0.18)" strokeWidth="22" />
          <line x1="340" y1="52" x2="460" y2="408"
            stroke="rgba(40,120,220,0.12)" strokeWidth="10" />

          {/* ── Jungle areas ── */}
          {/* Blue jungle (upper-left) */}
          <ellipse cx="195" cy="195" rx="72" ry="55"
            fill="rgba(8,30,18,0.7)" stroke="rgba(30,90,50,0.4)" strokeWidth="1.5" />
          <circle cx="195" cy="195" r="20"
            fill="url(#jungle-blue-grad)" filter="url(#soft-glow)" />
          <text x="195" y="199" textAnchor="middle" fontSize="16">🌀</text>
          {/* Camp rock decorations */}
          {[[168,178],[218,175],[185,215],[210,210]].map(([rx,ry],i)=>(
            <ellipse key={`bjc-${i}`} cx={rx} cy={ry} rx={9} ry={6}
              fill="#1a2a14" stroke="#2a4020" strokeWidth="1" />
          ))}

          {/* Red jungle (lower-right) */}
          <ellipse cx="605" cy="265" rx="72" ry="55"
            fill="rgba(25,10,8,0.7)" stroke="rgba(90,30,20,0.4)" strokeWidth="1.5" />
          <circle cx="605" cy="265" r="20"
            fill="url(#jungle-red-grad)" filter="url(#soft-glow)" />
          <text x="605" y="269" textAnchor="middle" fontSize="16">🔥</text>
          {[[578,248],[628,245],[595,285],[620,280]].map(([rx,ry],i)=>(
            <ellipse key={`rjc-${i}`} cx={rx} cy={ry} rx={9} ry={6}
              fill="#2a1408" stroke="#3a2010" strokeWidth="1" />
          ))}

          {/* ── Rock/bush decorations scattered on terrain ── */}
          {[
            [160,110],[240,340],[480,90],[560,360],
            [310,150],[490,320],[150,300],[640,160],
          ].map(([rx,ry],i)=>(
            <ellipse key={`rock-${i}`} cx={rx} cy={ry} rx={12} ry={8}
              fill="rgba(40,35,20,0.6)" stroke="rgba(60,50,28,0.4)" strokeWidth="1" />
          ))}

          {/* ── Bases ── */}
          {/* Blue base (bottom-left) */}
          <polygon points="80,408 140,408 140,348 80,348"
            fill="rgba(5,15,40,0.85)" stroke="rgba(30,111,255,0.4)" strokeWidth="1.5" />
          <circle cx="110" cy="378" r="26"
            fill="url(#blue-base-grad)" filter="url(#iso-glow)" />
          <circle cx="110" cy="378" r="18"
            fill="rgba(10,30,100,0.9)" stroke="rgba(60,160,255,0.7)" strokeWidth="2" />
          <text x="110" y="384" textAnchor="middle" fontSize="14">🔵</text>

          {/* Red base (top-right) */}
          <polygon points="660,52 720,52 720,112 660,112"
            fill="rgba(40,5,5,0.85)" stroke="rgba(232,53,53,0.4)" strokeWidth="1.5" />
          <circle cx="690" cy="82" r="26"
            fill="url(#red-base-grad)" filter="url(#iso-glow)" />
          <circle cx="690" cy="82" r="18"
            fill="rgba(80,10,10,0.9)" stroke="rgba(255,80,80,0.7)" strokeWidth="2" />
          <text x="690" y="88" textAnchor="middle" fontSize="14">🔴</text>

          {/* ── Towers on lanes ── */}
          {[
            // Blue towers
            [108, 290], [108, 330],
            [145, 260], [178, 260],
            // Red towers
            [692, 170], [692, 210],
            [622, 200], [655, 200],
          ].map(([tx,ty],i) => (
            <g key={`tower-${i}`}>
              <rect x={tx-5} y={ty-5} width={10} height={10} rx={2}
                fill={i < 4 ? 'rgba(30,80,200,0.6)' : 'rgba(200,40,40,0.6)'}
                stroke={i < 4 ? 'rgba(80,160,255,0.5)' : 'rgba(255,80,80,0.5)'}
                strokeWidth="1" />
            </g>
          ))}

          {/* ── Win-prob atmosphere overlay ── */}
          {blueAdv > 6 && (
            <rect width={W} height={H}
              fill={`rgba(30,111,255,${Math.min(0.08, blueAdv/580)})`} />
          )}
          {blueAdv < -6 && (
            <rect width={W} height={H}
              fill={`rgba(232,53,53,${Math.min(0.08, Math.abs(blueAdv)/580)})`} />
          )}

          {/* ── Synergy lines ── */}
          {synLines.map((sl, i) => (
            <line key={i}
              x1={sl.x1} y1={sl.y1} x2={sl.x2} y2={sl.y2}
              stroke={sl.team === 'blue'
                ? `rgba(60,140,255,${sl.strength * 0.6})`
                : `rgba(255,80,80,${sl.strength * 0.6})`}
              strokeWidth={1.2 + sl.strength * 2.4}
              strokeDasharray={sl.strength < 0.55 ? '6,7' : undefined}
              strokeLinecap="round"
              filter="url(#iso-glow)"
            />
          ))}

          {/* ── Hero nodes — Blue ── */}
          {(Object.keys(BLUE_MAP) as LaneKey[]).map((lane) => {
            const hero = blueAssign[lane];
            const [x, y] = BLUE_MAP[lane];
            return hero
              ? <MapHeroNode key={`bm-${lane}`} hero={hero} x={x} y={y} team="blue" lane={lane} clipId={`iso-cb-${lane}`} />
              : <MapEmptyNode key={`bme-${lane}`} x={x} y={y} team="blue" lane={lane} />;
          })}

          {/* ── Hero nodes — Red ── */}
          {(Object.keys(RED_MAP) as LaneKey[]).map((lane) => {
            const hero = redAssign[lane];
            const [x, y] = RED_MAP[lane];
            return hero
              ? <MapHeroNode key={`rm-${lane}`} hero={hero} x={x} y={y} team="red" lane={lane} clipId={`iso-cr-${lane}`} />
              : <MapEmptyNode key={`rme-${lane}`} x={x} y={y} team="red" lane={lane} />;
          })}

          {/* ── Lane labels ── */}
          <text x="135" y="150" textAnchor="middle" fontSize="9"
            fill="rgba(255,255,255,0.22)" fontFamily="monospace" letterSpacing="1.5" transform="rotate(-45,135,150)">
            TOP LANE
          </text>
          <text x="400" y="235" textAnchor="middle" fontSize="9"
            fill="rgba(255,255,255,0.22)" fontFamily="monospace" letterSpacing="1.5">
            MID
          </text>
          <text x="665" y="320" textAnchor="middle" fontSize="9"
            fill="rgba(255,255,255,0.22)" fontFamily="monospace" letterSpacing="1.5" transform="rotate(-45,665,320)">
            BOT LANE
          </text>
        </svg>
      </div>

      {/* ── Win probability bar ── */}
      <div className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'rgba(4,6,14,0.97)', borderTop: '1px solid rgba(30,50,90,0.5)' }}>
        <span className="text-[11px] font-black text-blue-400 tabular-nums">🔵 {winProbability.toFixed(0)}%</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(20,25,45,0.9)' }}>
          <div className="h-full transition-all duration-700 rounded-l-full"
            style={{ width: `${winProbability}%`, background: 'linear-gradient(to right,#1e4fff,#3b82f6)' }} />
          <div className="absolute inset-y-0 rounded-r-full transition-all duration-700"
            style={{ left: `${winProbability}%`, right: 0, background: 'linear-gradient(to right,#ef444490,#e83535)' }} />
          <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: '50%' }} />
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
