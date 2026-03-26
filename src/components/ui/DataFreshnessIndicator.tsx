'use client';

import { useEffect, useState } from 'react';
import { useDraftStore } from '@/store/draftStore';

interface DataStatus {
  buildTime:  string;
  heroCount:  number;
}

export function DataFreshnessIndicator() {
  const dataFreshness = useDraftStore((s) => s.dataFreshness);
  const [buildTime, setBuildTime] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch status when running on build data
    if (dataFreshness === 'live') return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${base}/data-status.json`)
      .then((r) => r.ok ? r.json() as Promise<DataStatus> : null)
      .then((s) => s?.buildTime ? setBuildTime(s.buildTime) : null)
      .catch(() => null);
  }, [dataFreshness]);

  // Live data → nothing to show
  if (dataFreshness === 'live') return null;

  const dateLabel = buildTime
    ? new Date(buildTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '…';

  return (
    <div
      className="fixed bottom-3 right-3 z-40 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium"
      style={{
        background:  'rgba(15,15,25,0.90)',
        border:      '1px solid rgba(250,204,21,0.30)',
        color:       'rgba(250,204,21,0.75)',
        backdropFilter: 'blur(8px)',
      }}
      title="Les données en direct n'ont pas encore pu être chargées. Les suggestions sont basées sur les données du dernier build."
    >
      <span style={{ color: '#facc15' }}>⚠</span>
      Données hors-ligne · build du {dateLabel}
    </div>
  );
}
