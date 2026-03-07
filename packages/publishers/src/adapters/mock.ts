// ============================================================
// Mock Publisher Adapter — Para desarrollo y testing
// ============================================================

import type {
  PublisherAdapter,
  ImagePost,
  CarouselPost,
  VideoPost,
  PublishResult,
} from '../types';

/**
 * Mock adapter que simula publicación sin llamar APIs reales.
 * Útil para desarrollo local y tests.
 */
export class MockPublisher implements PublisherAdapter {
  private readonly platform: 'instagram' | 'facebook';
  private publishCount = 0;

  constructor(platform: 'instagram' | 'facebook' = 'instagram') {
    this.platform = platform;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    this.publishCount++;
    const externalId = `mock_${this.platform}_${this.publishCount}_${Date.now()}`;

    console.log(`[MockPublisher][${this.platform}] publishImage:`, {
      imageUrl: post.imageUrl,
      captionLength: post.caption.length,
    });

    return {
      success: true,
      platform: this.platform,
      externalPostId: externalId,
      permalink: `https://${this.platform}.mock/${externalId}`,
    };
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    this.publishCount++;
    const externalId = `mock_${this.platform}_carousel_${this.publishCount}_${Date.now()}`;

    console.log(`[MockPublisher][${this.platform}] publishCarousel:`, {
      slides: post.imageUrls.length,
      captionLength: post.caption.length,
    });

    return {
      success: true,
      platform: this.platform,
      externalPostId: externalId,
      permalink: `https://${this.platform}.mock/${externalId}`,
    };
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    this.publishCount++;
    const externalId = `mock_${this.platform}_video_${this.publishCount}_${Date.now()}`;

    console.log(`[MockPublisher][${this.platform}] publishVideo:`, {
      videoUrl: post.videoUrl,
      captionLength: post.caption.length,
    });

    return {
      success: true,
      platform: this.platform,
      externalPostId: externalId,
      permalink: `https://${this.platform}.mock/${externalId}`,
    };
  }

  async validateCredentials(): Promise<boolean> {
    return true;
  }
}
