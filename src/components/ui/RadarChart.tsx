'use client';

/**
 * Pure-SVG radar / spider chart — no external dependencies.
 * Values are expected in 0–10 range (matching HeroData stat fields).
 */

export interface RadarAxis {
  key:   string;
  label: string;
  value: number;   // 0–10
}

interface Props {
  axes:        RadarAxis[];
  size?:       number;   // SVG viewport size in px, default 160
  color?:      string;   // filled polygon color, default '#a78bfa'
  showLabels?: boolean;  // default true
  className?:  string;
}

export function RadarChart({
  axes,
  size        = 160,
  color       = '#a78bfa',
  showLabels  = true,
  className   = '',
}: Props) {
  const n      = axes.length;
  if (n < 3) return null;

  const cx     = size / 2;
  const cy     = size / 2;
  const radius = size * 0.36;          // polygon outer radius
  const labelR = size * 0.48;          // label distance from center

  // Angle of axis i: start at top (−π/2), go clockwise
  const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;

  // Point on axis i at fraction t (0–1)
  const pt = (i: number, t: number) => ({
    x: cx + Math.cos(angle(i)) * radius * t,
    y: cy + Math.sin(angle(i)) * radius * t,
  });

  // Polygon path from array of {x,y}
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Grid rings (20%, 40%, 60%, 80%)
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0].map((t) =>
    poly(axes.map((_, i) => pt(i, t)))
  );

  // Data polygon
  const dataPoints = axes.map((ax, i) => pt(i, Math.min(ax.value, 10) / 10));
  const dataPath   = poly(dataPoints);

  // Label positions
  const labels = axes.map((ax, i) => {
    const p = {
      x: cx + Math.cos(angle(i)) * labelR,
      y: cy + Math.sin(angle(i)) * labelR,
    };
    return { ...p, label: ax.label, value: ax.value };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Radar chart"
    >
      {/* Grid rings */}
      {gridRings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(100,100,140,0.20)"
          strokeWidth="0.8"
        />
      ))}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const outer = pt(i, 1);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="rgba(100,100,140,0.18)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Data polygon — filled */}
      <path
        d={dataPath}
        fill={`${color}28`}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={color} />
      ))}

      {/* Labels */}
      {showLabels && labels.map((l, i) => {
        const valColor =
          l.value >= 7.5 ? '#4ade80'
          : l.value >= 5  ? '#facc15'
          : '#f87171';
        return (
          <g key={i}>
            <text
              x={l.x}
              y={l.y - 3}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize="8.5"
              fill="rgba(148,163,184,0.85)"
              fontFamily="inherit"
            >
              {l.label}
            </text>
            <text
              x={l.x}
              y={l.y + 7}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize="8"
              fill={valColor}
              fontWeight="700"
              fontFamily="inherit"
            >
              {l.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
