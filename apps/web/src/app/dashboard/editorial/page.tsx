import { prisma } from '@automatismos/db';
import Link from 'next/link';
import { createEditorialRun } from '@/lib/actions';
import { getSession } from '@/lib/session';
import { AutoRefresh } from '@/components/ui/auto-refresh';

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

export default async function EditorialPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let runs: Awaited<ReturnType<typeof prisma.editorialRun.findMany>> = [];
  let campaigns: { id: string; name: string }[] = [];
  let dbOk = true;
  try {
    [runs, campaigns] = await Promise.all([
      prisma.editorialRun.findMany({
        where: { workspaceId: wsId },
        include: {
          campaign: { select: { name: true } },
          contentBrief: {
            select: {
              angle: true,
              format: true,
              tone: true,
              theme: { select: { name: true } },
            },
          },
          _count: {
            select: {
              researchSnapshots: true,
              approvalEvents: true,
              publications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.campaign.findMany({
        where: { workspaceId: wsId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
  } catch {
    dbOk = false;
  }

  // Determine if any run is actively processing
  const activeStatuses = ['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE', 'PUBLISHING'];
  const activeRun = runs.find((r) => activeStatuses.includes(r.status));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Cola Editorial</h1>
          <p className="page-subtitle">Corridas editoriales y su estado en el pipeline.</p>
        </div>
        {activeRun && <AutoRefresh status={activeRun.status} intervalMs={5000} />}
      </div>

      <div className="animate-fade-in-delay-1">
        <details>
          <summary className="btn-primary cursor-pointer list-none text-sm w-fit select-none">
            🚀 Nueva corrida manual
          </summary>
          <form
            action={createEditorialRun}
            className="glass-card p-6 mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Campaña (opcional)</label>
                <select name="campaignId" className="input-field">
                  <option value="">Sin campaña</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Prioridad (1-10)</label>
                <input type="number" name="priority" defaultValue={5} min={1} max={10} className="input-field" />
              </div>
              <div>
                <label className="input-label">Canales</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                    <input type="checkbox" name="channels" value="instagram" defaultChecked className="accent-purple-500" /> 📸 Instagram
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                    <input type="checkbox" name="channels" value="facebook" className="accent-purple-500" /> 📘 Facebook
                  </label>
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full text-sm">
              🚀 Crear corrida
            </button>
          </form>
        </details>
      </div>

      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-1">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Tema / Ángulo</th>
              <th>Formato</th>
              <th>Canal</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl animate-float">📝</span>
                    <p style={{ color: 'var(--color-text-muted)' }}>No hay corridas editoriales aún. Crea una corrida manual o espera al scheduler diario.</p>
                  </div>
                </td>
              </tr>
            ) : (
              runs.map((run) => {
                const isRunning = ['RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE', 'PUBLISHING'].includes(run.status);
                return (
                <tr key={run.id} className={isRunning ? 'row-pipeline-active' : ''}>
                  <td>
                    {new Date(run.createdAt).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="badge" style={{ backgroundColor: `${STATUS_COLORS[run.status] ?? '#64748b'}20`, color: STATUS_COLORS[run.status] ?? '#64748b' }}>
                        <span className={`badge-dot${isRunning ? ' animate-pulse' : ''}`} style={{ backgroundColor: STATUS_COLORS[run.status] ?? '#64748b' }} />
                        {run.status}
                      </span>
                      {isRunning && (
                        <span className="text-[10px] animate-pulse" style={{ color: STATUS_COLORS[run.status] }}>⚡</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {run.contentBrief?.theme?.name ?? run.campaign?.name ?? 'Sin tema'}
                      </div>
                      {run.contentBrief?.angle && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {run.contentBrief.angle.substring(0, 60)}{run.contentBrief.angle.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="chip">{run.contentBrief?.format ?? '—'}</span>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      {run.targetChannels.map((ch) => (
                        <span key={ch} className="chip" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                          {ch}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/editorial/${run.id}`}
                      className="text-sm font-semibold transition-colors hover:brightness-125"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
