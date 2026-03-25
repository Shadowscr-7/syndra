// ============================================================
// Pinterest Publisher — Pinterest API v5 (OAuth 2.0)
// https://developers.pinterest.com/docs/api/v5/
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

const PINTEREST_API = 'https://api.pinterest.com/v5';

export interface PinterestCredentials {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** Refresh token for auto-renewal */
  refreshToken?: string;
  /** Default board ID to pin to */
  boardId: string;
  /** Board name (display) */
  boardName?: string;
  /** Pinterest username */
  username?: string;
}

export class PinterestPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly boardId: string;

  constructor(credentials: PinterestCredentials) {
    if (!credentials.accessToken) throw new Error('PinterestPublisher requires accessToken');
    if (!credentials.boardId) throw new Error('PinterestPublisher requires boardId');
    this.accessToken = credentials.accessToken;
    this.boardId = credentials.boardId;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const { title, description } = this.buildMeta(post.caption, post.hashtags);

      const body = {
        board_id: this.boardId,
        title,
        description,
        media_source: {
          source_type: 'image_url',
          url: post.imageUrl,
        },
      };

      const pin = await this.createPin(body);

      return {
        success: true,
        platform: 'pinterest',
        externalPostId: pin.id,
        permalink: `https://pinterest.com/pin/${pin.id}/`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'pinterest',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const { title, description } = this.buildMeta(post.caption, post.hashtags);

      // Pinterest carousel pins (up to 5 images)
      const items = post.imageUrls.slice(0, 5).map((url) => ({
        title,
        description,
        media_source: {
          source_type: 'image_url' as const,
          url,
        },
      }));

      const body = {
        board_id: this.boardId,
        title,
        description,
        media_source: {
          source_type: 'multiple_image_urls',
          items,
        },
      };

      const pin = await this.createPin(body);

      return {
        success: true,
        platform: 'pinterest',
        externalPostId: pin.id,
        permalink: `https://pinterest.com/pin/${pin.id}/`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'pinterest',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const { title, description } = this.buildMeta(post.caption, post.hashtags);

      // Step 1: Register video media
      const mediaUpload = await this.registerMedia();

      // Step 2: Upload video
      await this.uploadVideo(mediaUpload.uploadUrl, post.videoUrl);

      // Step 3: Wait for processing
      await this.pollMediaStatus(mediaUpload.mediaId);

      // Step 4: Create pin with video
      const body = {
        board_id: this.boardId,
        title,
        description,
        media_source: {
          source_type: 'video_id',
          media_id: mediaUpload.mediaId,
        },
      };

      const pin = await this.createPin(body);

      return {
        success: true,
        platform: 'pinterest',
        externalPostId: pin.id,
        permalink: `https://pinterest.com/pin/${pin.id}/`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'pinterest',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${PINTEREST_API}/user_account`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ──

  private buildMeta(caption: string, hashtags?: string[]): { title: string; description: string } {
    const firstLine = (caption.split('\n')[0] ?? caption).trim();
    const title = firstLine.length > 100 ? firstLine.slice(0, 97) + '...' : firstLine;

    const tags = hashtags?.length
      ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    let description = (caption + tags).trim();
    if (description.length > 500) description = description.slice(0, 497) + '...';

    return { title, description };
  }

  private async createPin(body: Record<string, any>): Promise<{ id: string }> {
    const res = await fetch(`${PINTEREST_API}/pins`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Pinterest create pin failed ${res.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    return { id: data.id };
  }

  private async registerMedia(): Promise<{ mediaId: string; uploadUrl: string }> {
    const res = await fetch(`${PINTEREST_API}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ media_type: 'video' }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Pinterest media register failed: ${res.status}`);
    const data: any = await res.json();
    return {
      mediaId: data.media_id,
      uploadUrl: data.upload_url,
    };
  }

  private async uploadVideo(uploadUrl: string, sourceUrl: string): Promise<void> {
    const mediaRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(120000) });
    if (!mediaRes.ok) throw new Error(`Failed to download video from ${sourceUrl}`);
    const buffer = Buffer.from(await mediaRes.arrayBuffer());

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: buffer,
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) throw new Error(`Pinterest video upload failed: ${res.status}`);
  }

  private async pollMediaStatus(mediaId: string, maxWait = 120000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const res = await fetch(`${PINTEREST_API}/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const data: any = await res.json();
      if (data.status === 'succeeded') return;
      if (data.status === 'failed') throw new Error('Pinterest video processing failed');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
