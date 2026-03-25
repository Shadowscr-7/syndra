// ============================================================
// TikTok Publisher — Content Publishing API (OAuth 2.0)
// https://developers.tiktok.com/doc/content-publishing-api-get-started
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

const TIKTOK_API = 'https://open.tiktokapis.com/v2';

export interface TikTokCredentials {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** Refresh token */
  refreshToken?: string;
  /** TikTok open ID */
  openId?: string;
  /** Username */
  username?: string;
}

export class TikTokPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly openId?: string;

  constructor(credentials: TikTokCredentials) {
    if (!credentials.accessToken) throw new Error('TikTokPublisher requires accessToken');
    this.accessToken = credentials.accessToken;
    this.openId = credentials.openId;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // TikTok photo mode: upload images as a photo post
      const publishId = await this.createPhotoPost(caption, [post.imageUrl]);

      return {
        success: true,
        platform: 'tiktok',
        externalPostId: publishId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'tiktok',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // TikTok supports photo carousels (up to 35 images)
      const publishId = await this.createPhotoPost(caption, post.imageUrls.slice(0, 35));

      return {
        success: true,
        platform: 'tiktok',
        externalPostId: publishId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'tiktok',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // Step 1: Initialize video upload
      const { publishId, uploadUrl } = await this.initVideoUpload(caption);

      // Step 2: Upload video binary
      await this.uploadVideo(uploadUrl, post.videoUrl);

      // Step 3: Poll publish status
      await this.pollPublishStatus(publishId);

      return {
        success: true,
        platform: 'tiktok',
        externalPostId: publishId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'tiktok',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${TIKTOK_API}/user/info/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ──

  private buildText(caption: string, hashtags?: string[]): string {
    const tags = hashtags?.length
      ? ' ' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const full = (caption + tags).trim();
    return full.length > 2200 ? full.slice(0, 2197) + '...' : full;
  }

  private async createPhotoPost(title: string, imageUrls: string[]): Promise<string> {
    const body = {
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        auto_add_music: true,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_images: imageUrls,
      },
      media_type: 'PHOTO',
    };

    const res = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`TikTok photo publish failed ${res.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    if (data.error?.code !== 'ok' && data.error?.code) {
      throw new Error(`TikTok error: ${data.error.message || data.error.code}`);
    }
    return data.data?.publish_id || '';
  }

  private async initVideoUpload(title: string): Promise<{ publishId: string; uploadUrl: string }> {
    const body = {
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: 0, // Will be determined on upload
        chunk_size: 10000000, // 10MB chunks
        total_chunk_count: 1,
      },
      media_type: 'VIDEO',
    };

    const res = await fetch(`${TIKTOK_API}/post/publish/inbox/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`TikTok video init failed ${res.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    return {
      publishId: data.data?.publish_id || '',
      uploadUrl: data.data?.upload_url || '',
    };
  }

  private async uploadVideo(uploadUrl: string, sourceUrl: string): Promise<void> {
    const mediaRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(120000) });
    if (!mediaRes.ok) throw new Error(`Failed to download video from ${sourceUrl}`);
    const buffer = Buffer.from(await mediaRes.arrayBuffer());

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${buffer.length - 1}/${buffer.length}`,
      },
      body: buffer,
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) throw new Error(`TikTok video upload failed: ${res.status}`);
  }

  private async pollPublishStatus(publishId: string, maxWait = 120000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id: publishId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const data: any = await res.json();
      const status = data.data?.status;
      if (status === 'PUBLISH_COMPLETE') return;
      if (status === 'FAILED') throw new Error(`TikTok publish failed: ${data.data?.fail_reason || 'unknown'}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
