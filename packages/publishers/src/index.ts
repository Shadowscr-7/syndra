// ============================================================
// @automatismos/publishers — Instagram & Facebook adapters
// ============================================================

// Types
export type {
  PublisherAdapter,
  MetaCredentials,
  ImagePost,
  CarouselPost,
  VideoPost,
  PublishResult,
  PrePublishValidation,
} from './types';

// Validators
export {
  buildCaption,
  validateInstagramImage,
  validateInstagramCarousel,
  validateInstagramVideo,
  validateFacebookPost,
} from './validators';

// Adapters
export { InstagramPublisher } from './adapters/instagram';
export { FacebookPublisher } from './adapters/facebook';
export { ThreadsPublisher, type ThreadsCredentials } from './adapters/threads';
export { DiscordPublisher, type DiscordWebhookConfig } from './adapters/discord';
export { TwitterPublisher, type TwitterCredentials } from './adapters/twitter';
export { LinkedInPublisher, type LinkedInCredentials } from './adapters/linkedin';
export { TikTokPublisher, type TikTokCredentials } from './adapters/tiktok';
export { YouTubePublisher, type YouTubeCredentials } from './adapters/youtube';
export { PinterestPublisher, type PinterestCredentials } from './adapters/pinterest';
export { MetaAdsPublisher, type MetaAdsCredentials } from './adapters/meta-ads';
export { GoogleAdsPublisher, type GoogleAdsCredentials } from './adapters/google-ads';
export { WhatsAppPublisher, type WhatsAppCredentials } from './adapters/whatsapp';
export { MercadoLibrePublisher, type MercadoLibreCredentials } from './adapters/mercadolibre';
export { MockPublisher } from './adapters/mock';

// Metrics / Analytics
export type { PostMetrics } from './metrics';
export {
  fetchInstagramMetrics,
  fetchFacebookMetrics,
  fetchPostFieldMetrics,
} from './metrics';
