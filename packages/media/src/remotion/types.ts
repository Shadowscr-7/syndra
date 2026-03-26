// Shared types for Remotion video composition

export interface SubtitleGroup {
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface VideoCompositionProps {
  images: string[];             // URLs (HTTP or data:)
  ttsAudioSrc?: string;         // data: URL or HTTP URL
  musicAudioSrc?: string;       // HTTP URL
  musicVolume: number;           // 0-1
  subtitleGroups: SubtitleGroup[];
  logoUrl?: string;
  productOverlay?: {
    name?: string;
    price?: string;
    cta?: string;
  };
}
