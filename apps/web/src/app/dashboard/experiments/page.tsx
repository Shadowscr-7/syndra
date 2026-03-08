import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import Link from 'next/link';

// ============================================================
// Experiments — A/B Testing Dashboard (Feature #6)
// ============================================================

async function getExperimentsData(workspaceId: string) {
  try {
    const [experiments, stats] = await Promise.all([
      prisma.contentExperiment.findMany({
        where: { workspaceId },
        orderBy: { startedAt: 'desc' },
        take: 50,
        include: {
          variants: true,
        },
      }),
      Promise.all([
        prisma.contentExperiment.count({ where: { workspaceId } }),
        prisma.contentExperiment.count({ where: { workspaceId, status: 'RUNNING' } }),
        prisma.contentExperiment.count({ where: { workspaceId, status: 'COMPLETED' } }),
        prisma.contentExperimentVariant.count({
          where: { experiment: { workspaceId }, isWinner: true },
        }),
      ]),
    ]);

    return {
      experiments,
      totalExperiments: stats[0],
      running: stats[1],
      completed: stats[2],
      winners: stats[3],
    };
  } catch {
    return null;
  }
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  TONE: { label: 'Tono', icon: '🗣️' },
  FORMAT: { label: 'Formato', icon: '📐' },
  CTA: { label: 'CTA', icon: '🎯' },
  HOOK: { label: 'Hook', icon: '🪝' },
  HOUR: { label: 'Horario', icon: '⏰' },
  IMAGE_STYLE: { label: 'Estilo Visual', icon: '🎨' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  RUNNING: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4' },
  COMPLETED: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

export default async function ExperimentsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  const data = await getExperimentsData(wsId);

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-4xl animate-float inline-block mb-4">🧪</span>
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Experimentos no disponible</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Error al conectar con la base de datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">🧪 A/B Testing Editorial</h1>
          <p className="page-subtitle">
            Compara variantes de contenido y descubre qué funciona mejor. Los resultados alimentan el learning loop.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        {[
          { label: 'Total Experimentos', value: data.totalExperiments, icon: '🧪', gradient: 'stat-gradient-purple' },
          { label: 'En Curso', value: data.running, icon: '🔄', gradient: 'stat-gradient-cyan' },
          { label: 'Completados', value: data.completed, icon: '✅', gradient: 'stat-gradient-green' },
          { label: 'Ganadores', value: data.winners, icon: '🏆', gradient: 'stat-gradient-amber' },
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

      {/* Info */}
      <div className="glass-card p-4 text-sm animate-fade-in-delay-1" style={{ color: 'var(--color-text-muted)', background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(124,58,237,0.04))' }}>
        <strong style={{ color: 'var(--color-text-secondary)' }}>💡 ¿Cómo funciona?</strong> Lanza un experimento desde la{' '}
        cola editorial para comparar variantes de tono, CTA, formato u otros. Tras 48h se evalúan métricas y el ganador
        alimenta automáticamente el perfil de aprendizaje.
        <br />
        API: <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}>POST /api/experiments</code>
      </div>

      {/* Experiments List */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-2">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}>
          <h2 className="font-bold text-sm" style={{ color: '#a78bfa' }}>📋 Historial de Experimentos</h2>
        </div>

        {data.experiments.length === 0 ? (
          <div className="p-10 text-center">
            <span className="text-4xl animate-float inline-block mb-3">🧪</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Aún no hay experimentos. Lanza uno desde la cola editorial o vía API.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {data.experiments.map((exp) => {
              const typeInfo = TYPE_LABELS[exp.experimentType] ?? { label: exp.experimentType, icon: '🔬' };
              const statusStyle = STATUS_STYLE[exp.status] ?? STATUS_STYLE['RUNNING'];
              const winner = exp.variants.find((v: any) => v.isWinner);

              return (
                <div key={exp.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {typeInfo.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                          >
                            {exp.status}
                          </span>
                        </div>
                        {exp.hypothesis && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {exp.hypothesis}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(exp.startedAt).toLocaleDateString('es-ES')}
                      </p>
                      {winner && (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: '#10b981' }}>
                          🏆 Ganador: {(winner as any).label}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {exp.variants.map((v: any) => (
                      <div
                        key={v.id}
                        className="rounded-xl px-3 py-2"
                        style={{
                          border: v.isWinner
                            ? '1px solid rgba(16,185,129,0.3)'
                            : '1px solid var(--color-border-subtle)',
                          background: v.isWinner
                            ? 'rgba(16,185,129,0.06)'
                            : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: v.isWinner ? '#10b981' : 'var(--color-text-secondary)' }}>
                            Variante {v.label} {v.isWinner ? '🏆' : ''}
                          </span>
                          {v.performanceScore != null && (
                            <span className="text-xs font-semibold" style={{ color: v.isWinner ? '#10b981' : 'var(--color-text-muted)' }}>
                              {v.performanceScore.toFixed(1)}pts
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {JSON.stringify(v.variantConfig).substring(0, 80)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
