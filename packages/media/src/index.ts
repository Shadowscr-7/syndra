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
  /** Image URL for image-to-video generation */
  imageUrl?: string;
  /** Motion/animation prompt for i2v */
  motionPrompt?: string;
  /** Provider-specific model or endpoint override */
  model?: string;
  endpoint?: string;
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
export { ResilientImageAdapter, type ResilientConfig } from './adapters/resilient';
export {
  CloudinaryAdapter,
  MockCloudinaryAdapter,
  type CloudinaryConfig,
  type CloudinaryUploadResult,
  type CloudinaryTransformOptions,
} from './adapters/cloudinary';

// --- Adapters (Image — New providers) ---
export { ReplicateImageAdapter, type ReplicateConfig, type ReplicateImageModel } from './adapters/replicate';

// --- Adapters (KIE AI — Music + Pro Image) ---
export {
  KieMusicAdapter,
  KieImageProAdapter,
  KieVideoAdapter,
  KIE_VIDEO_MODELS,
  PRO_IMAGE_MODELS,
  DEFAULT_BATCH_KIE_MODEL,
  type KieAIConfig,
  type KieImageModelId,
  type KieVideoType,
  type KieVideoModelDef,
  type ProImageModelId,
  type ProImageModelDef,
  type MusicGenerationOptions,
  type GeneratedMusic,
  type IdeogramOptions,
} from './adapters/kie-ai';

// --- Adapters (Video) ---
export { HeyGenVideoAdapter, type HeyGenConfig } from './adapters/heygen';
export { MockVideoAdapter } from './adapters/mock-video';
export { PikaVideoAdapter, type PikaConfig } from './adapters/pika-video';
export { LumaVideoAdapter, type LumaConfig } from './adapters/luma-video';
export { LocalGPUVideoAdapter, type LocalGPUConfig } from './adapters/local-gpu-video';
export { CompositeVideoAdapter, type CompositeVideoConfig } from './adapters/composite-video';
export { ReplicateVideoAdapter, type ReplicateVideoConfig, type ReplicateVideoModel } from './adapters/replicate-video';
export { FalVideoAdapter, type FalVideoConfig, type FalVideoEndpoint } from './adapters/fal-video';
export { DIDVideoAdapter, type DIDConfig, type DIDVoice } from './adapters/did-video';
export { HedraVideoAdapter, type HedraConfig } from './adapters/hedra-video';
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
export {
  ImageComposer,
  type ComposeImageOptions,
  type CompositionTemplate,
  type ComposedImage,
} from './composers/image-composer';
export {
  SharpRenderer,
  type SharpComposeOptions,
  type SharpRenderOptions,
  type RenderedImage,
} from './composers/sharp-renderer';

// --- Slideshow Renderer (FFmpeg local — gratis) ---
export {
  SlideshowRenderer,
  type SlideshowInput,
  type SlideshowResult,
} from './renderers/slideshow-renderer';

// --- Pro Video Renderer (FFmpeg compositor — profesional) ---
export {
  ProVideoRenderer,
  type ProVideoInput,
  type ProVideoResult,
} from './renderers/pro-video-renderer';

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
