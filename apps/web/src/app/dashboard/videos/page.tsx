import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

// ============================================================
// Videos Dashboard — Lista de video assets generados
// ============================================================

interface VideoAsset {
  id: string;
  type: string;
  status: string;
  provider: string;
  originalUrl: string | null;
  optimizedUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  contentVersion?: {
    id: string;
    version: number;
    hook: string;
    caption: string;
    brief?: {
      format: string;
      angle: string;
      editorialRun?: { id: string; status: string; date: string };
    };
  };
}

async function getVideos(): Promise<VideoAsset[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/videos?workspaceId=default&limit=50`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    READY: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, { icon: string; label: string }> = {
    AVATAR_VIDEO: { icon: '🤖', label: 'Avatar' },
    VIDEO: { icon: '🎬', label: 'Video' },
    MOTION_GRAPHIC: { icon: '✨', label: 'Motion' },
  };
  const info = labels[type] ?? { icon: '🎥', label: type };
  return (
    <span className="text-sm">
      {info.icon} {info.label}
    </span>
  );
}

export default async function VideosPage() {
  let videos: VideoAsset[] = [];
  let error = '';

  try {
    videos = await getVideos();
  } catch (e) {
    error = String(e);
  }

  // Stats
  const total = videos.length;
  const ready = videos.filter((v) => v.status === 'READY').length;
  const pending = videos.filter((v) => v.status === 'PENDING').length;
  const failed = videos.filter((v) => v.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎬 Videos</h1>
          <p className="text-gray-500 mt-1">Videos con avatar IA — Reels, noticias, educativos, CTA</p>
        </div>
        <Link
          href="/dashboard/videos/templates"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
        >
          📐 Ver Templates
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{ready}</div>
          <div className="text-sm text-gray-500">Completados</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{pending}</div>
          <div className="text-sm text-gray-500">Renderizando</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{failed}</div>
          <div className="text-sm text-gray-500">Fallidos</div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⚠️ API no disponible: {error}
        </div>
      )}

      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold text-gray-700">No hay videos generados</h3>
          <p className="text-gray-500 mt-2">
            Los videos se generan automáticamente cuando el formato del contenido es "avatar_video"
            o cuando presionas "Convertir a video" en Telegram.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
              {/* Preview area */}
              <div className="aspect-[9/16] max-h-48 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                {video.status === 'READY' && video.optimizedUrl ? (
                  <video
                    src={video.optimizedUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : video.status === 'PENDING' ? (
                  <div className="text-center text-white">
                    <div className="animate-spin text-3xl mb-2">⏳</div>
                    <div className="text-sm">Renderizando...</div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-3xl mb-2">🎬</div>
                    <div className="text-sm">{video.status}</div>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={video.status} />
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <TypeBadge type={video.type} />
                  <span className="text-xs text-gray-400">
                    {new Date(video.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>

                {video.contentVersion && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {video.contentVersion.hook || video.contentVersion.caption}
                  </p>
                )}

                {video.metadata && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {video.metadata['mode'] && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {String(video.metadata['mode'])}
                      </span>
                    )}
                    {video.metadata['durationSeconds'] && (
                      <span>⏱ {String(video.metadata['durationSeconds'])}s</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Link
                    href={`/dashboard/videos/${video.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver detalle →
                  </Link>
                  {video.contentVersion?.brief?.editorialRun?.id && (
                    <Link
                      href={`/dashboard/editorial?runId=${video.contentVersion.brief.editorialRun.id}`}
                      className="text-sm text-gray-500 hover:underline ml-auto"
                    >
                      Run editorial
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
