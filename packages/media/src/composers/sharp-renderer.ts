// ============================================================
// Sharp Renderer — Rasterizes SVG compositions to PNG and does
// pixel-based image composition (overlay product/logo on backgrounds)
// ============================================================

import sharp from 'sharp';
import type { ComposeImageOptions, ComposedImage } from './image-composer';

export interface SharpRenderOptions {
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp';
  /** JPEG/WebP quality (1-100) */
  quality?: number;
  /** Output width (defaults to SVG width) */
  width?: number;
  /** Output height (defaults to SVG height) */
  height?: number;
}

export interface RenderedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface SharpComposeOptions {
  /** Final output dimensions */
  width?: number;
  height?: number;
  /** Background: URL, Buffer, or solid color (hex) */
  background: string | Buffer;
  /** Product image: URL or Buffer — composited in center/right */
  productImage?: string | Buffer;
  /** Logo image: URL or Buffer — composited as watermark */
  logoImage?: string | Buffer;
  /** Logo position */
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Logo width as percentage of canvas (5-40) */
  logoSizePercent?: number;
  /** Product area size as percentage of canvas */
  productSizePercent?: number;
  /** Text overlay rendered via SVG-in-Sharp */
  overlayText?: {
    headline?: string;
    subtitle?: string;
    price?: string;
    originalPrice?: string;
    discount?: string;
    cta?: string;
  };
  /** Brand colors for text overlays */
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    font?: string;
  };
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality for lossy formats */
  quality?: number;
}

/**
 * Fetches an image from a URL and returns a Sharp instance.
 * Handles both URLs and Buffers.
 */
async function loadImage(source: string | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(source)) return source;

  // Data URIs
  if (source.startsWith('data:')) {
    const base64 = source.split(',')[1];
    if (!base64) throw new Error('Invalid data URI');
    return Buffer.from(base64, 'base64');
  }

  // HTTP(S) URLs
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${source}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates an SVG text overlay for Sharp composition.
 * Sharp can composite SVG buffers as overlays on raster images.
 */
function buildTextOverlaySvg(
  width: number,
  height: number,
  text: SharpComposeOptions['overlayText'],
  branding: NonNullable<SharpComposeOptions['branding']>,
): Buffer {
  const font = branding.font ?? 'Arial, Helvetica, sans-serif';
  const textColor = branding.textColor ?? '#FFFFFF';
  const primaryColor = branding.primaryColor ?? '#7C3AED';
  const accentColor = branding.accentColor ?? '#F59E0B';

  const elements: string[] = [];
  let y = height - 220; // Start from bottom area

  // Semi-transparent backdrop for text readability
  elements.push(
    `<rect x="0" y="${y - 30}" width="${width}" height="260" fill="rgba(0,0,0,0.55)" rx="0"/>`,
  );

  if (text?.discount) {
    elements.push(
      `<rect x="40" y="${y - 15}" width="${text.discount.length * 22 + 40}" height="48" fill="${accentColor}" rx="8"/>`,
      `<text x="60" y="${y + 22}" font-family="${font}" font-size="32" font-weight="800" fill="#000">${escapeXml(text.discount)}</text>`,
    );
    y += 58;
  }

  if (text?.headline) {
    elements.push(
      `<text x="40" y="${y + 5}" font-family="${font}" font-size="36" font-weight="700" fill="${textColor}">${escapeXml(truncate(text.headline, 40))}</text>`,
    );
    y += 48;
  }

  if (text?.subtitle) {
    elements.push(
      `<text x="40" y="${y + 5}" font-family="${font}" font-size="22" fill="${textColor}" opacity="0.85">${escapeXml(truncate(text.subtitle, 60))}</text>`,
    );
    y += 34;
  }

  // Price block
  if (text?.price || text?.originalPrice) {
    let priceX = 40;
    if (text?.originalPrice) {
      elements.push(
        `<text x="${priceX}" y="${y + 10}" font-family="${font}" font-size="22" fill="${textColor}" opacity="0.5" text-decoration="line-through">${escapeXml(text.originalPrice)}</text>`,
      );
      priceX += text.originalPrice.length * 14 + 16;
    }
    if (text?.price) {
      elements.push(
        `<text x="${priceX}" y="${y + 10}" font-family="${font}" font-size="30" font-weight="700" fill="${accentColor}">${escapeXml(text.price)}</text>`,
      );
    }
    y += 42;
  }

  if (text?.cta) {
    const ctaW = text.cta.length * 14 + 48;
    elements.push(
      `<rect x="40" y="${y}" width="${ctaW}" height="44" fill="${primaryColor}" rx="8"/>`,
      `<text x="${40 + ctaW / 2}" y="${y + 30}" font-family="${font}" font-size="20" font-weight="600" fill="#FFF" text-anchor="middle">${escapeXml(text.cta)}</text>`,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${elements.join('')}</svg>`;
  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

// ============================================================
// SharpRenderer class
// ============================================================

export class SharpRenderer {
  /**
   * Rasterize an SVG composition (from ImageComposer) to a raster image buffer.
   */
  async rasterizeSvg(
    composed: ComposedImage,
    options?: SharpRenderOptions,
  ): Promise<RenderedImage> {
    const format = options?.format ?? 'png';
    const width = options?.width ?? composed.width;
    const height = options?.height ?? composed.height;

    const svgBuffer = Buffer.from(composed.svgContent);

    let pipeline = sharp(svgBuffer, { density: 150 }).resize(width, height, { fit: 'fill' });

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options?.quality ?? 85 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options?.quality ?? 80 });
        break;
      case 'png':
      default:
        pipeline = pipeline.png({ compressionLevel: 6 });
        break;
    }

    const buffer = await pipeline.toBuffer();

    return {
      buffer,
      width,
      height,
      format,
      size: buffer.length,
    };
  }

  /**
   * Full pixel-based composition using Sharp: background + product + logo + text.
   * This is the primary method for production-quality promotional images.
   */
  async compose(options: SharpComposeOptions): Promise<RenderedImage> {
    const width = options.width ?? 1080;
    const height = options.height ?? 1080;
    const format = options.format ?? 'png';
    const branding = {
      primaryColor: options.branding?.primaryColor ?? '#7C3AED',
      secondaryColor: options.branding?.secondaryColor ?? '#06B6D4',
      accentColor: options.branding?.accentColor ?? '#F59E0B',
      textColor: options.branding?.textColor ?? '#FFFFFF',
      font: options.branding?.font ?? 'Arial, Helvetica, sans-serif',
    };

    // 1. Build the base canvas from the background
    let canvas: sharp.Sharp;
    if (typeof options.background === 'string' && options.background.startsWith('#')) {
      // Solid color background
      canvas = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: hexToRgba(options.background),
        },
      });
    } else {
      // Image background (URL or Buffer)
      const bgBuffer = await loadImage(options.background);
      canvas = sharp(bgBuffer).resize(width, height, { fit: 'cover', position: 'centre' });
    }

    // Ensure we're working in PNG for compositing
    const baseBuffer = await canvas.png().toBuffer();

    // 2. Build composite layers
    const composites: sharp.OverlayOptions[] = [];

    // 2a. Product image overlay (center-right area)
    if (options.productImage) {
      const productBuffer = await loadImage(options.productImage);
      const productSizePct = options.productSizePercent ?? 55;
      const productW = Math.round(width * (productSizePct / 100));
      const productH = Math.round(height * (productSizePct / 100));

      const resizedProduct = await sharp(productBuffer)
        .resize(productW, productH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      composites.push({
        input: resizedProduct,
        gravity: 'centre',
      });
    }

    // 2b. Logo watermark overlay
    if (options.logoImage) {
      const logoBuffer = await loadImage(options.logoImage);
      const logoPct = options.logoSizePercent ?? 12;
      const logoW = Math.round(width * (logoPct / 100));

      const resizedLogo = await sharp(logoBuffer)
        .resize(logoW, undefined, { fit: 'inside' })
        .png()
        .toBuffer();

      const position = options.logoPosition ?? 'bottom-right';
      const padding = 24;
      const logoMeta = await sharp(resizedLogo).metadata();
      const logoH = logoMeta.height ?? logoW;

      let top: number;
      let left: number;
      switch (position) {
        case 'top-left':
          top = padding;
          left = padding;
          break;
        case 'top-right':
          top = padding;
          left = width - logoW - padding;
          break;
        case 'bottom-left':
          top = height - logoH - padding;
          left = padding;
          break;
        case 'bottom-right':
        default:
          top = height - logoH - padding;
          left = width - logoW - padding;
          break;
      }

      composites.push({
        input: resizedLogo,
        top: Math.max(0, top),
        left: Math.max(0, left),
      });
    }

    // 2c. Text overlay (rendered as SVG layer)
    if (options.overlayText && Object.values(options.overlayText).some(Boolean)) {
      const textSvg = buildTextOverlaySvg(width, height, options.overlayText, branding);
      composites.push({
        input: textSvg,
        top: 0,
        left: 0,
      });
    }

    // 3. Apply all composites in one pass
    let pipeline = sharp(baseBuffer).composite(composites);

    // 4. Output
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality ?? 85 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality ?? 80 });
        break;
      case 'png':
      default:
        pipeline = pipeline.png({ compressionLevel: 6 });
        break;
    }

    const buffer = await pipeline.toBuffer();

    return {
      buffer,
      width,
      height,
      format,
      size: buffer.length,
    };
  }

  /**
   * Quick helper: overlay logo watermark on any image.
   */
  async addLogoWatermark(
    imageSource: string | Buffer,
    logoSource: string | Buffer,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right',
    logoSizePercent = 12,
  ): Promise<RenderedImage> {
    const imgBuffer = await loadImage(imageSource);
    const meta = await sharp(imgBuffer).metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1080;

    return this.compose({
      width,
      height,
      background: imgBuffer,
      logoImage: logoSource,
      logoPosition: position,
      logoSizePercent,
    });
  }

  /**
   * Resize and optimize an image (utility).
   */
  async optimize(
    source: string | Buffer,
    options?: {
      width?: number;
      height?: number;
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
    },
  ): Promise<RenderedImage> {
    const imgBuffer = await loadImage(source);
    const format = options?.format ?? 'webp';

    let pipeline = sharp(imgBuffer);

    if (options?.width || options?.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: 'cover',
        withoutEnlargement: true,
      });
    }

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options?.quality ?? 85 });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 6 });
        break;
      case 'webp':
      default:
        pipeline = pipeline.webp({ quality: options?.quality ?? 80 });
        break;
    }

    const buffer = await pipeline.toBuffer();
    const meta = await sharp(buffer).metadata();

    return {
      buffer,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format,
      size: buffer.length,
    };
  }
}

function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128, alpha: 1 };
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
    alpha: 1,
  };
}
