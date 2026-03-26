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
import type { VideoCompositionProps, SubtitleGroup } from './types';

// ── Ken Burns effect definitions ──
const KEN_BURNS_EFFECTS = [
  // Slow zoom in (center)
  { startScale: 1.0, endScale: 1.18, startX: 0, endX: 0, startY: 0, endY: 0 },
  // Slow zoom out
  { startScale: 1.18, endScale: 1.0, startX: 0, endX: 0, startY: 0, endY: 0 },
  // Pan left → right + zoom
  { startScale: 1.05, endScale: 1.15, startX: -30, endX: 30, startY: 0, endY: -10 },
  // Pan right → left + zoom
  { startScale: 1.15, endScale: 1.05, startX: 30, endX: -30, startY: -10, endY: 0 },
  // Zoom in from top-left
  { startScale: 1.0, endScale: 1.2, startX: -20, endX: 10, startY: -15, endY: 5 },
  // Zoom out to center from bottom-right
  { startScale: 1.2, endScale: 1.0, startX: 20, endX: 0, startY: 15, endY: 0 },
];

// ── Slide component with Ken Burns ──
const Slide: React.FC<{
  src: string;
  index: number;
  durationInFrames: number;
}> = ({ src, index, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = frame / Math.max(durationInFrames, 1);
  const effect = KEN_BURNS_EFFECTS[index % KEN_BURNS_EFFECTS.length]!;

  const scale = interpolate(progress, [0, 1], [effect.startScale, effect.endScale]);
  const x = interpolate(progress, [0, 1], [effect.startX, effect.endX]);
  const y = interpolate(progress, [0, 1], [effect.startY, effect.endY]);

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

// ── Animated Subtitles ──
const AnimatedSubtitles: React.FC<{
  groups: SubtitleGroup[];
}> = ({ groups }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const current = groups.find((g) => frame >= g.startFrame && frame < g.endFrame);
  if (!current) return null;

  const localFrame = frame - current.startFrame;
  const fadeIn = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(localFrame, [0, 6], [12, 0], { extrapolateRight: 'clamp' });
  const scaleIn = interpolate(localFrame, [0, 6], [0.92, 1], { extrapolateRight: 'clamp' });

  // Fade out near the end
  const remaining = current.endFrame - frame;
  const fadeOut = interpolate(remaining, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);

  const fontSize = Math.round(width * 0.042);
  const maxWidth = Math.round(width * 0.85);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: Math.round(width * 0.12),
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${slideUp}px) scale(${scaleIn})`,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.8)}px`,
          borderRadius: Math.round(fontSize * 0.35),
          maxWidth,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize,
            fontWeight: 700,
            fontFamily: 'Noto Sans, sans-serif',
            lineHeight: 1.35,
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
            wordBreak: 'break-word',
          }}
        >
          {current.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Product Overlay ──
const ProductOverlay: React.FC<{
  overlay: { name?: string; price?: string; cta?: string };
  logoUrl?: string;
}> = ({ overlay, logoUrl }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const bigFont = Math.round(height * 0.036);
  const smallFont = Math.round(height * 0.026);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', opacity: fadeIn }}>
      {/* Logo top-right */}
      {logoUrl && (
        <div
          style={{
            position: 'absolute',
            top: Math.round(width * 0.04),
            right: Math.round(width * 0.04),
          }}
        >
          <Img
            src={logoUrl}
            style={{
              width: Math.round(width * 0.15),
              height: Math.round(width * 0.15),
              objectFit: 'contain',
              opacity: 0.9,
            }}
          />
        </div>
      )}

      {/* Product info bottom */}
      <div
        style={{
          padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px`,
          paddingBottom: Math.round(height * 0.22),
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: Math.round(height * 0.008),
        }}
      >
        {overlay.name && (
          <span
            style={{
              color: '#FFFFFF',
              fontSize: bigFont,
              fontWeight: 700,
              fontFamily: 'Noto Sans, sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {overlay.name}
          </span>
        )}
        {overlay.price && (
          <span
            style={{
              color: '#FFD700',
              fontSize: bigFont + 4,
              fontWeight: 800,
              fontFamily: 'Noto Sans, sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {overlay.price}
          </span>
        )}
        {overlay.cta && (
          <span
            style={{
              color: '#00FF88',
              fontSize: smallFont,
              fontWeight: 600,
              fontFamily: 'Noto Sans, sans-serif',
              textShadow: '0 2px 6px rgba(0,0,0,0.7)',
            }}
          >
            {overlay.cta}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ──
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  images,
  ttsAudioSrc,
  musicAudioSrc,
  musicVolume,
  subtitleGroups,
  logoUrl,
  productOverlay,
}) => {
  const { durationInFrames, fps } = useVideoConfig();

  if (images.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  }

  // Calculate slide timing
  const transitionFrames = Math.round(fps * 1.0); // 1s transitions
  const n = images.length;
  const totalTransitionFrames = Math.max(0, (n - 1) * transitionFrames);
  const slideDurationFrames = Math.max(
    fps * 2, // minimum 2s per slide
    Math.round((durationInFrames + totalTransitionFrames) / n),
  );

  // Build slide sequences with crossfade transitions
  const slideSequences: Array<{
    src: string;
    index: number;
    from: number;
    duration: number;
  }> = [];

  for (let i = 0; i < n; i++) {
    const from = i * (slideDurationFrames - transitionFrames);
    slideSequences.push({
      src: images[i]!,
      index: i,
      from: Math.max(0, from),
      duration: slideDurationFrames,
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Image slides with Ken Burns + crossfade */}
      {slideSequences.map((slide, i) => (
        <Sequence
          key={i}
          from={slide.from}
          durationInFrames={slide.duration}
        >
          <CrossfadeSlide
            src={slide.src}
            index={slide.index}
            durationInFrames={slide.duration}
            transitionFrames={transitionFrames}
            isFirst={i === 0}
            isLast={i === n - 1}
          />
        </Sequence>
      ))}

      {/* Product overlay */}
      {productOverlay && (productOverlay.name || productOverlay.price || productOverlay.cta) && (
        <ProductOverlay overlay={productOverlay} logoUrl={logoUrl} />
      )}

      {/* Animated subtitles on top */}
      {subtitleGroups.length > 0 && (
        <AnimatedSubtitles groups={subtitleGroups} />
      )}

      {/* TTS audio */}
      {ttsAudioSrc && <Audio src={ttsAudioSrc} volume={1} />}

      {/* Background music */}
      {musicAudioSrc && <Audio src={musicAudioSrc} volume={musicVolume} />}
    </AbsoluteFill>
  );
};

// ── Crossfade Slide (handles fade in/out at boundaries) ──
const CrossfadeSlide: React.FC<{
  src: string;
  index: number;
  durationInFrames: number;
  transitionFrames: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ src, index, durationInFrames, transitionFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();

  // Fade in (except first slide)
  const fadeIn = isFirst
    ? 1
    : interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out (except last slide)
  const fadeOut = isLast
    ? 1
    : interpolate(
        frame,
        [durationInFrames - transitionFrames, durationInFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <Slide src={src} index={index} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
