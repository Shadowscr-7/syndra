// ============================================================
// Pre-publish validators — Validación antes de publicar
// ============================================================

import { INSTAGRAM_LIMITS, FACEBOOK_LIMITS } from '@automatismos/shared';
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
