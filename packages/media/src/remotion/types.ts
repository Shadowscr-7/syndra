// Shared types for Remotion video composition

export type SlideRole = 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
export type SlideAnimation =
  | 'ken-burns-in' | 'ken-burns-out'
  | 'pan-left' | 'pan-right'
  | 'zoom-pulse' | 'drift'
  | 'tilt-up' | 'tilt-down'
  | 'zoom-rotate' | 'cinematic-pan' | 'parallax'
  | 'none' | 'auto';

export type SubtitleStyle =
  | 'pill'          // glass pill background — clean and modern
  | 'word-by-word'  // each word highlights in sequence with glow
  | 'karaoke'       // gradient sweep as text is spoken
  | 'minimal'       // plain text, elegant fade
  | 'neon'          // synthwave glow border
  | 'kinetic';      // CapCut-style: words fly from random directions, variable size

export type OverlayTheme = 'none' | 'minimal' | 'modern' | 'neon' | 'elegant';

export interface StoryboardSlide {
  src: string;
  role: SlideRole;
  order: number;
  durationMs?: number;
  animation?: SlideAnimation;
  caption?: string;
}

export interface SubtitleGroup {
  startFrame: number;
  endFrame: number;
  text: string;
}

/** Per-word timing (from Whisper or manual) for kinetic subtitles */
export interface TimedWord {
  text: string;
  startFrame: number;
  endFrame: number;
  emphasis?: boolean;   // if true → larger size + accent color
}

export interface VideoCompositionProps {
  slides: StoryboardSlide[];
  ttsAudioSrc?: string;
  musicAudioSrc?: string;
  musicVolume: number;
  subtitleGroups: SubtitleGroup[];
  timedWords?: TimedWord[];           // For kinetic subtitle precise timing
  subtitleStyle?: SubtitleStyle;
  logoUrl?: string;
  productOverlay?: {
    name?: string;
    price?: string;
    cta?: string;
  };
  overlayTheme?: OverlayTheme;

  // Style prompt — free-text aesthetic description
  // e.g. "dark cinematic, orange accents, energetic, bold typography"
  stylePrompt?: string;

  // Accent color — drives kinetic subtitle highlights, progress bar, badges
  accentColor?: string;

  // Talking-head video — person speaking on camera
  // If provided: renders as full-screen base; slides appear as scene inserts
  talkingHeadVideoUrl?: string | null;
}
