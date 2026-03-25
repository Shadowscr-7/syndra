// ============================================================
// Meta Ads Publisher — Facebook/Instagram Ads via Marketing API
// Reutiliza credenciales META (mismo OAuth, scopes extendidos)
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

export interface MetaAdsCredentials {
  /** Long-lived user access token (same as Meta social, with ads_management scope) */
  accessToken: string;
  /** Ad Account ID (format: act_XXXXXXX) */
  adAccountId: string;
  /** Optional page ID for page-backed ads */
  pageId?: string;
}

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export class MetaAdsPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly adAccountId: string;
  private readonly pageId?: string;

  constructor(credentials: MetaAdsCredentials) {
    this.accessToken = credentials.accessToken;
    this.adAccountId = credentials.adAccountId;
    this.pageId = credentials.pageId;
  }

  /**
   * Creates an ad creative with a single image.
   * Does NOT create a full campaign — just the creative + ad draft.
   */
  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      // 1. Upload image as ad creative image
      const imageHash = await this.uploadAdImage(post.imageUrl);

      // 2. Create ad creative
      const creativeId = await this.createCreative({
        message: post.caption,
        imageHash,
        linkDescription: post.hashtags?.join(' '),
      });

      return {
        success: true,
        platform: 'meta_ads',
        externalPostId: creativeId,
        permalink: `https://business.facebook.com/adsmanager/manage/ads?act=${this.adAccountId.replace('act_', '')}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'meta_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates an ad creative with multiple images (carousel ad).
   */
  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const imageHashes: string[] = [];
      for (const url of post.imageUrls.slice(0, 10)) {
        const hash = await this.uploadAdImage(url);
        imageHashes.push(hash);
      }

      const childAttachments = imageHashes.map((hash) => ({
        image_hash: hash,
        link: `https://www.facebook.com/${this.pageId || ''}`,
      }));

      const creativeRes = await this.graphPost(`${this.adAccountId}/adcreatives`, {
        name: `Carousel ${Date.now()}`,
        object_story_spec: JSON.stringify({
          page_id: this.pageId,
          link_data: {
            message: post.caption,
            child_attachments: childAttachments,
            multi_share_optimized: true,
          },
        }),
      });

      return {
        success: true,
        platform: 'meta_ads',
        externalPostId: creativeRes.id,
        permalink: `https://business.facebook.com/adsmanager/manage/ads?act=${this.adAccountId.replace('act_', '')}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'meta_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates an ad creative with a video.
   */
  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      // 1. Upload video to ad account
      const videoId = await this.uploadAdVideo(post.videoUrl);

      // 2. Create creative
      const creativeRes = await this.graphPost(`${this.adAccountId}/adcreatives`, {
        name: `Video Ad ${Date.now()}`,
        object_story_spec: JSON.stringify({
          page_id: this.pageId,
          video_data: {
            video_id: videoId,
            message: post.caption,
            image_url: post.thumbnailUrl || undefined,
          },
        }),
      });

      return {
        success: true,
        platform: 'meta_ads',
        externalPostId: creativeRes.id,
        permalink: `https://business.facebook.com/adsmanager/manage/ads?act=${this.adAccountId.replace('act_', '')}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'meta_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Verify ad account access
      const res = await fetch(`${GRAPH_API}/${this.adAccountId}?fields=name,account_status&access_token=${this.accessToken}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return false;
      const data: any = await res.json();
      // account_status 1 = active
      return data.account_status === 1;
    } catch {
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────

  private async uploadAdImage(imageUrl: string): Promise<string> {
    // Download image, then upload via form-data
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const form = new FormData();
    form.append('access_token', this.accessToken);
    form.append('filename', new Blob([buffer]), 'image.jpg');

    const res = await fetch(`${GRAPH_API}/${this.adAccountId}/adimages`, {
      method: 'POST',
      body: form,
    });

    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message);

    // Response: { images: { "image.jpg": { hash: "xxx" } } }
    const images = data.images || {};
    const firstKey = Object.keys(images)[0];
    if (!firstKey) throw new Error('No image hash returned');
    return images[firstKey].hash;
  }

  private async uploadAdVideo(videoUrl: string): Promise<string> {
    const res = await this.graphPost(`${this.adAccountId}/advideos`, {
      file_url: videoUrl,
    });
    if (!res.id) throw new Error('No video ID returned');
    return res.id;
  }

  private async createCreative(opts: { message: string; imageHash: string; linkDescription?: string }): Promise<string> {
    const res = await this.graphPost(`${this.adAccountId}/adcreatives`, {
      name: `Creative ${Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: this.pageId,
        link_data: {
          message: opts.message,
          image_hash: opts.imageHash,
          link: `https://www.facebook.com/${this.pageId || ''}`,
          description: opts.linkDescription,
        },
      }),
    });
    return res.id;
  }

  private async graphPost(endpoint: string, params: Record<string, any>): Promise<any> {
    const url = `${GRAPH_API}/${endpoint}`;
    const body = new URLSearchParams();
    body.set('access_token', this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body.set(k, String(v));
    }

    const res = await fetch(url, { method: 'POST', body });
    const data = await res.json();
    if ((data as any).error) throw new Error((data as any).error.message);
    return data;
  }
}
