import { getApiUrl } from '@/lib/api';

// ============================================================
// Video Detail Page — Detalle de un video asset con script y preview
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
    copy: string;
    caption: string;
    brief?: {
      format: string;
      angle: string;
      tone: string;
      cta: string;
      editorialRun?: { id: string; status: string };
    };
  };
}

async function getVideo(id: string): Promise<VideoAsset | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/videos/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let video: VideoAsset | null = null;
  let error = '';

  try {
    video = await getVideo(id);
  } catch (e) {
    error = String(e);
  }

  if (!video) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="text-4xl mb-4">🎬</div>
        <h3 className="text-lg font-semibold text-gray-700">Video no encontrado</h3>
        <p className="text-gray-500 mt-2">{error || `ID: ${id}`}</p>
      </div>
    );
  }

  const metadata = video.metadata ?? {};
  const scriptBlocks = (metadata['scriptBlocks'] as Array<{ text: string; duration: number; role: string }>) ?? [];
  const subtitlesSRT = metadata['subtitlesSRT'] as string | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎬 Detalle de Video</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">{video.id}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={video.status} />
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            {video.type}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Preview */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-semibold">Vista Previa</div>
          <div className="aspect-[9/16] max-h-[500px] bg-gray-900 flex items-center justify-center">
            {video.status === 'READY' && video.optimizedUrl ? (
              <video
                src={video.optimizedUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            ) : video.status === 'PENDING' ? (
              <div className="text-center text-white">
                <div className="animate-spin text-5xl mb-4">⏳</div>
                <div className="text-lg">Renderizando video...</div>
                <div className="text-sm text-gray-400 mt-2">Esto puede tardar 2-5 minutos</div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-4">❌</div>
                <div>{video.status}</div>
              </div>
            )}
          </div>
          {video.optimizedUrl && (
            <div className="p-3 bg-gray-50 border-t">
              <a
                href={video.optimizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                📥 Descargar video
              </a>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-gray-50 font-semibold">Información</div>
            <div className="p-4 space-y-3">
              <InfoRow label="Proveedor" value={video.provider} />
              <InfoRow label="Modo" value={String(metadata['mode'] ?? '-')} />
              <InfoRow label="Duración" value={`${metadata['durationSeconds'] ?? '-'} segundos`} />
              <InfoRow label="Template" value={String(metadata['templateName'] ?? '-')} />
              <InfoRow label="Voz" value={String(metadata['voiceProvider'] ?? '-')} />
              <InfoRow label="Creado" value={new Date(video.createdAt).toLocaleString('es-ES')} />
              {video.contentVersion?.brief?.editorialRun && (
                <InfoRow
                  label="Run editorial"
                  value={video.contentVersion.brief.editorialRun.id.slice(0, 12) + '...'}
                />
              )}
            </div>
          </div>

          {/* Script */}
          {scriptBlocks.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b bg-gray-50 font-semibold">📝 Script</div>
              <div className="p-4 space-y-3">
                {scriptBlocks.map((block, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-20">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        block.role === 'hook' ? 'bg-red-100 text-red-700' :
                        block.role === 'cta' ? 'bg-green-100 text-green-700' :
                        block.role === 'highlight' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {block.role}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">{block.duration}s</div>
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{block.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Info */}
          {video.contentVersion && (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b bg-gray-50 font-semibold">📄 Contenido Fuente</div>
              <div className="p-4 space-y-2">
                <div>
                  <div className="text-xs font-medium text-gray-500">Hook</div>
                  <p className="text-sm">{video.contentVersion.hook}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Caption</div>
                  <p className="text-sm">{video.contentVersion.caption}</p>
                </div>
                {video.contentVersion.brief && (
                  <>
                    <div>
                      <div className="text-xs font-medium text-gray-500">Ángulo</div>
                      <p className="text-sm">{video.contentVersion.brief.angle}</p>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500">Tono</div>
                      <p className="text-sm">{video.contentVersion.brief.tone}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SRT Preview */}
          {subtitlesSRT && (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b bg-gray-50 font-semibold">💬 Subtítulos (SRT)</div>
              <pre className="p-4 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto bg-gray-50">
                {subtitlesSRT}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    READY: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
