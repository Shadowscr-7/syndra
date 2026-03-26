import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import type { VideoCompositionProps, SubtitleGroup, StoryboardSlide } from './types';

// ── Animation presets for Ken Burns ──
const ANIMATION_PRESETS = {
  'ken-burns-in':  { startScale: 1.0, endScale: 1.18, startX: 0, endX: 0, startY: 0, endY: 0 },
  'ken-burns-out': { startScale: 1.18, endScale: 1.0, startX: 0, endX: 0, startY: 0, endY: 0 },
  'pan-left':      { startScale: 1.08, endScale: 1.12, startX: 30, endX: -30, startY: 0, endY: -8 },
  'pan-right':     { startScale: 1.08, endScale: 1.12, startX: -30, endX: 30, startY: -8, endY: 0 },
  'zoom-pulse':    { startScale: 1.0, endScale: 1.25, startX: 0, endX: 0, startY: -10, endY: 5 },
  'none':          { startScale: 1.0, endScale: 1.0, startX: 0, endX: 0, startY: 0, endY: 0 },
};

const AUTO_ANIMATIONS = [
  ANIMATION_PRESETS['ken-burns-in'],
  ANIMATION_PRESETS['ken-burns-out'],
  ANIMATION_PRESETS['pan-left'],
  ANIMATION_PRESETS['pan-right'],
  ANIMATION_PRESETS['zoom-pulse'],
  { startScale: 1.2, endScale: 1.0, startX: 20, endX: 0, startY: 15, endY: 0 },
];

// ── Slide component with animation ──
const Slide: React.FC<{
  src: string;
  index: number;
  animation: string;
  durationInFrames: number;
}> = ({ src, index, animation, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = frame / Math.max(durationInFrames, 1);

  const preset = animation !== 'auto' && animation !== 'none'
    ? ANIMATION_PRESETS[animation as keyof typeof ANIMATION_PRESETS] ?? AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!
    : animation === 'none'
      ? ANIMATION_PRESETS['none']
      : AUTO_ANIMATIONS[index % AUTO_ANIMATIONS.length]!;

  const scale = interpolate(progress, [0, 1], [preset.startScale, preset.endScale]);
  const x = interpolate(progress, [0, 1], [preset.startX, preset.endX]);
  const y = interpolate(progress, [0, 1], [preset.startY, preset.endY]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Slide Caption overlay ──
const SlideCaption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: Math.round(width * 0.08) }}>
      <div
        style={{
          opacity: fadeIn,
          transform: `translateY(${slideUp}px)`,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          padding: `${Math.round(height * 0.015)}px ${Math.round(width * 0.06)}px`,
          borderRadius: Math.round(height * 0.01),
          textAlign: 'center',
          maxWidth: Math.round(width * 0.85),
        }}
      >
        <span style={{
          color: '#FFFFFF', fontSize: Math.round(width * 0.05), fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.4,
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}>
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Animated Subtitles — Multiple styles ──
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

  // ── Word-by-word style (CapCut-like) ──
  if (subtitleStyle === 'word-by-word') {
    const words = current.text.split(/\s+/);
    const framesPerWord = Math.max(1, Math.floor(totalFrames / words.length));
    const currentWordIdx = Math.min(Math.floor(localFrame / framesPerWord), words.length - 1);
    const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

    return (
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(width * 0.12), opacity: fadeOut }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: Math.round(fontSize * 0.25), maxWidth }}>
          {words.map((word, i) => {
            const wordFrame = i * framesPerWord;
            const wordProgress = Math.max(0, localFrame - wordFrame);
            const scale = i <= currentWordIdx
              ? interpolate(wordProgress, [0, 4], [0.8, 1], { extrapolateRight: 'clamp' })
              : 0.8;
            const opacity = i <= currentWordIdx
              ? interpolate(wordProgress, [0, 3], [0, 1], { extrapolateRight: 'clamp' })
              : 0.2;
            const isActive = i === currentWordIdx;
            return (
              <span key={i} style={{
                color: isActive ? '#FFD700' : '#FFFFFF', fontSize, fontWeight: isActive ? 800 : 700,
                fontFamily: 'Noto Sans, sans-serif', opacity,
                transform: `scale(${scale})`, display: 'inline-block',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
              }}>{word}</span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Karaoke style (highlight progressive) ──
  if (subtitleStyle === 'karaoke') {
    const progress = localFrame / Math.max(totalFrames, 1);
    const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const text = current.text;
    const highlightIdx = Math.floor(progress * text.length);

    return (
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(width * 0.12), opacity: fadeOut }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.8)}px`,
          borderRadius: Math.round(fontSize * 0.35), maxWidth, textAlign: 'center',
        }}>
          <span style={{ fontSize, fontWeight: 700, fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35 }}>
            <span style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>{text.slice(0, highlightIdx)}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{text.slice(highlightIdx)}</span>
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Minimal style ──
  if (subtitleStyle === 'minimal') {
    const fadeIn = interpolate(localFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(width * 0.12) }}>
        <span style={{
          opacity: Math.min(fadeIn, fadeOut), color: '#FFFFFF', fontSize, fontWeight: 600,
          fontFamily: 'Noto Sans, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
          textAlign: 'center', maxWidth,
        }}>
          {current.text}
        </span>
      </AbsoluteFill>
    );
  }

  // Default: pill style
  const fadeIn = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(localFrame, [0, 6], [12, 0], { extrapolateRight: 'clamp' });
  const scaleIn = interpolate(localFrame, [0, 6], [0.92, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(width * 0.12) }}>
      <div style={{
        opacity, transform: `translateY(${slideUp}px) scale(${scaleIn})`,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.8)}px`,
        borderRadius: Math.round(fontSize * 0.35), maxWidth, textAlign: 'center',
      }}>
        <span style={{
          color: '#FFFFFF', fontSize, fontWeight: 700,
          fontFamily: 'Noto Sans, sans-serif', lineHeight: 1.35,
          textShadow: '0 2px 6px rgba(0,0,0,0.7)', wordBreak: 'break-word',
        }}>
          {current.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Logo Watermark (persistent overlay) ──
const LogoWatermark: React.FC<{ src: string }> = ({ src }) => {
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 0.85], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: Math.round(width * 0.04), right: Math.round(width * 0.04), opacity: fadeIn,
    }}>
      <Img src={src} style={{
        width: Math.round(width * 0.14), height: Math.round(width * 0.14),
        objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      }} />
    </div>
  );
};

// ── Product Overlay ──
const ProductOverlay: React.FC<{ overlay: { name?: string; price?: string; cta?: string } }> = ({ overlay }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', opacity: fadeIn }}>
      <div style={{
        padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px`,
        paddingBottom: Math.round(height * 0.22), textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(height * 0.008),
      }}>
        {overlay.name && <span style={{ color: '#FFFFFF', fontSize: Math.round(height * 0.036), fontWeight: 700, fontFamily: 'Noto Sans, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{overlay.name}</span>}
        {overlay.price && <span style={{ color: '#FFD700', fontSize: Math.round(height * 0.036) + 4, fontWeight: 800, fontFamily: 'Noto Sans, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{overlay.price}</span>}
        {overlay.cta && <span style={{ color: '#00FF88', fontSize: Math.round(height * 0.026), fontWeight: 600, fontFamily: 'Noto Sans, sans-serif', textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>{overlay.cta}</span>}
      </div>
    </AbsoluteFill>
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
}) => {
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

// ── Crossfade Slide ──
const CrossfadeSlide: React.FC<{
  src: string; index: number; animation: string;
  durationInFrames: number; transitionFrames: number; isFirst: boolean; isLast: boolean;
}> = ({ src, index, animation, durationInFrames, transitionFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const fadeIn = isFirst ? 1 : interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <Slide src={src} index={index} animation={animation} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
