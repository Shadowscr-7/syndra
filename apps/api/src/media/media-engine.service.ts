// ============================================================
// Media Engine Service — Orquesta generación de media en el pipeline
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';
import {
  MediaPipeline,
  DallEImageAdapter,
  MockImageAdapter,
  PollinationsImageAdapter,
  HuggingFaceImageAdapter,
  CloudinaryAdapter,
  MockCloudinaryAdapter,
  SvgCarouselComposer,
  getTemplateForCategory,
  type ImagePipelineResult,
  type CarouselPipelineResult,
  type BrandingConfig,
  type CarouselSlide,
  type ImageGeneratorAdapter,
} from '@automatismos/media';

@Injectable()
export class MediaEngineService {
  private readonly logger = new Logger(MediaEngineService.name);
  private readonly pipeline: MediaPipeline;
  private readonly llm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // --- LLM adapter (for AI edits) ---
    const llmProvider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const llmApiKey = this.config.get<string>('LLM_API_KEY', '');
    if (llmProvider === 'anthropic') {
      this.llm = new AnthropicAdapter({ apiKey: llmApiKey });
    } else {
      this.llm = new OpenAIAdapter({ apiKey: llmApiKey });
    }
    // --- Imagen adapter ---
    const imageApiKey = this.config.get<string>('IMAGE_GEN_API_KEY', '');
    const imageProvider = this.config.get<string>('IMAGE_GEN_PROVIDER', 'mock');

    let imageGen: ImageGeneratorAdapter;
    if (imageProvider === 'dalle' && imageApiKey) {
      imageGen = new DallEImageAdapter({ apiKey: imageApiKey });
    } else if (imageProvider === 'huggingface' && imageApiKey) {
      imageGen = new HuggingFaceImageAdapter({ apiToken: imageApiKey });
      this.logger.log('Using HuggingFaceImageAdapter — free AI image generation (FLUX.1-schnell)');
    } else if (imageProvider === 'pollinations' || (!imageApiKey && imageProvider !== 'dalle')) {
      imageGen = new PollinationsImageAdapter();
      this.logger.log('Using PollinationsImageAdapter — free AI image generation (Flux)');
    } else {
      imageGen = new MockImageAdapter();
      this.logger.warn('Using MockImageAdapter — set IMAGE_GEN_PROVIDER=huggingface or pollinations or dalle');
    }

    // --- Cloudinary adapter ---
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    const cloudinary = cloudName && cloudKey
      ? new CloudinaryAdapter({ cloudName, apiKey: cloudKey, apiSecret: cloudSecret })
      : undefined;

    if (!cloudinary) {
      this.logger.warn('Cloudinary not configured — using direct URLs');
    }

    // --- Pipeline ---
    const defaultBranding: BrandingConfig = {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      primaryColor: '#6C63FF',
      secondaryColor: '#F4F4FF',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A2E',
    };

    this.pipeline = new MediaPipeline({
      imageGenerator: imageGen,
      cloudinary: cloudinary as unknown as import('@automatismos/media').CloudinaryAdapter | undefined,
      defaultBranding,
    });
  }

  /**
   * Ejecuta la etapa MEDIA del pipeline editorial:
   * 1. Lee ContentVersion principal del run
   * 2. Determina si necesita imagen simple o carrusel
   * 3. Genera media
   * 4. Almacena MediaAssets en BD
   * 5. Transiciona el run a REVIEW
   */
  async executeMediaGeneration(
    editorialRunId: string,
    workspaceId: string,
  ): Promise<{ mediaAssetIds: string[] }> {
    this.logger.log(`Starting media generation for run ${editorialRunId}`);

    // 1. Obtener brief y version principal
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: {
          where: { isMain: true },
          take: 1,
        },
      },
    });

    const mainVersion = brief.contentVersions[0];
    if (!mainVersion) {
      throw new Error(`No main content version found for run ${editorialRunId}`);
    }

    // 2. Obtener branding del workspace
    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    const branding = this.extractBranding(brand);

    // 3. Generar según formato
    const format = brief.format.toLowerCase();
    const mediaAssetIds: string[] = [];

    if (format === 'carousel') {
      try {
        const result = await this.generateCarouselMedia(mainVersion, branding, brief);
        // Verify slides have real URLs (not SVG data URIs)
        const hasRealUrls = result.slides.some(
          (s) => s.optimizedUrl && !s.optimizedUrl.startsWith('data:'),
        );
        if (!hasRealUrls) {
          throw new Error('Carousel slides are SVG data URIs — falling back to AI image');
        }
        for (const slide of result.slides) {
          const asset = await this.prisma.mediaAsset.create({
            data: {
              contentVersionId: mainVersion.id,
              type: 'CAROUSEL_SLIDE',
              provider: 'svg-composer',
              originalUrl: slide.originalUrl,
              optimizedUrl: slide.optimizedUrl,
              thumbnailUrl: slide.index === 0 ? result.thumbnailUrl : null,
              status: 'READY',
              metadata: { slideIndex: slide.index, slideType: slide.type, templateId: result.templateId },
            },
          });
          mediaAssetIds.push(asset.id);
        }
      } catch (carouselErr) {
        // Fallback: generate a single AI image for the carousel instead of SVG slides
        this.logger.warn(`Carousel SVG generation failed, falling back to AI image: ${carouselErr}`);
        const result = await this.generateSingleImage(mainVersion, brief);
        const asset = await this.prisma.mediaAsset.create({
          data: {
            contentVersionId: mainVersion.id,
            type: 'IMAGE',
            prompt: result.prompt,
            provider: result.provider,
            originalUrl: result.originalUrl,
            optimizedUrl: result.optimizedUrl,
            thumbnailUrl: result.thumbnailUrl,
            status: 'READY',
            metadata: { ...(result.metadata ?? {}), carouselFallback: true } as any,
          },
        });
        mediaAssetIds.push(asset.id);
      }
    } else {
      // Imagen simple para posts
      const result = await this.generateSingleImage(mainVersion, brief);
      const asset = await this.prisma.mediaAsset.create({
        data: {
          contentVersionId: mainVersion.id,
          type: 'IMAGE',
          prompt: result.prompt,
          provider: result.provider,
          originalUrl: result.originalUrl,
          optimizedUrl: result.optimizedUrl,
          thumbnailUrl: result.thumbnailUrl,
          status: 'READY',
          metadata: (result.metadata ?? {}) as any,
        },
      });
      mediaAssetIds.push(asset.id);
    }

    // 4. Transicionar a REVIEW
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: 'REVIEW' },
    });

    this.logger.log(`Media generated: ${mediaAssetIds.length} asset(s) for run ${editorialRunId}`);

    return { mediaAssetIds };
  }

  /**
   * Regenera solo la imagen de un ContentVersion manteniendo el copy.
   * Usa LLM para generar un prompt contextual basado en el contenido.
   */
  async regenerateImage(
    contentVersionId: string,
    customPrompt?: string,
  ): Promise<{ mediaAssetId: string }> {
    this.logger.log(`Regenerating image for version ${contentVersionId}`);

    const version = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: true },
    });

    let prompt: string;
    if (customPrompt) {
      prompt = customPrompt;
    } else {
      // Usar LLM para prompt contextual
      try {
        const llmResult = await this.llm.complete(
          `You are an expert at creating image generation prompts for social media.
Given this post content, create a vivid, detailed image prompt for AI generation.
The image should visually represent the core message. No text/typography in the image.
Tone: ${version.brief.tone}. Format: ${version.brief.format}. 
Topic: ${version.brief.angle}
Post content: ${version.copy.substring(0, 500)}

Respond ONLY with the English image prompt. Max 150 words.`,
          { temperature: 0.8, maxTokens: 300 },
        );
        prompt = llmResult.trim();
        this.logger.log(`LLM image prompt: ${prompt.substring(0, 100)}...`);
      } catch {
        prompt = this.pipeline.buildImagePromptFromBrief({
          angle: version.brief.angle,
          tone: version.brief.tone,
          format: version.brief.format,
          cta: version.brief.cta,
          copy: version.copy,
        });
      }
    }

    const result = await this.pipeline.generateImage(prompt);

    // Marcar assets anteriores como reemplazados (soft delete via metadata)
    await this.prisma.mediaAsset.updateMany({
      where: { contentVersionId, type: 'IMAGE' },
      data: { status: 'FAILED', metadata: { replaced: true, replacedAt: new Date().toISOString() } },
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId,
        type: 'IMAGE',
        prompt: result.prompt,
        provider: result.provider,
        originalUrl: result.originalUrl,
        optimizedUrl: result.optimizedUrl,
        thumbnailUrl: result.thumbnailUrl,
        status: 'READY',
        metadata: (result.metadata ?? {}) as any,
      },
    });

    return { mediaAssetId: asset.id };
  }

  /**
   * Edita un asset con instrucciones de IA.
   * - Para CAROUSEL_SLIDE: la IA reescribe título/body según la instrucción y regenera el SVG.
   * - Para IMAGE: la IA modifica el prompt y genera una nueva imagen.
   */
  async aiEditAsset(
    assetId: string,
    instruction: string,
  ): Promise<{ assetId: string; updatedUrl: string }> {
    this.logger.log(`AI edit for asset ${assetId}: "${instruction}"`);

    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({
      where: { id: assetId },
      include: {
        contentVersion: {
          include: { brief: true },
        },
      },
    });

    if (asset.type === 'CAROUSEL_SLIDE') {
      return this.aiEditSlide(asset, instruction);
    } else {
      return this.aiEditImage(asset, instruction);
    }
  }

  /**
   * AI-edit a carousel slide: extract current text → LLM rewrites → regenerate SVG
   */
  private async aiEditSlide(
    asset: any,
    instruction: string,
  ): Promise<{ assetId: string; updatedUrl: string }> {
    // Extract current slide info from metadata
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
    const slideType = (metadata.slideType as string) ?? 'content';
    const slideIndex = (metadata.slideIndex as number) ?? 0;

    // Decode current SVG to extract text content
    let currentTitle = '';
    let currentBody = '';
    const svgUrl = asset.originalUrl ?? '';
    if (svgUrl.startsWith('data:image/svg+xml')) {
      const svgContent = decodeURIComponent(svgUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
      // Simple extraction from SVG tspan elements
      const titleMatch = svgContent.match(/<text[^>]*font-size="(?:52|44)"[^>]*>([\s\S]*?)<\/text>/);
      const bodyMatch = svgContent.match(/<text[^>]*font-size="(?:28|30)"[^>]*>([\s\S]*?)<\/text>/);
      if (titleMatch?.[1]) currentTitle = titleMatch[1].replace(/<[^>]+>/g, ' ').trim();
      if (bodyMatch?.[1]) currentBody = bodyMatch[1].replace(/<[^>]+>/g, ' ').trim();
    }

    // Ask LLM to rewrite
    const prompt = `Eres un editor de contenido para redes sociales. 
Tienes un slide de carrusel de Instagram con este contenido actual:

TÍTULO: ${currentTitle}
CUERPO: ${currentBody}
TIPO DE SLIDE: ${slideType}

El usuario quiere hacer este cambio:
"${instruction}"

Reescribe SOLO el contenido del slide aplicando la instrucción. Responde en JSON:
{"title": "...", "body": "..."}

Reglas:
- Máximo 60 caracteres para título
- Máximo 200 caracteres para cuerpo
- Mantén el tono profesional
- Si el tipo es "cover", el body es opcional
- Si el tipo es "cta", incluye un llamado a la acción claro
- Responde SOLO el JSON, sin markdown ni explicaciones`;

    const response = await this.llm.complete(prompt, { temperature: 0.7 });
    let newTitle = currentTitle;
    let newBody = currentBody;

    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      newTitle = parsed.title ?? currentTitle;
      newBody = parsed.body ?? currentBody;
    } catch {
      this.logger.warn('Failed to parse LLM response, using raw text as title');
      newTitle = response.substring(0, 60);
    }

    // Get branding
    const workspaceId = asset.contentVersion?.brief?.editorialRun
      ? (await this.prisma.editorialRun.findUnique({
          where: { id: asset.contentVersion.brief.editorialRunId },
          select: { workspaceId: true },
        }))?.workspaceId
      : undefined;

    const brand = workspaceId
      ? await this.prisma.brandProfile.findUnique({ where: { workspaceId } })
      : null;
    const branding = this.extractBranding(brand);

    // Regenerate SVG using the composer
    const composer = new SvgCarouselComposer(1080, 1080);
    const fullBranding: BrandingConfig = {
      primaryFont: branding.primaryFont ?? 'Inter',
      secondaryFont: branding.secondaryFont ?? 'Inter',
      primaryColor: branding.primaryColor ?? '#6C63FF',
      secondaryColor: branding.secondaryColor ?? '#F4F4FF',
      backgroundColor: branding.backgroundColor ?? '#FFFFFF',
      textColor: branding.textColor ?? '#1A1A2E',
    };

    const slide: CarouselSlide = { type: slideType as 'cover' | 'content' | 'cta', title: newTitle, body: newBody };
    const composed = composer.composeSlides([slide], fullBranding);
    const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composed[0]?.svgContent ?? '')}`;

    // Update the asset in DB
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        originalUrl: svgDataUri,
        optimizedUrl: svgDataUri,
        metadata: { ...metadata, aiEdited: true, lastInstruction: instruction },
      },
    });

    return { assetId: asset.id, updatedUrl: svgDataUri };
  }

  /**
   * AI-edit an image: LLM refines the prompt based on instruction → regenerate
   */
  private async aiEditImage(
    asset: any,
    instruction: string,
  ): Promise<{ assetId: string; updatedUrl: string }> {
    const currentPrompt = asset.prompt ?? 'professional social media image';

    // Ask LLM to refine the image prompt
    const prompt = `Eres un experto en prompts para generación de imágenes IA.

Prompt actual de la imagen: "${currentPrompt}"

El usuario quiere este cambio: "${instruction}"

Genera un nuevo prompt de imagen optimizado que aplique el cambio solicitado.
Responde SOLO con el nuevo prompt, sin explicaciones, en inglés.
Máximo 200 palabras.`;

    const newPrompt = await this.llm.complete(prompt, { temperature: 0.7 });

    // Generate new image
    const result = await this.pipeline.generateImage(newPrompt.trim());

    // Update the asset in place
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        prompt: newPrompt.trim(),
        originalUrl: result.originalUrl,
        optimizedUrl: result.optimizedUrl,
        thumbnailUrl: result.thumbnailUrl,
        metadata: {
          ...((asset.metadata ?? {}) as Record<string, unknown>),
          aiEdited: true,
          lastInstruction: instruction,
          previousPrompt: currentPrompt,
        },
      },
    });

    return { assetId: asset.id, updatedUrl: result.optimizedUrl };
  }

  /**
   * Lista todos los media assets de un workspace
   */
  async listAssets(
    workspaceId: string,
    filters?: { type?: string; status?: string; limit?: number },
  ) {
    return this.prisma.mediaAsset.findMany({
      where: {
        contentVersion: {
          brief: {
            editorialRun: { workspaceId },
          },
        },
        ...(filters?.type ? { type: filters.type as 'IMAGE' | 'CAROUSEL_SLIDE' } : {}),
        ...(filters?.status ? { status: filters.status as 'READY' | 'PENDING' } : {}),
      },
      include: {
        contentVersion: {
          select: {
            id: true,
            version: true,
            caption: true,
            brief: {
              select: {
                format: true,
                angle: true,
                editorialRun: { select: { id: true, status: true, date: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });
  }

  // --- Private helpers ---

  /**
   * Genera una imagen para un post usando LLM para crear un prompt rico y contextual.
   * El LLM analiza el copy, ángulo, tono y formato para generar un prompt
   * de imagen que realmente refleje el contenido del post.
   */
  private async generateSingleImage(
    version: { copy: string; caption: string },
    brief: { angle: string; tone: string; format: string; cta: string },
  ): Promise<ImagePipelineResult> {
    // Usar LLM para generar un prompt de imagen contextual y rico
    const systemPrompt = `You are an expert at creating image generation prompts for social media posts.
Given a social media post's content, create a detailed, vivid image prompt that:
- Captures the CORE MESSAGE and EMOTION of the post
- Uses specific visual elements, colors, composition
- Is suitable for ${brief.format} format on Instagram (1080x1080)
- Matches the tone: ${brief.tone}
- NEVER includes text, letters, words, or typography in the image
- Focuses on visual metaphors, scenes, or abstract representations
- Is detailed enough for AI image generation (FLUX model)

Respond ONLY with the image prompt in English, no explanations. Max 150 words.`;

    const userMessage = `Post topic: ${brief.angle}
Post copy: ${version.copy.substring(0, 500)}
Caption: ${(version.caption || '').substring(0, 200)}
CTA: ${brief.cta}`;

    let prompt: string;
    try {
      const llmResult = await this.llm.complete(
        `${systemPrompt}\n\n${userMessage}`,
        { temperature: 0.8, maxTokens: 300 },
      );
      prompt = llmResult.trim();
      this.logger.log(`LLM-generated image prompt: ${prompt.substring(0, 100)}...`);
    } catch (err) {
      // Fallback al prompt básico si el LLM falla
      this.logger.warn(`LLM prompt generation failed, using basic prompt: ${err}`);
      prompt = this.pipeline.buildImagePromptFromBrief({
        angle: brief.angle,
        tone: brief.tone,
        format: brief.format,
        cta: brief.cta,
        copy: version.copy,
      });
    }

    return this.pipeline.generateImage(prompt);
  }

  private async generateCarouselMedia(
    version: { copy: string; caption: string; hook: string; title: string },
    branding: Partial<BrandingConfig>,
    brief: { angle: string; tone: string },
  ): Promise<CarouselPipelineResult> {
    // Determinar template según tono
    const category = this.toneToCategory(brief.tone);
    const template = getTemplateForCategory(category);

    // Construir slides desde el copy
    const slides = this.buildSlidesFromCopy(version, brief);

    return this.pipeline.generateCarousel(slides, branding, template);
  }

  private buildSlidesFromCopy(
    version: { copy: string; hook: string; title: string },
    brief: { angle: string },
  ): CarouselSlide[] {
    const slides: CarouselSlide[] = [];

    // Slide 1: Cover
    slides.push({
      type: 'cover',
      title: version.hook || version.title || brief.angle,
    });

    // Slides intermedios: dividir copy en párrafos
    const paragraphs = version.copy
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);

    for (let i = 0; i < Math.min(paragraphs.length, 6); i++) {
      const para = paragraphs[i]!;
      // Intentar extraer un heading del primer renglón
      const lines = para.split('\n');
      const heading = lines[0] && lines[0].length < 60 ? lines[0] : `Punto ${i + 1}`;
      const body = lines.length > 1 ? lines.slice(1).join(' ') : para;

      slides.push({
        type: 'content',
        title: heading,
        body: body.substring(0, 200),
      });
    }

    // Si no hay suficientes slides, añadir uno genérico
    if (slides.length < 3) {
      slides.push({
        type: 'content',
        title: brief.angle,
        body: version.copy.substring(0, 200),
      });
    }

    // Slide final: CTA
    slides.push({
      type: 'cta',
      title: '¿Te fue útil?',
      body: 'Guarda este post y compártelo con alguien que lo necesite 💡',
    });

    return slides;
  }

  private toneToCategory(
    tone: string,
  ): 'educational' | 'news' | 'cta' | 'authority' | 'controversial' {
    const map: Record<string, 'educational' | 'news' | 'cta' | 'authority' | 'controversial'> = {
      didáctico: 'educational',
      técnico: 'authority',
      aspiracional: 'cta',
      polémico: 'controversial',
      premium: 'authority',
      cercano: 'educational',
      mentor: 'educational',
      vendedor_suave: 'cta',
    };
    return map[tone] ?? 'educational';
  }

  private extractBranding(
    brand: { visualStyle: unknown } | null,
  ): Partial<BrandingConfig> {
    if (!brand?.visualStyle || typeof brand.visualStyle !== 'object') return {};

    const style = brand.visualStyle as Record<string, unknown>;
    return {
      primaryColor: typeof style['primaryColor'] === 'string' ? style['primaryColor'] : undefined,
      secondaryColor: typeof style['secondaryColor'] === 'string' ? style['secondaryColor'] : undefined,
      backgroundColor: typeof style['backgroundColor'] === 'string' ? style['backgroundColor'] : undefined,
      textColor: typeof style['textColor'] === 'string' ? style['textColor'] : undefined,
      primaryFont: typeof style['primaryFont'] === 'string' ? style['primaryFont'] : undefined,
      secondaryFont: typeof style['secondaryFont'] === 'string' ? style['secondaryFont'] : undefined,
      logoUrl: typeof style['logoUrl'] === 'string' ? style['logoUrl'] : undefined,
    };
  }
}
