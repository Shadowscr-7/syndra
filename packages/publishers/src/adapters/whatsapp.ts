// ============================================================
// WhatsApp Status Publisher — via Evolution API v2
// El usuario vincula su WhatsApp escaneando un QR desde Evolution API.
// Publica en el WhatsApp Status (Stories) del usuario.
// ============================================================

import type { PublisherAdapter, ImagePost, CarouselPost, VideoPost, PublishResult } from '../types';

export interface WhatsAppCredentials {
  /** URL de la instancia de Evolution API (ej: https://evo.example.com) */
  instanceUrl: string;
  /** API Key global o por instancia de Evolution API */
  apiKey: string;
  /** Nombre de la instancia creada en Evolution API */
  instanceName: string;
}

export class WhatsAppPublisher implements PublisherAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(credentials: WhatsAppCredentials) {
    this.baseUrl = credentials.instanceUrl.replace(/\/$/, '');
    this.apiKey = credentials.apiKey;
    this.instanceName = credentials.instanceName;
  }

  /**
   * Publica una imagen en el WhatsApp Status.
   */
  async publishImage(post: ImagePost): Promise<PublishResult> {
    try {
      const caption = post.caption + (post.hashtags?.length ? `\n\n${post.hashtags.join(' ')}` : '');

      const res = await this.evoPost('message/sendStatus', {
        type: 'image',
        content: {
          imageMessage: {
            url: post.imageUrl,
            caption: caption.slice(0, 1024),
          },
        },
        statusJidList: 'all',
        allContacts: true,
      });

      return {
        success: true,
        platform: 'whatsapp',
        externalPostId: res.key?.id || `status_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'whatsapp',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Publica múltiples imágenes como estados consecutivos.
   * WhatsApp Status no tiene carrusel nativo — publica una por una.
   */
  async publishCarousel(post: CarouselPost): Promise<PublishResult> {
    try {
      const results: string[] = [];
      for (const imageUrl of post.imageUrls.slice(0, 5)) {
        const res = await this.evoPost('message/sendStatus', {
          type: 'image',
          content: {
            imageMessage: {
              url: imageUrl,
              caption: results.length === 0 ? post.caption.slice(0, 1024) : '',
            },
          },
          statusJidList: 'all',
          allContacts: true,
        });
        results.push(res.key?.id || 'ok');
      }

      return {
        success: true,
        platform: 'whatsapp',
        externalPostId: results.join(','),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'whatsapp',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Publica un video en el WhatsApp Status (máx 30s).
   */
  async publishVideo(post: VideoPost): Promise<PublishResult> {
    try {
      const caption = post.caption + (post.hashtags?.length ? `\n\n${post.hashtags.join(' ')}` : '');

      const res = await this.evoPost('message/sendStatus', {
        type: 'video',
        content: {
          videoMessage: {
            url: post.videoUrl,
            caption: caption.slice(0, 1024),
          },
        },
        statusJidList: 'all',
        allContacts: true,
      });

      return {
        success: true,
        platform: 'whatsapp',
        externalPostId: res.key?.id || `status_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'whatsapp',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.evoGet('instance/connectionState');
      return res.state === 'open';
    } catch {
      return false;
    }
  }

  // ── Static helpers for QR pairing flow ────────────────

  /**
   * Crea una instancia en Evolution API.
   * Se llama una vez cuando el usuario configura WhatsApp.
   */
  static async createInstance(baseUrl: string, apiKey: string, instanceName: string): Promise<{ qrCode?: string; pairingCode?: string }> {
    const url = `${baseUrl.replace(/\/$/, '')}/instance/create`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        rejectCall: false,
        alwaysOnline: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data: any = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    return {
      qrCode: data.qrcode?.base64 || data.qrcode,
      pairingCode: data.pairingCode,
    };
  }

  /**
   * Obtiene el QR code actual para una instancia existente.
   */
  static async getQrCode(baseUrl: string, apiKey: string, instanceName: string): Promise<{ qrCode?: string; state: string }> {
    const url = `${baseUrl.replace(/\/$/, '')}/instance/connect/${instanceName}`;
    const res = await fetch(url, {
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    const data: any = await res.json();
    return {
      qrCode: data.base64 || data.qrcode,
      state: data.state || 'unknown',
    };
  }

  /**
   * Verifica el estado de conexión de la instancia.
   */
  static async checkConnection(baseUrl: string, apiKey: string, instanceName: string): Promise<{ connected: boolean; state: string; number?: string }> {
    const url = `${baseUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`;
    const res = await fetch(url, {
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    const data: any = await res.json();
    return {
      connected: data.state === 'open',
      state: data.state || 'unknown',
      number: data.instance?.wuid?.split('@')[0],
    };
  }

  // ── Private ───────────────────────────────────────────

  private async evoPost(endpoint: string, body: any): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}/${this.instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const data: any = await res.json();
    if (!res.ok) throw new Error(data.message || `Evolution API error: HTTP ${res.status}`);
    return data;
  }

  private async evoGet(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}/${this.instanceName}`;
    const res = await fetch(url, {
      headers: { 'apikey': this.apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    const data: any = await res.json();
    if (!res.ok) throw new Error(data.message || `Evolution API error: HTTP ${res.status}`);
    return data;
  }
}
