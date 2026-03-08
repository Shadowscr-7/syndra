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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export default async function StrategyHistoryPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'default';
  const plans = await fetchHistory(wsId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 Historial de Estrategias</h1>
          <p className="text-gray-500 mt-1">Versiones de planes estratégicos y su impacto</p>
        </div>
        <Link href="/dashboard/strategist" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          ← Plan Activo
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-700">Sin planes estratégicos</h3>
          <p className="text-gray-500 mt-2">Genera tu primer plan desde el panel del Estratega IA.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">v{plan.version}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[plan.status] ?? 'bg-gray-100'}`}>
                      {plan.status}
                    </span>
                    <span className="text-xs text-gray-400">{plan.periodType}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(plan.startDate).toLocaleDateString('es-ES')} → {new Date(plan.endDate).toLocaleDateString('es-ES')}
                  </div>
                </div>

                {plan.summary && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.summary}</p>
                )}

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-lg font-bold text-gray-900">{plan.weeklyPostTarget}</div>
                    <div className="text-xs text-gray-500">Posts/sem</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-lg font-bold text-gray-900">{plan.recommendations?.length ?? 0}</div>
                    <div className="text-xs text-gray-500">Recs</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-lg font-bold text-gray-900">
                      {plan.impactMetrics?.totalPublications ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">Pubs</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-lg font-bold text-gray-900">
                      {plan.impactMetrics ? `${plan.impactMetrics.avgEngagement.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-xs text-gray-500">Engagement</div>
                  </div>
                </div>

                {plan.recommendations && plan.recommendations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {plan.recommendations.slice(0, 3).map((r, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{r.title}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
