'use client';

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MediaAssetData {
  id: string;
  type: string;
  originalUrl: string | null;
  optimizedUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
}

export interface ContentVersionData {
  hook: string;
  copy: string;
  caption: string;
  hashtags: string[];
  mediaAssets: MediaAssetData[];
}

export interface PublicationData {
  id: string;
  status: string;
  platform: string;
  permalink: string | null;
}

export interface ApprovedRunData {
  id: string;
  status: string;
  createdAt: string;
  publishWindow: string | null;
  targetChannels: string[];
  contentBrief: {
    format: string | null;
    angle: string | null;
    contentVersions: ContentVersionData[];
  } | null;
  publications: PublicationData[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  CAROUSEL: '🖼 Carrusel',
  IMAGE: '📷 Imagen',
  VIDEO: '🎬 Video',
  REEL: '🎬 Reel',
  STORY: '⬆ Story',
  TEXT: '✍ Texto',
};

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📷',
  FACEBOOK: '📘',
  TIKTOK: '🎵',
  YOUTUBE: '▶',
};

const RUN_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  APPROVED:   { label: 'Aprobado',    color: '#22c55e' },
  PUBLISHING: { label: 'Publicando',  color: '#60a5fa' },
  PUBLISHED:  { label: 'Publicado',   color: '#10b981' },
  FAILED:     { label: 'Error',       color: '#ef4444' },
};

function primaryMediaUrl(assets: MediaAssetData[]): string | null {
  // Prefer thumbnail for preview, fall back to optimized / original
  for (const a of assets) {
    if (['IMAGE', 'CAROUSEL_SLIDE', 'THUMBNAIL', 'VIDEO', 'AVATAR_VIDEO', 'MOTION_GRAPHIC'].includes(a.type)) {
      return a.thumbnailUrl ?? a.optimizedUrl ?? a.originalUrl;
    }
  }
  return null;
}

function isVideo(asset: MediaAssetData) {
  return ['VIDEO', 'AVATAR_VIDEO', 'MOTION_GRAPHIC'].includes(asset.type);
}

function downloadableAssets(assets: MediaAssetData[]) {
  return assets.filter(
    (a) => a.status === 'READY' && (a.originalUrl ?? a.optimizedUrl),
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback noop
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar copy/caption"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        backgroundColor: copied ? '#22c55e20' : 'var(--color-bg-tertiary)',
        color: copied ? '#22c55e' : 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Copiado' : '📋 Copiar copy'}
    </button>
  );
}

function PublishButton({
  runId,
  hasChannels,
  alreadyPublished,
}: {
  runId: string;
  hasChannels: boolean;
  alreadyPublished: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(alreadyPublished);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
        ✅ Publicado
      </span>
    );
  }

  if (!hasChannels) {
    return (
      <a
        href="/dashboard/credentials"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #f59e0b40',
          backgroundColor: '#f59e0b10',
          color: '#f59e0b',
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
        title="Configurar canales de publicación"
      >
        ⚠️ Conectar canal
      </a>
    );
  }

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/publications/publish/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <button
        onClick={handlePublish}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: loading ? '#94a3b840' : 'var(--color-primary)',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '⏳ Publicando...' : '🚀 Publicar'}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>
      )}
    </div>
  );
}

function DownloadMenu({ assets }: { assets: MediaAssetData[] }) {
  const items = downloadableAssets(assets);
  if (items.length === 0) return null;

  const typeLabels: Record<string, string> = {
    IMAGE: '📷 Imagen',
    CAROUSEL_SLIDE: '🖼 Slide',
    VIDEO: '🎬 Video',
    AVATAR_VIDEO: '🤖 Avatar Video',
    MOTION_GRAPHIC: '✨ Motion',
    THUMBNAIL: '🖼 Thumbnail',
    AUDIO: '🎵 Audio',
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((a, i) => {
        const url = a.originalUrl ?? a.optimizedUrl ?? '';
        const ext = url.split('.').pop()?.split('?')[0] ?? 'file';
        const label = `${typeLabels[a.type] ?? a.type}${items.filter((x) => x.type === a.type).length > 1 ? ` ${i + 1}` : ''}`;
        return (
          <a
            key={a.id}
            href={url}
            download={`${a.type.toLowerCase()}_${a.id.slice(-6)}.${ext}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              fontSize: 11,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            ⬇ {label}
          </a>
        );
      })}
    </div>
  );
}

// ── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({
  run,
  hasChannels,
  onClose,
}: {
  run: ApprovedRunData;
  hasChannels: boolean;
  onClose: () => void;
}) {
  const version = run.contentBrief?.contentVersions?.[0];
  const assets = version?.mediaAssets ?? [];
  const copy = [version?.hook, version?.copy, version?.caption]
    .filter(Boolean)
    .join('\n\n');
  const hashtags = (version?.hashtags ?? []).join(' ');
  const fullCopy = [copy, hashtags].filter(Boolean).join('\n\n');
  const alreadyPublished = run.publications.some((p) => p.status === 'PUBLISHED');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 16,
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Vista previa
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {run.contentBrief?.format ? FORMAT_LABELS[run.contentBrief.format] ?? run.contentBrief.format : '—'}
              {' · '}
              {new Date(run.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Media grid */}
        {assets.filter((a) => a.type !== 'AUDIO').length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: assets.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
            }}
          >
            {assets
              .filter((a) => a.type !== 'AUDIO')
              .map((a) => {
                const url = a.thumbnailUrl ?? a.optimizedUrl ?? a.originalUrl;
                return (
                  <div
                    key={a.id}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: '#0a0a0a',
                      position: 'relative',
                    }}
                  >
                    {url ? (
                      isVideo(a) ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          src={a.optimizedUrl ?? a.originalUrl ?? ''}
                          poster={a.thumbnailUrl ?? undefined}
                          controls
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          color: '#334155',
                        }}
                      >
                        {isVideo(a) ? '🎬' : '🖼'}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Copy text */}
        {fullCopy && (
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Copy / Caption
              </span>
              <CopyButton text={fullCopy} />
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
              }}
            >
              {fullCopy}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <DownloadMenu assets={assets} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {run.publications.find((p) => p.permalink) && (
              <a
                href={run.publications.find((p) => p.permalink)!.permalink!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Ver post ↗
              </a>
            )}
            <PublishButton
              runId={run.id}
              hasChannels={hasChannels}
              alreadyPublished={alreadyPublished}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function PublicationCard({
  run,
  hasChannels,
}: {
  run: ApprovedRunData;
  hasChannels: boolean;
}) {
  const [open, setOpen] = useState(false);
  const version = run.contentBrief?.contentVersions?.[0];
  const assets = version?.mediaAssets ?? [];
  const preview = primaryMediaUrl(assets);
  const isVid = assets.some(isVideo);
  const format = run.contentBrief?.format;
  const angle = run.contentBrief?.angle ?? '';
  const statusInfo = RUN_STATUS_STYLE[run.status] ?? { label: run.status, color: '#94a3b8' };
  const alreadyPublished = run.publications.some((p) => p.status === 'PUBLISHED');
  const copy = [version?.hook, version?.copy, version?.caption]
    .filter(Boolean)
    .join('\n\n');
  const hashtags = (version?.hashtags ?? []).join(' ');
  const fullCopy = [copy, hashtags].filter(Boolean).join('\n\n');

  return (
    <>
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.15s, box-shadow 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            aspectRatio: '1',
            backgroundColor: '#0d0d14',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={() => setOpen(true)}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#334155',
              }}
            >
              {isVid ? '🎬' : assets.length > 1 ? '🖼' : '📷'}
            </div>
          )}

          {/* Overlays */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              gap: 4,
            }}
          >
            {format && (
              <span
                style={{
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: 6,
                  letterSpacing: 0.3,
                }}
              >
                {FORMAT_LABELS[format] ?? format}
              </span>
            )}
            {run.targetChannels.map((ch) => (
              <span
                key={ch}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  color: 'white',
                  fontSize: 11,
                  padding: '3px 5px',
                  borderRadius: 6,
                }}
              >
                {PLATFORM_ICONS[ch.toUpperCase()] ?? ch}
              </span>
            ))}
          </div>

          {assets.length > 1 && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 7px',
                borderRadius: 6,
              }}
            >
              {assets.length} archivos
            </span>
          )}

          {/* Play icon for video */}
          {isVid && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                ▶
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {/* Angle / title */}
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.4,
              color: 'var(--color-text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {angle || '—'}
          </p>

          {/* Date + status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {new Date(run.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <button
              onClick={() => setOpen(true)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              👁 Vista previa
            </button>
            {fullCopy && <CopyButton text={fullCopy} />}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <DownloadMenu assets={assets} />
            {!alreadyPublished && (
              <PublishButton
                runId={run.id}
                hasChannels={hasChannels}
                alreadyPublished={false}
              />
            )}
            {run.publications.find((p) => p.permalink) && (
              <a
                href={run.publications.find((p) => p.permalink)!.permalink!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Ver post ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {open && (
        <DetailModal run={run} hasChannels={hasChannels} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function MyPublicationsClient({
  runs,
  hasChannels,
}: {
  runs: ApprovedRunData[];
  hasChannels: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'published'>('all');

  const filtered = runs.filter((r) => {
    if (filter === 'approved') return r.status === 'APPROVED';
    if (filter === 'published') return ['PUBLISHING', 'PUBLISHED'].includes(r.status);
    return true;
  });

  return (
    <div>
      {/* No-channel banner */}
      {!hasChannels && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: 12,
            border: '1px solid #f59e0b40',
            backgroundColor: '#f59e0b08',
            padding: '14px 18px',
            marginBottom: 20,
            fontSize: 13,
            color: '#f59e0b',
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>No tenés canales de publicación configurados.</strong>
            {' '}Podés descargar tu contenido o{' '}
            <a
              href="/dashboard/credentials"
              style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'underline' }}
            >
              conectar Meta / Instagram
            </a>
            {' '}para publicar desde acá.
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(
          [
            { key: 'all', label: 'Todos', count: runs.length },
            { key: 'approved', label: 'Aprobados', count: runs.filter((r) => r.status === 'APPROVED').length },
            { key: 'published', label: 'Publicados', count: runs.filter((r) => ['PUBLISHING', 'PUBLISHED'].includes(r.status)).length },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${filter === f.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
              backgroundColor: filter === f.key ? 'var(--color-primary)15' : 'var(--color-bg-secondary)',
              color: filter === f.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
            <span
              style={{
                backgroundColor: filter === f.key ? 'var(--color-primary)30' : 'var(--color-bg-tertiary)',
                color: filter === f.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: 20,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {filter === 'all'
              ? 'No hay publicaciones aprobadas aún'
              : filter === 'approved'
              ? 'No hay publicaciones pendientes de publicar'
              : 'No hay publicaciones enviadas aún'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Aprobá contenido en la sección{' '}
            <a
              href="/dashboard/approvals"
              style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Aprobaciones
            </a>
            {' '}para verlo acá.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((run) => (
            <PublicationCard key={run.id} run={run} hasChannels={hasChannels} />
          ))}
        </div>
      )}
    </div>
  );
}
