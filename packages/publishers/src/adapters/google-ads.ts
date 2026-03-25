// ============================================================
// Google Ads Publisher — Search/Display/Performance Max campaigns
// Reutiliza credenciales GOOGLE (mismo OAuth que YouTube, scopes extendidos)
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

export interface GoogleAdsCredentials {
  /** OAuth 2.0 access token (same as YouTube, with adwords scope) */
  accessToken: string;
  /** OAuth 2.0 refresh token */
  refreshToken?: string;
  /** Google Ads customer/account ID (format: 123-456-7890 or 1234567890) */
  customerId: string;
  /** Developer token from Google Ads API Center */
  developerToken: string;
  /** Optional: Manager account ID if using MCC */
  managerCustomerId?: string;
}

const ADS_API = 'https://googleads.googleapis.com/v17';

export class GoogleAdsPublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly customerId: string;
  private readonly developerToken: string;
  private readonly managerCustomerId?: string;

  constructor(credentials: GoogleAdsCredentials) {
    this.accessToken = credentials.accessToken;
    this.customerId = credentials.customerId.replace(/-/g, '');
    this.developerToken = credentials.developerToken;
    this.managerCustomerId = credentials.managerCustomerId?.replace(/-/g, '');
  }

  /**
   * Creates asset(s) for a responsive display ad with a single image.
   * Creates: image asset + responsive display ad asset group.
   */
  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      // 1. Create image asset
      const imageAsset = await this.createAsset({
        type: 'IMAGE',
        imageUrl: post.imageUrl,
        name: `Image ${Date.now()}`,
      });

      // 2. Create responsive display ad with text + image
      const headlines = this.extractHeadlines(post.caption);
      const descriptions = this.extractDescriptions(post.caption);

      const adId = await this.createResponsiveDisplayAd({
        headlines,
        descriptions,
        marketingImages: [imageAsset],
      });

      return {
        success: true,
        platform: 'google_ads',
        externalPostId: adId,
        permalink: `https://ads.google.com/aw/ads?campaignId=all&ocid=${this.customerId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'google_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates multiple image assets for a responsive display ad.
   */
  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const imageAssets: string[] = [];
      for (const url of post.imageUrls.slice(0, 15)) {
        const asset = await this.createAsset({
          type: 'IMAGE',
          imageUrl: url,
          name: `Image ${Date.now()}_${imageAssets.length}`,
        });
        imageAssets.push(asset);
      }

      const headlines = this.extractHeadlines(post.caption);
      const descriptions = this.extractDescriptions(post.caption);

      const adId = await this.createResponsiveDisplayAd({
        headlines,
        descriptions,
        marketingImages: imageAssets,
      });

      return {
        success: true,
        platform: 'google_ads',
        externalPostId: adId,
        permalink: `https://ads.google.com/aw/ads?campaignId=all&ocid=${this.customerId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'google_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates a video asset for YouTube video ads.
   */
  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const videoAsset = await this.createAsset({
        type: 'YOUTUBE_VIDEO',
        youtubeVideoId: this.extractYouTubeId(post.videoUrl) || post.videoUrl,
        name: `Video ${Date.now()}`,
      });

      return {
        success: true,
        platform: 'google_ads',
        externalPostId: videoAsset,
        permalink: `https://ads.google.com/aw/ads?campaignId=all&ocid=${this.customerId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'google_ads',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${ADS_API}/customers/${this.customerId}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
    };
    if (this.managerCustomerId) {
      h['login-customer-id'] = this.managerCustomerId;
    }
    return h;
  }

  private async createAsset(opts: {
    type: 'IMAGE' | 'YOUTUBE_VIDEO';
    imageUrl?: string;
    youtubeVideoId?: string;
    name: string;
  }): Promise<string> {
    const asset: any = { name: opts.name };

    if (opts.type === 'IMAGE' && opts.imageUrl) {
      // Download and base64-encode image
      const imgRes = await fetch(opts.imageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      asset.imageAsset = { data: buf.toString('base64') };
    } else if (opts.type === 'YOUTUBE_VIDEO' && opts.youtubeVideoId) {
      asset.youtubeVideoAsset = { youtubeVideoId: opts.youtubeVideoId };
    }

    const res = await fetch(`${ADS_API}/customers/${this.customerId}/assets:mutate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        operations: [{ create: asset }],
      }),
    });

    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    return data.results?.[0]?.resourceName || 'created';
  }

  private async createResponsiveDisplayAd(opts: {
    headlines: string[];
    descriptions: string[];
    marketingImages: string[];
  }): Promise<string> {
    const ad: any = {
      responsiveDisplayAd: {
        headlines: opts.headlines.map((text) => ({ text })),
        descriptions: opts.descriptions.map((text) => ({ text })),
        marketingImages: opts.marketingImages.map((asset) => ({ asset })),
      },
    };

    const res = await fetch(`${ADS_API}/customers/${this.customerId}/ads:mutate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        operations: [{ create: ad }],
      }),
    });

    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    return data.results?.[0]?.resourceName || 'created';
  }

  private extractHeadlines(caption: string): string[] {
    const firstLine = (caption.split('\n')[0] ?? caption).trim();
    // Split into chunks of max 30 chars
    const headlines = [firstLine.slice(0, 30)];
    if (firstLine.length > 30) headlines.push(firstLine.slice(30, 60));
    return headlines;
  }

  private extractDescriptions(caption: string): string[] {
    const lines = caption.split('\n').filter((l) => l.trim());
    return [lines.join(' ').slice(0, 90)];
  }

  private extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
  }
}
