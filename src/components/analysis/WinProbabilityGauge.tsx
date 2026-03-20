'use client';

import { useEffect, useRef } from 'react';

interface WinProbabilityGaugeProps {
  probability: number;  // 0–100 (blue win %)
  blueRating?: number;
  redRating?:  number;
}

export function WinProbabilityGauge({ probability, blueRating, redRating }: WinProbabilityGaugeProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    barRef.current.style.width = `${probability}%`;
  }, [probability]);

  const redPct   = 100 - probability;
  const advantage = probability >= 55 ? 'BLUE ADVANTAGE'
                  : probability <= 45 ? 'RED ADVANTAGE'
                  : 'EVEN';

  return (
    <div className="flex flex-col gap-3 glass p-4">
      <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 text-center">
        Win Probability
      </h3>

      {/* Win % labels */}
      <div className="flex justify-between items-baseline">
        <div className="text-left">
          <div className="text-2xl font-black text-blue-400 tabular-nums">{probability}%</div>
          <div className="text-[10px] text-blue-300/70 font-bold">BLUE SIDE</div>
        </div>
        <div className="text-center">
          <div
            className={
              probability >= 55 ? 'text-blue-400' :
              probability <= 45 ? 'text-red-400'  :
              'text-slate-400'
            }
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}
          >
            {advantage}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-red-400 tabular-nums">{redPct}%</div>
          <div className="text-[10px] text-red-300/70 font-bold">RED SIDE</div>
        </div>
      </div>

      {/* Gradient bar */}
      <div className="relative h-4 rounded-full overflow-hidden bg-navy-800 border border-slate-700/40">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #1e3a8a 0%, #1e6fff 40%, #fff 50%, #ff3c3c 60%, #7f1d1d 100%)' }}
        />
        {/* Blue fill mask */}
        <div
          className="absolute right-0 top-0 bottom-0 bg-navy-950/90 transition-all duration-700 ease-out"
          style={{ width: `${redPct}%` }}
        />
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
        {/* Indicator */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg transition-all duration-700 ease-out"
          style={{ left: `calc(${probability}% - 2px)` }}
        />
      </div>

      {/* Ratings */}
      {blueRating !== undefined && redRating !== undefined && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>Lineup: <span className="text-blue-400 font-bold">{blueRating.toFixed(1)}</span></span>
          <span>Lineup: <span className="text-red-400 font-bold">{redRating.toFixed(1)}</span></span>
        </div>
      )}
    </div>
  );
}
