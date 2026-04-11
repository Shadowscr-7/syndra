import { prisma } from '@automatismos/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { approveEditorialRun, rejectEditorialRun, triggerPipeline, cancelEditorialRun, deleteEditorialRun } from '@/lib/actions';
import { AutoRefresh } from '@/components/ui/auto-refresh';
import { PublicationPreview } from './publication-preview';
import { MakeVideoButton } from './make-video-modal';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  RESEARCH: '#60a5fa',
  STRATEGY: '#818cf8',
  CONTENT: '#a78bfa',
  MEDIA: '#c084fc',
  COMPLIANCE: '#f472b6',
  REVIEW: '#fbbf24',
  APPROVED: '#34d399',
  PUBLISHING: '#22d3ee',
  PUBLISHED: '#10b981',
  REJECTED: '#ef4444',
  FAILED: '#ef4444',
  POSTPONED: '#f59e0b',
};

const STAGE_ORDER = [
  'PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA',
  'COMPLIANCE', 'REVIEW', 'APPROVED', 'PUBLISHING', 'PUBLISHED',
];

export default async function EditorialRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let run: any = null;
  let dbOk = true;
  try {
    run = await prisma.editorialRun.findUnique({
      where: { id },
      include: {
        workspace: { select: { name: true, logoUrl: true } },
        campaign: true,
        researchSnapshots: { orderBy: { relevanceScore: 'desc' } },
        contentBrief: {
          include: {
            theme: true,
            contentVersions: {
              include: { mediaAssets: true },
              orderBy: { version: 'desc' },
            },
          },
        },
        approvalEvents: { orderBy: { createdAt: 'desc' } },
        publications: true,
        jobQueueLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  } catch (e) {
    console.error('[EditorialRunDetailPage] DB error:', e);
    dbOk = false;
  }

  if (!run) notFound();

  const currentStageIndex = STAGE_ORDER.indexOf(run.status);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <Link
            href="/dashboard/editorial"
            className="text-sm font-medium transition-colors hover:brightness-125 inline-flex items-center gap-1 mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← Cola editorial
          </Link>
          <h1 className="page-title">Detalle de corrida</h1>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {run.id}
          </p>
        </div>
        <span className="badge text-sm px-4 py-2" style={{ backgroundColor: `${STATUS_COLORS[run.status] ?? '#64748b'}20`, color: STATUS_COLORS[run.status] ?? '#64748b' }}>
          <span className="badge-dot w-2.5 h-2.5" style={{ backgroundColor: STATUS_COLORS[run.status] }} />
          {run.status}
        </span>
      </div>

      <AutoRefresh status={run.status} intervalMs={4000} />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 animate-fade-in-delay-1">
        {run.status === 'PENDING' && (
          <form action={triggerPipeline}>
            <input type="hidden" name="runId" value={run.id} />
            <button type="submit" className="btn-primary text-sm">🚀 Iniciar Pipeline</button>
          </form>
        )}
        {(run.status === 'REJECTED' || run.status === 'FAILED') && (
          <form action={triggerPipeline}>
            <input type="hidden" name="runId" value={run.id} />
            <button type="submit" className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              🔄 Reiniciar Pipeline
            </button>
          </form>
        )}
        {['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE'].includes(run.status) && (
          <form action={cancelEditorialRun}>
            <input type="hidden" name="runId" value={run.id} />
            <button type="submit" className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              ⛔ Detener
            </button>
          </form>
        )}
        <form action={deleteEditorialRun}>
          <input type="hidden" name="runId" value={run.id} />
          <button type="submit" className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            🗑️ Eliminar
          </button>
        </form>

        {/* Avatar Video — available when there is content to convert */}
        <MakeVideoButton
          runId={run.id}
          hasContent={!!run.contentBrief?.contentVersions?.length}
        />
      </div>

      {/* Error Message */}
      {run.status === 'FAILED' && run.errorMessage && (
        <div className="animate-fade-in-delay-1 rounded-xl p-4" style={{
          backgroundColor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <div className="flex items-start gap-3">
            <span className="text-xl">💥</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>Error del pipeline</h3>
              <pre className="text-xs whitespace-pre-wrap break-words font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                {run.errorMessage}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Progress */}
      <div className="glass-card p-6 animate-fade-in-delay-1">
        <h2 className="section-title">PROGRESO DEL PIPELINE</h2>
        <div className="flex gap-1.5 mt-4">
          {STAGE_ORDER.map((stage, i) => {
            const isActive = i <= currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage} className="flex-1">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${isCurrent ? 'animate-pulse-glow' : ''}`}
                  style={{
                    backgroundColor: isActive ? (STATUS_COLORS[run.status] ?? '#64748b') : 'rgba(255,255,255,0.06)',
                    boxShadow: isCurrent ? `0 0 10px ${STATUS_COLORS[run.status]}40` : 'none',
                  }}
                />
                <p className="text-[10px] mt-1.5 text-center font-medium tracking-wide" style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {stage.substring(0, 4)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Research Snapshots */}
        <div className="glass-card p-6 animate-fade-in-delay-2">
          <h2 className="section-title">🔬 Research ({run.researchSnapshots.length})</h2>
          {run.researchSnapshots.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl animate-float inline-block">🔍</span>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin datos de research aún.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {run.researchSnapshots.slice(0, 5).map((snap: any) => (
                <div key={snap.id} className="rounded-xl p-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{snap.title}</h3>
                    <span className="chip" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                      {(snap.relevanceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    {snap.source} · {snap.keyPoints.slice(0, 2).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Brief */}
        <div className="glass-card p-6 animate-fade-in-delay-2">
          <h2 className="section-title">📋 Brief</h2>
          {!run.contentBrief ? (
            <div className="text-center py-6">
              <span className="text-2xl animate-float inline-block">📝</span>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Brief no generado aún.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4 text-sm">
              {[
                { label: 'Ángulo', value: run.contentBrief.angle },
                { label: 'Formato', value: run.contentBrief.format },
                { label: 'Tono', value: run.contentBrief.tone },
                { label: 'CTA', value: run.contentBrief.cta },
                { label: 'Tema', value: run.contentBrief.theme?.name ?? 'N/A' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="text-xs font-medium min-w-[60px]" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Versions — Publication Preview */}
        <div className="glass-card p-6 lg:col-span-2 animate-fade-in-delay-3">
          <h2 className="section-title">
            👁️ Vista previa de publicación
          </h2>
          {!run.contentBrief?.contentVersions.length ? (
            <div className="text-center py-8">
              <span className="text-2xl animate-float inline-block">✏️</span>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin versiones generadas aún.</p>
            </div>
          ) : (
            <div className="mt-6">
              {(() => {
                const mainVersion = run.contentBrief.contentVersions.find((v: any) => v.isMain)
                  || run.contentBrief.contentVersions[0];
                const format = run.contentBrief.format || 'POST';
                const accountName = run.workspace?.name || 'mi_marca';

                return (
                  <PublicationPreview
                    format={format}
                    version={mainVersion}
                    accountName={accountName}
                    accountAvatar={run.workspace?.logoUrl}
                    runId={run.id}
                    isReview={run.status === 'REVIEW'}
                    approveAction={approveEditorialRun}
                    rejectAction={rejectEditorialRun}
                  />
                );
              })()}

              {/* Other versions (collapsed) */}
              {run.contentBrief.contentVersions.length > 1 && (
                <details className="mt-6">
                  <summary className="text-xs font-medium cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                    📝 Ver {run.contentBrief.contentVersions.length - 1} versión(es) alternativa(s)
                  </summary>
                  <div className="mt-4 space-y-4">
                    {run.contentBrief.contentVersions
                      .filter((v: any) => !v.isMain && v.id !== (run.contentBrief.contentVersions.find((m: any) => m.isMain) || run.contentBrief.contentVersions[0]).id)
                      .map((ver: any) => (
                        <div
                          key={ver.id}
                          className="rounded-xl p-4"
                          style={{ border: '1px solid var(--color-border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>v{ver.version}</span>
                            {ver.score && (
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Score: {ver.score.toFixed(1)}</span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="font-semibold">Hook:</span> {ver.hook}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {ver.copy.substring(0, 150)}{ver.copy.length > 150 ? '...' : ''}
                          </p>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Approval Events */}
        <div className="glass-card p-6 animate-fade-in-delay-3">
          <h2 className="section-title">📱 Eventos de aprobación</h2>
          {run.approvalEvents.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl animate-float inline-block">📋</span>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin eventos aún.</p>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {run.approvalEvents.map((evt: any) => (
                <div key={evt.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(evt.createdAt).toLocaleTimeString('es-MX')}
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{evt.action}</span>
                  {evt.approvedBy && <span style={{ color: 'var(--color-text-muted)' }}>por @{evt.approvedBy}</span>}
                  {evt.versionNumber && <span className="chip">v{evt.versionNumber}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job Logs */}
        <div className="glass-card p-6 animate-fade-in-delay-3">
          <h2 className="section-title">📊 Logs de Jobs</h2>
          {run.jobQueueLogs.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl animate-float inline-block">📊</span>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin logs aún.</p>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {run.jobQueueLogs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(log.createdAt).toLocaleTimeString('es-MX')}
                  </span>
                  <span className="badge" style={{
                    backgroundColor: log.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : log.status === 'FAILED' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
                    color: log.status === 'COMPLETED' ? '#10b981' : log.status === 'FAILED' ? '#ef4444' : '#64748b',
                  }}>
                    {log.status}
                  </span>
                  <span style={{ color: 'var(--color-text)' }}>{log.jobType}</span>
                  {log.latencyMs && <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>{log.latencyMs}ms</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
