'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { AiEditModal } from './ai-edit-modal';
import { MediaPreviewModal } from './media-preview-modal';
import { useRouter } from 'next/navigation';

interface AssetCardProps {
  asset: {
    id: string;
    type: string;
    status: string;
    prompt: string | null;
    provider: string | null;
    originalUrl: string | null;
    optimizedUrl: string | null;
    createdAt: string;
    contentVersion?: {
      brief?: {
        format?: string;
        editorialRun?: { id: string };
      };
    } | null;
  };
}

const TYPE_LABELS: Record<string, string> = {
  IMAGE: '🖼️ Imagen',
  CAROUSEL_SLIDE: '🎠 Slide',
  VIDEO: '🎬 Video',
  AVATAR_VIDEO: '🤖 Avatar',
  THUMBNAIL: '📐 Thumbnail',
  MOTION_GRAPHIC: '✨ Motion',
  AUDIO: '🎵 Audio',
};

const STATUS_COLORS: Record<string, string> = {
  READY: '#10b981',
  PENDING: '#f59e0b',
  GENERATING: '#60a5fa',
  PROCESSING: '#818cf8',
  FAILED: '#ef4444',
};

export function AssetCard({ asset }: AssetCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const url = asset.optimizedUrl ?? asset.originalUrl;
  const isVideo = asset.type === 'VIDEO' || asset.type === 'AVATAR_VIDEO' || asset.type === 'MOTION_GRAPHIC';
  const isAudio = asset.type === 'AUDIO';
  const canPreview = !!url && asset.status === 'READY';

  return (
    <>
      <div className="glass-card p-0 overflow-hidden group">
        {/* Media preview area */}
        <div
          className={`relative aspect-square flex items-center justify-center overflow-hidden${canPreview ? ' cursor-pointer' : ''}`}
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
          onClick={() => canPreview && !isAudio && setShowPreview(true)}
        >
          {isAudio ? (
            /* Audio card — icon + inline player */
            <div className="flex flex-col items-center justify-center gap-3 p-4 w-full">
              <span className="text-5xl">🎵</span>
              {url && (
                <audio ref={audioRef} src={url} preload="metadata" className="w-full" controls />
              )}
            </div>
          ) : isVideo && url ? (
            /* Video/Avatar thumbnail with play overlay */
            <>
              <video
                src={url}
                muted
                preload="metadata"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onLoadedMetadata={(e) => {
                  // Seek to 1s for thumbnail
                  (e.target as HTMLVideoElement).currentTime = 1;
                }}
              />
              {canPreview && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                  >
                    <span className="text-white text-2xl ml-1">▶</span>
                  </div>
                </div>
              )}
            </>
          ) : url ? (
            /* Image */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt={asset.prompt ?? 'Media asset'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-4xl opacity-40">{TYPE_LABELS[asset.type]?.charAt(0) ?? '📎'}</div>
          )}

          {/* Status badge */}
          <span
            className="absolute top-2 right-2 badge"
            style={{
              backgroundColor: `${STATUS_COLORS[asset.status] ?? '#64748b'}30`,
              color: STATUS_COLORS[asset.status] ?? '#64748b',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="badge-dot" style={{ backgroundColor: STATUS_COLORS[asset.status] ?? '#64748b' }} />
            {asset.status}
          </span>

          {/* Hover overlay — click to view / edit */}
          {!isAudio && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 bg-black/0 group-hover:bg-black/30 transition-all duration-300 pointer-events-none">
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto">
                {canPreview && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:brightness-125"
                    style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                  >
                    {isVideo ? '▶ Reproducir' : '🔍 Ampliar'}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:brightness-125"
                  style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                >
                  ✨ Editar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              {TYPE_LABELS[asset.type] ?? asset.type}
            </span>
            <span className="chip text-[10px]">
              {asset.provider ?? '—'}
            </span>
          </div>

          {asset.prompt && (
            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
              {asset.prompt}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {asset.contentVersion?.brief?.editorialRun && (
              <Link
                href={`/dashboard/editorial/${asset.contentVersion.brief.editorialRun.id}`}
                className="text-xs font-semibold transition-colors hover:brightness-125"
                style={{ color: 'var(--color-primary)' }}
              >
                Ver corrida →
              </Link>
            )}

            <button
              onClick={() => setShowEditModal(true)}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all hover:brightness-125"
              style={{
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(124,58,237,0.08)',
              }}
            >
              ✨ Editar
            </button>
          </div>

          <div className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(asset.createdAt).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* AI Edit Modal */}
      {showEditModal && (
        <AiEditModal
          assetId={asset.id}
          assetType={asset.type}
          currentPrompt={asset.prompt}
          currentUrl={asset.optimizedUrl ?? asset.originalUrl}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Media Preview Modal */}
      {showPreview && (
        <MediaPreviewModal
          asset={asset}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
