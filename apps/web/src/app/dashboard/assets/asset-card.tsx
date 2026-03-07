'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AiEditModal } from './ai-edit-modal';
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
  const router = useRouter();

  return (
    <>
      <div className="glass-card p-0 overflow-hidden group">
        {/* Image preview */}
        <div
          className="relative aspect-square flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          {asset.optimizedUrl || asset.originalUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={asset.optimizedUrl ?? asset.originalUrl ?? ''}
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

          {/* AI Edit button — hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300">
            <button
              onClick={() => setShowEditModal(true)}
              className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 px-4 py-2.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            >
              ✨ Editar con IA
            </button>
          </div>
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
    </>
  );
}
