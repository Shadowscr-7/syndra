'use client';

import { useState, useCallback } from 'react';

interface MediaAsset {
  id: string;
  type: string;
  originalUrl?: string | null;
  optimizedUrl?: string | null;
  prompt?: string | null;
  status: string;
}

interface ContentVersion {
  id: string;
  version: number;
  isMain: boolean;
  hook: string;
  copy: string;
  caption: string;
  title: string;
  hashtags: string[];
  score?: number | null;
  isApproved: boolean;
  mediaAssets: MediaAsset[];
}

interface PublicationPreviewProps {
  format: string; // POST, CAROUSEL, REEL, STORY, AVATAR_VIDEO
  version: ContentVersion;
  accountName: string;
  accountAvatar?: string | null;
  runId: string;
  isReview: boolean;
  approveAction?: (formData: FormData) => void;
  rejectAction?: (formData: FormData) => void;
}

export function PublicationPreview({
  format,
  version,
  accountName,
  accountAvatar,
  runId,
  isReview,
  approveAction,
  rejectAction,
}: PublicationPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandCaption, setExpandCaption] = useState(false);

  const imageUrl = version.mediaAssets.find(
    (a) => (a.status === 'READY' || a.status === 'PENDING') && (a.optimizedUrl || a.originalUrl),
  );
  const mainImage = imageUrl?.optimizedUrl || imageUrl?.originalUrl || null;

  const carouselSlides = version.mediaAssets.filter(
    (a) => a.type === 'CAROUSEL_SLIDE' || a.type === 'IMAGE',
  );

  const captionText = version.caption || version.copy || '';
  const hashtagStr = version.hashtags.join(' ');
  const fullCaption = `${captionText}${hashtagStr ? '\n\n' + hashtagStr : ''}`;
  const shortCaption = fullCaption.length > 125 ? fullCaption.substring(0, 125) : fullCaption;
  const needsTruncation = fullCaption.length > 125;

  const isVertical = format === 'REEL' || format === 'STORY';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phone frame */}
      <div
        className="relative mx-auto"
        style={{
          width: isVertical ? '320px' : '380px',
          maxWidth: '100%',
          borderRadius: '24px',
          backgroundColor: '#000',
          border: '2px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.1)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-3.5 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              color: 'white',
            }}
          >
            {accountAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={accountAvatar}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              accountName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{accountName}</p>
            {version.hook && (
              <p className="text-[10px] text-gray-400 truncate">{version.hook}</p>
            )}
          </div>
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </div>

        {/* ── Content Area ── */}
        {format === 'STORY' && (
          <StoryPreview
            mainImage={mainImage}
            hook={version.hook}
            copy={version.copy}
          />
        )}

        {format === 'REEL' && (
          <ReelPreview
            mainImage={mainImage}
            hook={version.hook}
            copy={version.copy}
            accountName={accountName}
            hashtags={version.hashtags}
          />
        )}

        {(format === 'POST' || format === 'AVATAR_VIDEO' || format === 'HYBRID_MOTION') && (
          <PostPreview mainImage={mainImage} title={version.title} />
        )}

        {format === 'CAROUSEL' && (
          <CarouselPreview
            slides={carouselSlides}
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
            title={version.title}
          />
        )}

        {/* ── Action bar (not for story) ── */}
        {format !== 'STORY' && (
          <div className="px-3.5 pt-2.5 pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setLiked(!liked)} className="transition-transform active:scale-125">
                  {liked ? (
                    <svg className="w-6 h-6" fill="#ef4444" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <button onClick={() => setSaved(!saved)} className="transition-transform active:scale-125">
                {saved ? (
                  <svg className="w-6 h-6 text-white" fill="white" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Caption */}
            <div className="mt-2 pb-2">
              <p className="text-xs text-white leading-relaxed">
                <span className="font-semibold mr-1">{accountName}</span>
                {expandCaption || !needsTruncation ? (
                  <span className="whitespace-pre-wrap">{fullCaption}</span>
                ) : (
                  <span>
                    {shortCaption}
                    <button
                      onClick={() => setExpandCaption(true)}
                      className="text-gray-400 ml-1"
                    >
                      ... más
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Format label */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{
          backgroundColor: 'rgba(124,58,237,0.15)',
          color: '#a78bfa',
          border: '1px solid rgba(124,58,237,0.25)',
        }}>
          {format === 'POST' ? '📸 Post' :
           format === 'CAROUSEL' ? '🎠 Carrusel' :
           format === 'REEL' ? '🎬 Reel' :
           format === 'STORY' ? '📱 Story' :
           format === 'AVATAR_VIDEO' ? '🤖 Avatar Video' :
           `📄 ${format}`}
        </span>
        {version.score && (
          <span className="text-xs px-2 py-1 rounded-full" style={{
            backgroundColor: version.score >= 7 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: version.score >= 7 ? '#10b981' : '#f59e0b',
          }}>
            Score: {version.score.toFixed(1)}
          </span>
        )}
      </div>

      {/* ── Approve / Reject buttons ── */}
      {isReview && (
        <div className="w-full max-w-md space-y-3">
          <div className="flex gap-3">
            <form action={approveAction} className="flex-1">
              <input type="hidden" name="runId" value={runId} />
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                }}
              >
                ✅ Aprobar y publicar
              </button>
            </form>
            <button
              onClick={() => setShowRejectInput(!showRejectInput)}
              className="py-3 px-6 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              ❌ Rechazar
            </button>
          </div>

          {showRejectInput && (
            <form action={rejectAction} className="animate-fade-in">
              <input type="hidden" name="runId" value={runId} />
              <div className="flex gap-2">
                <input
                  name="reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="¿Qué cambiarías? (opcional)"
                  className="input-field flex-1 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  Confirmar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ImageWithLoading({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center p-4">
          <span className="text-3xl block mb-2">⚠️</span>
          <p className="text-xs text-gray-500">Error al cargar imagen</p>
          <button
            onClick={() => { setError(false); setLoaded(false); }}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-400">Generando imagen con IA...</p>
          </div>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${className ?? ''} ${loaded ? '' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

function PostPreview({ mainImage, title }: { mainImage: string | null; title: string }) {
  return (
    <div className="relative aspect-square bg-gray-900 flex items-center justify-center">
      {mainImage ? (
        <ImageWithLoading src={mainImage} alt={title || 'Post'} className="w-full h-full object-cover" />
      ) : (
        <div className="text-center p-6">
          <span className="text-4xl block mb-3">📸</span>
          <p className="text-xs text-gray-500">{title || 'Imagen en generación...'}</p>
        </div>
      )}
    </div>
  );
}

function CarouselPreview({
  slides,
  currentSlide,
  onSlideChange,
  title,
}: {
  slides: MediaAsset[];
  currentSlide: number;
  onSlideChange: (n: number) => void;
  title: string;
}) {
  const total = Math.max(slides.length, 1);
  const slide = slides[currentSlide];
  const imgUrl = slide?.optimizedUrl || slide?.originalUrl || null;

  return (
    <div className="relative aspect-square bg-gray-900">
      {imgUrl ? (
        <ImageWithLoading src={imgUrl} alt={`Slide ${currentSlide + 1}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-center p-6">
          <div>
            <span className="text-4xl block mb-3">🎠</span>
            <p className="text-xs text-gray-500">{title || `Slide ${currentSlide + 1}`}</p>
          </div>
        </div>
      )}

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          {currentSlide > 0 && (
            <button
              onClick={() => onSlideChange(currentSlide - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              ‹
            </button>
          )}
          {currentSlide < total - 1 && (
            <button
              onClick={() => onSlideChange(currentSlide + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              ›
            </button>
          )}
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => onSlideChange(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === currentSlide ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                transform: i === currentSlide ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      <div
        className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      >
        {currentSlide + 1}/{total}
      </div>
    </div>
  );
}

function ReelPreview({
  mainImage,
  hook,
  copy,
  accountName,
  hashtags,
}: {
  mainImage: string | null;
  hook: string;
  copy: string;
  accountName: string;
  hashtags: string[];
}) {
  return (
    <div className="relative bg-gray-900" style={{ aspectRatio: '9/16', maxHeight: '500px' }}>
      {mainImage ? (
        <ImageWithLoading src={mainImage} alt="Reel" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center p-6">
            <span className="text-5xl block mb-3">🎬</span>
            <p className="text-xs text-gray-500">Vista previa del reel</p>
          </div>
        </div>
      )}

      {/* Overlay bottom text */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
      >
        <p className="text-white text-xs font-semibold mb-1">{accountName}</p>
        <p className="text-white text-[11px] leading-relaxed mb-2">
          {hook || copy.substring(0, 100)}
        </p>
        <div className="flex flex-wrap gap-1">
          {hashtags.slice(0, 4).map((h) => (
            <span key={h} className="text-[10px] text-blue-400">{h}</span>
          ))}
        </div>
      </div>

      {/* Side icons */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-[10px] text-white">—</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] text-white">—</span>
        </div>
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </div>

      {/* Play icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function StoryPreview({
  mainImage,
  hook,
  copy,
}: {
  mainImage: string | null;
  hook: string;
  copy: string;
}) {
  return (
    <div className="relative bg-gray-900" style={{ aspectRatio: '9/16', maxHeight: '500px' }}>
      {mainImage ? (
        <ImageWithLoading src={mainImage} alt="Story" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
          <div className="text-center p-6">
            <p className="text-white text-sm font-bold mb-2">{hook || 'Story'}</p>
            {copy && (
              <p className="text-white/80 text-xs">{copy.substring(0, 120)}</p>
            )}
          </div>
        </div>
      )}

      {/* Progress bars at top */}
      <div className="absolute top-0 left-0 right-0 px-2 pt-2 flex gap-1">
        <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.8)' }} />
        <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* Swipe up */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <svg className="w-5 h-5 text-white mx-auto animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 15l7-7 7 7" />
        </svg>
        <p className="text-[10px] text-white/70 mt-0.5">Deslizar</p>
      </div>
    </div>
  );
}
