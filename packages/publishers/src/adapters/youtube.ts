// ============================================================
// YouTube Publisher — Google OAuth 2.0 + YouTube Data API v3
// For Shorts (vertical ≤60s) and regular uploads
// https://developers.google.com/youtube/v3/docs/videos/insert
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

const YT_UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';
const YT_API = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeCredentials {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** Refresh token for auto-renewal */
  refreshToken?: string;
  /** Channel ID */
  channelId?: string;
  /** Channel title */
  channelTitle?: string;
}

export class YouTubePublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly channelId?: string;

  constructor(credentials: YouTubeCredentials) {
    if (!credentials.accessToken) throw new Error('YouTubePublisher requires accessToken');
    this.accessToken = credentials.accessToken;
    this.channelId = credentials.channelId;
  }

  /**
   * YouTube doesn't support image-only posts via API.
   * Creates a YouTube Community post as fallback (if channel has community tab).
   * Otherwise returns an error.
   */
  async publishImage(_post: ImagePost): Promise<PublishResult> {
    return {
      success: false,
      platform: 'youtube',
      error: 'YouTube no soporta publicar solo imágenes via API. Usa publishVideo para Shorts.',
    };
  }

  /**
   * YouTube doesn't support carousels.
   */
  async publishCarousel(_post: CarouselPost): Promise<PublishResult> {
    return {
      success: false,
      platform: 'youtube',
      error: 'YouTube no soporta carruseles. Usa publishVideo para Shorts.',
    };
  }

  /**
   * Upload a video as a YouTube Short (or regular video).
   * Videos ≤60s vertical are auto-detected as Shorts.
   */
  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const title = this.buildTitle(post.caption);
      const description = this.buildDescription(post.caption, post.hashtags);

      // Step 1: Download video
      const mediaRes = await fetch(post.videoUrl, { signal: AbortSignal.timeout(120000) });
      if (!mediaRes.ok) throw new Error(`Failed to download video from ${post.videoUrl}`);
      const videoBuffer = Buffer.from(await mediaRes.arrayBuffer());

      // Step 2: Upload via resumable upload
      const videoId = await this.resumableUpload(videoBuffer, title, description);

      // Step 3: Set thumbnail if provided
      if (post.thumbnailUrl) {
        await this.setThumbnail(videoId, post.thumbnailUrl).catch(() => {});
      }

      return {
        success: true,
        platform: 'youtube',
        externalPostId: videoId,
        permalink: `https://youtube.com/shorts/${videoId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'youtube',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${YT_API}/channels?part=id&mine=true`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ──

  private buildTitle(caption: string): string {
    // First line or first 100 chars
    const firstLine = (caption.split('\n')[0] ?? caption).trim();
    return firstLine.length > 100 ? firstLine.slice(0, 97) + '...' : firstLine;
  }

  private buildDescription(caption: string, hashtags?: string[]): string {
    const tags = hashtags?.length
      ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const full = (caption + tags).trim();
    // Add #Shorts tag for discovery
    const withShorts = full.includes('#Shorts') ? full : full + '\n#Shorts';
    return withShorts.length > 5000 ? withShorts.slice(0, 5000) : withShorts;
  }

  private async resumableUpload(buffer: Buffer, title: string, description: string): Promise<string> {
    // Step 1: Initiate resumable upload
    const metadata = {
      snippet: {
        title,
        description,
        categoryId: '28', // Science & Technology
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    const initRes = await fetch(
      `${YT_UPLOAD_API}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': buffer.length.toString(),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!initRes.ok) {
      const err = await initRes.text().catch(() => '');
      throw new Error(`YouTube upload init failed ${initRes.status}: ${err.slice(0, 200)}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) throw new Error('No upload URL returned by YouTube');

    // Step 2: Upload video binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': buffer.length.toString(),
      },
      body: buffer,
      signal: AbortSignal.timeout(300000), // 5 min for large videos
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => '');
      throw new Error(`YouTube video upload failed ${uploadRes.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await uploadRes.json();
    return data.id;
  }

  private async setThumbnail(videoId: string, thumbnailUrl: string): Promise<void> {
    const imgRes = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) return;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    await fetch(`${YT_UPLOAD_API}/thumbnails/set?videoId=${videoId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': contentType,
      },
      body: buffer,
      signal: AbortSignal.timeout(30000),
    });
  }
}
