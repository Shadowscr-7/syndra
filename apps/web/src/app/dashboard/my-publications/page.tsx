import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import MyPublicationsClient, { type ApprovedRunData } from './client';

export default async function MyPublicationsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? '';

  let runs: ApprovedRunData[] = [];
  let hasChannels = false;
  let dbOk = true;

  try {
    // Fetch approved / published editorial runs with their media
    const rawRuns = await prisma.editorialRun.findMany({
      where: {
        workspaceId: wsId,
        status: { in: ['APPROVED', 'PUBLISHING', 'PUBLISHED', 'FAILED'] },
      },
      include: {
        contentBrief: {
          select: {
            format: true,
            angle: true,
            contentVersions: {
              where: { isMain: true },
              take: 1,
              select: {
                hook: true,
                copy: true,
                caption: true,
                hashtags: true,
                mediaAssets: {
                  select: {
                    id: true,
                    type: true,
                    originalUrl: true,
                    optimizedUrl: true,
                    thumbnailUrl: true,
                    status: true,
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
        publications: {
          select: {
            id: true,
            status: true,
            platform: true,
            permalink: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    runs = rawRuns.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      publishWindow: r.publishWindow?.toISOString() ?? null,
      targetChannels: r.targetChannels,
      contentBrief: r.contentBrief
        ? {
            format: r.contentBrief.format,
            angle: r.contentBrief.angle,
            contentVersions: r.contentBrief.contentVersions.map((v) => ({
              hook: v.hook,
              copy: v.copy,
              caption: v.caption,
              hashtags: v.hashtags,
              mediaAssets: v.mediaAssets.map((a) => ({
                id: a.id,
                type: a.type,
                originalUrl: a.originalUrl,
                optimizedUrl: a.optimizedUrl,
                thumbnailUrl: a.thumbnailUrl,
                status: a.status,
              })),
            })),
          }
        : null,
      publications: r.publications.map((p) => ({
        id: p.id,
        status: p.status,
        platform: p.platform,
        permalink: p.permalink,
      })),
    }));

    // Check if workspace has any active publishing channel configured
    const credCount = await prisma.apiCredential.count({
      where: { workspaceId: wsId, isActive: true },
    });
    hasChannels = credCount > 0;
  } catch {
    dbOk = false;
  }

  const stats = {
    total: runs.length,
    approved: runs.filter((r) => r.status === 'APPROVED').length,
    published: runs.filter((r) => ['PUBLISHING', 'PUBLISHED'].includes(r.status)).length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Mis Publicaciones</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Contenido aprobado listo para descargar o publicar.
        </p>
      </div>

      {!dbOk && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid #f59e0b40',
            backgroundColor: '#f59e0b0a',
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#f59e0b',
          }}
        >
          ⚠️ Base de datos no disponible. Iniciá Docker y reiniciá la app.
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Total aprobados', value: stats.total, color: '#94a3b8' },
          { label: 'Listos para publicar', value: stats.approved, color: '#f59e0b' },
          { label: 'Publicados', value: stats.published, color: '#10b981' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Client grid */}
      <MyPublicationsClient runs={runs} hasChannels={hasChannels} />
    </div>
  );
}
