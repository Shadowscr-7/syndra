// ============================================================
// Discord Webhook Publisher — Publica en un canal de Discord via webhook
// No requiere bot, solo un Webhook URL del canal.
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

export interface DiscordWebhookConfig {
  /** Webhook URL del canal (Settings > Integrations > Webhooks) */
  webhookUrl: string;
  /** Nombre que aparece como autor del mensaje (default: 'Syndra') */
  username?: string;
  /** Avatar URL del webhook (opcional) */
  avatarUrl?: string;
}

/**
 * Publisher para Discord via Webhooks.
 * Publica el contenido en un canal de Discord con embed rico.
 */
export class DiscordPublisher implements PublisherAdapter {
  private readonly webhookUrl: string;
  private readonly username: string;
  private readonly avatarUrl?: string;

  constructor(config: DiscordWebhookConfig) {
    this.webhookUrl = config.webhookUrl;
    this.username = config.username ?? 'Syndra';
    this.avatarUrl = config.avatarUrl;
  }

  async publishImage(post: ImagePost): Promise<PublishResult> {
    return this.sendToDiscord({
      caption: post.caption,
      hashtags: post.hashtags,
      imageUrls: [post.imageUrl],
      type: 'image',
    });
  }

  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    return this.sendToDiscord({
      caption: post.caption,
      hashtags: post.hashtags,
      imageUrls: post.imageUrls,
      type: 'carousel',
    });
  }

  async publishVideo(post: VideoPost): Promise<PublishResult> {
    return this.sendToDiscord({
      caption: post.caption,
      hashtags: post.hashtags,
      videoUrl: post.videoUrl,
      type: 'video',
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Discord webhooks can be validated with a GET request
      const res = await fetch(this.webhookUrl, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async sendToDiscord(opts: {
    caption: string;
    hashtags?: string[];
    imageUrls?: string[];
    videoUrl?: string;
    type: 'image' | 'carousel' | 'video';
  }): Promise<PublishResult> {
    const { caption, hashtags = [], imageUrls = [], videoUrl, type } = opts;

    // Build Discord message with embeds
    const hashtagText = hashtags.length > 0
      ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';

    const fullCaption = caption + hashtagText;

    // Format badge
    const typeBadge = type === 'carousel' ? '📸 Carrusel'
      : type === 'video' ? '🎬 Video'
      : '📷 Post';

    // Build embed(s)
    const embeds: Record<string, unknown>[] = [];

    // Main embed with text + first image
    const mainEmbed: Record<string, unknown> = {
      description: fullCaption.substring(0, 4096), // Discord limit
      color: 0x6C63FF, // Syndra purple
      footer: {
        text: `${typeBadge} • Publicado por Syndra`,
      },
      timestamp: new Date().toISOString(),
    };

    if (imageUrls.length > 0) {
      mainEmbed.image = { url: imageUrls[0] };
    }

    embeds.push(mainEmbed);

    // Additional images for carousel (Discord supports up to 10 embeds)
    if (imageUrls.length > 1) {
      for (let i = 1; i < Math.min(imageUrls.length, 10); i++) {
        embeds.push({
          url: 'https://syndra.dev', // Same URL groups embeds together
          image: { url: imageUrls[i] },
        });
      }
    }

    // Build webhook payload
    const payload: Record<string, unknown> = {
      username: this.username,
      embeds,
    };

    if (this.avatarUrl) {
      payload.avatar_url = this.avatarUrl;
    }

    // If video, add as content link (Discord auto-embeds videos)
    if (videoUrl) {
      payload.content = videoUrl;
    }

    try {
      // Use ?wait=true to get the message ID back
      const url = this.webhookUrl + (this.webhookUrl.includes('?') ? '&wait=true' : '?wait=true');

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Discord webhook error ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as Record<string, unknown>;
      const messageId = String(data.id ?? '');
      const channelId = String(data.channel_id ?? '');

      return {
        success: true,
        platform: 'discord' as const,
        externalPostId: messageId,
        permalink: channelId
          ? `https://discord.com/channels/@me/${channelId}/${messageId}`
          : undefined,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'discord' as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
