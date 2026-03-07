import { prisma } from '@automatismos/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  NEEDS_MANUAL_ATTENTION: '⚠️ Requiere atención manual',
};

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let publication: any = null;
  let dbOk = true;

  try {
    publication = await prisma.publication.findUnique({
      where: { id },
      include: {
        editorialRun: {
          include: {
            contentBrief: {
              include: {
                contentVersions: {
                  where: { isMain: true },
                  orderBy: { version: 'desc' },
                  take: 1,
                  include: {
                    mediaAssets: { where: { status: 'READY' }, take: 6 },
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch {
    dbOk = false;
  }

  if (!publication && dbOk) {
    notFound();
  }

  if (!dbOk) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Detalle de publicación</h1>
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: '#f59e0b15', borderColor: '#f59e0b40', color: '#f59e0b' }}
        >
          ⚠️ Base de datos no disponible.
        </div>
      </div>
    );
  }

  const brief = publication.editorialRun?.contentBrief;
  const version = brief?.contentVersions?.[0];
  const mediaAssets = version?.mediaAssets ?? [];
  const canRetry = ['FAILED', 'NEEDS_MANUAL_ATTENTION'].includes(publication.status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/publications"
          className="text-sm hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Publicaciones
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Publicación</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            ID: {publication.id}
          </p>
        </div>
        <span
          className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: (PUB_STATUS_COLORS[publication.status] ?? '#64748b') + '20',
            color: PUB_STATUS_COLORS[publication.status] ?? '#64748b',
          }}
        >
          {PUB_STATUS_LABELS[publication.status] ?? publication.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Info */}
        <div className="space-y-4">
          {/* Platform & dates */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h3 className="font-semibold mb-3">Información</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-muted)' }}>Plataforma</dt>
                <dd>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: publication.platform === 'INSTAGRAM' ? '#e040fb20' : '#1877f220',
                      color: publication.platform === 'INSTAGRAM' ? '#e040fb' : '#1877f2',
                    }}
                  >
                    {publication.platform === 'INSTAGRAM' ? '📷 Instagram' : '📘 Facebook'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-muted)' }}>Creada</dt>
                <dd>{new Date(publication.createdAt).toLocaleString('es-MX')}</dd>
              </div>
              {publication.publishedAt && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Publicada</dt>
                  <dd>{new Date(publication.publishedAt).toLocaleString('es-MX')}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-muted)' }}>Reintentos</dt>
                <dd>{publication.retryCount}</dd>
              </div>
              {publication.externalPostId && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Post ID externo</dt>
                  <dd className="text-xs font-mono">{publication.externalPostId}</dd>
                </div>
              )}
              {publication.permalink && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Permalink</dt>
                  <dd>
                    <a
                      href={publication.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Ver post ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Error */}
          {publication.errorMessage && (
            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor: '#ef444410',
                borderColor: '#ef444430',
              }}
            >
              <h3 className="font-semibold mb-2" style={{ color: '#ef4444' }}>
                Error
              </h3>
              <pre
                className="text-xs whitespace-pre-wrap break-all"
                style={{ color: '#ef4444' }}
              >
                {publication.errorMessage}
              </pre>
            </div>
          )}

          {/* Engagement */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h3 className="font-semibold mb-3">Métricas</h3>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                { label: 'Likes', value: publication.likes, icon: '❤️' },
                { label: 'Comentarios', value: publication.comments, icon: '💬' },
                { label: 'Shares', value: publication.shares, icon: '🔄' },
                { label: 'Saves', value: publication.saves, icon: '📌' },
                { label: 'Alcance', value: publication.reach, icon: '👁️' },
                { label: 'Impresiones', value: publication.impressions, icon: '📊' },
              ].map((m) => (
                <div key={m.label} className="py-2">
                  <div className="text-lg">{m.icon}</div>
                  <div className="font-bold text-lg">{m.value}</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
            {publication.engagementRate != null && (
              <div className="mt-3 text-center text-sm font-semibold" style={{ color: '#10b981' }}>
                Engagement Rate: {(publication.engagementRate * 100).toFixed(2)}%
              </div>
            )}
            {publication.metricsUpdatedAt && (
              <div className="mt-1 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Actualizado: {new Date(publication.metricsUpdatedAt).toLocaleString('es-MX')}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h3 className="font-semibold mb-3">Acciones</h3>
            <div className="flex gap-2">
              {canRetry && (
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#f59e0b' }}
                >
                  🔄 Reintentar publicación
                </button>
              )}
              <Link
                href={`/dashboard/editorial/${publication.editorialRunId}`}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{
                  borderColor: 'var(--color-border)',
                }}
              >
                📋 Ver editorial run
              </Link>
            </div>
          </div>
        </div>

        {/* Right column — Content & payload */}
        <div className="space-y-4">
          {/* Content preview */}
          {version && (
            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="font-semibold mb-3">Contenido publicado</h3>
              {version.caption && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Caption
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{version.caption}</p>
                </div>
              )}
              {version.copy && version.copy !== version.caption && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Copy
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{version.copy}</p>
                </div>
              )}

              {/* Media assets */}
              {mediaAssets.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Media ({mediaAssets.length} assets)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {mediaAssets.map((asset: any) => (
                      <div
                        key={asset.id}
                        className="aspect-square rounded-lg overflow-hidden border"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {(asset.thumbnailUrl || asset.optimizedUrl || asset.originalUrl) ? (
                          <img
                            src={asset.thumbnailUrl ?? asset.optimizedUrl ?? asset.originalUrl}
                            alt="Media asset"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}
                          >
                            {asset.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payload sent */}
          {publication.payloadSent && (
            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="font-semibold mb-3">Payload enviado</h3>
              <pre
                className="text-xs whitespace-pre-wrap break-all overflow-auto max-h-64 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-primary)' }}
              >
                {JSON.stringify(publication.payloadSent, null, 2)}
              </pre>
            </div>
          )}

          {/* API Response */}
          {publication.apiResponse && (
            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="font-semibold mb-3">Respuesta API</h3>
              <pre
                className="text-xs whitespace-pre-wrap break-all overflow-auto max-h-64 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-primary)' }}
              >
                {JSON.stringify(publication.apiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
