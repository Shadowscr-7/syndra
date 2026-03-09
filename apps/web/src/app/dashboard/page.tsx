import { StatCard } from '@/components/ui/stat-card';
import { RunLink } from '@/components/ui/run-link';
import { ExecutiveSummary } from '@/components/dashboard/executive-summary';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { GrowthEngineCard } from '@/components/dashboard/growth-engine-card';
import { prisma } from '@automatismos/db';
import Link from 'next/link';

async function getStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [publishedToday, inQueue, pendingReview, recentRuns] = await Promise.all([
      prisma.publication.count({
        where: { publishedAt: { gte: today }, status: 'PUBLISHED' },
      }),
      prisma.editorialRun.count({
        where: { status: { in: ['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE'] } },
      }),
      prisma.editorialRun.count({
        where: { status: 'REVIEW' },
      }),
      prisma.editorialRun.findMany({
        include: {
          contentBrief: { select: { angle: true, format: true, tone: true } },
          campaign: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
    ]);

    const avgEngagement = await prisma.publication.aggregate({
      where: { engagementRate: { not: null } },
      _avg: { engagementRate: true },
    });

    return { publishedToday, inQueue, pendingReview, recentRuns, avgRate: avgEngagement._avg.engagementRate, dbOk: true };
  } catch {
    return { publishedToday: 0, inQueue: 0, pendingReview: 0, recentRuns: [] as never[], avgRate: null, dbOk: false };
  }
}

const STATUS_ICON: Record<string, string> = {
  PUBLISHED: '✅', REVIEW: '⏳', FAILED: '❌', REJECTED: '🚫',
  PENDING: '🔄', RESEARCH: '🔬', STRATEGY: '🧠', CONTENT: '✍️',
  MEDIA: '🖼️', COMPLIANCE: '🛡️', APPROVED: '✅', PUBLISHING: '📤',
};

export default async function DashboardPage() {
  const { publishedToday, inQueue, pendingReview, recentRuns, avgRate, dbOk } = await getStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Resumen del pipeline editorial y métricas clave.
        </p>
      </div>

      {!dbOk && (
        <div className="glass-card px-4 py-3 text-sm animate-fade-in" style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
          ⚠️ Base de datos no disponible — mostrando datos vacíos.
        </div>
      )}

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Executive Summary */}
      <ExecutiveSummary />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="animate-fade-in">
          <StatCard title="Publicaciones hoy" value={String(publishedToday)} icon="📤" gradient="stat-gradient-purple" />
        </div>
        <div className="animate-fade-in-delay-1">
          <StatCard title="En cola" value={String(inQueue)} icon="📋" gradient="stat-gradient-cyan" />
        </div>
        <div className="animate-fade-in-delay-2">
          <StatCard title="Pendientes review" value={String(pendingReview)} icon="⏳" gradient="stat-gradient-amber" />
        </div>
        <div className="animate-fade-in-delay-3">
          <StatCard
            title="Engagement promedio"
            value={avgRate ? `${(avgRate * 100).toFixed(1)}%` : '—'}
            icon="📈"
            gradient="stat-gradient-green"
          />
        </div>
      </div>

      {/* AI Growth Engine */}
      <div className="animate-fade-in-delay-2">
        <GrowthEngineCard />
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6 animate-fade-in-delay-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Actividad reciente
          </h2>
          <Link
            href="/dashboard/editorial"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-primary-light)', background: 'rgba(124,58,237,0.08)' }}
          >
            Ver todo →
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-float">🚀</div>
            <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Sin actividad aún
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Las corridas editoriales aparecerán aquí cuando el pipeline procese contenido.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run, i) => (
              <RunLink
                key={run.id}
                href={`/dashboard/editorial/${run.id}`}
                status={run.status}
                angle={run.contentBrief?.angle ?? undefined}
                campaignName={run.campaign?.name ?? undefined}
                runId={run.id}
                updatedAt={run.updatedAt.toISOString()}
                format={run.contentBrief?.format ?? undefined}
                tone={run.contentBrief?.tone ?? undefined}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
