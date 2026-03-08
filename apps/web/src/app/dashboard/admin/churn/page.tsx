'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface ChurnSignal {
  id: string;
  workspaceId: string;
  riskScore: number;
  reasons: string[];
  status: string;
  lastCalculatedAt: string;
  workspace: { name: string; slug: string };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  AT_RISK:    { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'En riesgo' },
  MONITORING: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: 'Monitoreando' },
  HEALTHY:    { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Saludable' },
  CHURNED:    { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', label: 'Churn' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.HEALTHY;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 50 ? '#ef4444' : score >= 20 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ChurnPage() {
  const [signals, setSignals] = useState<ChurnSignal[]>([]);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = useCallback(async () => {
    try {
      const [sigRes, countRes] = await Promise.all([
        fetch(`${base}/api/admin/churn`, { credentials: 'include' }),
        fetch(`${base}/api/admin/churn/at-risk`, { credentials: 'include' }),
      ]);
      if (!sigRes.ok) throw new Error('Error al cargar datos');
      const sigsJson = await sigRes.json();
      const countJson = await countRes.json();
      setSignals(Array.isArray(sigsJson) ? sigsJson : sigsJson.data ?? []);
      setAtRiskCount(countJson.count ?? countJson.data?.count ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await fetch(`${base}/api/admin/churn/evaluate`, { method: 'POST', credentials: 'include' });
      await fetchData();
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-float mb-4">⚠️</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Analizando riesgo de churn...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={() => { setLoading(true); setError(''); fetchData(); }} className="btn-primary mt-4">Reintentar</button>
      </div>
    );
  }

  const filtered = filter === 'ALL' ? signals : signals.filter((s) => s.status === filter);
  const healthyCount = signals.filter((s) => s.status === 'HEALTHY').length;
  const monitoringCount = signals.filter((s) => s.status === 'MONITORING').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="page-title">⚠️ Detección de Churn</h1>
          <p className="page-subtitle">Monitorización de riesgo de abandono por workspace</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleEvaluate} disabled={evaluating} className="btn-primary text-sm">
            {evaluating ? '⏳ Evaluando...' : '🔄 Evaluar ahora'}
          </button>
          <Link href="/dashboard/admin/operations" className="btn-ghost text-sm">📊 Operaciones</Link>
          <Link href="/dashboard/admin" className="btn-ghost text-sm">🛡️ Admin</Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-5 stat-gradient-purple">
          <span className="text-2xl">🏢</span>
          <div className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text)' }}>{signals.length}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total evaluados</div>
        </div>
        <div className="glass-card p-5 stat-gradient-amber">
          <span className="text-2xl">🔥</span>
          <div className="text-2xl font-bold mt-2" style={{ color: '#ef4444' }}>{atRiskCount}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>En riesgo</div>
        </div>
        <div className="glass-card p-5 stat-gradient-cyan">
          <span className="text-2xl">👁️</span>
          <div className="text-2xl font-bold mt-2" style={{ color: '#f59e0b' }}>{monitoringCount}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Monitoreando</div>
        </div>
        <div className="glass-card p-5 stat-gradient-green">
          <span className="text-2xl">✅</span>
          <div className="text-2xl font-bold mt-2" style={{ color: '#22c55e' }}>{healthyCount}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Saludables</div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 animate-fade-in-delay-2">
        {['ALL', 'AT_RISK', 'MONITORING', 'HEALTHY', 'CHURNED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="chip transition-all"
            style={{
              backgroundColor: filter === f ? 'rgba(124,58,237,0.25)' : undefined,
              borderColor: filter === f ? '#7c3aed' : undefined,
            }}
          >
            {f === 'ALL' ? 'Todos' : STATUS_STYLES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-2">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {signals.length === 0
                ? 'Aún no se ha ejecutado la evaluación de churn.'
                : 'No hay workspaces en esta categoría.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Estado</th>
                <th>Puntuación</th>
                <th>Señales</th>
                <th>Última evaluación</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>{s.workspace?.name || 'N/A'}</span>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.workspace?.slug}</div>
                    </div>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><ScoreBar score={s.riskScore} /></td>
                  <td>
                    <div className="space-y-1">
                      {(s.reasons || []).map((r: any, i: number) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          • {typeof r === 'string' ? r : r.detail || r.reason || JSON.stringify(r)}
                          {typeof r === 'object' && r.weight != null && (
                            <span style={{ color: 'var(--color-text-muted)' }}> (peso: {r.weight})</span>
                          )}
                        </div>
                      ))}
                      {(!s.reasons || s.reasons.length === 0) && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin señales</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(s.lastCalculatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
