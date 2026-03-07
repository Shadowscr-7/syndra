// ============================================================
// Constantes globales
// ============================================================

export const QUEUES = {
  EDITORIAL: 'editorial_jobs',
  MEDIA: 'media_jobs',
  PUBLISH: 'publish_jobs',
  VIDEO: 'video_jobs',
  ANALYTICS: 'analytics_jobs',
} as const;

export const INSTAGRAM_LIMITS = {
  CAPTION_MAX_LENGTH: 2200,
  HASHTAGS_MAX: 30,
  CAROUSEL_MIN_SLIDES: 2,
  CAROUSEL_MAX_SLIDES: 20,
  IMAGE_ASPECT_RATIO_MIN: 0.8, // 4:5
  IMAGE_ASPECT_RATIO_MAX: 1.91, // 1.91:1
  REEL_MAX_DURATION_SECONDS: 90,
  REEL_MIN_DURATION_SECONDS: 3,
} as const;

export const FACEBOOK_LIMITS = {
  POST_MAX_LENGTH: 63206,
  IMAGE_MAX_SIZE_MB: 10,
  VIDEO_MAX_SIZE_MB: 4096,
} as const;

export const DEFAULT_PUBLISH_WINDOW = {
  MORNING: '09:00',
  AFTERNOON: '13:00',
  EVENING: '18:00',
} as const;

export const MAX_RETRIES = 3;
export const RETRY_BACKOFF_BASE_MS = 5000;

export const TONE_PRESETS = [
  'didáctico',
  'técnico',
  'aspiracional',
  'polémico',
  'premium',
  'cercano',
  'mentor',
  'vendedor_suave',
] as const;

export const CONTENT_FORMATS = [
  'post',
  'carousel',
  'reel',
  'story',
  'avatar_video',
  'hybrid_motion',
] as const;
