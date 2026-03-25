// ============================================================
// @automatismos/publishers — Tipos compartidos
// ============================================================

/**
 * Configuración de credenciales Meta (IG + FB)
 */
export interface MetaCredentials {
  /** Long-lived user/page access token */
  accessToken: string;
  /** Instagram Business Account ID */
  instagramAccountId?: string;
  /** Facebook Page ID */
  facebookPageId?: string;
}

/**
 * Opciones para publicar una imagen simple
 */
export interface ImagePost {
  imageUrl: string;
  caption: string;
  hashtags?: string[];
  /** Hora programada (Unix epoch seconds). Si se omite, publica inmediatamente */
  scheduledPublishTime?: number;
}

/**
 * Opciones para publicar un carrusel / álbum
 */
export interface CarouselPost {
  imageUrls: string[];
  caption: string;
  hashtags?: string[];
  scheduledPublishTime?: number;
}

/**
 * Opciones para publicar un video / reel
 */
export interface VideoPost {
  videoUrl: string;
  caption: string;
  thumbnailUrl?: string;
  hashtags?: string[];
  scheduledPublishTime?: number;
}

/**
 * Resultado de una publicación
 */
export interface PublishResult {
  success: boolean;
  platform: 'instagram' | 'facebook' | 'discord' | 'threads' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' | 'meta_ads' | 'google_ads' | 'whatsapp' | 'mercadolibre';
  externalPostId?: string;
  permalink?: string;
  error?: string;
  rawResponse?: unknown;
}

/**
 * Interface base para adaptadores de publicación.
 * Cada red social implementa esta interface.
 */
export interface PublisherAdapter {
  /** Publica un post simple con imagen */
  publishImage(post: ImagePost): Promise<PublishResult>;
  /** Publica un carrusel (álbum de imágenes) */
  publishCarousel(post: CarouselPost): Promise<PublishResult>;
  /** Publica un video / reel */
  publishVideo(post: VideoPost): Promise<PublishResult>;
  /** Verifica que los tokens y permisos sean válidos */
  validateCredentials(): Promise<boolean>;
}

/**
 * Resultado de validación pre-publish
 */
export interface PrePublishValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
