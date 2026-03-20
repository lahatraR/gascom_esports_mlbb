'use client';

import type { TeamMetrics } from '@/types/draft';
import { DualMetricBar } from '@/components/ui/MetricBar';

interface TeamComparisonPanelProps {
  blueMetrics: TeamMetrics;
  redMetrics:  TeamMetrics;
  counterIndex: number;
}

const METRIC_LABELS: { key: keyof TeamMetrics; label: string; icon: string }[] = [
  { key: 'early',     label: 'Early Game',   icon: '🌅' },
  { key: 'mid',       label: 'Mid Game',     icon: '⚔️' },
  { key: 'late',      label: 'Late Game',    icon: '🌙' },
  { key: 'damage',    label: 'Damage',       icon: '💥' },
  { key: 'tankiness', label: 'Durability',   icon: '🛡️' },
  { key: 'cc',        label: 'Crowd Control',icon: '🔒' },
  { key: 'push',      label: 'Push / Siege', icon: '🏰' },
];

export function TeamComparisonPanel({
  blueMetrics,
  redMetrics,
  counterIndex,
}: TeamComparisonPanelProps) {
  const ciColor = counterIndex > 0 ? 'text-blue-400' : counterIndex < 0 ? 'text-red-400' : 'text-slate-400';
  const ciLabel = counterIndex > 0 ? `+${counterIndex.toFixed(1)} Blue`
                : counterIndex < 0 ? `${counterIndex.toFixed(1)} Red`
                : '0 Even';

  return (
    <div className="flex flex-col gap-3 glass p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
          Team Comparison
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Counter Index:</span>
          <span className={`text-xs font-bold ${ciColor}`}>{ciLabel}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-blue-400">← BLUE</span>
        <span className="text-red-400">RED →</span>
      </div>

      {/* Metric bars */}
      <div className="flex flex-col gap-2.5">
        {METRIC_LABELS.map(({ key, label, icon }) => (
          <DualMetricBar
            key={key}
            label={`${icon} ${label}`}
            blueValue={blueMetrics[key]}
            redValue={redMetrics[key]}
          />
        ))}
      </div>
    </div>
  );
}
