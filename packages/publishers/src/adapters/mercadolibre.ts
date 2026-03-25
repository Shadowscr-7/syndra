// ============================================================
// Mercado Libre Publisher — Publicación de listings via API
// OAuth 2.0: https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

export interface MercadoLibreCredentials {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** OAuth 2.0 refresh token */
  refreshToken?: string;
  /** ML user ID */
  userId: string;
  /** ML user nickname */
  nickname?: string;
  /** Site ID (ej: MLA para Argentina, MLM para México, MLB para Brasil) */
  siteId?: string;
}

const ML_API = 'https://api.mercadolibre.com';

export class MercadoLibrePublisher implements PublisherAdapter {
  private readonly accessToken: string;
  private readonly userId: string;
  private readonly siteId: string;

  constructor(credentials: MercadoLibreCredentials) {
    this.accessToken = credentials.accessToken;
    this.userId = credentials.userId;
    this.siteId = credentials.siteId || 'MLA';
  }

  /**
   * Crea un listing (publicación) con una imagen.
   * En Mercado Libre, una "publicación" es un listing de producto.
   * Puede usarse para contenido promocional con listing_type_id = "free".
   */
  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const { title, description } = this.parseCaption(post.caption);

      // First upload the image to ML
      const pictureId = await this.uploadPicture(post.imageUrl);

      const body = {
        title: title.slice(0, 60),
        category_id: await this.predictCategory(title),
        price: 1, // Mínimo para listing informativo
        currency_id: this.getCurrency(),
        available_quantity: 1,
        buying_mode: 'buy_it_now' as const,
        listing_type_id: 'free',
        condition: 'new' as const,
        description: { plain_text: description },
        pictures: [{ id: pictureId }],
        channels: ['marketplace'],
      };

      const res = await this.mlPost('items', body);

      return {
        success: true,
        platform: 'mercadolibre',
        externalPostId: res.id,
        permalink: res.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'mercadolibre',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Crea un listing con múltiples imágenes.
   */
  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const { title, description } = this.parseCaption(post.caption);

      const pictures: { id: string }[] = [];
      for (const url of post.imageUrls.slice(0, 12)) {
        const id = await this.uploadPicture(url);
        pictures.push({ id });
      }

      const body = {
        title: title.slice(0, 60),
        category_id: await this.predictCategory(title),
        price: 1,
        currency_id: this.getCurrency(),
        available_quantity: 1,
        buying_mode: 'buy_it_now' as const,
        listing_type_id: 'free',
        condition: 'new' as const,
        description: { plain_text: description },
        pictures,
        channels: ['marketplace'],
      };

      const res = await this.mlPost('items', body);

      return {
        success: true,
        platform: 'mercadolibre',
        externalPostId: res.id,
        permalink: res.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'mercadolibre',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Mercado Libre no soporta video directo en listings desde la API.
   * Publica como imagen con link al video en la descripción.
   */
  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const { title, description } = this.parseCaption(post.caption);
      const fullDescription = `${description}\n\n📹 Video: ${post.videoUrl}`;

      const pictures: { id: string }[] = [];
      if (post.thumbnailUrl) {
        const id = await this.uploadPicture(post.thumbnailUrl);
        pictures.push({ id });
      }

      const body = {
        title: title.slice(0, 60),
        category_id: await this.predictCategory(title),
        price: 1,
        currency_id: this.getCurrency(),
        available_quantity: 1,
        buying_mode: 'buy_it_now' as const,
        listing_type_id: 'free',
        condition: 'new' as const,
        description: { plain_text: fullDescription },
        pictures: pictures.length ? pictures : undefined,
        channels: ['marketplace'],
      };

      const res = await this.mlPost('items', body);

      return {
        success: true,
        platform: 'mercadolibre',
        externalPostId: res.id,
        permalink: res.permalink,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'mercadolibre',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${ML_API}/users/me`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────

  private async uploadPicture(imageUrl: string): Promise<string> {
    const res = await fetch(`${ML_API}/pictures/items/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: imageUrl }),
      signal: AbortSignal.timeout(30_000),
    });

    const data: any = await res.json();
    if (data.error) throw new Error(data.error);
    return data.id;
  }

  private async predictCategory(title: string): Promise<string> {
    try {
      const res = await fetch(
        `${ML_API}/sites/${this.siteId}/domain_discovery/search?q=${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(5_000) },
      );
      const data: any = await res.json();
      if (data[0]?.category_id) return data[0].category_id;
    } catch { /* fallback */ }
    // Fallback: "Otros" category
    return this.siteId === 'MLA' ? 'MLA1743' : 'MLM1743';
  }

  private parseCaption(caption: string): { title: string; description: string } {
    const lines = caption.split('\n').filter((l) => l.trim());
    const title = (lines[0] ?? caption).trim().slice(0, 60);
    const description = lines.slice(1).join('\n').trim() || caption;
    return { title, description };
  }

  private getCurrency(): string {
    const map: Record<string, string> = {
      MLA: 'ARS', MLB: 'BRL', MLM: 'MXN', MLC: 'CLP',
      MLU: 'UYU', MCO: 'COP', MPE: 'PEN', MLV: 'VES',
    };
    return map[this.siteId] ?? 'USD';
  }

  private async mlPost(endpoint: string, body: any): Promise<any> {
    const res = await fetch(`${ML_API}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const data: any = await res.json();
    if (data.error) throw new Error(`${data.error}: ${data.message || ''}`);
    return data;
  }
}
