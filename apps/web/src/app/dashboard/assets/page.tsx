import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { DbWarningBanner } from '@/lib/safe-db';
import { AssetCard } from './asset-card';

export default async function AssetsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? '';
  let assets: Awaited<ReturnType<typeof prisma.mediaAsset.findMany>> = [];
  let dbOk = true;

  try {
    assets = await prisma.mediaAsset.findMany({
      where: {
        contentVersion: {
          brief: {
            editorialRun: { workspaceId: wsId },
          },
        },
      },
      include: {
        contentVersion: {
          select: {
            id: true,
            version: true,
            caption: true,
            brief: {
              select: {
                format: true,
                angle: true,
                editorialRun: { select: { id: true, status: true, date: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
  } catch {
    dbOk = false;
  }

  const stats = {
    total: assets.length,
    images: assets.filter((a) => a.type === 'IMAGE').length,
    slides: assets.filter((a) => a.type === 'CAROUSEL_SLIDE').length,
    ready: assets.filter((a) => a.status === 'READY').length,
  };

  const statCards = [
    { label: 'Total', value: stats.total, gradient: 'stat-gradient-purple', icon: '📦' },
    { label: 'Imágenes', value: stats.images, gradient: 'stat-gradient-cyan', icon: '🖼️' },
    { label: 'Slides', value: stats.slides, gradient: 'stat-gradient-pink', icon: '🎠' },
    { label: 'Listos', value: stats.ready, gradient: 'stat-gradient-green', icon: '✅' },
  ];

  return (
    <div className="space-y-8">
      {!dbOk && <DbWarningBanner />}

      <div className="page-header animate-fade-in">
        <h1 className="page-title">Galería de Assets</h1>
        <p className="page-subtitle">Media generada por el pipeline editorial.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        {statCards.map((stat) => (
          <div key={stat.label} className={`glass-card p-4 ${stat.gradient}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{stat.icon}</span>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {stat.label}
              </span>
            </div>
            <div className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-delay-2">
        {assets.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center">
            <span className="text-3xl animate-float inline-block mb-3">🎨</span>
            <p style={{ color: 'var(--color-text-muted)' }}>
              No hay media assets aún. Se generarán cuando el pipeline procese contenido con formato carousel o imagen.
            </p>
          </div>
        ) : (
          assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={{
                id: asset.id,
                type: asset.type,
                status: asset.status,
                prompt: asset.prompt,
                provider: asset.provider,
                originalUrl: asset.originalUrl,
                optimizedUrl: asset.optimizedUrl,
                createdAt: asset.createdAt.toISOString(),
                contentVersion: asset.contentVersion
                  ? {
                      brief: asset.contentVersion.brief
                        ? {
                            format: asset.contentVersion.brief.format,
                            editorialRun: asset.contentVersion.brief.editorialRun
                              ? { id: asset.contentVersion.brief.editorialRun.id }
                              : undefined,
                          }
                        : undefined,
                    }
                  : undefined,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
