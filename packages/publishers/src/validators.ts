// ============================================================
// Pre-publish validators — Validación antes de publicar
// ============================================================

import {
  INSTAGRAM_LIMITS,
  FACEBOOK_LIMITS,
  TWITTER_LIMITS,
  LINKEDIN_LIMITS,
  TIKTOK_LIMITS,
  YOUTUBE_LIMITS,
  PINTEREST_LIMITS,
  META_ADS_LIMITS,
  GOOGLE_ADS_LIMITS,
  WHATSAPP_LIMITS,
  MERCADOLIBRE_LIMITS,
} from '@automatismos/shared';
import type { ImagePost, CarouselPost, VideoPost, PrePublishValidation } from './types';

/**
 * Construye el caption final combinando texto y hashtags
 */
export function buildCaption(caption: string, hashtags?: string[]): string {
  const hashtagBlock = hashtags?.length
    ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    : '';
  return (caption + hashtagBlock).trim();
}

/**
 * Valida un post simple para Instagram
 */
export function validateInstagramImage(post: ImagePost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const caption = buildCaption(post.caption, post.hashtags);

  if (caption.length > INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH) {
    errors.push(
      `Caption excede ${INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH} caracteres (actual: ${caption.length})`,
    );
  }

  if (post.hashtags && post.hashtags.length > INSTAGRAM_LIMITS.HASHTAGS_MAX) {
    errors.push(
      `Demasiados hashtags: ${post.hashtags.length} (máximo: ${INSTAGRAM_LIMITS.HASHTAGS_MAX})`,
    );
  }

  if (!post.imageUrl) {
    errors.push('Se requiere imageUrl');
  }

  if (caption.length > 2000) {
    warnings.push('Captions largos tienden a tener menor engagement');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un carrusel para Instagram
 */
export function validateInstagramCarousel(post: CarouselPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const caption = buildCaption(post.caption, post.hashtags);

  if (caption.length > INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH) {
    errors.push(`Caption excede ${INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH} caracteres`);
  }

  if (post.imageUrls.length < INSTAGRAM_LIMITS.CAROUSEL_MIN_SLIDES) {
    errors.push(
      `Carrusel necesita al menos ${INSTAGRAM_LIMITS.CAROUSEL_MIN_SLIDES} imágenes`,
    );
  }

  if (post.imageUrls.length > INSTAGRAM_LIMITS.CAROUSEL_MAX_SLIDES) {
    errors.push(
      `Carrusel máximo ${INSTAGRAM_LIMITS.CAROUSEL_MAX_SLIDES} imágenes (actual: ${post.imageUrls.length})`,
    );
  }

  if (post.hashtags && post.hashtags.length > INSTAGRAM_LIMITS.HASHTAGS_MAX) {
    errors.push(`Demasiados hashtags: máximo ${INSTAGRAM_LIMITS.HASHTAGS_MAX}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un video / reel para Instagram
 */
export function validateInstagramVideo(post: VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!post.videoUrl) {
    errors.push('Se requiere videoUrl');
  }

  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH) {
    errors.push(`Caption excede ${INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH} caracteres`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un post para Facebook
 */
export function validateFacebookPost(
  post: ImagePost | CarouselPost | VideoPost,
): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > FACEBOOK_LIMITS.POST_MAX_LENGTH) {
    errors.push(`Texto excede ${FACEBOOK_LIMITS.POST_MAX_LENGTH} caracteres`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Twitter / X ──

export function validateTwitterPost(post: ImagePost | CarouselPost | VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > TWITTER_LIMITS.TWEET_MAX_LENGTH) {
    errors.push(`Tweet excede ${TWITTER_LIMITS.TWEET_MAX_LENGTH} caracteres (actual: ${caption.length})`);
  }
  if ('imageUrls' in post && post.imageUrls.length > TWITTER_LIMITS.IMAGE_MAX_COUNT) {
    errors.push(`Máximo ${TWITTER_LIMITS.IMAGE_MAX_COUNT} imágenes por tweet`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── LinkedIn ──

export function validateLinkedInPost(post: ImagePost | CarouselPost | VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > LINKEDIN_LIMITS.POST_MAX_LENGTH) {
    errors.push(`Texto excede ${LINKEDIN_LIMITS.POST_MAX_LENGTH} caracteres`);
  }
  if ('imageUrls' in post && post.imageUrls.length > LINKEDIN_LIMITS.IMAGE_MAX_COUNT) {
    errors.push(`Máximo ${LINKEDIN_LIMITS.IMAGE_MAX_COUNT} imágenes`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── TikTok ──

export function validateTikTokPost(post: VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!post.videoUrl) {
    errors.push('TikTok requiere un video');
  }
  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH) {
    errors.push(`Descripción excede ${TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── YouTube ──

export function validateYouTubePost(post: VideoPost & { title?: string }): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!post.videoUrl) {
    errors.push('YouTube requiere un video');
  }
  if (post.title && post.title.length > YOUTUBE_LIMITS.TITLE_MAX_LENGTH) {
    errors.push(`Título excede ${YOUTUBE_LIMITS.TITLE_MAX_LENGTH} caracteres`);
  }
  const desc = buildCaption(post.caption, post.hashtags);
  if (desc.length > YOUTUBE_LIMITS.DESCRIPTION_MAX_LENGTH) {
    errors.push(`Descripción excede ${YOUTUBE_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── Pinterest ──

export function validatePinterestPost(post: ImagePost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!post.imageUrl) {
    errors.push('Pinterest requiere una imagen');
  }
  if (post.caption.length > PINTEREST_LIMITS.DESCRIPTION_MAX_LENGTH) {
    errors.push(`Descripción excede ${PINTEREST_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── Meta Ads ──

export function validateMetaAdsPost(post: ImagePost | CarouselPost | VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = buildCaption(post.caption, post.hashtags);
  if (text.length > META_ADS_LIMITS.PRIMARY_TEXT_MAX_LENGTH) {
    warnings.push(`Texto principal supera los ${META_ADS_LIMITS.PRIMARY_TEXT_MAX_LENGTH} caracteres recomendados`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── Google Ads ──

export function validateGoogleAdsPost(post: ImagePost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!post.imageUrl) {
    errors.push('Google Ads requiere al menos una imagen');
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── WhatsApp ──

export function validateWhatsAppPost(post: ImagePost | VideoPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const caption = buildCaption(post.caption, post.hashtags);
  if (caption.length > WHATSAPP_LIMITS.CAPTION_MAX_LENGTH) {
    errors.push(`Caption excede ${WHATSAPP_LIMITS.CAPTION_MAX_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── Mercado Libre ──

export function validateMercadoLibrePost(post: ImagePost | CarouselPost): PrePublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (post.caption.length > MERCADOLIBRE_LIMITS.TITLE_MAX_LENGTH) {
    errors.push(`Título excede ${MERCADOLIBRE_LIMITS.TITLE_MAX_LENGTH} caracteres`);
  }
  if ('imageUrls' in post && post.imageUrls.length > MERCADOLIBRE_LIMITS.IMAGES_MAX_COUNT) {
    errors.push(`Máximo ${MERCADOLIBRE_LIMITS.IMAGES_MAX_COUNT} imágenes`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ── Generic validator dispatcher ──

export function validatePost(
  platform: string,
  post: ImagePost | CarouselPost | VideoPost,
): PrePublishValidation {
  switch (platform) {
    case 'instagram':
      if ('imageUrls' in post) return validateInstagramCarousel(post);
      if ('videoUrl' in post) return validateInstagramVideo(post);
      return validateInstagramImage(post as ImagePost);
    case 'facebook': return validateFacebookPost(post);
    case 'twitter': return validateTwitterPost(post);
    case 'linkedin': return validateLinkedInPost(post);
    case 'tiktok': return validateTikTokPost(post as VideoPost);
    case 'youtube': return validateYouTubePost(post as VideoPost);
    case 'pinterest': return validatePinterestPost(post as ImagePost);
    case 'meta_ads': return validateMetaAdsPost(post);
    case 'google_ads': return validateGoogleAdsPost(post as ImagePost);
    case 'whatsapp': return validateWhatsAppPost(post as ImagePost);
    case 'mercadolibre': return validateMercadoLibrePost(post as ImagePost);
    default: return { valid: true, errors: [], warnings: [] };
  }
}
