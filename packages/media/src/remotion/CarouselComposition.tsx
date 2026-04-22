// ============================================================
// CarouselComposition — High-fidelity slide composer for Syndra
// Mirrors the visual quality of editor-pro-max compositions.
// Carousel mode = static (fully rendered, no mid-animation frames).
// Video mode = animated sequences.
// ============================================================

import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
} from 'remotion';
import { GradientBackground } from './components/GradientBackground';
import { ParticleField } from './components/ParticleField';
import { TechGrid } from './components/TechGrid';
import { AvatarBadge } from './components/AvatarBadge';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CarouselSlideInput {
  /** Slide text — narration in video mode, display text in carousel mode */
  text: string;
  /** Optional image URL — fills background or inset */
  imageUrl?: string;
  /** Role: hook = big title, body = bullets, cta = call to action */
  role?: 'hook' | 'body' | 'cta' | 'slide';
  /** Caption / sub-headline override */
  caption?: string;
  /** Per-slide accent color override */
  accentColor?: string;
}

export interface CarouselCompositionProps {
  slides: CarouselSlideInput[];
  /** frames per slide (default 90 = 3s at 30fps) */
  framesPerSlide?: number;
  /** Global accent color */
  accentColor?: string;
  /** Palette name */
  palette?: 'tech-azul' | 'anthropic' | 'openai' | 'google' | 'dark-purple' | 'custom';
  /** bg primary dark color */
  bgPrimary?: string;
  /** bg secondary dark color */
  bgSecondary?: string;
  /** Brand handle shown bottom-right */
  handle?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Show TechGrid overlay */
  techGrid?: boolean;
  /** Show ParticleField */
  particles?: boolean;
  /** TTS audio URL (for video mode) */
  ttsAudioUrl?: string;
  /** Music audio URL (for video mode) */
  musicAudioUrl?: string;
  musicVolume?: number;
  /** 'carousel' = static render, skip entrance animations; 'video' = animated (default) */
  renderMode?: 'video' | 'carousel';
}

// ── Palettes ───────────────────────────────────────────────────────────────────

const PALETTES: Record<string, { bg1: string; bg2: string; accent: string }> = {
  'tech-azul':   { bg1: '#0A1628', bg2: '#0A0A0A', accent: '#00D4FF' },
  'anthropic':   { bg1: '#0A1628', bg2: '#0A0A0A', accent: '#CC785C' },
  'openai':      { bg1: '#0A1628', bg2: '#0A0A0A', accent: '#10A37F' },
  'google':      { bg1: '#050810', bg2: '#0A1628', accent: '#4285F4' },
  'dark-purple': { bg1: '#0D0A1E', bg2: '#130A2A', accent: '#A855F7' },
  'custom':      { bg1: '#0A0A0A', bg2: '#0A1628', accent: '#FFD700' },
};

// ── Internal helpers ───────────────────────────────────────────────────────────

const GlowBorder: React.FC<{ color: string }> = ({ color }) => (
  <div style={{
    position: 'absolute', inset: 24,
    border: `2px solid ${color}`,
    borderRadius: 20,
    boxShadow: `0 0 28px ${color}88, 0 0 56px ${color}33`,
    pointerEvents: 'none',
  }} />
);

const Chip: React.FC<{ label: string; color: string; hot?: boolean }> = ({ label, color, hot }) => (
  <div style={{
    display: 'inline-block',
    background: hot
      ? 'linear-gradient(90deg, rgba(255,107,53,0.2), rgba(0,212,255,0.13))'
      : `${color}22`,
    border: `1.5px solid ${hot ? '#FF6B35AA' : color}`,
    borderRadius: 100,
    padding: '7px 26px',
    color: hot ? '#FF6B35' : color,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    boxShadow: `0 0 14px ${hot ? '#FF6B3544' : `${color}44`}`,
    fontFamily: 'monospace, sans-serif',
    marginBottom: 32,
  }}>
    {label}
  </div>
);

const Bullet: React.FC<{
  text: string;
  color: string;
  bodySize: number;
  style?: React.CSSProperties;
}> = ({ text, color, bodySize, style }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22, ...style }}>
    <span style={{ color, fontSize: bodySize * 0.9, lineHeight: 1.5, flexShrink: 0, marginTop: 2 }}>▸</span>
    <span style={{
      color: '#FFFFFF',
      fontSize: bodySize,
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: 'Noto Sans, Arial, sans-serif',
      textShadow: '0 2px 12px rgba(0,0,0,0.9)',
    }}>
      {text}
    </span>
  </div>
);

const StatBlock: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <div style={{
    background: `${color}15`,
    border: `1.5px solid ${color}55`,
    borderRadius: 14,
    padding: '20px 32px',
    textAlign: 'center' as const,
    boxShadow: `0 0 20px ${color}22`,
  }}>
    <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1, fontFamily: 'Impact, Arial Black, sans-serif' }}>
      {value}
    </div>
    <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.65)', marginTop: 8, fontFamily: 'monospace, sans-serif' }}>
      {label}
    </div>
  </div>
);

const Handle: React.FC<{ text: string; color: string; width: number; height: number }> = ({
  text, color, width, height,
}) => (
  <div style={{
    position: 'absolute',
    bottom: Math.round(height * 0.055),
    right: Math.round(width * 0.065),
    color: `${color}99`,
    fontSize: Math.round(width * 0.022),
    fontFamily: 'monospace, sans-serif',
    fontWeight: 600,
    letterSpacing: 1,
  }}>
    {text}
  </div>
);

// Progress bar along top of slide
const SlideProgress: React.FC<{
  current: number;
  total: number;
  color: string;
  width: number;
}> = ({ current, total, color, width }) => {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
  return (
    <div style={{
      position: 'absolute', top: 22, left: 32, right: 32, height: 3,
      background: 'rgba(255,255,255,0.07)', borderRadius: 2,
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: 2, boxShadow: `0 0 10px ${color}88`,
      }} />
    </div>
  );
};

// Accent radial glow
const AccentGlow: React.FC<{ color: string; position?: 'top-right' | 'bottom-left' | 'center' }> = ({
  color, position = 'top-right',
}) => {
  const posMap = {
    'top-right':   'radial-gradient(ellipse 70% 50% at 85% 15%',
    'bottom-left': 'radial-gradient(ellipse 70% 50% at 15% 85%',
    'center':      'radial-gradient(ellipse 80% 70% at 50% 50%',
  };
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `${posMap[position]}, ${color}22 0%, transparent 70%)`,
    }} />
  );
};

// ── Per-slide inner renderer ───────────────────────────────────────────────────

const CarouselSlideInner: React.FC<{
  slide: CarouselSlideInput;
  slideIndex: number;
  totalSlides: number;
  localFrame: number;
  accent: string;
  bg1: string;
  bg2: string;
  handle: string;
  logoUrl?: string;
  techGrid: boolean;
  particles: boolean;
  isStatic: boolean;
}> = ({
  slide, slideIndex, totalSlides, localFrame,
  accent, bg1, bg2, handle, logoUrl, techGrid, particles, isStatic,
}) => {
  const { width, height, fps } = useVideoConfig();
  const a = slide.accentColor ?? accent;

  // In carousel (static) mode, all animation values are at their final state
  const fadeIn = isStatic ? 1 : interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = isStatic ? 0 : interpolate(localFrame, [0, 18], [40, 0], { extrapolateRight: 'clamp' });
  const titleScale = isStatic ? 1 : spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 140, mass: 0.7 } });
  const bulletFadeFor = (bi: number) =>
    isStatic ? 1 : interpolate(localFrame, [bi * 5, bi * 5 + 12], [0, 1], { extrapolateRight: 'clamp' });
  const bulletSlideFor = (bi: number) =>
    isStatic ? 0 : interpolate(localFrame, [bi * 5, bi * 5 + 12], [28, 0], { extrapolateRight: 'clamp' });

  const role = slide.role ?? 'body';
  const isHook = role === 'hook';
  const isCta = role === 'cta';

  // Proportional sizes — larger to match editor-pro-max quality
  const titleSize = isHook ? Math.round(width * 0.08) : Math.round(width * 0.065);
  const bodySize = Math.round(width * 0.037);
  const captionSize = Math.round(width * 0.03);
  const padH = Math.round(width * 0.074);
  const padV = Math.round(height * 0.07);
  const avatarSize = Math.round(width * 0.2);

  // Parse text into title + bullets (split on newlines or | )
  const lines = slide.text.split(/\n|\|/).map(l => l.trim()).filter(Boolean);
  const mainTitle = lines[0] ?? '';
  const bullets = lines.slice(1);

  // "value::label" bullets become stat blocks
  const statBullets = bullets.filter(b => b.includes('::'));
  const regularBullets = bullets.filter(b => !b.includes('::'));

  const gradAngle = isHook ? 145 : isCta ? 165 : 130 + slideIndex * 12;

  return (
    <AbsoluteFill style={{ background: bg1, overflow: 'hidden' }}>
      {/* ── Base gradient ── */}
      <GradientBackground
        colors={[bg2, bg1, `${a}25`]}
        angle={gradAngle}
        animateAngle={!isStatic}
        animateSpeed={0.06}
      />

      {/* ── Radial accent glow ── */}
      <AccentGlow color={a} position={isHook ? 'top-right' : isCta ? 'center' : 'bottom-left'} />

      {/* ── Background image ── */}
      {slide.imageUrl && (
        <AbsoluteFill style={{ opacity: isHook ? 0.32 : 0.2 }}>
          <Img src={slide.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(0deg, ${bg1}F5 0%, ${bg1}CC 30%, ${bg1}66 100%)`,
          }} />
        </AbsoluteFill>
      )}

      {/* ── TechGrid (graphic motions — static decoration for carousel) ── */}
      {techGrid && <TechGrid accentColor={a} opacity={0.75} />}

      {/* ── Particles (graphic motions — static at frame 0 for carousel) ── */}
      {particles && (
        <>
          <ParticleField count={40} color={`${a}55`} speed={isStatic ? 0 : 0.3} direction="up" />
          <ParticleField count={20} color="rgba(255,255,255,0.1)" speed={isStatic ? 0 : 0.18} direction="right" />
        </>
      )}

      {/* ── Glow border — 2px solid, prominent ── */}
      <GlowBorder color={a} />

      {/* ── Slide progress bar ── */}
      <SlideProgress current={slideIndex} total={totalSlides} color={a} width={width} />

      {/* ── HOOK layout: avatar right + big title center-bottom ── */}
      {isHook && (
        <>
          {/* Avatar top-right */}
          <AvatarBadge
            size={avatarSize}
            accentColor={a}
            label={handle}
            style={{ position: 'absolute', top: Math.round(height * 0.1), right: Math.round(width * 0.07) }}
          />

          {/* Chip top-left */}
          <div style={{
            position: 'absolute',
            top: Math.round(height * 0.12),
            left: padH,
            opacity: fadeIn,
          }}>
            <Chip label={`Slide 1 · ${totalSlides}`} color={a} hot />
          </div>

          {/* Main title — lower half, centered */}
          <AbsoluteFill style={{
            justifyContent: 'flex-end', alignItems: 'center',
            paddingBottom: Math.round(height * 0.16),
            opacity: fadeIn, transform: `translateY(${slideUp}px)`,
          }}>
            <div style={{ textAlign: 'center', padding: `0 ${padH}px`, width: '100%' }}>
              <div style={{
                fontSize: titleSize,
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.05,
                textTransform: 'uppercase',
                letterSpacing: -1,
                textShadow: `0 0 50px ${a}66`,
                marginBottom: Math.round(height * 0.02),
                fontFamily: 'Impact, Arial Black, sans-serif',
                transform: `scale(${titleScale})`,
                transformOrigin: 'center',
              }}>
                {(() => {
                  const words = mainTitle.split(' ');
                  const last = words.pop();
                  return (
                    <>
                      {words.join(' ')}{words.length > 0 ? ' ' : ''}
                      <span style={{ color: a, textShadow: `0 0 30px ${a}99, 0 0 60px ${a}55` }}>
                        {last}
                      </span>
                    </>
                  );
                })()}
              </div>
              {slide.caption && (
                <div style={{
                  fontSize: captionSize * 1.2,
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  maxWidth: '78%',
                  margin: '0 auto',
                  fontFamily: 'Noto Sans, Arial, sans-serif',
                }}>
                  {slide.caption}
                </div>
              )}
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── BODY layout: left-aligned chip + large title + bullets ── */}
      {!isHook && !isCta && (
        <AbsoluteFill style={{
          justifyContent: 'center', alignItems: 'flex-start',
          padding: `${padV + 20}px ${padH}px ${padV}px`,
          opacity: fadeIn, transform: `translateY(${slideUp}px)`,
        }}>
          <div style={{ width: '100%' }}>
            <Chip label={`${slideIndex + 1} / ${totalSlides}`} color={a} />

            <div style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.12,
              marginBottom: Math.round(height * 0.04),
              fontFamily: 'Impact, Arial Black, Noto Sans, sans-serif',
              transform: `scale(${titleScale})`,
              transformOrigin: 'left center',
              maxWidth: '90%',
              textShadow: `0 0 40px ${a}44`,
            }}>
              {(() => {
                const words = mainTitle.split(' ');
                if (words.length <= 1) return <span style={{ color: a }}>{mainTitle}</span>;
                const last = words.pop();
                return (
                  <>
                    {words.join(' ')}{' '}
                    <span style={{ color: a }}>{last}</span>
                  </>
                );
              })()}
            </div>

            {slide.caption && (
              <div style={{
                fontSize: captionSize,
                color: `${a}CC`,
                fontWeight: 600,
                letterSpacing: 1,
                marginBottom: Math.round(height * 0.025),
                fontFamily: 'monospace, sans-serif',
                textTransform: 'uppercase' as const,
              }}>
                {slide.caption}
              </div>
            )}

            {regularBullets.map((bullet, bi) => (
              <Bullet
                key={bi}
                text={bullet}
                color={a}
                bodySize={bodySize}
                style={{ opacity: bulletFadeFor(bi), transform: `translateX(${bulletSlideFor(bi)}px)` }}
              />
            ))}

            {/* Stat blocks for "value::label" bullets */}
            {statBullets.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(statBullets.length, 3)}, 1fr)`,
                gap: Math.round(width * 0.02),
                marginTop: Math.round(height * 0.025),
              }}>
                {statBullets.map((sb, si) => {
                  const [val, lbl] = sb.split('::');
                  return (
                    <div key={si} style={{ opacity: bulletFadeFor(si + regularBullets.length) }}>
                      <StatBlock value={val ?? ''} label={lbl ?? ''} color={a} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* ── CTA layout: centered, avatar prominent ── */}
      {isCta && (
        <AbsoluteFill style={{
          justifyContent: 'center', alignItems: 'center',
          opacity: fadeIn, transform: `translateY(${slideUp}px)`,
        }}>
          <div style={{ textAlign: 'center', padding: `0 ${padH}px`, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: Math.round(height * 0.03) }}>
              <AvatarBadge size={avatarSize} accentColor={a} label={handle} />
            </div>

            <div style={{
              fontSize: Math.round(titleSize * 0.88),
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: Math.round(height * 0.04),
              fontFamily: 'Impact, Arial Black, Noto Sans, sans-serif',
              textShadow: `0 0 40px ${a}44`,
            }}>
              {(() => {
                const words = mainTitle.split(' ');
                const last = words.pop();
                return (
                  <>
                    {words.join(' ')}{' '}
                    <span style={{ color: a }}>{last}</span>
                  </>
                );
              })()}
            </div>

            {/* CTA action box */}
            <div style={{
              display: 'inline-block',
              background: `${a}18`,
              border: `2px solid ${a}`,
              borderRadius: 16,
              padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px`,
              marginBottom: Math.round(height * 0.03),
              boxShadow: `0 0 32px ${a}55`,
            }}>
              <span style={{
                color: a,
                fontSize: Math.round(bodySize * 1.1),
                fontWeight: 700,
                fontFamily: 'Noto Sans, Arial, sans-serif',
              }}>
                {slide.caption ?? '💬 Déjalo en los comentarios'}
              </span>
            </div>

            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: bodySize * 0.9,
              fontWeight: 400,
              fontFamily: 'Noto Sans, Arial, sans-serif',
            }}>
              Seguime para más contenido 🤖
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── Logo top-right (for body/cta if provided, overrides avatar area) ── */}
      {logoUrl && !isHook && (
        <div style={{
          position: 'absolute',
          top: Math.round(height * 0.055),
          right: Math.round(width * 0.065),
          opacity: 0.9,
        }}>
          <Img
            src={logoUrl}
            style={{
              width: Math.round(width * 0.11),
              height: Math.round(width * 0.11),
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* ── Handle ── */}
      <Handle text={handle} color={a} width={width} height={height} />

      {/* ── Bottom gradient fade ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(height * 0.12),
        background: `linear-gradient(0deg, ${bg1} 0%, transparent 100%)`,
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};

// ── Thin wrapper: provides localFrame via hook ─────────────────────────────────

const SlideInner: React.FC<{
  slide: CarouselSlideInput;
  slideIndex: number;
  totalSlides: number;
  accent: string;
  bg1: string;
  bg2: string;
  handle: string;
  logoUrl?: string;
  techGrid: boolean;
  particles: boolean;
  isStatic: boolean;
}> = (props) => {
  const localFrame = useCurrentFrame();
  return <CarouselSlideInner {...props} localFrame={localFrame} />;
};

// ── Main composition ───────────────────────────────────────────────────────────

export const CarouselComposition: React.FC<CarouselCompositionProps> = ({
  slides = [],
  framesPerSlide = 90,
  accentColor,
  palette = 'tech-azul',
  bgPrimary,
  bgSecondary,
  handle = '@syndra',
  logoUrl,
  techGrid = true,
  particles = true,
  ttsAudioUrl,
  musicAudioUrl,
  musicVolume = 0.22,
  renderMode = 'video',
}) => {
  const pal = PALETTES[palette] ?? PALETTES['tech-azul']!;
  const accent = accentColor ?? pal.accent;
  const bg1 = bgPrimary ?? pal.bg1;
  const bg2 = bgSecondary ?? pal.bg2;
  const isStatic = renderMode === 'carousel';

  if (slides.length === 0) {
    return <AbsoluteFill style={{ background: bg1 }} />;
  }

  return (
    <AbsoluteFill>
      {ttsAudioUrl && <Audio src={ttsAudioUrl} volume={1} />}
      {musicAudioUrl && <Audio src={musicAudioUrl} volume={musicVolume} />}

      {slides.map((slide, i) => (
        <Sequence
          key={i}
          from={i * framesPerSlide}
          durationInFrames={framesPerSlide}
          name={`Slide ${i + 1}`}
        >
          <SlideInner
            slide={slide}
            slideIndex={i}
            totalSlides={slides.length}
            accent={accent}
            bg1={bg1}
            bg2={bg2}
            handle={handle}
            logoUrl={logoUrl}
            techGrid={techGrid}
            particles={particles}
            isStatic={isStatic}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
