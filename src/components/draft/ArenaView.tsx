'use client';

import { useMemo, useState } from 'react';
import type { HeroData, DraftStep } from '@/types/draft';
import { getHeroArchetypeTags } from '@/data/tierList';

// ─── Types ────────────────────────────────────────────────────────────────────

type LaneKey = 'EXP' | 'Gold' | 'Jungle' | 'Mid' | 'Roam';

const LANE_LABEL: Record<LaneKey, string> = {
  EXP: 'EXP', Gold: 'Gold', Jungle: 'JG', Mid: 'Mid', Roam: 'Roam',
};
const LANE_ICON: Record<LaneKey, string> = {
  EXP: '⚡', Gold: '💰', Jungle: '🌿', Mid: '🔮', Roam: '🛡',
};

// ─── Map positions (SVG viewBox 0 0 700 500) ─────────────────────────────────
//
//  Blue base = bottom-left (90, 440)
//  Red  base = top-right   (610, 60)
//
//  Top lane    : curves along top edge  (Blue EXP ↔ Red Gold)
//  Mid lane    : diagonal straight line (Blue Mid ↔ Red Mid)
//  Bottom lane : curves along bottom    (Blue Gold ↔ Red EXP)

const BLUE_POS: Record<LaneKey, [number, number]> = {
  EXP:    [132, 192],   // top lane, blue side (left vertical portion)
  Jungle: [218, 308],   // blue jungle
  Mid:    [272, 318],   // mid lane, blue half
  Gold:   [228, 418],   // bottom lane, blue side
  Roam:   [180, 378],   // near gold lane
};

const RED_POS: Record<LaneKey, [number, number]> = {
  Gold:   [568, 178],   // top lane, red side (they mirror: gold goes top)
  Jungle: [482, 202],   // red jungle
  Mid:    [428, 192],   // mid lane, red half
  EXP:    [472, 372],   // bottom lane, red side
  Roam:   [518, 138],   // near red gold lane
};

// ─── Hero → lane mapping ──────────────────────────────────────────────────────

function heroToLane(hero: HeroData): LaneKey {
  const r = hero.roles;
  if (r.includes('Marksman')) return 'Gold';
  if (r.includes('Support'))  return 'Roam';
  if (r.includes('Tank'))     return 'Roam';
  if (r.includes('Mage'))     return 'Mid';
  if (r.includes('Assassin')) return 'Jungle';
  return 'EXP';
}

function assignHeroesToLanes(
  picks: (HeroData | null)[],
): Partial<Record<LaneKey, HeroData>> {
  const result: Partial<Record<LaneKey, HeroData>> = {};
  const ALL: LaneKey[] = ['EXP', 'Gold', 'Mid', 'Jungle', 'Roam'];
  for (const hero of picks) {
    if (!hero) continue;
    const preferred = heroToLane(hero);
    if (!result[preferred]) { result[preferred] = hero; continue; }
    for (const lane of ALL) {
      if (!result[lane]) { result[lane] = hero; break; }
    }
  }
  return result;
}

// ─── Synergy score between two heroes (0–1) ──────────────────────────────────

function heroSynergy(a: HeroData, b: HeroData): number {
  const tagsA = getHeroArchetypeTags(a.name);
  const tagsB = getHeroArchetypeTags(b.name);
  if (!tagsA.length || !tagsB.length) return 0.22;
  const shared     = tagsA.filter(t => tagsB.includes(t)).length;
  const roleDiv    = a.roles.filter(r => b.roles.includes(r)).length === 0 ? 1 : 0.4;
  const pairBoost  = (a.synergyPairs?.[b.id] ?? 0) + (b.synergyPairs?.[a.id] ?? 0);
  const base       = Math.max(0.05, 1 - shared / Math.max(tagsA.length, tagsB.length));
  return Math.min(0.95, base * 0.5 + roleDiv * 0.3 + Math.min(pairBoost / 20, 0.2));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArenaViewProps {
  bluePicks:       (HeroData | null)[];
  redPicks:        (HeroData | null)[];
  blueBans:        (HeroData | null)[];
  redBans:         (HeroData | null)[];
  winProbability:  number; // 0–100, 50 = balanced
  currentStep:     number;
  sequence:        DraftStep[];
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArenaView({
  bluePicks, redPicks,
  blueBans,  redBans,
  winProbability,
  currentStep, sequence,
}: ArenaViewProps) {
  const [hoveredHero, setHoveredHero] = useState<HeroData | null>(null);

  const blueAssign = useMemo(() => assignHeroesToLanes(bluePicks), [bluePicks]);
  const redAssign  = useMemo(() => assignHeroesToLanes(redPicks),  [redPicks]);

  // All pairwise synergy connections per team
  const blueSynLines = useMemo(() => buildSynLines(blueAssign, BLUE_POS), [blueAssign]);
  const redSynLines  = useMemo(() => buildSynLines(redAssign,  RED_POS),  [redAssign]);

  const isDone     = currentStep >= sequence.length;
  const activeStep = isDone ? null : sequence[currentStep];
  const blueAdv    = winProbability - 50; // positive = blue winning

  return (
    <div className="flex flex-col gap-2 h-full select-none">

      {/* ── Ban strip ── */}
      <div className="flex items-center gap-2 px-1">
        {/* Blue bans */}
        <div className="flex gap-1 flex-1">
          {blueBans.map((hero, i) => (
            <BanBadge key={i} hero={hero} team="blue" />
          ))}
        </div>
        {/* Center label */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
            {isDone ? '🏆 Draft terminé' : activeStep
              ? `${activeStep.action === 'ban' ? '🚫 Ban' : '⚔️ Pick'} — Équipe ${activeStep.team === 'blue' ? 'Bleue' : 'Rouge'}`
              : '—'
            }
          </span>
        </div>
        {/* Red bans */}
        <div className="flex gap-1 flex-1 justify-end">
          {redBans.map((hero, i) => (
            <BanBadge key={i} hero={hero} team="red" />
          ))}
        </div>
      </div>

      {/* ── Arena SVG map ── */}
      <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ minHeight: 260 }}>

        {/* Win-prob atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1500"
          style={{
            background: blueAdv > 6
              ? `radial-gradient(ellipse 55% 90% at 18% 50%, rgba(30,111,255,${Math.min(0.13, blueAdv / 380)}) 0%, transparent 70%)`
              : blueAdv < -6
              ? `radial-gradient(ellipse 55% 90% at 82% 50%, rgba(232,53,53,${Math.min(0.13, Math.abs(blueAdv) / 380)}) 0%, transparent 70%)`
              : 'none',
            zIndex: 10,
          }}
        />

        <svg
          viewBox="0 0 700 500"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <defs>
            {/* Glow filter */}
            <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-soft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Hero portrait clip paths */}
            {Object.entries(BLUE_POS).map(([lane, [x, y]]) => (
              <clipPath key={`clip-blue-${lane}`} id={`clip-blue-${lane}`}>
                <circle cx={x} cy={y} r={22} />
              </clipPath>
            ))}
            {Object.entries(RED_POS).map(([lane, [x, y]]) => (
              <clipPath key={`clip-red-${lane}`} id={`clip-red-${lane}`}>
                <circle cx={x} cy={y} r={22} />
              </clipPath>
            ))}
          </defs>

          {/* ── Map background ── */}
          <rect width="700" height="500" fill="rgba(6,8,16,1)" />

          {/* Subtle dot grid */}
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="0.8" fill="rgba(255,255,255,0.025)" />
          </pattern>
          <rect width="700" height="500" fill="url(#dots)" />

          {/* Map boundary — outer arena walls */}
          <rect
            x="42" y="28" width="616" height="444" rx="18"
            fill="rgba(12,16,28,0.9)"
            stroke="rgba(60,80,120,0.25)"
            strokeWidth="1.5"
          />

          {/* ── Jungle areas (darker zones) ── */}
          {/* Blue jungle */}
          <ellipse cx="218" cy="295" rx="80" ry="68"
            fill="rgba(15,25,45,0.7)" stroke="rgba(30,60,100,0.3)" strokeWidth="1" />
          <ellipse cx="218" cy="295" rx="58" ry="48"
            fill="rgba(10,18,32,0.5)" stroke="rgba(20,50,90,0.2)" strokeWidth="0.5" />

          {/* Red jungle */}
          <ellipse cx="482" cy="205" rx="80" ry="68"
            fill="rgba(30,15,20,0.7)" stroke="rgba(100,30,40,0.3)" strokeWidth="1" />
          <ellipse cx="482" cy="205" rx="58" ry="48"
            fill="rgba(22,10,14,0.5)" stroke="rgba(90,20,30,0.2)" strokeWidth="0.5" />

          {/* ── River (diagonal strip) ── */}
          <polygon
            points="295,30 355,30 405,470 345,470"
            fill="rgba(20,35,80,0.18)"
          />
          <line
            x1="325" y1="30" x2="375" y2="470"
            stroke="rgba(60,100,200,0.12)" strokeWidth="14"
          />

          {/* ── Lane paths ── */}
          {/* Top lane (blue EXP ↔ red Gold) */}
          <path
            d="M 90,440 C 90,180 380,55 610,65"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          <path
            d="M 90,440 C 90,180 380,55 610,65"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="6,4"
          />

          {/* Mid lane (diagonal) */}
          <line x1="90" y1="440" x2="610" y2="60"
            stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          <line x1="90" y1="440" x2="610" y2="60"
            stroke="rgba(255,255,255,0.14)" strokeWidth="2"
            strokeDasharray="6,4" />

          {/* Bottom lane (blue Gold ↔ red EXP) */}
          <path
            d="M 90,440 C 320,455 610,320 610,65"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          <path
            d="M 90,440 C 320,455 610,320 610,65"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="6,4"
          />

          {/* ── Base towers ── */}
          {/* Blue base */}
          <circle cx="90" cy="440" r="28"
            fill="rgba(10,20,50,0.9)"
            stroke="rgba(30,111,255,0.5)" strokeWidth="2" />
          <circle cx="90" cy="440" r="18"
            fill="rgba(15,35,90,0.8)"
            stroke="rgba(30,111,255,0.7)" strokeWidth="1.5" />
          <text x="90" y="444" textAnchor="middle" fontSize="12" fill="rgba(100,160,255,0.9)" fontWeight="bold">🔵</text>

          {/* Red base */}
          <circle cx="610" cy="60" r="28"
            fill="rgba(50,10,15,0.9)"
            stroke="rgba(232,53,53,0.5)" strokeWidth="2" />
          <circle cx="610" cy="60" r="18"
            fill="rgba(90,15,20,0.8)"
            stroke="rgba(232,53,53,0.7)" strokeWidth="1.5" />
          <text x="610" y="64" textAnchor="middle" fontSize="12" fill="rgba(255,100,100,0.9)" fontWeight="bold">🔴</text>

          {/* ── Synergy lines (drawn below hero nodes) ── */}
          {blueSynLines.map((line, i) => (
            <SynergyLine key={`bsyn-${i}`} {...line} color="30,111,255" />
          ))}
          {redSynLines.map((line, i) => (
            <SynergyLine key={`rsyn-${i}`} {...line} color="232,53,53" />
          ))}

          {/* ── Hero nodes — Blue team ── */}
          {(Object.keys(BLUE_POS) as LaneKey[]).map((lane) => {
            const hero = blueAssign[lane];
            const [x, y] = BLUE_POS[lane];
            return hero ? (
              <HeroNode
                key={`blue-${lane}`}
                hero={hero}
                x={x} y={y}
                team="blue"
                lane={lane}
                clipId={`clip-blue-${lane}`}
                isHovered={hoveredHero?.id === hero.id}
                onHover={setHoveredHero}
              />
            ) : (
              <EmptyNode
                key={`blue-empty-${lane}`}
                x={x} y={y}
                team="blue"
                lane={lane}
              />
            );
          })}

          {/* ── Hero nodes — Red team ── */}
          {(Object.keys(RED_POS) as LaneKey[]).map((lane) => {
            const hero = redAssign[lane];
            const [x, y] = RED_POS[lane];
            return hero ? (
              <HeroNode
                key={`red-${lane}`}
                hero={hero}
                x={x} y={y}
                team="red"
                lane={lane}
                clipId={`clip-red-${lane}`}
                isHovered={hoveredHero?.id === hero.id}
                onHover={setHoveredHero}
              />
            ) : (
              <EmptyNode
                key={`red-empty-${lane}`}
                x={x} y={y}
                team="red"
                lane={lane}
              />
            );
          })}

          {/* ── Lane labels (subtle, center of map) ── */}
          <text x="350" y="252" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.18)" fontFamily="monospace" letterSpacing="2">MID</text>
          <text x="195" y="148" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.12)" fontFamily="monospace" letterSpacing="1.5">TOP LANE</text>
          <text x="435" y="428" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.12)" fontFamily="monospace" letterSpacing="1.5">BOT LANE</text>
        </svg>

        {/* Hero tooltip overlay */}
        {hoveredHero && (
          <HeroTooltipOverlay hero={hoveredHero} />
        )}
      </div>

      {/* ── Win probability bar ── */}
      <WinProbBar winProbability={winProbability} />
    </div>
  );
}

// ─── Synergy line builder ─────────────────────────────────────────────────────

interface SynLine { x1:number; y1:number; x2:number; y2:number; strength:number; }

function buildSynLines(
  assign: Partial<Record<LaneKey, HeroData>>,
  positions: Record<LaneKey, [number, number]>,
): SynLine[] {
  const entries = Object.entries(assign) as [LaneKey, HeroData][];
  const lines: SynLine[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [laneA, heroA] = entries[i];
      const [laneB, heroB] = entries[j];
      const syn = heroSynergy(heroA, heroB);
      if (syn < 0.3) continue; // don't draw weak connections
      const [x1, y1] = positions[laneA];
      const [x2, y2] = positions[laneB];
      lines.push({ x1, y1, x2, y2, strength: syn });
    }
  }
  return lines;
}

// ─── SVG sub-components ───────────────────────────────────────────────────────

function SynergyLine({ x1, y1, x2, y2, strength, color }: SynLine & { color: string }) {
  const opacity  = strength * 0.35;
  const width    = 0.8 + strength * 1.8;
  const isDashed = strength < 0.6;
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={`rgba(${color},${opacity})`}
      strokeWidth={width}
      strokeDasharray={isDashed ? '5,6' : undefined}
    />
  );
}

function HeroNode({
  hero, x, y, team, lane, clipId, isHovered, onHover,
}: {
  hero: HeroData; x: number; y: number;
  team: 'blue' | 'red'; lane: LaneKey;
  clipId: string; isHovered: boolean;
  onHover: (h: HeroData | null) => void;
}) {
  const teamColor = team === 'blue' ? '30,111,255' : '232,53,53';
  const scale = isHovered ? 'scale(1.18)' : 'scale(1)';

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ transition: 'transform 0.2s' }}
      onMouseEnter={() => onHover(hero)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      {/* Outer glow ring */}
      <circle r={28} fill={`rgba(${teamColor},0.08)`} stroke={`rgba(${teamColor},0.4)`} strokeWidth="1.5" />

      {/* Portrait background */}
      <circle r={22} fill={`rgba(${teamColor},0.2)`} />

      {/* Portrait image */}
      {hero.image && (
        <image
          href={hero.image}
          x={-22} y={-22} width={44} height={44}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          style={{ transform: scale, transformOrigin: `${x}px ${y}px`, transition: 'transform 0.2s' }}
        />
      )}

      {/* Portrait border */}
      <circle r={22} fill="none" stroke={`rgba(${teamColor},0.8)`} strokeWidth="2" />

      {/* Gradient overlay on portrait */}
      <circle r={22} fill={`url(#port-grad-${team})`} />

      {/* Lane badge */}
      <g transform={`translate(0, 28)`}>
        <rect x={-18} y={-8} width={36} height={14} rx={6}
          fill={`rgba(${teamColor},0.85)`} />
        <text x={0} y={5} textAnchor="middle" fontSize={8}
          fill="white" fontWeight="bold" fontFamily="monospace">
          {LANE_ICON[lane]} {LANE_LABEL[lane]}
        </text>
      </g>

      {/* Hero name (hover) */}
      {isHovered && (
        <text x={0} y={-32} textAnchor="middle" fontSize="10"
          fill="white" fontWeight="bold"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
          {hero.name}
        </text>
      )}
    </g>
  );
}

function EmptyNode({
  x, y, team, lane,
}: { x: number; y: number; team: 'blue' | 'red'; lane: LaneKey }) {
  const teamColor = team === 'blue' ? '30,111,255' : '232,53,53';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Pulsing empty ring */}
      <circle r={22} fill={`rgba(${teamColor},0.04)`}
        stroke={`rgba(${teamColor},0.2)`} strokeWidth="1.5"
        strokeDasharray="4,3" />
      <text x={0} y={4} textAnchor="middle" fontSize={10}
        fill={`rgba(${teamColor},0.35)`} fontWeight="bold">
        ?
      </text>
      {/* Lane label */}
      <text x={0} y={34} textAnchor="middle" fontSize={7}
        fill={`rgba(255,255,255,0.18)`} fontFamily="monospace">
        {LANE_LABEL[lane]}
      </text>
    </g>
  );
}

// ─── Ban badge ────────────────────────────────────────────────────────────────

function BanBadge({ hero, team }: { hero: HeroData | null; team: 'blue' | 'red' }) {
  if (!hero) {
    return (
      <div
        className="w-8 h-8 rounded border border-dashed opacity-25 flex-shrink-0"
        style={{ borderColor: team === 'blue' ? 'rgba(30,111,255,0.5)' : 'rgba(232,53,53,0.5)' }}
      />
    );
  }
  return (
    <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 grayscale opacity-60">
      {hero.image
        ? <img src={hero.image} alt={hero.name} className="w-full h-full object-cover" title={hero.name} />
        : <div className="w-full h-full flex items-center justify-center text-[9px] font-black bg-slate-800 text-slate-400">{hero.name.charAt(0)}</div>
      }
      {/* Red X overlay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(180,0,0,0.45)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line x1="2" y1="2" x2="12" y2="12" stroke="rgba(255,100,100,0.9)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="2" x2="2" y2="12" stroke="rgba(255,100,100,0.9)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Win probability bar ──────────────────────────────────────────────────────

function WinProbBar({ winProbability }: { winProbability: number }) {
  const blueW = winProbability.toFixed(0);
  const redW  = (100 - winProbability).toFixed(0);
  const diff  = Math.abs(winProbability - 50);
  const label = diff < 5 ? 'ÉQUILIBRÉ' : winProbability > 50 ? `AVANTAGE BLEU +${diff.toFixed(0)}%` : `AVANTAGE ROUGE +${diff.toFixed(0)}%`;
  const labelColor = diff < 5 ? '#94a3b8' : winProbability > 50 ? '#60a5fa' : '#f87171';

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[11px] font-black text-blue-400 tabular-nums w-8 text-right">{blueW}%</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-800/80 relative">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${winProbability}%`,
            background: 'linear-gradient(to right, rgba(30,111,255,0.9), rgba(30,111,255,0.4))',
          }}
        />
        <div
          className="absolute inset-0 rounded-full transition-all duration-700"
          style={{
            marginLeft: `${winProbability}%`,
            background: 'linear-gradient(to right, rgba(232,53,53,0.4), rgba(232,53,53,0.9))',
          }}
        />
        {/* Center marker */}
        <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '50%' }} />
      </div>
      <span className="text-[11px] font-black text-red-400 tabular-nums w-8">{redW}%</span>
      <span className="text-[9px] font-bold tracking-wider" style={{ color: labelColor, minWidth: 100 }}>{label}</span>
    </div>
  );
}

// ─── Hero tooltip overlay ─────────────────────────────────────────────────────

function HeroTooltipOverlay({ hero }: { hero: HeroData }) {
  const role = hero.roles[0] ?? 'Fighter';
  const ROLE_COLOR: Record<string, string> = {
    Tank: '#60a5fa', Support: '#2dd4bf', Fighter: '#fb923c',
    Assassin: '#a78bfa', Mage: '#c084fc', Marksman: '#facc15',
  };
  const rColor = ROLE_COLOR[role] ?? '#94a3b8';

  return (
    <div
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{
        background: 'rgba(8,10,20,0.97)',
        border: '1px solid rgba(100,120,180,0.35)',
        borderRadius: 12,
        padding: '10px 14px',
        minWidth: 200,
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
          {hero.image && <img src={hero.image} alt={hero.name} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {hero.name}
          </p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: rColor, background: `${rColor}20` }}>
            {role}
          </span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-400">WR</p>
          <p className="text-[12px] font-black" style={{ color: hero.winRate >= 0.52 ? '#4ade80' : hero.winRate >= 0.48 ? '#facc15' : '#f87171' }}>
            {(hero.winRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[
          ['DMG',   hero.damage],
          ['TANK',  hero.tankiness],
          ['CC',    hero.cc],
          ['EARLY', hero.early],
          ['LATE',  hero.late],
          ['MOB',   hero.mobility],
        ].map(([label, val]) => (
          <div key={label as string} className="flex flex-col items-center">
            <span className="text-[8px] text-slate-600 font-bold">{label}</span>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-0.5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(val as number) * 10}%`,
                  background: (val as number) >= 7 ? '#4ade80' : (val as number) >= 4 ? '#facc15' : '#f87171',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
