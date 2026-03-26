// Shared types for Remotion video composition

export type SlideRole = 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
export type SlideAnimation = 'ken-burns-in' | 'ken-burns-out' | 'pan-left' | 'pan-right' | 'zoom-pulse' | 'drift' | 'tilt-up' | 'tilt-down' | 'zoom-rotate' | 'cinematic-pan' | 'parallax' | 'none' | 'auto';
export type SubtitleStyle = 'pill' | 'word-by-word' | 'karaoke' | 'minimal' | 'neon';
export type OverlayTheme = 'none' | 'minimal' | 'modern' | 'neon' | 'elegant';

export interface StoryboardSlide {
  src: string;                    // URL (HTTP or data:)
  role: SlideRole;
  order: number;
  durationMs?: number;            // Override duration (ms)
  animation?: SlideAnimation;
  caption?: string;               // Text overlay for this specific slide
}

export interface SubtitleGroup {
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface VideoCompositionProps {
  slides: StoryboardSlide[];       // Ordered storyboard slides with roles
  ttsAudioSrc?: string;            // data: URL or HTTP URL
  musicAudioSrc?: string;          // HTTP URL
  musicVolume: number;             // 0-1
  subtitleGroups: SubtitleGroup[];
  subtitleStyle?: SubtitleStyle;
  logoUrl?: string;                // Deprecated — use slide with role='logo' instead
  productOverlay?: {
    name?: string;
    price?: string;
    cta?: string;
  };
  overlayTheme?: OverlayTheme;    // Dynamic visual overlays
}
