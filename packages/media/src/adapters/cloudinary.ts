// ============================================================
// Cloudinary Adapter — Optimización, transformación y CDN de media
// ============================================================

import { createHash } from 'crypto';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset?: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'pad';
  gravity?: 'auto' | 'face' | 'center';
  quality?: 'auto' | number;
  format?: 'webp' | 'jpg' | 'png' | 'avif';
  overlay?: string;
  effect?: string;
}

/**
 * Adapter para Cloudinary — upload, transformación y optimización.
 * Usa signed uploads con SHA-1 para autenticación segura.
 */
export class CloudinaryAdapter {
  private readonly config: CloudinaryConfig;
  private readonly uploadUrl: string;

  constructor(config: CloudinaryConfig) {
    this.config = config;
    this.uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
  }

  /**
   * Genera la firma SHA-1 para Cloudinary signed uploads.
   * Firma = SHA1(sorted params string + api_secret)
   */
  private generateSignature(params: Record<string, string>): string {
    // Solo se firman ciertos parámetros (excluir file, api_key, resource_type, cloud_name)
    const exclude = new Set(['file', 'api_key', 'resource_type', 'cloud_name', 'signature']);
    const sorted = Object.keys(params)
      .filter((k) => !exclude.has(k) && params[k] !== undefined && params[k] !== '')
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');

    return createHash('sha1')
      .update(sorted + this.config.apiSecret)
      .digest('hex');
  }

  /**
   * Sube una imagen (URL o base64) a Cloudinary con signed upload
   */
  async upload(
    source: string,
    folder: string = 'syndra',
  ): Promise<CloudinaryUploadResult> {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Parámetros que se firman
    const params: Record<string, string> = {
      folder,
      timestamp,
    };

    // Generar firma
    const signature = this.generateSignature(params);

    // Construir body completo (firma + parámetros no firmados)
    const body: Record<string, string> = {
      ...params,
      file: source,
      api_key: this.config.apiKey,
      signature,
    };

    const formData = new URLSearchParams(body);

    const res = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudinary upload error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as Record<string, unknown>;

    return {
      publicId: String(json['public_id'] ?? ''),
      url: String(json['url'] ?? ''),
      secureUrl: String(json['secure_url'] ?? ''),
      width: Number(json['width'] ?? 0),
      height: Number(json['height'] ?? 0),
      format: String(json['format'] ?? ''),
      bytes: Number(json['bytes'] ?? 0),
    };
  }

  /**
   * Genera URL transformada de Cloudinary
   */
  transformUrl(publicId: string, options: CloudinaryTransformOptions): string {
    const parts: string[] = [];

    if (options.width) parts.push(`w_${options.width}`);
    if (options.height) parts.push(`h_${options.height}`);
    if (options.crop) parts.push(`c_${options.crop}`);
    if (options.gravity) parts.push(`g_${options.gravity}`);
    if (options.quality) parts.push(`q_${options.quality}`);
    if (options.format) parts.push(`f_${options.format}`);
    if (options.effect) parts.push(`e_${options.effect}`);

    const transformation = parts.join(',');
    const format = options.format ?? 'webp';

    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformation}/${publicId}.${format}`;
  }

  /**
   * Genera URLs optimizadas para redes sociales.
   * Usa jpg para máxima compatibilidad con Instagram/Facebook API.
   */
  socialMediaUrls(publicId: string): {
    square: string;
    portrait: string;
    landscape: string;
    thumbnail: string;
  } {
    return {
      square: this.transformUrl(publicId, {
        width: 1080,
        height: 1080,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        format: 'jpg',
      }),
      portrait: this.transformUrl(publicId, {
        width: 1080,
        height: 1350,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        format: 'jpg',
      }),
      landscape: this.transformUrl(publicId, {
        width: 1080,
        height: 566,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        format: 'jpg',
      }),
      thumbnail: this.transformUrl(publicId, {
        width: 300,
        height: 300,
        crop: 'thumb',
        gravity: 'auto',
        quality: 80,
        format: 'jpg',
      }),
    };
  }
}

/**
 * Mock de Cloudinary para desarrollo
 */
export class MockCloudinaryAdapter {
  async upload(source: string, _folder?: string): Promise<CloudinaryUploadResult> {
    return {
      publicId: `mock_${Date.now()}`,
      url: source.startsWith('data:') ? 'https://placehold.co/1080x1080/333/fff?text=uploaded' : source,
      secureUrl: source.startsWith('data:') ? 'https://placehold.co/1080x1080/333/fff?text=uploaded' : source,
      width: 1080,
      height: 1080,
      format: 'png',
      bytes: 0,
    };
  }

  transformUrl(publicId: string, _options: CloudinaryTransformOptions): string {
    return `https://placehold.co/1080x1080/333/fff?text=${publicId}`;
  }

  socialMediaUrls(publicId: string) {
    const base = `https://placehold.co`;
    return {
      square: `${base}/1080x1080/1a1a2e/e94560?text=${publicId}`,
      portrait: `${base}/1080x1350/1a1a2e/e94560?text=${publicId}`,
      landscape: `${base}/1080x566/1a1a2e/e94560?text=${publicId}`,
      thumbnail: `${base}/300x300/1a1a2e/e94560?text=${publicId}`,
    };
  }
}
