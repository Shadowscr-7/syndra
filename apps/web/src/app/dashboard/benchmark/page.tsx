import { getApiUrl } from '@/lib/api';
import { getSession } from '@/lib/session';

interface ChannelBenchmark {
  platform: string;
  totalPubs: number;
  avgEngagement: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  bestFormat: string | null;
  bestTone: string | null;
  bestObjective: string | null;
  trend: 'UP' | 'DOWN' | 'FLAT';
}

interface FormatBenchmark {
  format: string;
  platforms: Array<{ platform: string; avgEngagement: number; count: number }>;
  overall: number;
}

interface CampaignBenchmark {
  campaignId: string;
  name: string;
  objective: string;
  totalPubs: number;
  avgEngagement: number;
  avgReach: number;
  platforms: string[];
}

interface Recommendation {
  type: string;
  channel: string;
  title: string;
  description: string;
  confidence: number;
}

async function fetchData<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

const TREND_ICONS: Record<string, string> = { UP: '📈', DOWN: '📉', FLAT: '➡️' };
const REC_COLORS: Record<string, string> = {
  FOCUS: 'bg-green-50 border-green-200 text-green-800',
  EXPERIMENT: 'bg-blue-50 border-blue-200 text-blue-800',
  REDUCE: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  OPPORTUNITY: 'bg-purple-50 border-purple-200 text-purple-800',
};
const REC_ICONS: Record<string, string> = { FOCUS: '🎯', EXPERIMENT: '🧪', REDUCE: '📉', OPPORTUNITY: '💡' };

export default async function BenchmarkPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'default';
  const q = `?workspaceId=${wsId}`;

  const [channels, formats, campaigns, recs] = await Promise.all([
    fetchData<ChannelBenchmark[]>(`/api/analytics/benchmark/platforms${q}`),
    fetchData<FormatBenchmark[]>(`/api/analytics/benchmark/formats${q}`),
    fetchData<CampaignBenchmark[]>(`/api/analytics/benchmark/campaigns${q}`),
    fetchData<Recommendation[]>(`/api/analytics/benchmark/recommendations${q}`),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Benchmarking</h1>
        <p className="text-gray-500 mt-1">Compara performance entre canales, formatos y campañas</p>
      </div>

      {/* Recommendations */}
      {recs && recs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Recomendaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recs.map((r, i) => (
              <div key={i} className={`border rounded-lg p-4 ${REC_COLORS[r.type] ?? 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>{REC_ICONS[r.type] ?? '💡'}</span>
                  <span>{r.title}</span>
                  <span className="ml-auto text-xs opacity-60">{Math.round(r.confidence * 100)}% conf</span>
                </div>
                <p className="text-xs mt-1 opacity-80">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Platform */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Por Plataforma</h2>
        </div>
        {!channels || channels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay datos suficientes. Publica en más canales para comparar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Canal</th>
                <th className="px-4 py-3 text-right">Pubs</th>
                <th className="px-4 py-3 text-right">Engagement</th>
                <th className="px-4 py-3 text-right">Reach</th>
                <th className="px-4 py-3 text-left">Mejor Formato</th>
                <th className="px-4 py-3 text-left">Mejor Tono</th>
                <th className="px-4 py-3 text-center">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {channels.map((ch) => (
                <tr key={ch.platform} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium capitalize">{ch.platform}</td>
                  <td className="px-4 py-3 text-right">{ch.totalPubs}</td>
                  <td className="px-4 py-3 text-right font-mono">{ch.avgEngagement}%</td>
                  <td className="px-4 py-3 text-right">{ch.avgReach.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{ch.bestFormat ?? '-'}</td>
                  <td className="px-4 py-3 text-xs">{ch.bestTone ?? '-'}</td>
                  <td className="px-4 py-3 text-center">{TREND_ICONS[ch.trend]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* By Format */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Por Formato (cross-platform)</h2>
        </div>
        {!formats || formats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Sin datos.</div>
        ) : (
          <div className="divide-y">
            {formats.map((f) => (
              <div key={f.format} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{f.format}</span>
                  <span className="text-xs text-gray-500">Overall: {f.overall}%</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {f.platforms.map((p) => (
                    <div key={p.platform} className="bg-gray-50 rounded px-3 py-1 text-xs">
                      <span className="font-medium capitalize">{p.platform}</span>{' '}
                      <span className="text-gray-500">{p.avgEngagement}% ({p.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Campaign */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Por Campaña</h2>
        </div>
        {!campaigns || campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Sin datos de campañas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Campaña</th>
                <th className="px-4 py-3 text-left">Objetivo</th>
                <th className="px-4 py-3 text-right">Pubs</th>
                <th className="px-4 py-3 text-right">Engagement</th>
                <th className="px-4 py-3 text-right">Reach</th>
                <th className="px-4 py-3 text-left">Canales</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c) => (
                <tr key={c.campaignId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs">{c.objective}</td>
                  <td className="px-4 py-3 text-right">{c.totalPubs}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.avgEngagement}%</td>
                  <td className="px-4 py-3 text-right">{c.avgReach.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{c.platforms.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
