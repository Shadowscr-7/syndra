import { getApiUrl } from '@/lib/api';
import { getSession } from '@/lib/session';
import Link from 'next/link';

interface PlanVersion {
  id: string;
  version: number;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  weeklyPostTarget: number;
  summary: string | null;
  impactMetrics: { totalPublications: number; avgEngagement: number; avgReach: number } | null;
  recommendations: Array<{ type: string; title: string }>;
  createdAt: string;
}

async function fetchHistory(wsId: string): Promise<PlanVersion[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/strategist/history`, {
      cache: 'no-store',
      headers: { cookie: `workspace-id=${wsId}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  ACTIVE:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  DRAFT:     { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  COMPLETED: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  ARCHIVED:  { bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
};

export default async function StrategyHistoryPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'default';
  const plans = await fetchHistory(wsId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Historial de Estrategias</h1>
          <p className="page-subtitle">Versiones de planes estratégicos y su impacto</p>
        </div>
        <Link href="/dashboard/strategist" className="btn-primary text-sm">
          ← Plan Activo
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4 animate-float">📋</div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Sin planes estratégicos</h3>
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Genera tu primer plan desde el panel del Estratega IA.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan, idx) => {
            const ss = STATUS_STYLES[plan.status] ?? STATUS_STYLES.ARCHIVED;
            return (
              <div key={plan.id} className={`glass-card p-0 overflow-hidden animate-fade-in${idx > 0 ? `-delay-${Math.min(idx, 3)}` : ''}`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>v{plan.version}</span>
                      <span className="chip" style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {plan.status}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{plan.periodType}</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(plan.startDate).toLocaleDateString('es-ES')} → {new Date(plan.endDate).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  {plan.summary && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{plan.summary}</p>
                  )}

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="glass-card p-2" style={{ background: 'rgba(124,58,237,0.05)' }}>
                      <div className="text-lg font-bold" style={{ color: 'var(--color-primary-light)' }}>{plan.weeklyPostTarget}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Posts/sem</div>
                    </div>
                    <div className="glass-card p-2" style={{ background: 'rgba(6,182,212,0.05)' }}>
                      <div className="text-lg font-bold" style={{ color: 'var(--color-secondary)' }}>{plan.recommendations?.length ?? 0}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Recs</div>
                    </div>
                    <div className="glass-card p-2" style={{ background: 'rgba(16,185,129,0.05)' }}>
                      <div className="text-lg font-bold" style={{ color: '#10b981' }}>
                        {plan.impactMetrics?.totalPublications ?? '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pubs</div>
                    </div>
                    <div className="glass-card p-2" style={{ background: 'rgba(236,72,153,0.05)' }}>
                      <div className="text-lg font-bold" style={{ color: '#ec4899' }}>
                        {plan.impactMetrics ? `${plan.impactMetrics.avgEngagement.toFixed(1)}%` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Engagement</div>
                    </div>
                  </div>

                  {plan.recommendations && plan.recommendations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {plan.recommendations.slice(0, 3).map((r, i) => (
                        <span key={i} className="chip" style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-primary-light)', borderColor: 'rgba(124,58,237,0.2)' }}>
                          {r.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
