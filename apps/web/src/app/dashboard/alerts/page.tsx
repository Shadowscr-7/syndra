'use client';

import { useEffect, useState, useCallback } from 'react';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  suggestedAction: string | null;
  status: string;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', icon: '🔴', text: '#ef4444' },
  WARNING:  { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', icon: '🟡', text: '#f59e0b' },
  INFO:     { bg: 'rgba(6,182,212,0.08)',   border: '#06b6d4', icon: '🔵', text: '#06b6d4' },
};

const TYPE_LABELS: Record<string, string> = {
  TOKEN_EXPIRING: 'Token por expirar',
  LOW_ACTIVITY: 'Baja actividad',
  ENGAGEMENT_DROP: 'Caída de engagement',
  TREND_DETECTED: 'Tendencia detectada',
  PUBLISH_ERROR: 'Error de publicación',
  CREDENTIALS_BROKEN: 'Credenciales rotas',
  CAMPAIGN_NO_SOURCES: 'Campaña sin fuentes',
  ONBOARDING_STALLED: 'Onboarding detenido',
  HIGH_FATIGUE: 'Fatiga alta',
  PLAN_LIMIT_NEAR: 'Límite del plan',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ACTIVE');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchAlerts = useCallback(async () => {
    try {
      const statusParam = filter !== 'ALL' ? `?status=${filter}` : '';
      const [alertsRes, countRes] = await Promise.all([
        fetch(`${base}/api/alerts${statusParam}`, { credentials: 'include' }),
        fetch(`${base}/api/alerts/count`, { credentials: 'include' }),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (countRes.ok) {
        const c = await countRes.json();
        setCount(c.count ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [base, filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleDismiss = async (id: string) => {
    await fetch(`${base}/api/alerts/${id}/dismiss`, { method: 'PATCH', credentials: 'include' });
    await fetchAlerts();
  };

  const handleResolve = async (id: string) => {
    await fetch(`${base}/api/alerts/${id}/resolve`, { method: 'PATCH', credentials: 'include' });
    await fetchAlerts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-float mb-4">🔔</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Cargando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="page-title">🔔 Alertas</h1>
          {count > 0 && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
              style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              {count}
            </span>
          )}
        </div>
        <p className="page-subtitle">Alertas proactivas sobre tu workspace</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 animate-fade-in-delay-1">
        {['ACTIVE', 'DISMISSED', 'RESOLVED', 'ALL'].map((f) => {
          const labels: Record<string, string> = { ACTIVE: 'Activas', DISMISSED: 'Descartadas', RESOLVED: 'Resueltas', ALL: 'Todas' };
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className="chip transition-all"
              style={{
                backgroundColor: filter === f ? 'rgba(124,58,237,0.25)' : undefined,
                borderColor: filter === f ? '#7c3aed' : undefined,
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Alert cards */}
      <div className="space-y-3 animate-fade-in-delay-2">
        {alerts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {filter === 'ACTIVE' ? 'No hay alertas activas. ¡Todo funciona correctamente!' : 'No hay alertas en esta categoría.'}
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.INFO;
            return (
              <div
                key={alert.id}
                className="glass-card p-5"
                style={{
                  backgroundColor: sev.bg,
                  borderLeft: `3px solid ${sev.border}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{sev.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {alert.title}
                      </span>
                      <span className="chip text-[10px]">{TYPE_LABELS[alert.type] || alert.type}</span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {alert.message}
                    </p>
                    {alert.suggestedAction && (
                      <p className="text-xs" style={{ color: sev.text }}>
                        💡 {alert.suggestedAction}
                      </p>
                    )}
                    <span className="text-[10px] mt-2 inline-block" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(alert.createdAt).toLocaleString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {alert.status === 'ACTIVE' && (
                    <div className="flex gap-1.5 ml-4 shrink-0">
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="btn-ghost text-xs px-2 py-1"
                        title="Marcar como resuelta"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="btn-ghost text-xs px-2 py-1"
                        title="Descartar"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
