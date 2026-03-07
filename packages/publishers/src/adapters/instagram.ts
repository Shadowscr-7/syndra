// ============================================================
// Instagram Publisher Adapter — Content Publishing API (Graph API v21)
// ============================================================

import type {
  PublisherAdapter,
  MetaCredentials,
  ImagePost,
  CarouselPost,
  VideoPost,
  PublishResult,
} from '../types';
import {
  buildCaption,
  validateInstagramImage,
  validateInstagramCarousel,
  validateInstagramVideo,
} from '../validators';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Adapter para publicar en Instagram via Content Publishing API.
 *
 * Flujo:
 * 1. Crear container(s) de media
 * 2. (Carousel: crear carousel container agrupando los anteriores)
 * 3. Publish container → post real
 * 4. Polling status FINISHED
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing
 */
export class InstagramPublisher implements PublisherAdapter {
  private readonly accountId: string;
  private readonly accessToken: string;

  constructor(credentials: MetaCredentials) {
    if (!credentials.instagramAccountId) {
      throw new Error('InstagramPublisher requires instagramAccountId');
    }
    this.accountId = credentials.instagramAccountId;
    this.accessToken = credentials.accessToken;
  }

  // ============================================================
  // Single Image
  // ============================================================

  async publishImage(post: ImagePost): Promise<PublishResult> {
    const validation = validateInstagramImage(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'instagram',
        error: validation.errors.join('; '),
      };
    }

    try {
      const caption = buildCaption(post.caption, post.hashtags);

      // Step 1: Create image container
      const containerId = await this.createMediaContainer({
        image_url: post.imageUrl,
        caption,
        ...(post.scheduledPublishTime
          ? { published: false, scheduled_publish_time: post.scheduledPublishTime }
          : {}),
      });

      // Step 2: Wait for container to be ready
      await this.waitForContainerReady(containerId);

      // Step 3: Publish
      const publishId = await this.publishContainer(containerId);

      // Step 4: Get permalink
      const permalink = await this.getPermalink(publishId);

      return {
        success: true,
        platform: 'instagram',
        externalPostId: publishId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Carousel
  // ============================================================

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    const validation = validateInstagramCarousel(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'instagram',
        error: validation.errors.join('; '),
      };
    }

    try {
      const caption = buildCaption(post.caption, post.hashtags);

      // Step 1: Create child containers for each image
      const childIds: string[] = [];
      for (const imageUrl of post.imageUrls) {
        const childId = await this.createMediaContainer({
          image_url: imageUrl,
          is_carousel_item: true,
        });
        childIds.push(childId);
      }

      // Step 2: Wait for all children
      for (const childId of childIds) {
        await this.waitForContainerReady(childId);
      }

      // Step 3: Create carousel container
      const carouselId = await this.createMediaContainer({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        ...(post.scheduledPublishTime
          ? { published: false, scheduled_publish_time: post.scheduledPublishTime }
          : {}),
      });

      // Step 4: Publish carousel
      const publishId = await this.publishContainer(carouselId);

      // Step 5: Get permalink
      const permalink = await this.getPermalink(publishId);

      return {
        success: true,
        platform: 'instagram',
        externalPostId: publishId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Reel / Video
  // ============================================================

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    const validation = validateInstagramVideo(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'instagram',
        error: validation.errors.join('; '),
      };
    }

    try {
      const caption = buildCaption(post.caption, post.hashtags);

      // Create REELS container
      const containerId = await this.createMediaContainer({
        media_type: 'REELS',
        video_url: post.videoUrl,
        caption,
        ...(post.thumbnailUrl ? { thumb_offset: '0' } : {}),
      });

      // Reels need longer polling
      await this.waitForContainerReady(containerId, 120_000);

      const publishId = await this.publishContainer(containerId);
      const permalink = await this.getPermalink(publishId);

      return {
        success: true,
        platform: 'instagram',
        externalPostId: publishId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Credential validation
  // ============================================================

  async validateCredentials(): Promise<boolean> {
    try {
      const resp = await this.graphGet(`/${this.accountId}`, {
        fields: 'id,username',
      });
      return !!resp.id;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async createMediaContainer(
    params: Record<string, unknown>,
  ): Promise<string> {
    const data = await this.graphPost(`/${this.accountId}/media`, params);
    if (!data.id) {
      throw new Error(`Failed to create container: ${JSON.stringify(data)}`);
    }
    return data.id as string;
  }

  private async publishContainer(containerId: string): Promise<string> {
    const data = await this.graphPost(`/${this.accountId}/media_publish`, {
      creation_id: containerId,
    });
    if (!data.id) {
      throw new Error(`Failed to publish container: ${JSON.stringify(data)}`);
    }
    return data.id as string;
  }

  private async waitForContainerReady(
    containerId: string,
    timeoutMs = 60_000,
  ): Promise<void> {
    const start = Date.now();
    const pollIntervalMs = 3_000;

    while (Date.now() - start < timeoutMs) {
      const data = await this.graphGet(`/${containerId}`, {
        fields: 'status_code',
      });

      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new Error(`Container ${containerId} failed: ${JSON.stringify(data)}`);
      }

      // IN_PROGRESS — wait and retry
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Container ${containerId} timed out after ${timeoutMs}ms`);
  }

  private async getPermalink(mediaId: string): Promise<string | undefined> {
    try {
      const data = await this.graphGet(`/${mediaId}`, {
        fields: 'permalink',
      });
      return data.permalink as string | undefined;
    } catch {
      return undefined;
    }
  }

  private async graphGet(
    path: string,
    params: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${GRAPH_API_BASE}${path}`);
    url.searchParams.set('access_token', this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const resp = await fetch(url.toString());
    const data = await resp.json();

    if (!resp.ok || (data as { error?: unknown }).error) {
      throw new Error(
        `Instagram API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
      );
    }

    return data as Record<string, unknown>;
  }

  private async graphPost(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${GRAPH_API_BASE}${path}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        access_token: this.accessToken,
      }),
    });

    const data = await resp.json();

    if (!resp.ok || (data as { error?: unknown }).error) {
      throw new Error(
        `Instagram API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
      );
    }

    return data as Record<string, unknown>;
  }
}
