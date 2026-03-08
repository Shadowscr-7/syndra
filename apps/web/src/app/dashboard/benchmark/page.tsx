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
const REC_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  FOCUS:       { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  EXPERIMENT:  { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  REDUCE:      { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  OPPORTUNITY: { bg: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: 'rgba(124,58,237,0.2)' },
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
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Benchmarking</h1>
        <p className="page-subtitle">Compara performance entre canales, formatos y campañas</p>
      </div>

      {/* Recommendations */}
      {recs && recs.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="section-title" style={{ fontSize: '0.85rem' }}>Recomendaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recs.map((r, i) => {
              const s = REC_STYLES[r.type] ?? { bg: 'rgba(255,255,255,0.03)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
              return (
                <div key={i} className="glass-card p-4" style={{ background: s.bg, borderColor: s.border }}>
                  <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: s.color }}>
                    <span>{REC_ICONS[r.type] ?? '💡'}</span>
                    <span>{r.title}</span>
                    <span className="ml-auto text-xs" style={{ opacity: 0.6 }}>{Math.round(r.confidence * 100)}%</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{r.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Platform */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-1">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Por Plataforma</h2>
        </div>
        {!channels || channels.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-3 animate-float">📊</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No hay datos suficientes. Publica en más canales para comparar.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th style={{ textAlign: 'right' }}>Pubs</th>
                <th style={{ textAlign: 'right' }}>Engagement</th>
                <th style={{ textAlign: 'right' }}>Reach</th>
                <th>Mejor Formato</th>
                <th>Mejor Tono</th>
                <th style={{ textAlign: 'center' }}>Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.platform}>
                  <td className="font-medium capitalize">{ch.platform}</td>
                  <td style={{ textAlign: 'right' }}>{ch.totalPubs}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{ch.avgEngagement}%</td>
                  <td style={{ textAlign: 'right' }}>{ch.avgReach.toLocaleString()}</td>
                  <td className="text-xs">{ch.bestFormat ?? '—'}</td>
                  <td className="text-xs">{ch.bestTone ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{TREND_ICONS[ch.trend]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* By Format */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-2">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(124,58,237,0.04))' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Por Formato (cross-platform)</h2>
        </div>
        {!formats || formats.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-3 animate-float">📋</div>
            <p style={{ color: 'var(--color-text-muted)' }}>Sin datos de formatos.</p>
          </div>
        ) : (
          <div>
            {formats.map((f) => (
              <div key={f.format} className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{f.format}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Overall: <strong style={{ color: 'var(--color-primary-light)' }}>{f.overall}%</strong></span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {f.platforms.map((p) => (
                    <span key={p.platform} className="chip" style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-text-secondary)', borderColor: 'rgba(124,58,237,0.15)' }}>
                      <span className="capitalize font-medium">{p.platform}</span>{' '}
                      <span style={{ color: 'var(--color-text-muted)' }}>{p.avgEngagement}% ({p.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Campaign */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-3">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(124,58,237,0.04))' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Por Campaña</h2>
        </div>
        {!campaigns || campaigns.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-3 animate-float">🎯</div>
            <p style={{ color: 'var(--color-text-muted)' }}>Sin datos de campañas.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Objetivo</th>
                <th style={{ textAlign: 'right' }}>Pubs</th>
                <th style={{ textAlign: 'right' }}>Engagement</th>
                <th style={{ textAlign: 'right' }}>Reach</th>
                <th>Canales</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignId}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-xs">{c.objective}</td>
                  <td style={{ textAlign: 'right' }}>{c.totalPubs}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{c.avgEngagement}%</td>
                  <td style={{ textAlign: 'right' }}>{c.avgReach.toLocaleString()}</td>
                  <td className="text-xs">{c.platforms.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
