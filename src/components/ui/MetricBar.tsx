'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

interface MetricBarProps {
  label: string;
  value: number;    // 0–10
  maxValue?: number;
  color?: string;   // tailwind bg class or hex
  showValue?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md';
}

const VALUE_COLORS = [
  { threshold: 7, color: 'bg-emerald-500' },
  { threshold: 4, color: 'bg-amber-500'   },
  { threshold: 0, color: 'bg-red-500'     },
];

function getBarColor(value: number, customColor?: string): string {
  if (customColor) return customColor;
  return VALUE_COLORS.find((c) => value >= c.threshold)?.color ?? 'bg-red-500';
}

export function MetricBar({
  label,
  value,
  maxValue = 10,
  color,
  showValue = true,
  animated = true,
  size = 'md',
}: MetricBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pct = Math.round((Math.max(0, Math.min(value, maxValue)) / maxValue) * 100);
  const barColor = getBarColor(value, color);

  useEffect(() => {
    if (!animated || !fillRef.current) return;
    fillRef.current.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [pct, animated]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className={clsx('text-slate-400 font-medium', size === 'sm' ? 'text-xs' : 'text-xs')}>
          {label}
        </span>
        {showValue && (
          <span className={clsx('font-bold tabular-nums', size === 'sm' ? 'text-xs' : 'text-xs', 'text-slate-200')}>
            {value.toFixed(1)}
          </span>
        )}
      </div>
      <div className={clsx('w-full rounded-full overflow-hidden bg-navy-800', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          ref={fillRef}
          className={clsx(barColor, 'h-full rounded-full transition-all duration-700 ease-out')}
          style={{ width: animated ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Dual metric bar (Blue vs Red) ───────────────────────────────────────────

interface DualMetricBarProps {
  label: string;
  blueValue: number;
  redValue: number;
  maxValue?: number;
}

export function DualMetricBar({ label, blueValue, redValue, maxValue = 10 }: DualMetricBarProps) {
  const bluePct = Math.round((Math.max(0, Math.min(blueValue, maxValue)) / maxValue) * 100);
  const redPct  = Math.round((Math.max(0, Math.min(redValue,  maxValue)) / maxValue) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-blue-400 font-bold text-xs tabular-nums">{blueValue.toFixed(1)}</span>
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className="text-red-400 font-bold text-xs tabular-nums">{redValue.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-1">
        {/* Blue bar (fills from right to left) */}
        <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${bluePct}%` }}
          />
        </div>
        {/* Divider */}
        <div className="w-px h-3 bg-slate-600 flex-shrink-0" />
        {/* Red bar (fills from left to right) */}
        <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${redPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
