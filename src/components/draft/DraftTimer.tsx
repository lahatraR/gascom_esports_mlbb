'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';

interface DraftTimerProps {
  currentStep: number;  // resets timer on every new step
  isDone: boolean;
}

const DURATIONS = [30, 60] as const;

export function DraftTimer({ currentStep, isDone }: DraftTimerProps) {
  const [duration, setDuration]     = useState<30 | 60>(30);
  const [remaining, setRemaining]   = useState(30);
  const [active, setActive]         = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset on each new draft step
  useEffect(() => {
    clearTick();
    setRemaining(duration);
    setActive(false);
  }, [currentStep, duration, clearTick]);

  // Stop when draft is done
  useEffect(() => {
    if (isDone) { clearTick(); setActive(false); }
  }, [isDone, clearTick]);

  // Countdown interval
  useEffect(() => {
    if (!active) { clearTick(); return; }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTick();
          setActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTick;
  }, [active, clearTick]);

  const handleDurationChange = (d: 30 | 60) => {
    setDuration(d);
    setRemaining(d);
    setActive(false);
  };

  const pct        = remaining / duration;
  const isWarning  = remaining <= Math.round(duration * 0.33);
  const isCritical = remaining <= Math.round(duration * 0.15);

  const strokeColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
  const radius      = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div
      className="glass flex items-center gap-3 px-3 py-2 rounded-lg"
      title="Keyboard: Ctrl+Z undo · / search"
    >
      {/* Circular progress */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="22" cy="22" r={radius} fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s' }}
          />
        </svg>
        <div
          className={clsx(
            'absolute inset-0 flex items-center justify-center font-black text-sm tabular-nums',
            isCritical ? 'text-red-400 animate-pulse' :
            isWarning  ? 'text-amber-400' : 'text-emerald-400'
          )}
        >
          {remaining}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setActive((a) => !a)}
          disabled={isDone}
          className={clsx(
            'px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all',
            active
              ? 'border-amber-500/50 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40'
              : 'border-emerald-500/50 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40',
            isDone && 'opacity-40 cursor-not-allowed'
          )}
        >
          {active ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          onClick={() => { setRemaining(duration); setActive(false); }}
          className="px-2.5 py-0.5 rounded text-[10px] font-medium border border-slate-700/30 text-slate-500 hover:text-white transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Duration selector */}
      <div className="flex flex-col gap-1">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => handleDurationChange(d)}
            className={clsx(
              'text-[9px] font-bold rounded px-2 py-0.5 border transition-all',
              duration === d
                ? 'border-red-700/60 text-red-300 bg-red-950/30'
                : 'border-slate-700/30 text-slate-600 hover:text-slate-300'
            )}
          >
            {d}s
          </button>
        ))}
      </div>
    </div>
  );
}
