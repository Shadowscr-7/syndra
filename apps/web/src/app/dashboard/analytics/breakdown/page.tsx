import Link from 'next/link';
import { prisma } from '@automatismos/db';

// ============================================================
// Analytics Breakdown — Rendimiento por tema, formato y tono
// ============================================================

interface BreakdownRow {
  label: string;
  count: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  avgReach: number;
  avgEngagement: number;
}

async function getBreakdowns() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const publications = await prisma.publication.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
      include: {
        editorialRun: {
          include: { contentBrief: { include: { theme: true } } },
        },
      },
    });

    const computeBreakdown = (keyFn: (p: (typeof publications)[0]) => string): BreakdownRow[] => {
      const map = new Map<string, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number; engagement: number }>();
      for (const pub of publications) {
        const key = keyFn(pub);
        const existing = map.get(key) ?? { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, engagement: 0 };
        existing.count++;
        existing.likes += pub.likes;
        existing.comments += pub.comments;
        existing.shares += pub.shares;
        existing.saves += pub.saves;
        existing.reach += pub.reach;
        existing.engagement += pub.engagementRate ?? 0;
        map.set(key, existing);
      }

      return Array.from(map.entries())
        .map(([label, d]) => ({
          label,
          count: d.count,
          avgLikes: Math.round(d.likes / d.count),
          avgComments: Math.round(d.comments / d.count),
          avgShares: Math.round(d.shares / d.count),
          avgSaves: Math.round(d.saves / d.count),
          avgReach: Math.round(d.reach / d.count),
          avgEngagement: Number((d.engagement / d.count).toFixed(2)),
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);
    };

    return {
      byTheme: computeBreakdown((p) => p.editorialRun?.contentBrief?.theme?.name ?? 'Sin tema'),
      byFormat: computeBreakdown((p) => p.editorialRun?.contentBrief?.format ?? 'POST'),
      byTone: computeBreakdown((p) => p.editorialRun?.contentBrief?.tone ?? 'Sin tono'),
      byPlatform: computeBreakdown((p) => p.platform),
      byCta: computeBreakdown((p) => {
        const cta = p.editorialRun?.contentBrief?.cta;
        return cta && cta.length > 0 ? cta.slice(0, 40) : 'Sin CTA';
      }),
    };
  } catch {
    return null;
  }
}

function MetricCell({ value, highlight }: { value: number | string; highlight?: boolean }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums" style={{ color: highlight ? 'var(--color-primary-light)' : 'var(--color-text-secondary)' }}>
      {value}
    </td>
  );
}

function BreakdownTable({ title, icon, rows, delay = 0 }: { title: string; icon: string; rows: BreakdownRow[]; delay?: number }) {
  const maxEng = Math.max(...rows.map((r) => r.avgEngagement), 1);
  const animClass = delay === 0 ? 'animate-fade-in' : `animate-fade-in-delay-${delay}`;

  return (
    <div className={`glass-card overflow-hidden ${animClass}`}>
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-lg">{icon}</span>
        <h2 className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>
          {rows.length} categorías
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Categoría</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>#</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>❤️ Likes</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>💬 Cmts</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>🔄 Shares</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>⭐ Saves</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>👁️ Reach</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Eng%</th>
                <th className="px-3 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isTop = i === 0;
                return (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isTop ? 'rgba(124,58,237,0.06)' : 'transparent',
                    }}
                    className="transition-colors hover:!bg-white/[0.03]"
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2">
                        {isTop && <span className="text-xs">🏆</span>}
                        <span className="truncate max-w-[200px]">{row.label}</span>
                      </div>
                    </td>
                    <MetricCell value={row.count} />
                    <MetricCell value={row.avgLikes} />
                    <MetricCell value={row.avgComments} />
                    <MetricCell value={row.avgShares} />
                    <MetricCell value={row.avgSaves} />
                    <MetricCell value={row.avgReach} />
                    <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color: isTop ? '#10b981' : 'var(--color-text)' }}>
                      {row.avgEngagement}%
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(row.avgEngagement / maxEng) * 100}%`,
                            background: isTop
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function BreakdownPage() {
  const data = await getBreakdowns();

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-4xl animate-float inline-block mb-4">📊</span>
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Error cargando datos</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>No se pudieron obtener los desgloses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">📊 Desglose de Rendimiento</h1>
          <p className="page-subtitle">
            Comparativa por tema, formato, tono, CTA y plataforma — últimos 30 días
          </p>
        </div>
        <Link href="/dashboard/analytics" className="btn-ghost text-sm">
          ← Volver a Analytics
        </Link>
      </div>

      <BreakdownTable title="Por Temática" icon="💡" rows={data.byTheme} delay={1} />
      <BreakdownTable title="Por Formato" icon="📐" rows={data.byFormat} delay={2} />
      <BreakdownTable title="Por Tono" icon="🗣️" rows={data.byTone} delay={1} />
      <BreakdownTable title="Por Plataforma" icon="📱" rows={data.byPlatform} delay={2} />
      <BreakdownTable title="Por CTA" icon="🎯" rows={data.byCta} delay={1} />
    </div>
  );
}
