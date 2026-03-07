// ============================================================
// @automatismos/media — Image generation, carousel rendering & media pipeline
// ============================================================

// --- Core interfaces ---

export interface ImageGeneratorAdapter {
  generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage>;
}

export interface ImageGenOptions {
  width?: number;
  height?: number;
  style?: string;
  quality?: 'standard' | 'hd';
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  provider: string;
  metadata: Record<string, unknown>;
}

export interface CarouselRenderer {
  render(slides: CarouselSlide[], branding: BrandingConfig): Promise<string[]>;
}

export interface CarouselSlide {
  type: 'cover' | 'content' | 'cta';
  title?: string;
  body?: string;
  imageUrl?: string;
}

export interface BrandingConfig {
  primaryFont: string;
  secondaryFont: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
}

// --- Video interfaces (Fase 4) ---

export interface AvatarVideoAdapter {
  generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo>;
  getStatus(jobId: string): Promise<VideoJobStatus>;
}

export interface VideoScript {
  blocks: Array<{ text: string; duration?: number }>;
  totalDuration?: number;
}

export interface VideoGenOptions {
  avatarId?: string;
  voiceId?: string;
  language?: string;
  outputFormat?: 'mp4' | 'webm';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface GeneratedVideo {
  jobId: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  url?: string;
}

export interface VideoJobStatus {
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress?: number;
  url?: string;
  error?: string;
}

// --- Adapters (Image) ---
export { DallEImageAdapter, StabilityImageAdapter, MockImageAdapter } from './adapters/image-generator';
export { PollinationsImageAdapter } from './adapters/pollinations';
export { HuggingFaceImageAdapter, type HuggingFaceImageConfig } from './adapters/huggingface';
export {
  CloudinaryAdapter,
  MockCloudinaryAdapter,
  type CloudinaryConfig,
  type CloudinaryUploadResult,
  type CloudinaryTransformOptions,
} from './adapters/cloudinary';

// --- Adapters (Video) ---
export { HeyGenVideoAdapter, type HeyGenConfig } from './adapters/heygen';
export { MockVideoAdapter } from './adapters/mock-video';
export {
  ElevenLabsVoiceAdapter,
  MockVoiceAdapter,
  type ElevenLabsConfig,
  type VoiceSynthesisAdapter,
  type VoiceSynthesisOptions,
  type SynthesizedAudio,
  type VoiceInfo,
} from './adapters/voice-synthesis';
export { EdgeTTSAdapter } from './adapters/edge-tts';

// --- Templates ---
export {
  BUILTIN_TEMPLATES,
  TEMPLATE_EDUCATIONAL,
  TEMPLATE_NEWS,
  TEMPLATE_CTA,
  TEMPLATE_AUTHORITY,
  TEMPLATE_CONTROVERSIAL,
  getTemplateById,
  getTemplateForCategory,
  validateSlidesAgainstTemplate,
  type CarouselTemplate,
  type TemplateSlotDef,
} from './templates/carousel-templates';

// --- Composers ---
export { SvgCarouselComposer, type ComposedSlide } from './composers/carousel-composer';

// --- Pipeline ---
export {
  MediaPipeline,
  type MediaPipelineConfig,
  type ImagePipelineResult,
  type CarouselPipelineResult,
} from './pipeline/media-pipeline';

// --- Video Pipeline ---
export {
  VideoPipeline,
  type VideoPipelineConfig,
  type VideoScriptInput,
  type VideoPipelineResult,
} from './pipeline/video-pipeline';

// --- Video Templates ---
export {
  BUILTIN_VIDEO_TEMPLATES,
  VIDEO_TEMPLATE_NEWS,
  VIDEO_TEMPLATE_EDUCATIONAL,
  VIDEO_TEMPLATE_CTA,
  VIDEO_TEMPLATE_HYBRID_MOTION,
  getVideoTemplateById,
  getVideoTemplateForMode,
  buildScriptFromTemplate,
  generateSRT,
  type VideoTemplate,
  type VideoMode,
  type ScriptBlock,
  type SubtitleStyle,
} from './templates/video-templates';
