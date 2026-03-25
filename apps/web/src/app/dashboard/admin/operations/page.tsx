'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface RealtimeData {
  today: {
    runsCreated: number;
    runsFailed: number;
    pubsPublished: number;
    pubsFailed: number;
  };
  last30d: {
    totalRuns: number;
    failedRuns: number;
    publishedRuns: number;
    approvedRuns: number;
    rejectedRuns: number;
    approvalRate: number;
    failureRate: number;
    avgCycleHours: number;
  };
  health: {
    totalWorkspaces: number;
    inactiveWorkspaces: number;
    activeWorkspaces: number;
  };
}

interface TrendPoint {
  date: string;
  value: number;
}

interface DashboardPayload {
  realtime: RealtimeData;
  trends: Record<string, TrendPoint[]>;
}

// ── Tiny sparkline ────────────────────────────────────
function Sparkline({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────
function KpiCard({ icon, label, value, sub, gradient, trend }: {
  icon: string; label: string; value: string | number; sub?: string; gradient: string; trend?: number[];
}) {
  return (
    <div className={`glass-card p-5 ${gradient}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && <Sparkline data={trend} color="rgba(255,255,255,0.5)" />}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sub}</div>}
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <span className="text-xl">{icon}</span>
      <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</div>
      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      {sub && <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{sub}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────

export default function OperationsPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/operations`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar métricas');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-float mb-4">📊</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Cargando métricas operativas...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p style={{ color: 'var(--color-danger)' }}>{error || 'Error desconocido'}</p>
        <button onClick={() => { setLoading(true); setError(''); fetchData(); }} className="btn-primary mt-4">Reintentar</button>
      </div>
    );
  }

  const { realtime, trends } = data;
  const rt = realtime;

  // Extract trend values for sparklines
  const trendValues = (metric: string) => (trends[metric] || []).map((t) => t.value);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="page-title">📊 Operaciones</h1>
          <p className="page-subtitle">Estado operativo en tiempo real y tendencias históricas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin" className="btn-ghost text-sm">🛡️ Admin</Link>
          <Link href="/dashboard/admin/churn" className="btn-ghost text-sm">⚠️ Churn</Link>
        </div>
      </div>

      {/* ── Hoy ─────────────────────────────────────── */}
      <div>
        <h2 className="section-title mb-3">⚡ Hoy</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
          <KpiCard icon="🚀" label="Runs creados" value={rt.today.runsCreated} gradient="stat-gradient-purple" trend={trendValues('runs_created')} />
          <KpiCard icon="❌" label="Runs fallidos" value={rt.today.runsFailed} gradient="stat-gradient-amber" trend={trendValues('runs_failed')} />
          <KpiCard icon="📤" label="Publicados" value={rt.today.pubsPublished} gradient="stat-gradient-green" trend={trendValues('pubs_published')} />
          <KpiCard icon="💥" label="Pub. fallidas" value={rt.today.pubsFailed} gradient="stat-gradient-cyan" trend={trendValues('pubs_failed')} />
        </div>
      </div>

      {/* ── 30 días ─────────────────────────────────── */}
      <div>
        <h2 className="section-title mb-3">📅 Últimos 30 días</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-2">
          <KpiCard icon="📊" label="Total runs" value={rt.last30d.totalRuns}
            sub={`${rt.last30d.publishedRuns} publicados`} gradient="stat-gradient-purple" />
          <KpiCard icon="✅" label="Tasa aprobación" value={`${rt.last30d.approvalRate}%`}
            sub={`${rt.last30d.approvedRuns} aprobados / ${rt.last30d.rejectedRuns} rechazados`}
            gradient="stat-gradient-green" trend={trendValues('approval_rate')} />
          <KpiCard icon="⚠️" label="Tasa errores" value={`${rt.last30d.failureRate}%`}
            sub={`${rt.last30d.failedRuns} fallidos`}
            gradient={rt.last30d.failureRate > 20 ? 'stat-gradient-amber' : 'stat-gradient-cyan'} />
          <KpiCard icon="⏱️" label="Ciclo promedio" value={`${rt.last30d.avgCycleHours}h`}
            sub="Idea → Publicado" gradient="stat-gradient-cyan" trend={trendValues('avg_cycle_hours')} />
        </div>
      </div>

      {/* ── Health & details ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-delay-3">
        {/* Workspace health */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">🏢 Salud de Workspaces</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Total</span>
              <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{rt.health.totalWorkspaces}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Activos (7d)</span>
              <span className="text-lg font-bold" style={{ color: '#22c55e' }}>{rt.health.activeWorkspaces}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Inactivos</span>
              <span className="text-lg font-bold" style={{ color: rt.health.inactiveWorkspaces > 0 ? '#f59e0b' : 'var(--color-text)' }}>
                {rt.health.inactiveWorkspaces}
              </span>
            </div>
            {rt.health.totalWorkspaces > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tasa de actividad</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {Math.round((rt.health.activeWorkspaces / rt.health.totalWorkspaces) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                  <div className="h-2 rounded-full transition-all" style={{
                    width: `${Math.round((rt.health.activeWorkspaces / rt.health.totalWorkspaces) * 100)}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mini stats grid */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">📈 Resumen pipeline</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon="🔄" label="Total runs" value={rt.last30d.totalRuns} />
            <MiniStat icon="✅" label="Publicados" value={rt.last30d.publishedRuns} />
            <MiniStat icon="👍" label="Aprobados" value={rt.last30d.approvedRuns} />
            <MiniStat icon="👎" label="Rechazados" value={rt.last30d.rejectedRuns} />
          </div>
        </div>

        {/* Trends list */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">📉 Tendencias (14 días)</h3>
          {Object.keys(trends).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin datos históricos aún. Se generarán automáticamente.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(trends).slice(0, 6).map(([metric, points]) => {
                const vals = points.map((p) => p.value);
                const last = vals[vals.length - 1] ?? 0;
                const prev = vals[vals.length - 2] ?? last;
                const diff = prev !== 0 ? Math.round(((last - prev) / prev) * 100) : 0;
                return (
                  <div key={metric} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        {metric.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Sparkline data={vals} />
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{last}</div>
                      {diff !== 0 && (
                        <div className="text-[10px]" style={{ color: diff > 0 ? '#22c55e' : '#ef4444' }}>
                          {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
