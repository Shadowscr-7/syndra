import Link from 'next/link';
import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';

// ============================================================
// Analytics Dashboard — Vista general de rendimiento
// ============================================================

async function getAnalyticsData(workspaceId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [totalPub, last30, last7, avgMetrics, topPosts, worstPosts, insights] =
      await Promise.all([
        prisma.publication.count({
          where: { workspaceId, status: 'PUBLISHED' },
        }),
        prisma.publication.count({
          where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
        }),
        prisma.publication.count({
          where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: sevenDaysAgo } },
        }),
        prisma.publication.aggregate({
          where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
          _avg: {
            likes: true,
            comments: true,
            shares: true,
            saves: true,
            reach: true,
            impressions: true,
            engagementRate: true,
          },
        }),
        prisma.publication.findMany({
          where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
          orderBy: { engagementRate: 'desc' },
          take: 5,
          include: {
            editorialRun: {
              include: { contentBrief: { include: { theme: true } } },
            },
          },
        }),
        prisma.publication.findMany({
          where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo }, engagementRate: { not: null } },
          orderBy: { engagementRate: 'asc' },
          take: 3,
          include: {
            editorialRun: {
              include: { contentBrief: { include: { theme: true } } },
            },
          },
        }),
        prisma.performanceInsight.findMany({
          where: {
            workspaceId,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
          orderBy: { score: 'desc' },
          take: 6,
        }),
      ]);

    return {
      totalPub,
      last30,
      last7,
      avgMetrics: avgMetrics._avg,
      topPosts,
      worstPosts,
      insights,
    };
  } catch {
    return null;
  }
}

const insightIcons: Record<string, string> = {
  BEST_FORMAT: '📐',
  BEST_THEME: '💡',
  BEST_TONE: '🗣️',
  BEST_HOUR: '⏰',
  BEST_CTA: '🎯',
  TREND_UP: '📈',
  TREND_DOWN: '📉',
  WEEKLY_SUMMARY: '📊',
  SUGGESTION: '💡',
};

export default async function AnalyticsPage() {
  const session = await getSession();
  const workspaceId = session?.workspaceId ?? '';
  const data = await getAnalyticsData(workspaceId);

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-4xl animate-float inline-block mb-4">📈</span>
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Analytics no disponible</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Error al conectar con la base de datos</p>
      </div>
    );
  }

  const { avgMetrics } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">📈 Analytics</h1>
          <p className="page-subtitle">Rendimiento de contenido — últimos 30 días</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics/breakdown" className="btn-primary text-sm">
            📊 Desglose
          </Link>
          <Link href="/dashboard/analytics/hours" className="btn-ghost text-sm">
            ⏰ Mejores Horas
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in-delay-1">
        {[
          { label: 'Total publicados', value: data.totalPub, icon: '📝', gradient: 'stat-gradient-blue' },
          { label: 'Últimos 30d', value: data.last30, icon: '📅', gradient: 'stat-gradient-purple' },
          { label: 'Últimos 7d', value: data.last7, icon: '🗓️', gradient: 'stat-gradient-green' },
          { label: 'Engagement %', value: `${(avgMetrics.engagementRate ?? 0).toFixed(1)}%`, icon: '💫', gradient: 'stat-gradient-amber' },
          { label: 'Likes prom.', value: Math.round(avgMetrics.likes ?? 0), icon: '❤️', gradient: 'stat-gradient-pink' },
          { label: 'Alcance prom.', value: Math.round(avgMetrics.reach ?? 0), icon: '👁️', gradient: 'stat-gradient-cyan' },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card p-4 ${stat.gradient}`}>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {stat.icon} {stat.label}
            </div>
            <div className="text-2xl font-extrabold mt-1 tracking-tight" style={{ color: 'var(--color-text)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement Averages Detail */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-fade-in-delay-2">
        {[
          { label: '❤️ Likes', value: Math.round(avgMetrics.likes ?? 0), color: '#ef4444' },
          { label: '💬 Comentarios', value: Math.round(avgMetrics.comments ?? 0), color: '#60a5fa' },
          { label: '🔄 Compartidos', value: Math.round(avgMetrics.shares ?? 0), color: '#22c55e' },
          { label: '📌 Guardados', value: Math.round(avgMetrics.saves ?? 0), color: '#a78bfa' },
          { label: '👁️ Alcance', value: Math.round(avgMetrics.reach ?? 0), color: '#06b6d4' },
          { label: '📺 Impresiones', value: Math.round(avgMetrics.impressions ?? 0), color: '#94a3b8' },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4 text-center">
            <div className="text-xl font-extrabold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Insights & Suggestions */}
      {data.insights.length > 0 && (
        <div className="glass-card p-6 animate-fade-in-delay-2" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.05))' }}>
          <h2 className="section-title">💡 Insights & Recomendaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {data.insights.map((insight) => (
              <div key={insight.id} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{insightIcons[insight.type] ?? '💡'}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{insight.title}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{insight.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-3">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(34,197,94,0.05))' }}>
            <h2 className="font-bold text-sm" style={{ color: '#22c55e' }}>🏆 Top 5 Posts (Engagement)</h2>
          </div>
          <div>
            {data.topPosts.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-2xl animate-float inline-block">🏆</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin publicaciones aún</p>
              </div>
            ) : (
              data.topPosts.map((pub, i) => (
                <div key={pub.id} className="px-5 py-3.5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(34,197,94,0.1))', color: '#22c55e' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {pub.editorialRun?.contentBrief?.theme?.name ?? 'Sin tema'} — {pub.editorialRun?.contentBrief?.format ?? 'POST'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {pub.platform} · {pub.publishedAt?.toLocaleDateString('es-ES') ?? '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#22c55e' }}>{pub.engagementRate?.toFixed(1)}%</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>❤️ {pub.likes} · 👁️ {pub.reach}</div>
                  </div>
                  {pub.permalink && (
                    <a href={pub.permalink} target="_blank" rel="noopener noreferrer" className="text-sm transition-colors hover:brightness-125" style={{ color: 'var(--color-primary)' }}>↗</a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Worst Posts */}
        <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-3">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))' }}>
            <h2 className="font-bold text-sm" style={{ color: '#ef4444' }}>📉 Posts con Menor Rendimiento</h2>
          </div>
          <div>
            {data.worstPosts.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-2xl animate-float inline-block">📉</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin publicaciones aún</p>
              </div>
            ) : (
              data.worstPosts.map((pub) => (
                <div key={pub.id} className="px-5 py-3.5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>📉</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {pub.editorialRun?.contentBrief?.theme?.name ?? 'Sin tema'} — {pub.editorialRun?.contentBrief?.format ?? 'POST'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {pub.platform} · Tono: {pub.editorialRun?.contentBrief?.tone ?? '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#ef4444' }}>{pub.engagementRate?.toFixed(1) ?? '0.0'}%</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>❤️ {pub.likes} · 👁️ {pub.reach}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick info */}
      <div className="glass-card p-4 text-sm animate-fade-in-delay-3" style={{ color: 'var(--color-text-muted)' }}>
        <strong style={{ color: 'var(--color-text-secondary)' }}>ℹ️ Info:</strong> Las métricas se actualizan automáticamente cada 6 horas desde las
        APIs de Meta. Los insights se regeneran cada lunes. Puedes forzar una actualización desde la
        API: <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}>POST /api/analytics/collect</code>
      </div>
    </div>
  );
}
