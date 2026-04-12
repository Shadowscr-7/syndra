import { prisma } from '@automatismos/db';
import Link from 'next/link';
import { getSession } from '@/lib/session';

const PUB_STATUS_COLORS: Record<string, string> = {
  QUEUED: '#94a3b8',
  PUBLISHING: '#60a5fa',
  PUBLISHED: '#10b981',
  FAILED: '#ef4444',
  RETRYING: '#f59e0b',
  NEEDS_MANUAL_ATTENTION: '#ef4444',
};

const PUB_STATUS_LABELS: Record<string, string> = {
  QUEUED: '🕐 En cola',
  PUBLISHING: '📤 Publicando',
  PUBLISHED: '✅ Publicado',
  FAILED: '❌ Fallido',
  RETRYING: '🔄 Reintentando',
  NEEDS_MANUAL_ATTENTION: '⚠️ Atención manual',
};

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const wsId = session?.workspaceId ?? '';
  let publications: any[] = [];
  let stats = { total: 0, published: 0, failed: 0, queued: 0 };
  let dbOk = true;

  try {
    const where: Record<string, unknown> = { workspaceId: wsId };
    if (params.platform) where.platform = params.platform;
    if (params.status) where.status = params.status;

    publications = await prisma.publication.findMany({
      where,
      include: {
        editorialRun: {
          select: {
            id: true,
            targetChannels: true,
            publishWindow: true,
            contentBrief: {
              select: {
                angle: true,
                format: true,
                contentVersions: {
                  where: { isMain: true },
                  take: 1,
                  select: { caption: true, copy: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const counts = await prisma.publication.groupBy({
      by: ['status'],
      where: { workspaceId: wsId },
      _count: true,
    });

    stats.total = counts.reduce((s, c) => s + c._count, 0);
    stats.published = counts.find((c) => c.status === 'PUBLISHED')?._count ?? 0;
    stats.failed =
      (counts.find((c) => c.status === 'FAILED')?._count ?? 0) +
      (counts.find((c) => c.status === 'NEEDS_MANUAL_ATTENTION')?._count ?? 0);
    stats.queued =
      (counts.find((c) => c.status === 'QUEUED')?._count ?? 0) +
      (counts.find((c) => c.status === 'PUBLISHING')?._count ?? 0) +
      (counts.find((c) => c.status === 'RETRYING')?._count ?? 0);
  } catch {
    dbOk = false;
  }

  const filters = [
    { label: 'Todos', href: '/dashboard/publications' },
    { label: '📷 Instagram', href: '/dashboard/publications?platform=INSTAGRAM' },
    { label: '📘 Facebook', href: '/dashboard/publications?platform=FACEBOOK' },
    { label: '✅ Publicados', href: '/dashboard/publications?status=PUBLISHED' },
    { label: '❌ Fallidos', href: '/dashboard/publications?status=FAILED' },
    { label: '⚠️ Atención', href: '/dashboard/publications?status=NEEDS_MANUAL_ATTENTION' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Publicaciones</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Historial de publicaciones en Instagram y Facebook.
          </p>
        </div>
      </div>

      {!dbOk && (
        <div
          className="rounded-lg border px-4 py-3 mb-6 text-sm"
          style={{ backgroundColor: '#f59e0b15', borderColor: '#f59e0b40', color: '#f59e0b' }}
        >
          ⚠️ Base de datos no disponible. Inicia Docker y reinicia la app.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#94a3b8' },
          { label: 'Publicadas', value: stats.published, color: '#10b981' },
          { label: 'En cola', value: stats.queued, color: '#60a5fa' },
          { label: 'Con error', value: stats.failed, color: '#ef4444' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="text-3xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderColor: 'var(--color-border)' }} className="border-b">
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Fecha</th>
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Red</th>
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Contenido</th>
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Estado</th>
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Engagement</th>
              <th className="text-left px-6 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {publications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  {dbOk
                    ? 'No hay publicaciones aún. Aparecerán aquí una vez que el contenido se publique.'
                    : 'No se pueden cargar publicaciones sin base de datos.'}
                </td>
              </tr>
            ) : (
              publications.map((pub) => {
                const brief = pub.editorialRun?.contentBrief;
                const version = brief?.contentVersions?.[0];
                const contentPreview = (version?.caption ?? version?.copy ?? brief?.angle ?? '').substring(0, 80);
                const canRetry = ['FAILED', 'NEEDS_MANUAL_ATTENTION'].includes(pub.status);

                return (
                  <tr
                    key={pub.id}
                    className="border-b hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        {pub.publishedAt
                          ? new Date(pub.publishedAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(pub.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                      </div>
                      {pub.retryCount > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                          {pub.retryCount} reintentos
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            pub.platform === 'INSTAGRAM' ? '#e040fb20' : '#1877f220',
                          color:
                            pub.platform === 'INSTAGRAM' ? '#e040fb' : '#1877f2',
                        }}
                      >
                        {pub.platform === 'INSTAGRAM' ? '📷 IG' : '📘 FB'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-xs max-w-[200px] truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={contentPreview}
                      >
                        {contentPreview || '—'}
                      </div>
                      {brief?.format && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {brief.format}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold"
                        style={{
                          color: PUB_STATUS_COLORS[pub.status] ?? '#64748b',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: PUB_STATUS_COLORS[pub.status] ?? '#64748b',
                          }}
                        />
                        {PUB_STATUS_LABELS[pub.status] ?? pub.status}
                      </span>
                      {pub.errorMessage && (
                        <div
                          className="text-xs mt-1 max-w-[200px] truncate"
                          style={{ color: '#ef4444' }}
                          title={pub.errorMessage}
                        >
                          {pub.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="flex gap-3 text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span>❤️ {pub.likes}</span>
                        <span>💬 {pub.comments}</span>
                        <span>🔄 {pub.shares}</span>
                        <span>📌 {pub.saves}</span>
                      </div>
                      {pub.reach > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          👁️ {pub.reach} alcance · {pub.impressions} imp.
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {pub.permalink && (
                          <a
                            href={pub.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            Ver post ↗
                          </a>
                        )}
                        <Link
                          href={`/dashboard/publications/${pub.id}`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Detalle
                        </Link>
                        <Link
                          href={`/dashboard/editorial/${pub.editorialRunId}`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Ver run
                        </Link>
                        {canRetry && (
                          <form
                            action={`/api/publications/retry/${pub.id}`}
                            method="POST"
                          >
                            <button
                              type="button"
                              className="text-xs font-medium hover:underline"
                              style={{ color: '#f59e0b' }}
                              title="Reintentar publicación"
                            >
                              🔄 Reintentar
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div
        className="mt-6 rounded-lg border px-4 py-3 text-xs"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        <strong>ℹ️ Flujo de publicación:</strong> Contenido aprobado en Telegram → Se encola
        automáticamente → Se publica en los canales target (IG/FB) → Confirmación por Telegram
        con permalink. Si falla, se reintenta hasta 3 veces con backoff exponencial. Las
        publicaciones con &quot;Atención manual&quot; necesitan intervención.
      </div>
    </div>
  );
}
