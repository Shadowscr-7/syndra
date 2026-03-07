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
export { DiscordPublisher, type DiscordWebhookConfig } from './adapters/discord';
export { MockPublisher } from './adapters/mock';

// Metrics / Analytics
export type { PostMetrics } from './metrics';
export {
  fetchInstagramMetrics,
  fetchFacebookMetrics,
  fetchPostFieldMetrics,
} from './metrics';
