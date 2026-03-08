// ============================================================
// Threads Publisher Adapter — Threads API (via Meta Graph API)
// ============================================================

import type {
  PublisherAdapter,
  ImagePost,
  CarouselPost,
  VideoPost,
  PublishResult,
} from '../types';
import { buildCaption } from '../validators';

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

/**
 * Credenciales para publicar en Threads.
 * Usa el mismo access token de Meta pero con el Threads User ID.
 */
export interface ThreadsCredentials {
  /** Long-lived user access token (with threads_content_publish permission) */
  accessToken: string;
  /** Threads user ID */
  threadsUserId: string;
}

/**
 * Adapter para publicar en Threads via Threads API.
 *
 * Flujo:
 * 1. POST /{user-id}/threads → crear container (TEXT, IMAGE, VIDEO, CAROUSEL)
 * 2. POST /{user-id}/threads_publish → publicar el container
 *
 * @see https://developers.facebook.com/docs/threads/posts
 */
export class ThreadsPublisher implements PublisherAdapter {
  private readonly userId: string;
  private readonly accessToken: string;

  constructor(credentials: ThreadsCredentials) {
    if (!credentials.threadsUserId) {
      throw new Error('ThreadsPublisher requires threadsUserId');
    }
    this.userId = credentials.threadsUserId;
    this.accessToken = credentials.accessToken;
  }

  // ============================================================
  // Single Image
  // ============================================================

  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const text = buildCaption(post.caption, post.hashtags);

      // Step 1: Create image container
      const containerId = await this.createContainer({
        media_type: 'IMAGE',
        image_url: post.imageUrl,
        text,
      });

      // Step 2: Wait for container to be ready
      await this.waitForContainerReady(containerId);

      // Step 3: Publish
      const postId = await this.publishContainer(containerId);

      // Step 4: Get permalink
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'threads',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'threads',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Carousel (up to 20 items on Threads)
  // ============================================================

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const text = buildCaption(post.caption, post.hashtags);

      // Step 1: Create child containers for each image
      const childIds: string[] = [];
      for (const imageUrl of post.imageUrls) {
        const childId = await this.createContainer({
          media_type: 'IMAGE',
          image_url: imageUrl,
          is_carousel_item: true,
        });
        childIds.push(childId);
      }

      // Step 2: Wait for all children to be ready
      for (const childId of childIds) {
        await this.waitForContainerReady(childId);
      }

      // Step 3: Create carousel container
      const carouselId = await this.createContainer({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        text,
      });

      // Step 4: Publish carousel
      const postId = await this.publishContainer(carouselId);

      // Step 5: Get permalink
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'threads',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'threads',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Video
  // ============================================================

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const text = buildCaption(post.caption, post.hashtags);

      // Create VIDEO container
      const containerId = await this.createContainer({
        media_type: 'VIDEO',
        video_url: post.videoUrl,
        text,
      });

      // Videos need longer polling
      await this.waitForContainerReady(containerId, 120_000);

      const postId = await this.publishContainer(containerId);
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'threads',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'threads',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Text-only post (Threads-specific)
  // ============================================================

  async publishText(text: string): Promise<PublishResult> {
    try {
      const containerId = await this.createContainer({
        media_type: 'TEXT',
        text,
      });

      await this.waitForContainerReady(containerId);
      const postId = await this.publishContainer(containerId);
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'threads',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'threads',
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
      const resp = await this.graphGet(`/${this.userId}`, {
        fields: 'id,username,threads_profile_picture_url',
      });
      return !!resp.id;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async createContainer(
    params: Record<string, unknown>,
  ): Promise<string> {
    const data = await this.graphPost(`/${this.userId}/threads`, params);
    if (!data.id) {
      throw new Error(`Failed to create Threads container: ${JSON.stringify(data)}`);
    }
    return data.id as string;
  }

  private async publishContainer(containerId: string): Promise<string> {
    const data = await this.graphPost(`/${this.userId}/threads_publish`, {
      creation_id: containerId,
    });
    if (!data.id) {
      throw new Error(`Failed to publish Threads container: ${JSON.stringify(data)}`);
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
        fields: 'status',
      });

      const status = data.status as string | undefined;
      if (status === 'FINISHED') return;
      if (status === 'ERROR') {
        const errorMsg = (data.error_message as string) ?? JSON.stringify(data);
        throw new Error(`Threads container ${containerId} failed: ${errorMsg}`);
      }

      // IN_PROGRESS — wait and retry
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Threads container ${containerId} timed out after ${timeoutMs}ms`);
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
    const url = new URL(`${THREADS_API_BASE}${path}`);
    url.searchParams.set('access_token', this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const resp = await fetch(url.toString());
    const data = await resp.json();

    if (!resp.ok || (data as { error?: unknown }).error) {
      throw new Error(
        `Threads API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
      );
    }

    return data as Record<string, unknown>;
  }

  private async graphPost(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${THREADS_API_BASE}${path}`;

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
        `Threads API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
      );
    }

    return data as Record<string, unknown>;
  }
}
