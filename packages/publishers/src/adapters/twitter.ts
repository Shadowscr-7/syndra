// ============================================================
// Twitter/X Publisher — OAuth 2.0 with PKCE
// API v2: https://developer.x.com/en/docs/x-api
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

const TWITTER_API = 'https://api.x.com/2';
const UPLOAD_API = 'https://upload.twitter.com/1.1';

export interface TwitterCredentials {
  /** OAuth 2.0 access token (user-context) */
  accessToken: string;
  /** Refresh token for auto-renewal */
  refreshToken?: string;
  /** Twitter user ID */
  userId?: string;
  /** Twitter username */
  username?: string;
}

export class TwitterPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly userId?: string;

  constructor(credentials: TwitterCredentials) {
    if (!credentials.accessToken) {
      throw new Error('TwitterPublisher requires accessToken');
    }
    this.accessToken = credentials.accessToken;
    this.userId = credentials.userId;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // Step 1: Upload media
      const mediaId = await this.uploadMedia(post.imageUrl, 'image');

      // Step 2: Create tweet with media
      const tweet = await this.createTweet(caption, [mediaId]);

      return {
        success: true,
        platform: 'twitter',
        externalPostId: tweet.id,
        permalink: tweet.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // Twitter supports up to 4 images per tweet
      const urls = post.imageUrls.slice(0, 4);
      const mediaIds: string[] = [];
      for (const url of urls) {
        mediaIds.push(await this.uploadMedia(url, 'image'));
      }

      const tweet = await this.createTweet(caption, mediaIds);

      return {
        success: true,
        platform: 'twitter',
        externalPostId: tweet.id,
        permalink: tweet.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      const mediaId = await this.uploadMedia(post.videoUrl, 'video');
      const tweet = await this.createTweet(caption, [mediaId]);

      return {
        success: true,
        platform: 'twitter',
        externalPostId: tweet.id,
        permalink: tweet.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${TWITTER_API}/users/me`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
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
      ? '\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const full = (caption + tags).trim();
    return full.length > 280 ? full.slice(0, 277) + '...' : full;
  }

  private async createTweet(text: string, mediaIds: string[]): Promise<{ id: string; permalink: string }> {
    const body: Record<string, any> = { text };
    if (mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }

    const res = await fetch(`${TWITTER_API}/tweets`, {
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
      throw new Error(`Twitter API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const tweetId = data.data?.id;
    return {
      id: tweetId,
      permalink: `https://x.com/i/status/${tweetId}`,
    };
  }

  private async uploadMedia(url: string, type: 'image' | 'video'): Promise<string> {
    // Download media first
    const mediaRes = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!mediaRes.ok) throw new Error(`Failed to download media from ${url}`);
    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    const contentType = mediaRes.headers.get('content-type') || (type === 'video' ? 'video/mp4' : 'image/jpeg');

    if (type === 'video') {
      return this.chunkedUpload(buffer, contentType);
    }

    // Simple upload for images
    const form = new FormData();
    form.append('media_data', buffer.toString('base64'));
    form.append('media_category', 'tweet_image');

    const res = await fetch(`${UPLOAD_API}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Media upload failed ${res.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    return data.media_id_string;
  }

  private async chunkedUpload(buffer: Buffer, contentType: string): Promise<string> {
    // INIT
    const initParams = new URLSearchParams({
      command: 'INIT',
      total_bytes: buffer.length.toString(),
      media_type: contentType,
      media_category: 'tweet_video',
    });

    const initRes = await fetch(`${UPLOAD_API}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: initParams.toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!initRes.ok) throw new Error(`Upload INIT failed: ${initRes.status}`);
    const initData: any = await initRes.json();
    const mediaId = initData.media_id_string;

    // APPEND (5MB chunks)
    const chunkSize = 5 * 1024 * 1024;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', String(Math.floor(i / chunkSize)));
      form.append('media_data', chunk.toString('base64'));

      const appendRes = await fetch(`${UPLOAD_API}/media/upload.json`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      if (!appendRes.ok) throw new Error(`Upload APPEND failed: ${appendRes.status}`);
    }

    // FINALIZE
    const finalParams = new URLSearchParams({ command: 'FINALIZE', media_id: mediaId });
    const finalRes = await fetch(`${UPLOAD_API}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: finalParams.toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!finalRes.ok) throw new Error(`Upload FINALIZE failed: ${finalRes.status}`);

    // Poll processing status
    await this.pollMediaProcessing(mediaId);

    return mediaId;
  }

  private async pollMediaProcessing(mediaId: string, maxWait = 120000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const res = await fetch(
        `${UPLOAD_API}/media/upload.json?command=STATUS&media_id=${mediaId}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` }, signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) break;
      const data: any = await res.json();
      const state = data.processing_info?.state;
      if (!state || state === 'succeeded') return;
      if (state === 'failed') throw new Error('Video processing failed on Twitter');
      const waitMs = (data.processing_info?.check_after_secs || 5) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}
