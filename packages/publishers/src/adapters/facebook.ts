// ============================================================
// Facebook Publisher Adapter — Graph API v21
// ============================================================

import type {
  PublisherAdapter,
  MetaCredentials,
  ImagePost,
  CarouselPost,
  VideoPost,
  PublishResult,
} from '../types';
import { buildCaption, validateFacebookPost } from '../validators';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Adapter para publicar en Facebook Pages via Graph API.
 *
 * Endpoints:
 * - POST /{page-id}/photos → imagen simple
 * - POST /{page-id}/feed → post con varias images (unpublished photos)
 * - POST /{page-id}/videos → video
 *
 * @see https://developers.facebook.com/docs/pages-api/posts
 */
export class FacebookPublisher implements PublisherAdapter {
  private readonly pageId: string;
  private readonly accessToken: string;

  constructor(credentials: MetaCredentials) {
    if (!credentials.facebookPageId) {
      throw new Error('FacebookPublisher requires facebookPageId');
    }
    this.pageId = credentials.facebookPageId;
    this.accessToken = credentials.accessToken;
  }

  // ============================================================
  // Single Image
  // ============================================================

  async publishImage(post: ImagePost): Promise<PublishResult> {
    const validation = validateFacebookPost(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'facebook',
        error: validation.errors.join('; '),
      };
    }

    try {
      const message = buildCaption(post.caption, post.hashtags);

      // POST /{page-id}/photos
      const data = await this.graphPost(`/${this.pageId}/photos`, {
        url: post.imageUrl,
        message,
        ...(post.scheduledPublishTime
          ? { published: false, scheduled_publish_time: post.scheduledPublishTime }
          : {}),
      });

      const postId = (data.post_id ?? data.id) as string;
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'facebook',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Multi-image (álbum simulado via unpublished photos + feed)
  // ============================================================

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    const validation = validateFacebookPost(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'facebook',
        error: validation.errors.join('; '),
      };
    }

    try {
      const message = buildCaption(post.caption, post.hashtags);

      // Step 1: Upload each image as unpublished
      const uploadedPhotoIds: string[] = [];
      for (const imageUrl of post.imageUrls) {
        const photoData = await this.graphPost(`/${this.pageId}/photos`, {
          url: imageUrl,
          published: false,
        });
        if (photoData.id) {
          uploadedPhotoIds.push(photoData.id as string);
        }
      }

      // Step 2: Create feed post with attached_media
      const attachedMedia: Record<string, unknown> = {};
      uploadedPhotoIds.forEach((id, i) => {
        attachedMedia[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
      });

      const data = await this.graphPost(`/${this.pageId}/feed`, {
        message,
        ...attachedMedia,
        ...(post.scheduledPublishTime
          ? { published: false, scheduled_publish_time: post.scheduledPublishTime }
          : {}),
      });

      const postId = data.id as string;
      const permalink = await this.getPermalink(postId);

      return {
        success: true,
        platform: 'facebook',
        externalPostId: postId,
        permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : String(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================
  // Video
  // ============================================================

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    const validation = validateFacebookPost(post);
    if (!validation.valid) {
      return {
        success: false,
        platform: 'facebook',
        error: validation.errors.join('; '),
      };
    }

    try {
      const description = buildCaption(post.caption, post.hashtags);

      const data = await this.graphPost(`/${this.pageId}/videos`, {
        file_url: post.videoUrl,
        description,
        ...(post.thumbnailUrl ? { thumb: post.thumbnailUrl } : {}),
        ...(post.scheduledPublishTime
          ? { published: false, scheduled_publish_time: post.scheduledPublishTime }
          : {}),
      });

      const videoId = data.id as string;

      return {
        success: true,
        platform: 'facebook',
        externalPostId: videoId,
        permalink: `https://www.facebook.com/${this.pageId}/videos/${videoId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
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
      const resp = await this.graphGet(`/${this.pageId}`, {
        fields: 'id,name',
      });
      return !!resp.id;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async getPermalink(postId: string): Promise<string | undefined> {
    try {
      const data = await this.graphGet(`/${postId}`, {
        fields: 'permalink_url',
      });
      return (data.permalink_url as string) ?? undefined;
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
        `Facebook API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
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
        `Facebook API Error: ${JSON.stringify((data as { error?: unknown }).error ?? data)}`,
      );
    }
    return data as Record<string, unknown>;
  }
}
