// ============================================================
// CarouselComposition — Tech-style slide composer for Syndra
// Inspired by editor-pro-max-main components.
// Each slide renders one frame for carousel export OR sequential
// for video. Supports: background image, gradient, TechGrid,
// ParticleField, chip, title, bullets, CTA, logo.
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

const GlowBorder: React.FC<{ color: string; radius?: number }> = ({ color, radius = 24 }) => (
  <div style={{
    position: 'absolute', inset: 20,
    border: `1.5px solid ${color}55`,
    borderRadius: radius,
    boxShadow: `0 0 24px ${color}44, 0 0 48px ${color}22`,
    pointerEvents: 'none',
  }} />
);

const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div style={{
    display: 'inline-block',
    background: `${color}22`,
    border: `1px solid ${color}`,
    borderRadius: 100,
    padding: '6px 22px',
    color,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    boxShadow: `0 0 12px ${color}44`,
    fontFamily: 'monospace, sans-serif',
  }}>
    {label}
  </div>
);

const Handle: React.FC<{ text: string; color: string; width: number; height: number }> = ({
  text, color, width, height,
}) => (
  <div style={{
    position: 'absolute',
    bottom: Math.round(height * 0.04),
    right: Math.round(width * 0.06),
    color: `${color}88`,
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
  const pct = total > 1 ? ((current) / (total - 1)) * 100 : 100;
  return (
    <div style={{
      position: 'absolute', top: 20, left: 28, right: 28, height: 3,
      background: 'rgba(255,255,255,0.08)', borderRadius: 2,
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: 2,
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
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
}> = ({
  slide, slideIndex, totalSlides, localFrame,
  accent, bg1, bg2, handle, logoUrl, techGrid, particles,
}) => {
  const { width, height, fps } = useVideoConfig();
  const a = slide.accentColor ?? accent;

  // ── Entrance animations ──
  const fadeIn = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(localFrame, [0, 18], [40, 0], { extrapolateRight: 'clamp' });
  const titleScale = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 140, mass: 0.7 } });

  const role = slide.role ?? 'body';
  const isHook = role === 'hook';
  const isCta  = role === 'cta';

  // Font sizes proportional to composition width
  const titleSize  = isHook ? Math.round(width * 0.085) : Math.round(width * 0.066);
  const bodySize   = Math.round(width * 0.038);
  const captionSize = Math.round(width * 0.032);
  const padH = Math.round(width * 0.08);
  const padV = Math.round(height * 0.06);

  // Parse text into lines (split on newlines or | for bullet lists)
  const lines = slide.text.split(/\n|\|/).map(l => l.trim()).filter(Boolean);
  const mainTitle = lines[0] ?? '';
  const bullets = lines.slice(1);

  return (
    <AbsoluteFill style={{ background: bg1, overflow: 'hidden' }}>
      {/* Layer 1: gradient background */}
      <GradientBackground
        colors={[bg2, bg1, `${a}33`]}
        angle={145}
        animateAngle
        animateSpeed={0.08}
      />

      {/* Layer 1b: accent radial glow — gives depth and identity to the slide */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 70% 20%, ${a}1A 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Layer 2: background image (dimmed) */}
      {slide.imageUrl && (
        <AbsoluteFill style={{ opacity: isHook ? 0.35 : 0.22 }}>
          <Img
            src={slide.imageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(0deg, ${bg1}F0 0%, ${bg1}BB 35%, ${bg1}55 100%)`,
          }} />
        </AbsoluteFill>
      )}

      {/* Layer 3: TechGrid */}
      {techGrid && <TechGrid accentColor={a} opacity={0.9} />}

      {/* Layer 4: Particles */}
      {particles && (
        <>
          <ParticleField count={30} color={`${a}55`} speed={0.35} direction="up" />
          <ParticleField count={18} color={`rgba(255,255,255,0.12)`} speed={0.2} direction="right" />
        </>
      )}

      {/* Layer 5: Glow border */}
      <GlowBorder color={a} />

      {/* Layer 6: Progress bar */}
      <SlideProgress current={slideIndex} total={totalSlides} color={a} width={width} />

      {/* Layer 7: Content */}
      <AbsoluteFill style={{
        padding: `${padV + 18}px ${padH}px ${padV}px`,
        opacity: fadeIn,
        transform: `translateY(${slideUp}px)`,
      }}>
        {/* Chip/badge top-left */}
        <div style={{ marginBottom: Math.round(height * 0.025) }}>
          <Chip
            label={isHook ? `Slide 1 · ${totalSlides}` : isCta ? '🎯 Acción' : `${slideIndex + 1} / ${totalSlides}`}
            color={a}
          />
        </div>

        {/* Main title */}
        <div style={{
          fontSize: titleSize,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.08,
          textTransform: isHook ? 'uppercase' as const : 'none' as const,
          letterSpacing: isHook ? -1 : 0,
          textShadow: `0 0 40px ${a}44`,
          marginBottom: Math.round(height * 0.022),
          fontFamily: 'Impact, Arial Black, Noto Sans, sans-serif',
          transform: `scale(${titleScale})`,
          transformOrigin: 'left center',
          maxWidth: '90%',
        }}>
          {/* Highlight last word in accent color for hook slides */}
          {isHook ? (
            (() => {
              const words = mainTitle.split(' ');
              const last = words.pop();
              return (
                <>
                  {words.join(' ')}{words.length > 0 ? ' ' : ''}
                  <span style={{ color: a, textShadow: `0 0 30px ${a}88, 0 0 60px ${a}44` }}>
                    {last}
                  </span>
                </>
              );
            })()
          ) : mainTitle}
        </div>

        {/* Caption / subtitle */}
        {slide.caption && (
          <div style={{
            fontSize: captionSize,
            color: `${a}CC`,
            fontWeight: 600,
            letterSpacing: 1,
            marginBottom: Math.round(height * 0.02),
            fontFamily: 'monospace, sans-serif',
            textTransform: 'uppercase' as const,
          }}>
            {slide.caption}
          </div>
        )}

        {/* Bullet points */}
        {bullets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(height * 0.016) }}>
            {bullets.map((bullet, bi) => {
              const bulletFade = interpolate(localFrame, [bi * 6, bi * 6 + 14], [0, 1], { extrapolateRight: 'clamp' });
              const bulletSlide = interpolate(localFrame, [bi * 6, bi * 6 + 14], [30, 0], { extrapolateRight: 'clamp' });
              return (
                <div key={bi} style={{
                  display: 'flex', alignItems: 'flex-start', gap: Math.round(width * 0.03),
                  opacity: bulletFade,
                  transform: `translateX(${bulletSlide}px)`,
                }}>
                  <span style={{ color: a, fontSize: Math.round(bodySize * 0.9), flexShrink: 0, marginTop: 2 }}>▸</span>
                  <span style={{
                    color: '#FFFFFF',
                    fontSize: bodySize,
                    fontWeight: 400,
                    lineHeight: 1.45,
                    fontFamily: 'Noto Sans, Arial, sans-serif',
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}>
                    {bullet}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA special content */}
        {isCta && (
          <div style={{ marginTop: Math.round(height * 0.04) }}>
            <div style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, ${a}, ${a}88)`,
              color: '#000',
              fontWeight: 900,
              fontSize: Math.round(width * 0.045),
              padding: `${Math.round(height * 0.018)}px ${Math.round(width * 0.07)}px`,
              borderRadius: Math.round(height * 0.015),
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: 1,
              boxShadow: `0 0 32px ${a}66`,
            }}>
              {mainTitle}
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* Layer 8: Logo top-right */}
      {logoUrl && (
        <div style={{
          position: 'absolute',
          top: Math.round(height * 0.05),
          right: Math.round(width * 0.06),
          opacity: 0.85,
        }}>
          <Img
            src={logoUrl}
            style={{
              width: Math.round(width * 0.12),
              height: Math.round(width * 0.12),
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Layer 9: Handle */}
      <Handle text={handle} color={a} width={width} height={height} />

      {/* Layer 10: Bottom gradient fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(height * 0.15),
        background: `linear-gradient(0deg, ${bg1} 0%, transparent 100%)`,
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};

// ── Main composition (video mode: slides play sequentially) ───────────────────

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
}) => {
  const pal = PALETTES[palette] ?? PALETTES['tech-azul']!;
  const accent = accentColor ?? pal.accent;
  const bg1 = bgPrimary ?? pal.bg1;
  const bg2 = bgSecondary ?? pal.bg2;

  if (slides.length === 0) {
    return <AbsoluteFill style={{ background: bg1 }} />;
  }

  return (
    <AbsoluteFill>
      {/* TTS Audio */}
      {ttsAudioUrl && (
        <Audio src={ttsAudioUrl} volume={1} />
      )}
      {/* Background music */}
      {musicAudioUrl && (
        <Audio src={musicAudioUrl} volume={musicVolume} />
      )}

      {/* Slides rendered as sequential Sequences */}
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
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Thin wrapper that provides localFrame via useCurrentFrame()
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
}> = (props) => {
  const localFrame = useCurrentFrame();
  return <CarouselSlideInner {...props} localFrame={localFrame} />;
};
