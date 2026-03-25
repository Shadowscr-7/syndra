// ============================================================
// LinkedIn Publisher — OAuth 2.0 + Community Management API
// https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

const LINKEDIN_API = 'https://api.linkedin.com/rest';

export interface LinkedInCredentials {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** LinkedIn member URN (urn:li:person:xxx) or organization URN */
  authorUrn: string;
  /** Display name */
  name?: string;
}

export class LinkedInPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly authorUrn: string;

  constructor(credentials: LinkedInCredentials) {
    if (!credentials.accessToken) throw new Error('LinkedInPublisher requires accessToken');
    if (!credentials.authorUrn) throw new Error('LinkedInPublisher requires authorUrn');
    this.accessToken = credentials.accessToken;
    this.authorUrn = credentials.authorUrn;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // Step 1: Register image upload
      const asset = await this.initializeUpload('image');

      // Step 2: Upload binary
      await this.uploadBinary(asset.uploadUrl, post.imageUrl);

      // Step 3: Create post with image
      const postId = await this.createPost(caption, [{ id: asset.assetId, type: 'image' }]);

      return {
        success: true,
        platform: 'linkedin',
        externalPostId: postId,
        permalink: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'linkedin',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      // LinkedIn doesn't have native carousel — use multi-image post
      const assets: { id: string; type: string }[] = [];
      for (const url of post.imageUrls.slice(0, 20)) {
        const asset = await this.initializeUpload('image');
        await this.uploadBinary(asset.uploadUrl, url);
        assets.push({ id: asset.assetId, type: 'image' });
      }

      const postId = await this.createPost(caption, assets);

      return {
        success: true,
        platform: 'linkedin',
        externalPostId: postId,
        permalink: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'linkedin',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const caption = this.buildText(post.caption, post.hashtags);

      const asset = await this.initializeUpload('video');
      await this.uploadBinary(asset.uploadUrl, post.videoUrl);

      // Wait for video processing
      await this.pollVideoReady(asset.assetId);

      const postId = await this.createPost(caption, [{ id: asset.assetId, type: 'video' }]);

      return {
        success: true,
        platform: 'linkedin',
        externalPostId: postId,
        permalink: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'linkedin',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${LINKEDIN_API}/userinfo`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ──

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'LinkedIn-Version': '202402',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  private buildText(caption: string, hashtags?: string[]): string {
    const tags = hashtags?.length
      ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const full = (caption + tags).trim();
    return full.length > 3000 ? full.slice(0, 2997) + '...' : full;
  }

  private async initializeUpload(type: 'image' | 'video'): Promise<{ uploadUrl: string; assetId: string }> {
    if (type === 'image') {
      const res = await fetch(`${LINKEDIN_API}/images?action=initializeUpload`, {
        method: 'POST',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ initializeUploadRequest: { owner: this.authorUrn } }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`LinkedIn image init failed: ${res.status}`);
      const data: any = await res.json();
      return {
        uploadUrl: data.value.uploadUrl,
        assetId: data.value.image,
      };
    }

    // Video upload
    const res = await fetch(`${LINKEDIN_API}/videos?action=initializeUpload`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ initializeUploadRequest: { owner: this.authorUrn, fileSizeBytes: 0 } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`LinkedIn video init failed: ${res.status}`);
    const data: any = await res.json();
    return {
      uploadUrl: data.value.uploadInstructions?.[0]?.uploadUrl || data.value.uploadUrl,
      assetId: data.value.video,
    };
  }

  private async uploadBinary(uploadUrl: string, sourceUrl: string): Promise<void> {
    const mediaRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(60000) });
    if (!mediaRes.ok) throw new Error(`Failed to download media from ${sourceUrl}`);
    const buffer = Buffer.from(await mediaRes.arrayBuffer());

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: buffer,
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`LinkedIn upload failed: ${res.status}`);
  }

  private async createPost(text: string, media: { id: string; type: string }[]): Promise<string> {
    const content: any[] = media.map((m) => ({
      media: { id: m.id },
    }));

    const body: any = {
      author: this.authorUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED' },
      lifecycleState: 'PUBLISHED',
    };

    if (content.length === 1 && media[0]?.type === 'video') {
      body.content = { media: { id: media[0]!.id } };
    } else if (content.length > 0) {
      body.content = { multiImage: { images: content } };
    }

    const res = await fetch(`${LINKEDIN_API}/posts`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`LinkedIn create post failed ${res.status}: ${err.slice(0, 200)}`);
    }

    // Post ID is in the x-restli-id header
    const postId = res.headers.get('x-restli-id') || '';
    return postId;
  }

  private async pollVideoReady(videoUrn: string, maxWait = 120000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const res = await fetch(`${LINKEDIN_API}/videos/${encodeURIComponent(videoUrn)}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const data: any = await res.json();
      if (data.status === 'AVAILABLE') return;
      if (data.status === 'FAILED') throw new Error('LinkedIn video processing failed');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
