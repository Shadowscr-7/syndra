import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from 'remotion';
import type {
  VideoCompositionProps,
  SubtitleGroup,
  TimedWord,
  StoryboardSlide,
  OverlayTheme,
  SubtitleStyle,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Deterministic pseudo-random values from an index — safe for rendering */
const seed = (i: number) => {
  const s = Math.abs(i) * 137.508 + 1;
  return {
    r1: ((s * 7.3) % 1 + 1) % 1,
    r2: ((s * 13.7) % 1 + 1) % 1,
    r3: ((s * 23.1) % 1 + 1) % 1,
    r4: ((s * 41.9) % 1 + 1) % 1,
    r5: ((s * 59.3) % 1 + 1) % 1,
  };
};

/** Parse stylePrompt keywords to theme overrides */
const parseStylePrompt = (prompt: string = ''): {
  theme: OverlayTheme;
  accentOverride: string | null;
  subtitleSizeBoost: number;
  particleBoost: number;
} => {
  const p = prompt.toLowerCase();
  const theme: OverlayTheme =
    p.includes('neon') || p.includes('synthwave') || p.includes('cyberpunk') ? 'neon' :
    p.includes('elegant') || p.includes('luxury') || p.includes('gold') ? 'elegant' :
    p.includes('minimal') || p.includes('clean') || p.includes('simple') ? 'minimal' :
    p.includes('dark') || p.includes('cinematic') || p.includes('modern') ? 'modern' :
    'modern';

  const colorMap: Record<string, string> = {
    red: '#FF3333', orange: '#FF6B00', yellow: '#FFD700', gold: '#FFD700',
    green: '#00FF88', teal: '#00E5FF', blue: '#3B82F6', purple: '#9333EA',
    pink: '#FF3366', white: '#FFFFFF', magenta: '#FF00FF', naranja: '#FF6B00',
    amarillo: '#FFD700', verde: '#00FF88', azul: '#3B82F6', morado: '#9333EA',
    rojo: '#FF3333', rosa: '#FF3366',
  };
  let accentOverride: string | null = null;
  for (const [key, value] of Object.entries(colorMap)) {
    if (p.includes(key)) { accentOverride = value; break; }
  }

  const subtitleSizeBoost = p.includes('bold') || p.includes('grande') || p.includes('big') ? 1.2 : 1;
  const particleBoost = p.includes('energetic') || p.includes('dynamic') || p.includes('hype') ? 12 : 6;

  return { theme, accentOverride, subtitleSizeBoost, particleBoost };
};

// ── Animation presets ─────────────────────────────────────────────────────────
const ANIMATION_PRESETS = {
  'ken-burns-in':  { startScale: 1.0,  endScale: 1.18, startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0,    endRotate: 0 },
  'ken-burns-out': { startScale: 1.18, endScale: 1.0,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0,    endRotate: 0 },
  'pan-left':      { startScale: 1.08, endScale: 1.12, startX: 40,  endX: -40, startY: 0,   endY: -10, startRotate: 0,    endRotate: 0 },
  'pan-right':     { startScale: 1.08, endScale: 1.12, startX: -40, endX: 40,  startY: -10, endY: 0,   startRotate: 0,    endRotate: 0 },
  'zoom-pulse':    { startScale: 1.0,  endScale: 1.25, startX: 0,   endX: 0,   startY: -10, endY: 5,   startRotate: 0,    endRotate: 0 },
  'drift':         { startScale: 1.1,  endScale: 1.15, startX: -20, endX: 20,  startY: -15, endY: 15,  startRotate: -0.3, endRotate: 0.3 },
  'tilt-up':       { startScale: 1.12, endScale: 1.12, startX: 0,   endX: 0,   startY: 50,  endY: -30, startRotate: 0,    endRotate: 0 },
  'tilt-down':     { startScale: 1.12, endScale: 1.12, startX: 0,   endX: 0,   startY: -30, endY: 50,  startRotate: 0,    endRotate: 0 },
  'zoom-rotate':   { startScale: 1.0,  endScale: 1.2,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: -0.8, endRotate: 0.8 },
  'cinematic-pan': { startScale: 1.15, endScale: 1.08, startX: 60,  endX: -60, startY: 0,   endY: 0,   startRotate: 0,    endRotate: 0 },
  'parallax':      { startScale: 1.2,  endScale: 1.05, startX: 30,  endX: -10, startY: 20,  endY: -10, startRotate: 0.2,  endRotate: -0.2 },
  'none':          { startScale: 1.0,  endScale: 1.0,  startX: 0,   endX: 0,   startY: 0,   endY: 0,   startRotate: 0,    endRotate: 0 },
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

// ── Slide (image with Ken Burns / pan / zoom animation) ──────────────────────
const Slide: React.FC<{
  src: string;
  index: number;
  animation: string;
  durationInFrames: number;
}> = ({ src, index, animation, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = clamp(frame / Math.max(durationInFrames, 1));
  const easedProgress = Easing.inOut(Easing.cubic)(progress);

  const preset = animation !== 'auto' && animation !== 'none'
    ? ANIMATION_PRESETS[animation as keyof typeof ANIMATION_PRESETS] ?? AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!
    : animation === 'none'
      ? ANIMATION_PRESETS['none']
      : AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!;

  const scale  = interpolate(easedProgress, [0, 1], [preset.startScale,  preset.endScale]);
  const x      = interpolate(easedProgress, [0, 1], [preset.startX,      preset.endX]);
  const y      = interpolate(easedProgress, [0, 1], [preset.startY,      preset.endY]);
  const rotate = interpolate(easedProgress, [0, 1], [preset.startRotate, preset.endRotate]);
  const brightness = interpolate(frame, [0, 15], [1.15, 1.0], { extrapolateRight: 'clamp' });
  const vignetteOpacity = interpolate(frame, [0, 12], [0.6, 0.25], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <Img
        src={src}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${scale}) translate(${x}px, ${y}px) rotate(${rotate}deg)`,
          filter: `brightness(${brightness})`,
          willChange: 'transform, filter',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
      }} />
    </AbsoluteFill>
  );
};

// ── Talking Head Scene (person on camera, full-screen) ───────────────────────
const TalkingHeadScene: React.FC<{
  src: string;
}> = ({ src }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', opacity: fadeIn }}>
      <OffthreadVideo
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        muted={false}
      />
      {/* Subtle cinematic vignette on talking head */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
      }} />
      {/* Bottom gradient to blend subtitles */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 35%)',
      }} />
    </AbsoluteFill>
  );
};

// ── Slide Caption ─────────────────────────────────────────────────────────────
const SlideCaption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.8 } });
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(frame, [0, 12], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: Math.round(width * 0.08) }}>
      <div style={{
        opacity: fadeIn,
        transform: `translateY(${slideUp}px) scale(${scaleSpring})`,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
        backdropFilter: 'blur(8px)',
        padding: `${Math.round(height * 0.018)}px ${Math.round(width * 0.06)}px`,
        borderRadius: Math.round(height * 0.012),
        textAlign: 'center', maxWidth: Math.round(width * 0.85),
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{
          color: '#FFFFFF', fontSize: Math.round(width * 0.05), fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.4,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          letterSpacing: '0.02em',
        }}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── KINETIC SUBTITLES — CapCut-style words flying from random directions ──────
const KineticSubtitles: React.FC<{
  groups: SubtitleGroup[];
  timedWords?: TimedWord[];
  accentColor: string;
  sizeBoost?: number;
}> = ({ groups, timedWords, accentColor, sizeBoost = 1 }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();

  // Safe zone bottom offset (above platform UI)
  const SAFE_BOTTOM = Math.round(width * 0.42); // ~450px on 1080w
  const BASE_SIZE   = Math.round(width * 0.065 * sizeBoost);

  // ── Mode 1: timed words (precise Whisper sync) ──
  if (timedWords && timedWords.length > 0) {
    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: SAFE_BOTTOM,
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: `${Math.round(BASE_SIZE * 0.1)}px ${Math.round(BASE_SIZE * 0.2)}px`,
          padding: `0 ${Math.round(width * 0.06)}px`,
          width: '100%',
        }}>
          {timedWords.map((word, i) => {
            if (frame < word.startFrame) return null;
            const wordFrame = frame - word.startFrame;
            const s = seed(i);

            const isAllCaps = /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(word.text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ''));
            const isShort = word.text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '').length <= 3;
            const sizeM = word.emphasis || isAllCaps ? 1.45 : isShort ? 0.72 : 0.8 + s.r1 * 0.35;
            const fontSize = Math.round(BASE_SIZE * sizeM);
            const rotation = (s.r2 - 0.5) * 18;

            // Entry direction
            const DIRS = [
              [80, 0], [-80, 0], [60, -50], [-60, -50], [0, -60], [60, 50],
            ];
            const [fromX, fromY] = DIRS[Math.floor(s.r3 * 6)] ?? [0, 0];

            const tx = spring({ frame: wordFrame, fps, from: fromX, to: 0, config: { stiffness: 250, damping: 17 } });
            const ty = spring({ frame: wordFrame, fps, from: fromY, to: 0, config: { stiffness: 250, damping: 17 } });
            const sc = spring({ frame: wordFrame, fps, from: 0.15, to: 1, config: { stiffness: 380, damping: 17 } });
            const op = interpolate(wordFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

            const color = (word.emphasis || isAllCaps) ? accentColor : 'white';

            return (
              <span key={i} style={{
                fontSize, fontWeight: 900, color,
                fontFamily: 'Impact, Noto Sans, Arial Black, sans-serif',
                display: 'inline-block',
                transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rotation}deg)`,
                opacity: op,
                textShadow: (word.emphasis || isAllCaps)
                  ? `0 0 20px ${accentColor}90, 0 2px 12px rgba(0,0,0,0.95)`
                  : '0 2px 12px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)',
                lineHeight: 1.0,
              }}>
                {word.text}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Mode 2: subtitle groups (segment-based, auto-stagger) ──
  const current = groups.find(g => frame >= g.startFrame && frame < g.endFrame);
  if (!current) return null;

  const localFrame = frame - current.startFrame;
  const totalFrames = current.endFrame - current.startFrame;
  const words = current.text.split(/\s+/).filter(Boolean);
  const WORD_DELAY = Math.max(3, Math.floor(totalFrames / words.length));

  return (
    <AbsoluteFill style={{
      justifyContent: 'flex-end', alignItems: 'center',
      paddingBottom: SAFE_BOTTOM,
    }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: `${Math.round(BASE_SIZE * 0.1)}px ${Math.round(BASE_SIZE * 0.18)}px`,
        padding: `0 ${Math.round(width * 0.06)}px`,
        width: '100%',
      }}>
        {words.map((word, i) => {
          const delay = i * WORD_DELAY;
          const wordFrame = Math.max(0, localFrame - delay);
          if (localFrame < delay) return null;

          const s = seed(i);
          const cleanWord = word.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
          const isAllCaps = cleanWord.length >= 2 && cleanWord === cleanWord.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(cleanWord);
          const isShort = cleanWord.length <= 3;
          const isLong = cleanWord.length > 8;

          const sizeM = isAllCaps ? 1.4 : isShort ? 0.72 : isLong ? 0.88 : 0.82 + s.r1 * 0.32;
          const fontSize = Math.round(BASE_SIZE * sizeM);
          const rotation = (s.r2 - 0.5) * 20;

          const DIRS = [
            [90, 0], [-90, 0], [0, -65], [65, -45], [-65, -45], [70, 50],
          ];
          const [fromX, fromY] = DIRS[Math.floor(s.r3 * 6)] ?? [0, 0];

          const tx = spring({ frame: wordFrame, fps, from: fromX, to: 0, config: { stiffness: 240, damping: 16 } });
          const ty = spring({ frame: wordFrame, fps, from: fromY, to: 0, config: { stiffness: 240, damping: 16 } });
          const sc = spring({ frame: wordFrame, fps, from: 0.1, to: 1, config: { stiffness: 400, damping: 16 } });
          const op = interpolate(wordFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

          const color = isAllCaps ? accentColor : 'white';

          return (
            <span key={i} style={{
              fontSize, fontWeight: 900, color,
              fontFamily: 'Impact, Noto Sans, Arial Black, sans-serif',
              display: 'inline-block',
              transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rotation}deg)`,
              opacity: op,
              textShadow: isAllCaps
                ? `0 0 20px ${accentColor}90, 0 2px 12px rgba(0,0,0,0.95)`
                : '0 2px 12px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)',
              lineHeight: 1.0,
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Animated Subtitles (pill / word-by-word / karaoke / minimal / neon) ──────
const AnimatedSubtitles: React.FC<{
  groups: SubtitleGroup[];
  subtitleStyle?: SubtitleStyle;
  accentColor: string;
  sizeBoost?: number;
}> = ({ groups, subtitleStyle, accentColor, sizeBoost = 1 }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const current = groups.find(g => frame >= g.startFrame && frame < g.endFrame);
  if (!current) return null;

  const localFrame = frame - current.startFrame;
  const remaining  = current.endFrame - frame;
  const totalFrames = current.endFrame - current.startFrame;
  const fontSize = Math.round(width * 0.042 * sizeBoost);
  const maxWidth = Math.round(width * 0.85);
  const padBottom = Math.round(width * 0.12);

  // ── Word-by-word ──
  if (subtitleStyle === 'word-by-word') {
    const words = current.text.split(/\s+/);
    const framesPerWord = Math.max(1, Math.floor(totalFrames / words.length));
    const currentWordIdx = Math.min(Math.floor(localFrame / framesPerWord), words.length - 1);
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const containerSlide = interpolate(localFrame, [0, 8], [25, 0], { extrapolateRight: 'clamp' });
    const containerFade  = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: padBottom,
        opacity: Math.min(containerFade, fadeOut), transform: `translateY(${containerSlide}px)`,
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: Math.round(fontSize * 0.3), maxWidth,
          padding: `${Math.round(fontSize * 0.3)}px ${Math.round(fontSize * 0.6)}px`,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))',
          borderRadius: Math.round(fontSize * 0.4), backdropFilter: 'blur(4px)',
        }}>
          {words.map((word, i) => {
            const wordFrame  = i * framesPerWord;
            const wordProgress = Math.max(0, localFrame - wordFrame);
            const isActive = i === currentWordIdx;
            const isPast = i < currentWordIdx;
            const rawScale = interpolate(wordProgress, [0, 3, 5], [0.6, 1.12, 1.0], { extrapolateRight: 'clamp' });
            const scale = i <= currentWordIdx ? rawScale : 0.85;
            const opacity = i <= currentWordIdx ? interpolate(wordProgress, [0, 2], [0, 1], { extrapolateRight: 'clamp' }) : 0.15;
            const color = isActive ? accentColor : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
            return (
              <span key={i} style={{
                color, fontSize: Math.round(fontSize * (isActive ? 1.1 : 1)),
                fontWeight: isActive ? 900 : 700, fontFamily: 'Noto Sans, sans-serif',
                opacity, transform: `scale(${scale})`, display: 'inline-block',
                textShadow: isActive ? `0 0 16px ${accentColor}99, 0 2px 8px rgba(0,0,0,0.9)` : '0 2px 8px rgba(0,0,0,0.9)',
              }}>{word}</span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Karaoke ──
  if (subtitleStyle === 'karaoke') {
    const progress = localFrame / Math.max(totalFrames, 1);
    const fadeIn  = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const scaleIn = interpolate(localFrame, [0, 6], [0.9, 1.0], { extrapolateRight: 'clamp' });
    const highlightIdx = Math.floor(progress * current.text.length);
    const glowPulse = 0.4 + 0.3 * Math.sin(localFrame * 0.4);

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: padBottom,
        opacity: Math.min(fadeIn, fadeOut), transform: `scale(${scaleIn})`,
      }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
          padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
          borderRadius: Math.round(fontSize * 0.4), maxWidth, textAlign: 'center',
          border: `1px solid ${accentColor}25`,
          boxShadow: `0 0 ${Math.round(20 * glowPulse)}px ${accentColor}${Math.round(glowPulse * 50).toString(16).padStart(2, '0')}`,
        }}>
          <span style={{ fontSize, fontWeight: 700, fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35 }}>
            <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}${Math.round(glowPulse * 255).toString(16).padStart(2, '0')}` }}>
              {current.text.slice(0, highlightIdx)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{current.text.slice(highlightIdx)}</span>
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Minimal ──
  if (subtitleStyle === 'minimal') {
    const fadeIn  = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
    const letterSpace = interpolate(localFrame, [0, 8], [0.15, 0.03], { extrapolateRight: 'clamp' });
    const slideUp = interpolate(localFrame, [0, 6], [8, 0], { extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: padBottom }}>
        <span style={{
          opacity: Math.min(fadeIn, fadeOut), color: '#FFFFFF', fontSize,
          fontWeight: 600, fontFamily: 'Noto Sans, sans-serif',
          textAlign: 'center', maxWidth,
          textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.5)',
          letterSpacing: `${letterSpace}em`,
          transform: `translateY(${slideUp}px)`,
        }}>{current.text}</span>
      </AbsoluteFill>
    );
  }

  // ── Neon ──
  if (subtitleStyle === 'neon') {
    const fadeIn  = interpolate(localFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const scaleIn = interpolate(localFrame, [0, 5], [0.85, 1.0], { extrapolateRight: 'clamp' });
    const flicker = localFrame < 3 ? (localFrame % 2 === 0 ? 0.6 : 1) : 1;
    const glowI   = 0.7 + 0.3 * Math.sin(localFrame * 0.3);

    return (
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: padBottom,
        opacity: Math.min(fadeIn, fadeOut) * flicker, transform: `scale(${scaleIn})`,
      }}>
        <div style={{
          padding: `${Math.round(fontSize * 0.35)}px ${Math.round(fontSize * 0.8)}px`,
          borderRadius: Math.round(fontSize * 0.3), maxWidth, textAlign: 'center',
          border: `2px solid ${accentColor}${Math.round(glowI * 200).toString(16).padStart(2, '0')}`,
          boxShadow: `0 0 ${Math.round(15 * glowI)}px ${accentColor}80, inset 0 0 ${Math.round(10 * glowI)}px ${accentColor}25`,
          background: 'rgba(0,0,0,0.6)',
        }}>
          <span style={{
            color: accentColor, fontSize, fontWeight: 800,
            fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35,
            textShadow: `0 0 8px ${accentColor}, 0 0 20px ${accentColor}80, 0 0 40px ${accentColor}40`,
            letterSpacing: '0.05em',
          }}>{current.text}</span>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Default: Pill ──
  const pillSpring = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 120, mass: 0.6 } });
  const slideUp    = interpolate(localFrame, [0, 8], [18, 0], { extrapolateRight: 'clamp' });
  const fadeOut    = interpolate(remaining, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: padBottom }}>
      <div style={{
        opacity: Math.min(pillSpring, fadeOut),
        transform: `translateY(${slideUp}px) scale(${pillSpring})`,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.75), rgba(20,20,30,0.6))',
        backdropFilter: 'blur(6px)',
        padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
        borderRadius: Math.round(fontSize * 0.4), maxWidth, textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        <span style={{
          color: '#FFFFFF', fontSize, fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          wordBreak: 'break-word', letterSpacing: '0.01em',
        }}>{current.text}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── Logo Watermark ─────────────────────────────────────────────────────────────
const LogoWatermark: React.FC<{ src: string }> = ({ src }) => {
  const { width, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const scaleSpring = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 0.5 }, delay: 10 });
  const fadeIn = interpolate(frame, [10, 25], [0, 0.9], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: Math.round(width * 0.04), right: Math.round(width * 0.04),
      opacity: fadeIn, transform: `scale(${scaleSpring})`, zIndex: 20,
    }}>
      <Img src={src} style={{
        width: Math.round(width * 0.14), height: Math.round(width * 0.14),
        objectFit: 'contain',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(0,0,0,0.3))',
      }} />
    </div>
  );
};

// ── Product Overlay ───────────────────────────────────────────────────────────
const ProductOverlay: React.FC<{
  overlay: { name?: string; price?: string; cta?: string };
  accentColor: string;
}> = ({ overlay, accentColor }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.7 } });
  const slideUp = interpolate(frame, [0, 15], [40, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', opacity: scaleSpring }}>
      <div style={{
        padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px`,
        paddingBottom: Math.round(height * 0.22), textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: Math.round(height * 0.01), transform: `translateY(${slideUp}px)`,
      }}>
        {overlay.name && <span style={{
          color: '#FFFFFF', fontSize: Math.round(height * 0.036), fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.9)', letterSpacing: '0.02em',
        }}>{overlay.name}</span>}
        {overlay.price && <span style={{
          color: accentColor, fontSize: Math.round(height * 0.04), fontWeight: 800,
          fontFamily: 'Noto Sans, sans-serif',
          textShadow: `0 0 15px ${accentColor}66, 0 2px 10px rgba(0,0,0,0.9)`,
        }}>{overlay.price}</span>}
        {overlay.cta && <span style={{
          color: '#00FF88', fontSize: Math.round(height * 0.028), fontWeight: 600,
          fontFamily: 'Noto Sans, sans-serif',
          background: 'rgba(0,255,136,0.12)',
          padding: `${Math.round(height * 0.006)}px ${Math.round(width * 0.03)}px`,
          borderRadius: Math.round(height * 0.008),
          textShadow: '0 0 10px rgba(0,255,136,0.3)',
        }}>{overlay.cta}</span>}
      </div>
    </AbsoluteFill>
  );
};

// ── Dynamic Overlays ──────────────────────────────────────────────────────────
const GradientOverlay: React.FC<{ theme: OverlayTheme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (theme === 'none') return null;
  const shift = Math.sin((frame / durationInFrames) * Math.PI * 2) * 15;

  const gradients: Record<string, { top: string; bottom: string }> = {
    minimal: {
      top:    `linear-gradient(180deg, rgba(0,0,0,${0.3 + shift * 0.005}) 0%, transparent 25%)`,
      bottom: `linear-gradient(0deg, rgba(0,0,0,${0.5 + shift * 0.005}) 0%, transparent 35%)`,
    },
    modern: {
      top:    'linear-gradient(180deg, rgba(10,10,30,0.4) 0%, transparent 30%)',
      bottom: 'linear-gradient(0deg, rgba(10,10,30,0.6) 0%, transparent 40%)',
    },
    neon: {
      top:    'linear-gradient(180deg, rgba(0,10,30,0.5) 0%, transparent 25%)',
      bottom: 'linear-gradient(0deg, rgba(0,10,30,0.7) 0%, transparent 40%)',
    },
    elegant: {
      top:    'linear-gradient(180deg, rgba(20,15,10,0.35) 0%, transparent 20%)',
      bottom: 'linear-gradient(0deg, rgba(20,15,10,0.55) 0%, transparent 35%)',
    },
  };
  const g = gradients[theme] ?? gradients.modern!;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: g.top,    pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: 0, background: g.bottom, pointerEvents: 'none', zIndex: 2 }} />
    </>
  );
};

const FloatingParticles: React.FC<{ theme: OverlayTheme; count?: number; accentColor?: string }> = ({
  theme, count = 6, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (theme === 'none' || theme === 'minimal') return null;

  const baseColor = accentColor
    ? `rgba(${parseInt(accentColor.slice(1, 3), 16)},${parseInt(accentColor.slice(3, 5), 16)},${parseInt(accentColor.slice(5, 7), 16)},`
    : theme === 'neon' ? 'rgba(0,229,255,' : theme === 'elegant' ? 'rgba(255,215,0,' : 'rgba(255,255,255,';

  const particles = Array.from({ length: count }, (_, i) => {
    const s = seed(i);
    const xBase = s.r1 * width;
    const yBase = s.r2 * height;
    const size  = 2 + (i % 4);
    const speed = 0.3 + (i % 5) * 0.15;
    const opacity = 0.15 + (i % 3) * 0.1;
    const x = xBase + Math.sin(frame * speed * 0.02 + s.r3 * 360) * 30;
    const y = ((yBase + Math.cos(frame * speed * 0.015 + s.r4 * 360) * 25 - frame * speed * 0.3) % height + height) % height;
    return { x, y, size, opacity };
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: '50%',
          background: `${baseColor}${p.opacity})`,
          boxShadow: theme === 'neon' ? `0 0 ${p.size * 2}px ${baseColor}${p.opacity * 0.5})` : undefined,
        }} />
      ))}
    </div>
  );
};

const ProgressBar: React.FC<{ theme: OverlayTheme; accentColor: string }> = ({ theme, accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  if (theme === 'none') return null;
  const progress = clamp(frame / durationInFrames);

  const barStyle = theme === 'minimal' ? 'rgba(255,255,255,0.5)'
    : theme === 'elegant' ? 'linear-gradient(90deg, #d4a574, #f5e6d3)'
    : `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)`;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0,
      width: Math.round(width * progress), height: theme === 'minimal' ? 2 : 3,
      background: barStyle, zIndex: 10, borderRadius: '0 0 2px 0',
      boxShadow: theme === 'neon' ? `0 0 8px ${accentColor}80` : undefined,
    }} />
  );
};

const SlideCounter: React.FC<{
  currentSlide: number; totalSlides: number; theme: OverlayTheme;
}> = ({ currentSlide, totalSlides, theme }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  if (theme === 'none' || theme === 'minimal') return null;
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 0.7], { extrapolateRight: 'clamp' });
  const fontSize = Math.round(width * 0.025);
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    modern:  { bg: 'rgba(0,0,0,0.45)',  text: '#fff',    border: 'rgba(255,255,255,0.1)' },
    neon:    { bg: 'rgba(0,10,30,0.6)', text: '#00e5ff', border: 'rgba(0,229,255,0.3)' },
    elegant: { bg: 'rgba(20,15,10,0.5)', text: '#f5e6d3', border: 'rgba(212,165,116,0.3)' },
  };
  const c = colors[theme] ?? colors.modern!;
  return (
    <div style={{
      position: 'absolute', top: Math.round(width * 0.04), left: Math.round(width * 0.04),
      opacity: fadeIn, fontSize, fontWeight: 600, fontFamily: 'Noto Sans, sans-serif',
      color: c.text, background: c.bg,
      padding: `${Math.round(fontSize * 0.3)}px ${Math.round(fontSize * 0.7)}px`,
      borderRadius: Math.round(fontSize * 0.4), border: `1px solid ${c.border}`,
      backdropFilter: 'blur(4px)', zIndex: 5, letterSpacing: '0.05em',
    }}>
      {currentSlide}/{totalSlides}
    </div>
  );
};

const AnimatedFrame: React.FC<{ theme: OverlayTheme; accentColor: string }> = ({ theme, accentColor }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  if (theme !== 'neon' && theme !== 'elegant') return null;
  const fadeIn  = interpolate(frame, [0, Math.round(fps * 0.8)], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - Math.round(fps * 0.5), durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut) * 0.6;
  const inset = Math.round(width * 0.03);

  if (theme === 'neon') {
    const pulse = 0.4 + 0.3 * Math.sin(frame * 0.1);
    return (
      <div style={{
        position: 'absolute', inset, pointerEvents: 'none', zIndex: 4,
        border: `1px solid ${accentColor}${Math.round(opacity * pulse * 255).toString(16).padStart(2, '0')}`,
        borderRadius: Math.round(width * 0.02),
        boxShadow: `inset 0 0 ${Math.round(15 * pulse)}px ${accentColor}${Math.round(opacity * pulse * 80).toString(16).padStart(2, '0')}`,
      }} />
    );
  }

  const cornerSize = Math.round(width * 0.08);
  const cColor = `rgba(212,165,116,${opacity})`;
  return (
    <>
      <div style={{ position: 'absolute', top: inset, left: inset, width: cornerSize, height: cornerSize, borderTop: `2px solid ${cColor}`, borderLeft: `2px solid ${cColor}`, zIndex: 4 }} />
      <div style={{ position: 'absolute', top: inset, right: inset, width: cornerSize, height: cornerSize, borderTop: `2px solid ${cColor}`, borderRight: `2px solid ${cColor}`, zIndex: 4 }} />
      <div style={{ position: 'absolute', bottom: inset, left: inset, width: cornerSize, height: cornerSize, borderBottom: `2px solid ${cColor}`, borderLeft: `2px solid ${cColor}`, zIndex: 4 }} />
      <div style={{ position: 'absolute', bottom: inset, right: inset, width: cornerSize, height: cornerSize, borderBottom: `2px solid ${cColor}`, borderRight: `2px solid ${cColor}`, zIndex: 4 }} />
    </>
  );
};

// ── Crossfade Slide ───────────────────────────────────────────────────────────
const CrossfadeSlide: React.FC<{
  src: string; index: number; animation: string;
  durationInFrames: number; transitionFrames: number;
  isFirst: boolean; isLast: boolean;
}> = ({ src, index, animation, durationInFrames, transitionFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const fadeIn  = isFirst ? 1 : interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = isLast  ? 1 : interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tScale  = isFirst ? 1 : interpolate(frame, [0, transitionFrames], [1.03, 1.0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), transform: `scale(${tScale})` }}>
      <Slide src={src} index={index} animation={animation} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

// ── MAIN COMPOSITION ──────────────────────────────────────────────────────────
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  slides,
  ttsAudioSrc,
  musicAudioSrc,
  musicVolume,
  subtitleGroups,
  timedWords,
  subtitleStyle,
  logoUrl,
  productOverlay,
  overlayTheme = 'modern',
  stylePrompt = '',
  accentColor: propAccentColor = '#FFD700',
  talkingHeadVideoUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Parse style prompt to override theme/accent
  const parsed = parseStylePrompt(stylePrompt);
  const effectiveTheme   = parsed.theme !== 'modern' ? parsed.theme : overlayTheme;
  const effectiveAccent  = parsed.accentOverride ?? propAccentColor;
  const subtitleSizeBoost = parsed.subtitleSizeBoost;

  // Separate slides by role
  const logoSlide     = slides.find(s => s.role === 'logo');
  const contentSlides = slides.filter(s => s.role !== 'logo' && s.role !== 'background');
  const effectiveLogoUrl = logoSlide?.src ?? logoUrl;

  const transitionFrames = Math.round(fps * 1.0);
  const n = contentSlides.length;

  // Build slide sequences with timing
  let slideSequences: Array<{ slide: StoryboardSlide; index: number; from: number; duration: number }> = [];

  if (n > 0) {
    const hasCustomDurations = contentSlides.some(s => s.durationMs);
    if (hasCustomDurations) {
      let currentFrame = 0;
      slideSequences = contentSlides.map((slide, i) => {
        const dur  = Math.round(((slide.durationMs ?? 4000) / 1000) * fps);
        const from = Math.max(0, currentFrame - (i > 0 ? transitionFrames : 0));
        const seq  = { slide, index: i, from, duration: dur + (i > 0 ? transitionFrames : 0) };
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
  }

  const currentSlideIdx = slideSequences.reduce((acc, seq, i) => {
    if (frame >= seq.from && frame < seq.from + seq.duration) return i;
    return acc;
  }, 0) + 1;

  // ── Talking head mode: slides become scene inserts alternating with talking head ──
  if (talkingHeadVideoUrl) {
    // Divide video into segments: talking head & image inserts
    // Image inserts occupy 25-35% of total time, evenly distributed
    const hasInserts = n > 0;
    const insertDurFrames = hasInserts ? Math.round((durationInFrames * 0.3) / n) : 0;
    const insertSpacing   = hasInserts ? Math.round(durationInFrames / (n + 1)) : 0;

    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {/* Base layer: talking head video */}
        <TalkingHeadScene src={talkingHeadVideoUrl} />

        {/* Scene inserts: image slides at evenly spaced intervals */}
        {hasInserts && slideSequences.map((seq, i) => {
          const insertFrom = Math.round(insertSpacing * (i + 1) - insertDurFrames / 2);
          const from = Math.max(0, insertFrom);
          const dur  = Math.min(insertDurFrames, durationInFrames - from);
          if (dur <= 0) return null;

          return (
            <Sequence key={i} from={from} durationInFrames={dur}>
              <AbsoluteFill>
                {/* Insert fills top 60% of screen, talking head shows below */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', overflow: 'hidden' }}>
                  <CrossfadeSlide
                    src={seq.slide.src} index={seq.index}
                    animation={seq.slide.animation ?? 'ken-burns-in'}
                    durationInFrames={dur} transitionFrames={Math.round(fps * 0.5)}
                    isFirst={false} isLast={false}
                  />
                </div>
                {/* Caption for insert */}
                {seq.slide.caption && (
                  <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: '38%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SlideCaption text={seq.slide.caption} />
                  </div>
                )}
              </AbsoluteFill>
            </Sequence>
          );
        })}

        {/* Overlays */}
        <GradientOverlay theme={effectiveTheme} />
        <FloatingParticles theme={effectiveTheme} count={parsed.particleBoost} accentColor={effectiveAccent} />
        <ProgressBar theme={effectiveTheme} accentColor={effectiveAccent} />
        <AnimatedFrame theme={effectiveTheme} accentColor={effectiveAccent} />

        {effectiveLogoUrl && <LogoWatermark src={effectiveLogoUrl} />}

        {productOverlay && (productOverlay.name || productOverlay.price || productOverlay.cta) && (
          <ProductOverlay overlay={productOverlay} accentColor={effectiveAccent} />
        )}

        {/* Subtitles */}
        {subtitleStyle === 'kinetic' && subtitleGroups.length > 0 && (
          <KineticSubtitles
            groups={subtitleGroups} timedWords={timedWords}
            accentColor={effectiveAccent} sizeBoost={subtitleSizeBoost}
          />
        )}
        {subtitleStyle !== 'kinetic' && subtitleGroups.length > 0 && (
          <AnimatedSubtitles
            groups={subtitleGroups} subtitleStyle={subtitleStyle}
            accentColor={effectiveAccent} sizeBoost={subtitleSizeBoost}
          />
        )}

        {/* Audio: TTS comes from the video itself (muted=false above), music is added */}
        {musicAudioSrc && <Audio src={musicAudioSrc} volume={musicVolume * 0.4} />}
      </AbsoluteFill>
    );
  }

  // ── Standard mode: image slides ──
  if (n === 0) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {slideSequences.map((seq, i) => (
        <Sequence key={i} from={seq.from} durationInFrames={seq.duration}>
          <CrossfadeSlide
            src={seq.slide.src} index={seq.index}
            animation={seq.slide.animation ?? 'auto'}
            durationInFrames={seq.duration} transitionFrames={transitionFrames}
            isFirst={i === 0} isLast={i === n - 1}
          />
          {seq.slide.caption && <SlideCaption text={seq.slide.caption} />}
        </Sequence>
      ))}

      <GradientOverlay theme={effectiveTheme} />
      <FloatingParticles theme={effectiveTheme} count={parsed.particleBoost} accentColor={effectiveAccent} />
      <ProgressBar theme={effectiveTheme} accentColor={effectiveAccent} />
      <AnimatedFrame theme={effectiveTheme} accentColor={effectiveAccent} />
      <SlideCounter currentSlide={currentSlideIdx} totalSlides={n} theme={effectiveTheme} />

      {effectiveLogoUrl && <LogoWatermark src={effectiveLogoUrl} />}

      {productOverlay && (productOverlay.name || productOverlay.price || productOverlay.cta) && (
        <ProductOverlay overlay={productOverlay} accentColor={effectiveAccent} />
      )}

      {subtitleStyle === 'kinetic' && subtitleGroups.length > 0 && (
        <KineticSubtitles
          groups={subtitleGroups} timedWords={timedWords}
          accentColor={effectiveAccent} sizeBoost={subtitleSizeBoost}
        />
      )}
      {subtitleStyle !== 'kinetic' && subtitleGroups.length > 0 && (
        <AnimatedSubtitles
          groups={subtitleGroups} subtitleStyle={subtitleStyle}
          accentColor={effectiveAccent} sizeBoost={subtitleSizeBoost}
        />
      )}

      {ttsAudioSrc   && <Audio src={ttsAudioSrc}   volume={1} />}
      {musicAudioSrc && <Audio src={musicAudioSrc} volume={musicVolume} />}
    </AbsoluteFill>
  );
};
