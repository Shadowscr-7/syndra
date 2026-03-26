import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from 'remotion';
import type { VideoCompositionProps, SubtitleGroup, StoryboardSlide, OverlayTheme } from './types';

// ── Easing helpers ──
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const easeOutBack = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOutElastic = (t: number) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

// ── Animation presets for Ken Burns + advanced ──
const ANIMATION_PRESETS = {
  'ken-burns-in':  { startScale: 1.0,  endScale: 1.18, startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0, endRotate: 0 },
  'ken-burns-out': { startScale: 1.18, endScale: 1.0,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0, endRotate: 0 },
  'pan-left':      { startScale: 1.08, endScale: 1.12, startX: 40,  endX: -40, startY: 0,   endY: -10, startRotate: 0, endRotate: 0 },
  'pan-right':     { startScale: 1.08, endScale: 1.12, startX: -40, endX: 40,  startY: -10, endY: 0,   startRotate: 0, endRotate: 0 },
  'zoom-pulse':    { startScale: 1.0,  endScale: 1.25, startX: 0,   endX: 0,   startY: -10, endY: 5,   startRotate: 0, endRotate: 0 },
  'drift':         { startScale: 1.1,  endScale: 1.15, startX: -20, endX: 20,  startY: -15, endY: 15,  startRotate: -0.3, endRotate: 0.3 },
  'tilt-up':       { startScale: 1.12, endScale: 1.12, startX: 0,   endX: 0,   startY: 50,  endY: -30, startRotate: 0, endRotate: 0 },
  'tilt-down':     { startScale: 1.12, endScale: 1.12, startX: 0,   endX: 0,   startY: -30, endY: 50,  startRotate: 0, endRotate: 0 },
  'zoom-rotate':   { startScale: 1.0,  endScale: 1.2,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: -0.8, endRotate: 0.8 },
  'cinematic-pan': { startScale: 1.15, endScale: 1.08, startX: 60,  endX: -60, startY: 0,   endY: 0,   startRotate: 0, endRotate: 0 },
  'parallax':      { startScale: 1.2,  endScale: 1.05, startX: 30,  endX: -10, startY: 20,  endY: -10, startRotate: 0.2, endRotate: -0.2 },
  'none':          { startScale: 1.0,  endScale: 1.0,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0, endRotate: 0 },
};

const AUTO_ANIMATIONS = [
  ANIMATION_PRESETS['ken-burns-in'],
  ANIMATION_PRESETS['ken-burns-out'],
  ANIMATION_PRESETS['pan-left'],
  ANIMATION_PRESETS['pan-right'],
  ANIMATION_PRESETS['zoom-pulse'],
  ANIMATION_PRESETS['drift'],
  ANIMATION_PRESETS['tilt-up'],
  ANIMATION_PRESETS['cinematic-pan'],
  ANIMATION_PRESETS['parallax'],
  ANIMATION_PRESETS['zoom-rotate'],
];

// ── Slide component with advanced animation + vignette ──
const Slide: React.FC<{
  src: string;
  index: number;
  animation: string;
  durationInFrames: number;
}> = ({ src, index, animation, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = clamp(frame / Math.max(durationInFrames, 1));

  // Eased progress for smoother motion
  const easedProgress = Easing.inOut(Easing.cubic)(progress);

  const preset = animation !== 'auto' && animation !== 'none'
    ? ANIMATION_PRESETS[animation as keyof typeof ANIMATION_PRESETS] ?? AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!
    : animation === 'none'
      ? ANIMATION_PRESETS['none']
      : AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!;

  const scale = interpolate(easedProgress, [0, 1], [preset.startScale, preset.endScale]);
  const x = interpolate(easedProgress, [0, 1], [preset.startX, preset.endX]);
  const y = interpolate(easedProgress, [0, 1], [preset.startY, preset.endY]);
  const rotate = interpolate(easedProgress, [0, 1], [preset.startRotate, preset.endRotate]);

  // Subtle brightness pulse on entrance
  const brightness = interpolate(frame, [0, Math.round(fps * 0.5)], [1.15, 1.0], { extrapolateRight: 'clamp' });
  // Cinematic vignette
  const vignetteOpacity = interpolate(frame, [0, Math.round(fps * 0.4)], [0.6, 0.25], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${x}px, ${y}px) rotate(${rotate}deg)`,
          filter: `brightness(${brightness})`,
          willChange: 'transform, filter',
        }}
      />
      {/* Cinematic vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
      }} />
    </AbsoluteFill>
  );
};

// ── Slide Caption overlay with spring animation ──
const SlideCaption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.8 } });
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(frame, [0, 12], [30, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: Math.round(width * 0.08) }}>
      <div
        style={{
          opacity: fadeIn,
          transform: `translateY(${slideUp}px) scale(${scaleSpring})`,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
          backdropFilter: 'blur(8px)',
          padding: `${Math.round(height * 0.018)}px ${Math.round(width * 0.06)}px`,
          borderRadius: Math.round(height * 0.012),
          textAlign: 'center',
          maxWidth: Math.round(width * 0.85),
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{
          color: '#FFFFFF', fontSize: Math.round(width * 0.05), fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.4,
          textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.3)',
          letterSpacing: '0.02em',
        }}>
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Animated Subtitles — Enhanced styles ──
const AnimatedSubtitles: React.FC<{
  groups: SubtitleGroup[];
  subtitleStyle?: string;
}> = ({ groups, subtitleStyle }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const current = groups.find((g) => frame >= g.startFrame && frame < g.endFrame);
  if (!current) return null;

  const localFrame = frame - current.startFrame;
  const remaining = current.endFrame - frame;
  const totalFrames = current.endFrame - current.startFrame;
  const fontSize = Math.round(width * 0.042);
  const maxWidth = Math.round(width * 0.85);

  // ── Word-by-word style (CapCut-like, enhanced) ──
  if (subtitleStyle === 'word-by-word') {
    const words = current.text.split(/\s+/);
    const framesPerWord = Math.max(1, Math.floor(totalFrames / words.length));
    const currentWordIdx = Math.min(Math.floor(localFrame / framesPerWord), words.length - 1);
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    // Container entrance
    const containerSlide = interpolate(localFrame, [0, 8], [25, 0], { extrapolateRight: 'clamp' });
    const containerFade = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: Math.round(width * 0.12),
        opacity: Math.min(containerFade, fadeOut),
        transform: `translateY(${containerSlide}px)`,
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: Math.round(fontSize * 0.3), maxWidth,
          padding: `${Math.round(fontSize * 0.3)}px ${Math.round(fontSize * 0.6)}px`,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)',
          borderRadius: Math.round(fontSize * 0.4),
          backdropFilter: 'blur(4px)',
        }}>
          {words.map((word, i) => {
            const wordFrame = i * framesPerWord;
            const wordProgress = Math.max(0, localFrame - wordFrame);
            const isActive = i === currentWordIdx;
            const isPast = i < currentWordIdx;
            // Spring-like bounce for active word
            const rawScale = interpolate(wordProgress, [0, 3, 5], [0.6, 1.12, 1.0], { extrapolateRight: 'clamp' });
            const scale = i <= currentWordIdx ? rawScale : 0.85;
            const opacity = i <= currentWordIdx
              ? interpolate(wordProgress, [0, 2], [0, 1], { extrapolateRight: 'clamp' })
              : 0.15;
            // Color: active = bright accent, past = white, future = dim
            const color = isActive ? '#FFD700' : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
            // Active word glow
            const glowShadow = isActive
              ? '0 0 16px rgba(255,215,0,0.6), 0 2px 8px rgba(0,0,0,0.9)'
              : '0 2px 8px rgba(0,0,0,0.9)';
            return (
              <span key={i} style={{
                color, fontSize: Math.round(fontSize * (isActive ? 1.1 : 1)), fontWeight: isActive ? 900 : 700,
                fontFamily: 'Noto Sans, sans-serif', opacity,
                transform: `scale(${scale})`, display: 'inline-block',
                textShadow: glowShadow,
                transition: 'color 0.1s',
              }}>{word}</span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Karaoke style (gradient sweep + glow pulse) ──
  if (subtitleStyle === 'karaoke') {
    const progress = localFrame / Math.max(totalFrames, 1);
    const fadeIn = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const scaleIn = interpolate(localFrame, [0, 6], [0.9, 1.0], { extrapolateRight: 'clamp' });
    const text = current.text;
    const highlightIdx = Math.floor(progress * text.length);
    // Pulsing glow intensity
    const glowPulse = 0.4 + 0.3 * Math.sin(localFrame * 0.4);

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: Math.round(width * 0.12),
        opacity: Math.min(fadeIn, fadeOut),
        transform: `scale(${scaleIn})`,
      }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
          padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
          borderRadius: Math.round(fontSize * 0.4), maxWidth, textAlign: 'center',
          border: '1px solid rgba(255,215,0,0.15)',
          boxShadow: `0 0 ${Math.round(20 * glowPulse)}px rgba(255,215,0,${glowPulse * 0.3})`,
        }}>
          <span style={{ fontSize, fontWeight: 700, fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35 }}>
            <span style={{
              color: '#FFD700',
              textShadow: `0 0 12px rgba(255,215,0,${glowPulse}), 0 2px 8px rgba(0,0,0,0.9)`,
            }}>{text.slice(0, highlightIdx)}</span>
            <span style={{
              color: 'rgba(255,255,255,0.4)',
              textShadow: '0 2px 6px rgba(0,0,0,0.7)',
            }}>{text.slice(highlightIdx)}</span>
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Minimal style (elegant fade + letter spacing) ──
  if (subtitleStyle === 'minimal') {
    const fadeIn = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const letterSpace = interpolate(localFrame, [0, 8], [0.15, 0.03], { extrapolateRight: 'clamp' });
    const slideUp = interpolate(localFrame, [0, 6], [8, 0], { extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: Math.round(width * 0.12),
      }}>
        <span style={{
          opacity: Math.min(fadeIn, fadeOut), color: '#FFFFFF',
          fontSize, fontWeight: 600,
          fontFamily: 'Noto Sans, sans-serif', textAlign: 'center', maxWidth,
          textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.25)',
          letterSpacing: `${letterSpace}em`,
          transform: `translateY(${slideUp}px)`,
        }}>
          {current.text}
        </span>
      </AbsoluteFill>
    );
  }

  // ── Neon style (synthwave / retro glow) ──
  if (subtitleStyle === 'neon') {
    const fadeIn = interpolate(localFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const scaleIn = interpolate(localFrame, [0, 5], [0.85, 1.0], { extrapolateRight: 'clamp' });
    const flicker = localFrame < 3 ? (localFrame % 2 === 0 ? 0.6 : 1) : 1;
    const glowIntensity = 0.7 + 0.3 * Math.sin(localFrame * 0.3);

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: Math.round(width * 0.12),
        opacity: Math.min(fadeIn, fadeOut) * flicker,
        transform: `scale(${scaleIn})`,
      }}>
        <div style={{
          padding: `${Math.round(fontSize * 0.35)}px ${Math.round(fontSize * 0.8)}px`,
          borderRadius: Math.round(fontSize * 0.3), maxWidth, textAlign: 'center',
          border: `2px solid rgba(0,229,255,${glowIntensity * 0.8})`,
          boxShadow: `0 0 ${Math.round(15 * glowIntensity)}px rgba(0,229,255,${glowIntensity * 0.5}), inset 0 0 ${Math.round(10 * glowIntensity)}px rgba(0,229,255,${glowIntensity * 0.15})`,
          background: 'rgba(0,0,0,0.6)',
        }}>
          <span style={{
            color: '#00E5FF', fontSize, fontWeight: 800,
            fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35,
            textShadow: `0 0 8px rgba(0,229,255,${glowIntensity}), 0 0 20px rgba(0,229,255,${glowIntensity * 0.5}), 0 0 40px rgba(0,229,255,${glowIntensity * 0.25})`,
            letterSpacing: '0.05em',
          }}>
            {current.text}
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // Default: pill style (enhanced with spring + gradient)
  const pillSpring = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 120, mass: 0.6 } });
  const slideUp = interpolate(localFrame, [0, 8], [18, 0], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
  const opacity = Math.min(pillSpring, fadeOut);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(width * 0.12) }}>
      <div style={{
        opacity, transform: `translateY(${slideUp}px) scale(${pillSpring})`,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(20,20,30,0.6) 100%)',
        backdropFilter: 'blur(6px)',
        padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
        borderRadius: Math.round(fontSize * 0.4), maxWidth, textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <span style={{
          color: '#FFFFFF', fontSize, fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35,
          textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.3)',
          wordBreak: 'break-word', letterSpacing: '0.01em',
        }}>
          {current.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Logo Watermark (persistent overlay with spring entrance) ──
const LogoWatermark: React.FC<{ src: string }> = ({ src }) => {
  const { width, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const scaleSpring = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 0.5 }, delay: 10 });
  const fadeIn = interpolate(frame, [10, 25], [0, 0.9], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: Math.round(width * 0.04), right: Math.round(width * 0.04),
      opacity: fadeIn, transform: `scale(${scaleSpring})`,
    }}>
      <Img src={src} style={{
        width: Math.round(width * 0.14), height: Math.round(width * 0.14),
        objectFit: 'contain',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(0,0,0,0.3))',
      }} />
    </div>
  );
};

// ── Product Overlay (with slide-up + spring) ──
const ProductOverlay: React.FC<{ overlay: { name?: string; price?: string; cta?: string } }> = ({ overlay }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.7 } });
  const slideUp = interpolate(frame, [0, 15], [40, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', opacity: scaleSpring }}>
      <div style={{
        padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px`,
        paddingBottom: Math.round(height * 0.22), textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(height * 0.01),
        transform: `translateY(${slideUp}px)`,
      }}>
        {overlay.name && <span style={{
          color: '#FFFFFF', fontSize: Math.round(height * 0.036), fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.4)',
          letterSpacing: '0.02em',
        }}>{overlay.name}</span>}
        {overlay.price && <span style={{
          color: '#FFD700', fontSize: Math.round(height * 0.04), fontWeight: 800,
          fontFamily: 'Noto Sans, sans-serif',
          textShadow: '0 0 15px rgba(255,215,0,0.4), 0 2px 10px rgba(0,0,0,0.9)',
        }}>{overlay.price}</span>}
        {overlay.cta && <span style={{
          color: '#00FF88', fontSize: Math.round(height * 0.028), fontWeight: 600,
          fontFamily: 'Noto Sans, sans-serif',
          background: 'rgba(0,255,136,0.12)', padding: `${Math.round(height * 0.006)}px ${Math.round(width * 0.03)}px`,
          borderRadius: Math.round(height * 0.008),
          textShadow: '0 0 10px rgba(0,255,136,0.3), 0 2px 6px rgba(0,0,0,0.7)',
        }}>{overlay.cta}</span>}
      </div>
    </AbsoluteFill>
  );
};

// ── Dynamic Overlays ──

// Animated gradient overlay (top + bottom)
const GradientOverlay: React.FC<{ theme: OverlayTheme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (theme === 'none') return null;

  const progress = frame / durationInFrames;
  const shift = Math.sin(progress * Math.PI * 2) * 15;

  const gradients: Record<string, { top: string; bottom: string }> = {
    minimal: {
      top: `linear-gradient(180deg, rgba(0,0,0,${0.3 + shift * 0.005}) 0%, transparent 25%)`,
      bottom: `linear-gradient(0deg, rgba(0,0,0,${0.5 + shift * 0.005}) 0%, transparent 35%)`,
    },
    modern: {
      top: `linear-gradient(180deg, rgba(10,10,30,0.4) 0%, transparent 30%)`,
      bottom: `linear-gradient(0deg, rgba(10,10,30,0.6) 0%, transparent 40%)`,
    },
    neon: {
      top: `linear-gradient(180deg, rgba(0,10,30,0.5) 0%, transparent 25%)`,
      bottom: `linear-gradient(0deg, rgba(0,10,30,0.7) 0%, transparent 40%)`,
    },
    elegant: {
      top: `linear-gradient(180deg, rgba(20,15,10,0.35) 0%, transparent 20%)`,
      bottom: `linear-gradient(0deg, rgba(20,15,10,0.55) 0%, transparent 35%)`,
    },
  };

  const g = gradients[theme] ?? gradients.modern!;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: g.top, pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: 0, background: g.bottom, pointerEvents: 'none', zIndex: 2 }} />
    </>
  );
};

// Floating particles effect
const FloatingParticles: React.FC<{ theme: OverlayTheme; count?: number }> = ({ theme, count = 6 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (theme === 'none' || theme === 'minimal') return null;

  const color = theme === 'neon' ? 'rgba(0,229,255,' : theme === 'elegant' ? 'rgba(255,215,0,' : 'rgba(255,255,255,';

  // Deterministic pseudo-random based on index
  const particles = Array.from({ length: count }, (_, i) => {
    const seed = (i * 137.5) % 360;
    const xBase = (seed / 360) * width;
    const yBase = ((i * 73.7) % 100) / 100 * height;
    const size = 2 + (i % 4);
    const speed = 0.3 + (i % 5) * 0.15;
    const opacity = 0.15 + (i % 3) * 0.1;
    const x = xBase + Math.sin(frame * speed * 0.02 + seed) * 30;
    const y = yBase + Math.cos(frame * speed * 0.015 + seed * 0.5) * 25 - frame * speed * 0.3;
    const wrappedY = ((y % height) + height) % height;
    return { x, y: wrappedY, size, opacity };
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: '50%',
          background: `${color}${p.opacity})`,
          boxShadow: theme === 'neon' ? `0 0 ${p.size * 2}px ${color}${p.opacity * 0.5})` : undefined,
        }} />
      ))}
    </div>
  );
};

// Progress bar at top or bottom
const ProgressBar: React.FC<{ theme: OverlayTheme; position?: 'top' | 'bottom' }> = ({ theme, position = 'top' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  if (theme === 'none') return null;

  const progress = clamp(frame / durationInFrames);

  const colors: Record<string, string> = {
    minimal: 'rgba(255,255,255,0.5)',
    modern: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
    neon: 'linear-gradient(90deg, #00e5ff, #00ff88)',
    elegant: 'linear-gradient(90deg, #d4a574, #f5e6d3)',
  };

  const barHeight = theme === 'minimal' ? 2 : 3;
  const barStyle = colors[theme] ?? colors.modern!;

  return (
    <div style={{
      position: 'absolute',
      [position]: 0, left: 0,
      width: Math.round(width * progress), height: barHeight,
      background: barStyle,
      zIndex: 10, borderRadius: position === 'top' ? '0 0 2px 0' : '2px 0 0 0',
      boxShadow: theme === 'neon' ? '0 0 8px rgba(0,229,255,0.5)' : undefined,
    }} />
  );
};

// Slide counter (e.g. "2/5")
const SlideCounter: React.FC<{
  currentSlide: number; totalSlides: number; theme: OverlayTheme;
}> = ({ currentSlide, totalSlides, theme }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  if (theme === 'none' || theme === 'minimal') return null;

  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 0.7], { extrapolateRight: 'clamp' });
  const fontSize = Math.round(width * 0.025);

  const colors: Record<string, { bg: string; text: string; border: string }> = {
    modern: { bg: 'rgba(0,0,0,0.45)', text: '#fff', border: 'rgba(255,255,255,0.1)' },
    neon: { bg: 'rgba(0,10,30,0.6)', text: '#00e5ff', border: 'rgba(0,229,255,0.3)' },
    elegant: { bg: 'rgba(20,15,10,0.5)', text: '#f5e6d3', border: 'rgba(212,165,116,0.3)' },
  };
  const c = colors[theme] ?? colors.modern!;

  return (
    <div style={{
      position: 'absolute', top: Math.round(width * 0.04), left: Math.round(width * 0.04),
      opacity: fadeIn, fontSize, fontWeight: 600,
      fontFamily: 'Noto Sans, sans-serif', color: c.text,
      background: c.bg, padding: `${Math.round(fontSize * 0.3)}px ${Math.round(fontSize * 0.7)}px`,
      borderRadius: Math.round(fontSize * 0.4), border: `1px solid ${c.border}`,
      backdropFilter: 'blur(4px)', zIndex: 5,
      letterSpacing: '0.05em',
    }}>
      {currentSlide}/{totalSlides}
    </div>
  );
};

// Animated border frame
const AnimatedFrame: React.FC<{ theme: OverlayTheme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  if (theme !== 'neon' && theme !== 'elegant') return null;

  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.8)], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - Math.round(fps * 0.5), durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut) * 0.6;
  const inset = Math.round(width * 0.03);

  if (theme === 'neon') {
    const pulse = 0.4 + 0.3 * Math.sin(frame * 0.1);
    return (
      <div style={{
        position: 'absolute', inset, pointerEvents: 'none', zIndex: 4,
        border: `1px solid rgba(0,229,255,${opacity * pulse})`,
        borderRadius: Math.round(width * 0.02),
        boxShadow: `inset 0 0 ${Math.round(15 * pulse)}px rgba(0,229,255,${opacity * pulse * 0.3}), 0 0 ${Math.round(10 * pulse)}px rgba(0,229,255,${opacity * pulse * 0.2})`,
      }} />
    );
  }

  // Elegant: corner accents
  const cornerSize = Math.round(width * 0.08);
  const cColor = `rgba(212,165,116,${opacity})`;
  const cornerStyle = (position: Record<string, number>): React.CSSProperties => ({
    position: 'absolute', ...position, width: cornerSize, height: cornerSize,
    pointerEvents: 'none', zIndex: 4,
  });

  return (
    <>
      <div style={{ ...cornerStyle({ top: inset, left: inset }), borderTop: `2px solid ${cColor}`, borderLeft: `2px solid ${cColor}` }} />
      <div style={{ ...cornerStyle({ top: inset, right: inset }), borderTop: `2px solid ${cColor}`, borderRight: `2px solid ${cColor}` }} />
      <div style={{ ...cornerStyle({ bottom: inset, left: inset }), borderBottom: `2px solid ${cColor}`, borderLeft: `2px solid ${cColor}` }} />
      <div style={{ ...cornerStyle({ bottom: inset, right: inset }), borderBottom: `2px solid ${cColor}`, borderRight: `2px solid ${cColor}` }} />
    </>
  );
};

// ── Main Composition ──
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  slides,
  ttsAudioSrc,
  musicAudioSrc,
  musicVolume,
  subtitleGroups,
  subtitleStyle,
  logoUrl,
  productOverlay,
  overlayTheme = 'modern',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Separate by role
  const logoSlide = slides.find(s => s.role === 'logo');
  const contentSlides = slides.filter(s => s.role !== 'logo' && s.role !== 'background');
  const effectiveLogoUrl = logoSlide?.src ?? logoUrl;

  if (contentSlides.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  }

  const transitionFrames = Math.round(fps * 1.0);
  const n = contentSlides.length;
  const hasCustomDurations = contentSlides.some(s => s.durationMs);

  let slideSequences: Array<{ slide: StoryboardSlide; index: number; from: number; duration: number }>;

  if (hasCustomDurations) {
    let currentFrame = 0;
    slideSequences = contentSlides.map((slide, i) => {
      const dur = Math.round(((slide.durationMs ?? 4000) / 1000) * fps);
      const from = Math.max(0, currentFrame - (i > 0 ? transitionFrames : 0));
      const seq = { slide, index: i, from, duration: dur + (i > 0 ? transitionFrames : 0) };
      currentFrame += dur;
      return seq;
    });
  } else {
    const totalTransition = Math.max(0, (n - 1) * transitionFrames);
    const slideDur = Math.max(fps * 2, Math.round((durationInFrames + totalTransition) / n));
    slideSequences = contentSlides.map((slide, i) => ({
      slide, index: i,
      from: Math.max(0, i * (slideDur - transitionFrames)),
      duration: slideDur,
    }));
  }

  // Calculate current slide index for counter
  const currentSlideIdx = slideSequences.reduce((acc, seq, i) => {
    if (frame >= seq.from && frame < seq.from + seq.duration) return i;
    return acc;
  }, 0) + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {slideSequences.map((seq, i) => (
        <Sequence key={i} from={seq.from} durationInFrames={seq.duration}>
          <CrossfadeSlide
            src={seq.slide.src} index={seq.index} animation={seq.slide.animation ?? 'auto'}
            durationInFrames={seq.duration} transitionFrames={transitionFrames}
            isFirst={i === 0} isLast={i === n - 1}
          />
          {seq.slide.caption && <SlideCaption text={seq.slide.caption} />}
        </Sequence>
      ))}

      {/* Dynamic overlays */}
      <GradientOverlay theme={overlayTheme} />
      <FloatingParticles theme={overlayTheme} />
      <ProgressBar theme={overlayTheme} />
      <AnimatedFrame theme={overlayTheme} />
      <SlideCounter currentSlide={currentSlideIdx} totalSlides={n} theme={overlayTheme} />

      {effectiveLogoUrl && <LogoWatermark src={effectiveLogoUrl} />}

      {productOverlay && (productOverlay.name || productOverlay.price || productOverlay.cta) && (
        <ProductOverlay overlay={productOverlay} />
      )}

      {subtitleGroups.length > 0 && <AnimatedSubtitles groups={subtitleGroups} subtitleStyle={subtitleStyle} />}

      {ttsAudioSrc && <Audio src={ttsAudioSrc} volume={1} />}
      {musicAudioSrc && <Audio src={musicAudioSrc} volume={musicVolume} />}
    </AbsoluteFill>
  );
};

// ── Crossfade Slide (with subtle zoom on transition) ──
const CrossfadeSlide: React.FC<{
  src: string; index: number; animation: string;
  durationInFrames: number; transitionFrames: number; isFirst: boolean; isLast: boolean;
}> = ({ src, index, animation, durationInFrames, transitionFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const fadeIn = isFirst ? 1 : interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Subtle zoom during fade for parallax-like depth
  const transitionScale = isFirst ? 1 : interpolate(frame, [0, transitionFrames], [1.03, 1.0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), transform: `scale(${transitionScale})` }}>
      <Slide src={src} index={index} animation={animation} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
