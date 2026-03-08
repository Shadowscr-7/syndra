'use client';

import { useEffect, useState } from 'react';

interface SummaryData {
  period: string;
  publications: { total: number; thisMonth: number; growth: number };
  engagement: { avg: number; best: { platform: string; rate: number } | null };
  pipeline: { totalRuns: number; successRate: number; avgCycleDays: number };
  channels: { name: string; count: number; icon: string }[];
}

export function ExecutiveSummary() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then((r) => r.json())
      .then((json) => setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-5 animate-fade-in-delay-3">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Resumen Ejecutivo</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const growthColor = data.publications.growth >= 0 ? '#10b981' : '#ef4444';
  const growthIcon = data.publications.growth >= 0 ? '↑' : '↓';

  return (
    <div className="glass-card p-5 animate-fade-in-delay-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">📊</span>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              Resumen Ejecutivo
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {data.period}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Publications */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Publicaciones</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {data.publications.thisMonth}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: growthColor }}>
              {growthIcon} {Math.abs(data.publications.growth)}%
            </span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {data.publications.total} totales
          </p>
        </div>

        {/* Engagement */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Engagement</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>
            {data.engagement.avg > 0 ? `${(data.engagement.avg * 100).toFixed(1)}%` : '—'}
          </p>
          {data.engagement.best && (
            <p className="text-[10px] mt-0.5" style={{ color: '#06b6d4' }}>
              Mejor: {data.engagement.best.platform} ({(data.engagement.best.rate * 100).toFixed(1)}%)
            </p>
          )}
        </div>

        {/* Pipeline success */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Éxito pipeline</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>
            {data.pipeline.successRate}%
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {data.pipeline.totalRuns} runs este mes
          </p>
        </div>

        {/* Channels */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Canales activos</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {data.channels.map((ch) => (
              <span
                key={ch.name}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}
                title={`${ch.name}: ${ch.count} publicaciones`}
              >
                {ch.icon} {ch.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
