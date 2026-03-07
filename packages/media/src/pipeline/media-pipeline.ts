// ============================================================
// Media Pipeline — Orquesta el flujo completo: generar → subir → optimizar → guardar
// ============================================================

import type { ImageGeneratorAdapter, GeneratedImage, BrandingConfig, CarouselSlide } from '../index';
import type { CloudinaryAdapter, CloudinaryUploadResult } from '../adapters/cloudinary';
import { SvgCarouselComposer } from '../composers/carousel-composer';
import type { CarouselTemplate } from '../templates/carousel-templates';

export interface MediaPipelineConfig {
  imageGenerator: ImageGeneratorAdapter;
  cloudinary?: CloudinaryAdapter;
  defaultBranding: BrandingConfig;
}

export interface ImagePipelineResult {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  prompt: string;
  provider: string;
  cloudinaryPublicId?: string;
  metadata: Record<string, unknown>;
}

export interface CarouselPipelineResult {
  slides: Array<{
    index: number;
    type: string;
    originalUrl: string;
    optimizedUrl: string;
  }>;
  thumbnailUrl: string;
  slideCount: number;
  templateId?: string;
}

/**
 * Pipeline de media que orquesta generación, upload y optimización
 */
export class MediaPipeline {
  private readonly imageGen: ImageGeneratorAdapter;
  private readonly cloudinary?: CloudinaryAdapter;
  private readonly branding: BrandingConfig;
  private readonly carouselComposer: SvgCarouselComposer;

  constructor(config: MediaPipelineConfig) {
    this.imageGen = config.imageGenerator;
    this.cloudinary = config.cloudinary;
    this.branding = config.defaultBranding;
    this.carouselComposer = new SvgCarouselComposer(1080, 1080);
  }

  /**
   * Pipeline para una imagen individual:
   * 1. Genera con IA
   * 2. Sube a Cloudinary (si disponible)
   * 3. Genera URLs optimizadas
   */
  /**
   * Descarga una imagen por URL y la convierte a base64 data URI.
   * Necesario porque proveedores como Pollinations generan on-the-fly
   * y Cloudinary/Instagram no pueden descargar esas URLs directamente.
   * Incluye reintentos con backoff para URLs inestables.
   */
  private async downloadToBase64(url: string, maxRetries = 3): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Backoff exponencial: 2s, 4s, 8s...
          await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
        }

        const res = await fetch(url, {
          headers: { 'Accept': 'image/*' },
          redirect: 'follow',
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 1000) {
          throw new Error(`Image too small (${buffer.length} bytes) — likely an error page`);
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new Error(`Failed to download image after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async generateImage(prompt: string, options?: {
    width?: number;
    height?: number;
    quality?: 'standard' | 'hd';
  }): Promise<ImagePipelineResult> {
    // 1. Generar imagen
    const generated: GeneratedImage = await this.imageGen.generate(prompt, {
      width: options?.width ?? 1080,
      height: options?.height ?? 1080,
      quality: options?.quality ?? 'standard',
    });

    // 2. Upload a Cloudinary si está configurado
    let optimizedUrl = generated.url;
    let thumbnailUrl = generated.url;
    let cloudinaryPublicId: string | undefined;

    if (this.cloudinary) {
      // Usar base64 de metadatos si disponible (Pollinations lo captura en generate)
      // Si no, descargar la imagen manualmente
      const imageData = (generated.metadata?.imageBase64 as string)
        || await this.downloadToBase64(generated.url);

      const uploaded: CloudinaryUploadResult = await this.cloudinary.upload(
        imageData,
        'syndra/images',
      );
      cloudinaryPublicId = uploaded.publicId;
      const urls = this.cloudinary.socialMediaUrls(uploaded.publicId);
      optimizedUrl = urls.square;
      thumbnailUrl = urls.thumbnail;
    }

    return {
      originalUrl: generated.url,
      optimizedUrl,
      thumbnailUrl,
      prompt: generated.prompt,
      provider: generated.provider,
      cloudinaryPublicId,
      metadata: generated.metadata,
    };
  }

  /**
   * Pipeline para carrusel:
   * 1. Renderiza slides con el composer SVG
   * 2. Sube cada slide a Cloudinary (si disponible)
   * 3. Retorna URLs de cada slide
   */
  async generateCarousel(
    slides: CarouselSlide[],
    branding?: Partial<BrandingConfig>,
    template?: CarouselTemplate,
  ): Promise<CarouselPipelineResult> {
    const mergedBranding: BrandingConfig = {
      ...this.branding,
      ...template?.defaultBranding,
      ...branding,
    };

    // 1. Renderizar slides a SVG data URIs
    const svgUrls = await this.carouselComposer.render(slides, mergedBranding);

    // 2. Subir a Cloudinary si disponible
    const resultSlides: CarouselPipelineResult['slides'] = [];

    for (let i = 0; i < svgUrls.length; i++) {
      const svgUrl = svgUrls[i]!;
      let optimizedUrl = svgUrl;

      if (this.cloudinary) {
        const uploaded = await this.cloudinary.upload(svgUrl, 'automatismos/carousels');
        optimizedUrl = this.cloudinary.transformUrl(uploaded.publicId, {
          width: 1080,
          height: 1080,
          crop: 'fill',
          quality: 'auto',
          format: 'webp',
        });
      }

      resultSlides.push({
        index: i,
        type: slides[i]!.type,
        originalUrl: svgUrl,
        optimizedUrl,
      });
    }

    // 3. Thumbnail del primer slide
    const thumbnailUrl = resultSlides[0]?.optimizedUrl ?? '';

    return {
      slides: resultSlides,
      thumbnailUrl,
      slideCount: resultSlides.length,
      templateId: template?.id,
    };
  }

  /**
   * Genera solo el prompt de imagen basado en un brief (sin generar la imagen)
   * Útil para preview antes de gastar tokens de IA
   */
  buildImagePromptFromBrief(brief: {
    angle: string;
    tone: string;
    format: string;
    cta: string;
    copy: string;
  }): string {
    const styleGuide = [
      'Clean modern social media graphic',
      'Minimalist design with bold typography',
      `Tone: ${brief.tone}`,
      'No text in the image',
      'Professional gradient background',
      'Suitable for Instagram feed post (1080x1080)',
    ].join('. ');

    return `${styleGuide}. Topic: ${brief.angle}. Visual metaphor for: ${brief.copy.substring(0, 100)}`;
  }
}
