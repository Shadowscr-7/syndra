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

export const TWITTER_LIMITS = {
  TWEET_MAX_LENGTH: 280,
  IMAGE_MAX_COUNT: 4,
  VIDEO_MAX_DURATION_SECONDS: 140,
  VIDEO_MAX_SIZE_MB: 512,
} as const;

export const LINKEDIN_LIMITS = {
  POST_MAX_LENGTH: 3000,
  IMAGE_MAX_COUNT: 20,
  VIDEO_MAX_DURATION_SECONDS: 600,
  VIDEO_MAX_SIZE_MB: 200,
} as const;

export const TIKTOK_LIMITS = {
  DESCRIPTION_MAX_LENGTH: 2200,
  VIDEO_MIN_DURATION_SECONDS: 1,
  VIDEO_MAX_DURATION_SECONDS: 600,
  VIDEO_MAX_SIZE_MB: 4096,
} as const;

export const YOUTUBE_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 5000,
  TAGS_MAX: 500,
  VIDEO_MAX_SIZE_MB: 256000,
} as const;

export const PINTEREST_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  IMAGE_MIN_WIDTH: 100,
  VIDEO_MAX_DURATION_SECONDS: 900,
} as const;

export const META_ADS_LIMITS = {
  HEADLINE_MAX_LENGTH: 40,
  PRIMARY_TEXT_MAX_LENGTH: 125,
  DESCRIPTION_MAX_LENGTH: 30,
  IMAGE_RATIO: '1.91:1',
  IMAGE_MIN_WIDTH: 1080,
  VIDEO_MAX_DURATION_SECONDS: 241,
} as const;

export const GOOGLE_ADS_LIMITS = {
  HEADLINE_MAX_LENGTH: 30,
  LONG_HEADLINE_MAX_LENGTH: 90,
  DESCRIPTION_MAX_LENGTH: 90,
  IMAGE_MIN_WIDTH: 600,
  MAX_HEADLINES: 15,
  MAX_DESCRIPTIONS: 4,
} as const;

export const WHATSAPP_LIMITS = {
  STATUS_TEXT_MAX_LENGTH: 700,
  CAPTION_MAX_LENGTH: 1024,
  IMAGE_MAX_SIZE_MB: 16,
  VIDEO_MAX_SIZE_MB: 16,
  VIDEO_MAX_DURATION_SECONDS: 30,
} as const;

export const MERCADOLIBRE_LIMITS = {
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 50000,
  IMAGES_MAX_COUNT: 12,
  IMAGE_MIN_WIDTH: 500,
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
