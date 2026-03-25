'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface MediaPreviewModalProps {
  asset: {
    id: string;
    type: string;
    status: string;
    prompt: string | null;
    provider: string | null;
    originalUrl: string | null;
    optimizedUrl: string | null;
    createdAt: string;
  };
  onClose: () => void;
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

export function MediaPreviewModal({ asset, onClose }: MediaPreviewModalProps) {
  const url = asset.optimizedUrl ?? asset.originalUrl;
  const isVideo = asset.type === 'VIDEO' || asset.type === 'AVATAR_VIDEO' || asset.type === 'MOTION_GRAPHIC';
  const isAudio = asset.type === 'AUDIO';
  const isImage = !isVideo && !isAudio;
  const [loaded, setLoaded] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.92)',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 20,
        }}
      >
        ✕
      </button>

      {/* Content — stop clicks from closing */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          maxWidth: '90vw',
          maxHeight: '90vh',
          padding: 16,
        }}
      >
        {/* Media */}
        {isImage && url && (
          <>
            {!loaded && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cargando imagen...</div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={asset.prompt ?? 'Media asset'}
              onLoad={() => setLoaded(true)}
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                display: loaded ? 'block' : 'none',
              }}
            />
          </>
        )}

        {isVideo && url && (
          <video
            src={url}
            controls
            autoPlay
            style={{
              maxWidth: '85vw',
              maxHeight: '80vh',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            Tu navegador no soporta video.
          </video>
        )}

        {isAudio && url && (
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              padding: 32,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              background: 'rgba(15,15,35,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 64 }}>🎵</div>
            <audio src={url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}

        {!url && (
          <div
            style={{
              padding: 48,
              borderRadius: 16,
              textAlign: 'center',
              background: 'rgba(15,15,35,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🚫</span>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              {asset.status === 'PENDING' || asset.status === 'GENERATING'
                ? 'Este asset aún se está generando...'
                : 'No hay URL disponible para este asset.'}
            </p>
          </div>
        )}

        {/* Info bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 12,
            fontSize: 12,
            background: 'rgba(15,15,35,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            {TYPE_LABELS[asset.type] ?? asset.type}
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>{asset.provider ?? '—'}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>
            {new Date(asset.createdAt).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {asset.prompt && (
            <>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.prompt}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
