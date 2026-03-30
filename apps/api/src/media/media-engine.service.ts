// ============================================================
// Media Engine Service — Orquesta generación de media en el pipeline
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
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
  ReplicateImageAdapter,
  ResilientImageAdapter,
  CloudinaryAdapter,
  MockCloudinaryAdapter,
  SvgCarouselComposer,
  getTemplateForCategory,
  ImageComposer,
  SharpRenderer,
  KieMusicAdapter,
  KieImageProAdapter,
  PRO_IMAGE_MODELS,
  DEFAULT_BATCH_KIE_MODEL,
  type ComposeImageOptions,
  type CompositionTemplate,
  type ImagePipelineResult,
  type CarouselPipelineResult,
  type BrandingConfig,
  type CarouselSlide,
  type ImageGeneratorAdapter,
  type ProImageModelId,
  type KieImageModelId,
} from '@automatismos/media';

@Injectable()
export class MediaEngineService {
  private readonly logger = new Logger(MediaEngineService.name);
  /** Env-var fallback pipeline (used when no DB credentials are configured) */
  private readonly fallbackPipeline: MediaPipeline;
  private readonly fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {
    // --- Fallback LLM adapter (from env vars) ---
    const llmProvider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const llmApiKey = this.config.get<string>('LLM_API_KEY', '');
    if (llmProvider === 'anthropic') {
      this.fallbackLlm = new AnthropicAdapter({ apiKey: llmApiKey });
    } else {
      this.fallbackLlm = new OpenAIAdapter({ apiKey: llmApiKey });
    }
    // --- Fallback Imagen adapter (from env vars) ---
    const imageApiKey = this.config.get<string>('IMAGE_GEN_API_KEY', '');
    const imageProvider = this.config.get<string>('IMAGE_GEN_PROVIDER', 'mock');
    const replicateToken = this.config.get<string>('REPLICATE_API_TOKEN', '');

    let imageGen: ImageGeneratorAdapter;
    if (imageProvider === 'dalle' && imageApiKey) {
      imageGen = new DallEImageAdapter({ apiKey: imageApiKey });
    } else if (imageProvider === 'huggingface' && imageApiKey) {
      imageGen = new HuggingFaceImageAdapter({ apiToken: imageApiKey });
      this.logger.log('Fallback: HuggingFaceImageAdapter from env vars');
    } else if (imageProvider === 'pollinations' || (!imageApiKey && imageProvider !== 'dalle')) {
      const pollinations = new PollinationsImageAdapter();
      const hfToken = this.config.get<string>('HUGGINGFACE_API_KEY', '');
      // Build resilient chain: Pollinations → HuggingFace → Replicate
      if (hfToken) {
        const huggingface = new HuggingFaceImageAdapter({ apiToken: hfToken });
        let fallback: ImageGeneratorAdapter = huggingface;
        let fallbackName = 'HuggingFace/FLUX';
        // If Replicate also available, nest it as third fallback
        if (replicateToken) {
          const replicate = new ReplicateImageAdapter({ apiToken: replicateToken, defaultModel: 'flux-schnell' });
          fallback = new ResilientImageAdapter({
            primary: huggingface,
            fallback: replicate,
            primaryName: 'HuggingFace/FLUX',
            fallbackName: 'Replicate/flux-schnell',
          });
          fallbackName = 'HuggingFace → Replicate';
        }
        imageGen = new ResilientImageAdapter({
          primary: pollinations,
          fallback,
          primaryName: 'Pollinations',
          fallbackName,
        });
        this.logger.log(`Fallback: Pollinations → ${fallbackName} (resilient)`);
      } else if (replicateToken) {
        const replicate = new ReplicateImageAdapter({ apiToken: replicateToken, defaultModel: 'flux-schnell' });
        imageGen = new ResilientImageAdapter({
          primary: pollinations,
          fallback: replicate,
          primaryName: 'Pollinations',
          fallbackName: 'Replicate/flux-schnell',
        });
        this.logger.log('Fallback: Pollinations → Replicate (resilient)');
      } else {
        imageGen = pollinations;
        this.logger.log('Fallback: PollinationsImageAdapter from env vars');
      }
    } else if (imageProvider === 'replicate' && (imageApiKey || replicateToken)) {
      imageGen = new ReplicateImageAdapter({ apiToken: imageApiKey || replicateToken });
      this.logger.log('Fallback: ReplicateImageAdapter from env vars');
    } else {
      imageGen = new MockImageAdapter();
      this.logger.warn('Fallback: MockImageAdapter — set IMAGE_GEN_PROVIDER');
    }

    // --- Fallback Cloudinary adapter (from env vars) ---
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    const cloudinary = cloudName && cloudKey
      ? new CloudinaryAdapter({ cloudName, apiKey: cloudKey, apiSecret: cloudSecret })
      : undefined;

    if (!cloudinary) {
      this.logger.warn('Cloudinary not configured in env — will check DB credentials at runtime');
    }

    // --- Fallback Pipeline ---
    const defaultBranding: BrandingConfig = {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      primaryColor: '#6C63FF',
      secondaryColor: '#F4F4FF',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A2E',
    };

    this.fallbackPipeline = new MediaPipeline({
      imageGenerator: imageGen,
      cloudinary: cloudinary as unknown as import('@automatismos/media').CloudinaryAdapter | undefined,
      defaultBranding,
    });
  }

  // ── Credential resolution helpers ──────────────────────

  /** Resolve workspace owner userId for credential lookups */
  private async resolveUserId(workspaceId: string): Promise<string | null> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    return wsUser?.userId ?? null;
  }

  /** Build LLM adapter: respects workspace credential preference */
  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'LLM');
      if (payload?.apiKey) {
        const provider = payload.provider ?? 'openai';
        this.logger.debug(`Using ${provider} LLM credential for workspace ${workspaceId}`);
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    return this.fallbackLlm;
  }

  /** Build ImageGenerator adapter: respects workspace credential preference */
  private async getImageGen(workspaceId: string, userId: string | null): Promise<ImageGeneratorAdapter> {
    if (userId) {
      try {
        const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'IMAGE_GEN');
        if (payload?.apiKey) {
          const provider = payload.provider ?? this.config.get<string>('IMAGE_GEN_PROVIDER', 'huggingface');
          this.logger.log(`Using ${provider} IMAGE_GEN credential for workspace ${workspaceId}`);
          if (provider === 'dalle') return new DallEImageAdapter({ apiKey: payload.apiKey });
          if (provider === 'huggingface') return new HuggingFaceImageAdapter({ apiToken: payload.apiKey });
          if (provider === 'pollinations') return new PollinationsImageAdapter();
          if (provider === 'replicate') return new ReplicateImageAdapter({ apiToken: payload.apiKey });
          return new HuggingFaceImageAdapter({ apiToken: payload.apiKey });
        }
      } catch {
        // If resolveCredential throws (missing own credential), fall through to fallback
      }
    }
    return this.fallbackPipeline['imageGen'] as ImageGeneratorAdapter;
  }

  /** Build Cloudinary adapter: respects workspace credential preference */
  private async getCloudinary(workspaceId: string, userId: string | null): Promise<CloudinaryAdapter | undefined> {
    if (userId) {
      try {
        const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'CLOUDINARY');
        if (payload?.cloudName && payload?.apiKey) {
          this.logger.debug(`Using CLOUDINARY credential for workspace ${workspaceId}`);
          return new CloudinaryAdapter({
            cloudName: payload.cloudName,
            apiKey: payload.apiKey,
            apiSecret: payload.apiSecret ?? '',
          });
        }
      } catch {
        // Cloudinary is optional, fall through
      }
    }
    return this.fallbackPipeline['cloudinary'] as CloudinaryAdapter | undefined;
  }

  /** Build a per-request MediaPipeline using DB credentials */
  private async getPipeline(workspaceId: string): Promise<MediaPipeline> {
    const userId = await this.resolveUserId(workspaceId);
    const imageGen = await this.getImageGen(workspaceId, userId);
    const cloudinary = await this.getCloudinary(workspaceId, userId);

    const defaultBranding: BrandingConfig = {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      primaryColor: '#6C63FF',
      secondaryColor: '#F4F4FF',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A2E',
    };

    return new MediaPipeline({
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
        editorialRun: {
          select: { contentProfileId: true },
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

    const legacyBranding = this.extractBranding(brand);

    // 2b. Cargar BusinessProfile + UserMedia para contenido promocional
    const businessProfile = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    }).catch(() => null);

    // Resolve owner userId for UserMedia queries
    const ownerId = await this.resolveUserId(workspaceId);

    // 2c. Cargar VisualStyleProfile (fuente canónica de colores/fuentes)
    // Prioridad: VisualStyleProfile específico del contentProfile > global > BusinessProfile.brandColors > BrandProfile.visualStyle
    const runContentProfileId = brief.editorialRun?.contentProfileId ?? null;
    const visualStyle = ownerId
      ? await (async () => {
          // First: profile-specific style (matches the run's content profile)
          if (runContentProfileId) {
            const specific = await this.prisma.visualStyleProfile.findFirst({
              where: { userId: ownerId, contentProfileId: runContentProfileId },
              orderBy: { createdAt: 'desc' },
            }).catch(() => null);
            if (specific) return specific;
          }
          // Fallback: global style (no contentProfileId = workspace-wide Brand Kit)
          return this.prisma.visualStyleProfile.findFirst({
            where: { userId: ownerId, contentProfileId: null },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null);
        })()
      : null;

    // Merge branding: VisualStyleProfile wins over legacy BrandProfile.visualStyle
    const branding: Partial<BrandingConfig> = {
      ...legacyBranding,
      ...(visualStyle?.colorPalette?.length
        ? {
            primaryColor: visualStyle.colorPalette[0] ?? legacyBranding.primaryColor,
            secondaryColor: visualStyle.colorPalette[1] ?? legacyBranding.secondaryColor,
            accentColor: visualStyle.colorPalette[2] ?? legacyBranding.accentColor,
          }
        : {}),
      ...(visualStyle?.primaryFont ? { primaryFont: visualStyle.primaryFont } : {}),
      ...(visualStyle?.secondaryFont ? { secondaryFont: visualStyle.secondaryFont } : {}),
    };

    // Cargar logo del workspace (UserMedia con isLogo=true)
    const logoMedia = ownerId ? await this.prisma.userMedia.findFirst({
      where: { userId: ownerId, isLogo: true },
    }).catch(() => null) : null;

    // Cargar productos/media marcados para pipeline
    const pipelineMedia = ownerId ? await this.prisma.userMedia.findMany({
      where: { userId: ownerId, useInPipeline: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []) : [];

    // Detectar si el tema es promocional
    const theme = brief.themeId
      ? await this.prisma.contentTheme.findUnique({ where: { id: brief.themeId } })
      : null;
    const isPromotional = theme && [
      'PRODUCT', 'SERVICE', 'OFFER', 'SEASONAL', 'ANNOUNCEMENT',
    ].includes(theme.type);

    const logoUrl = logoMedia?.url ?? branding.logoUrl ?? legacyBranding.logoUrl ?? null;
    const imagePromptPrefix = visualStyle?.customPromptPrefix ?? undefined;

    // Build per-request pipeline from DB credentials (fallback to env)
    const pipeline = await this.getPipeline(workspaceId);
    const llm = await this.getLlm(workspaceId);

    // 3. Generar según formato
    const format = brief.format.toLowerCase();
    const mediaAssetIds: string[] = [];

    if (format === 'carousel') {
      // Generate AI images for carousel slides — use KIE Pro when available
      try {
        const slideCount = Math.min(4, Math.max(2, Math.ceil(mainVersion.copy.split(/\n\n+/).length / 2)));
        const slides = this.buildSlidesFromCopy(mainVersion, brief);
        
        // Generate a cover image and one per key content point
        const slidePrompts = this.buildCarouselImagePrompts(slides, brief);
        
        for (let i = 0; i < Math.min(slidePrompts.length, slideCount); i++) {
          try {
            const slideVersion = { copy: slidePrompts[i]!, caption: mainVersion.caption };
            const result = await this.generateSingleImageWithProFallback(
              slideVersion, brief, llm, pipeline, workspaceId, imagePromptPrefix,
            );
            const asset = await this.prisma.mediaAsset.create({
              data: {
                contentVersionId: mainVersion.id,
                type: 'CAROUSEL_SLIDE',
                prompt: result.prompt,
                provider: result.provider,
                originalUrl: result.originalUrl,
                optimizedUrl: result.optimizedUrl,
                thumbnailUrl: i === 0 ? result.thumbnailUrl : null,
                status: 'READY',
                metadata: { slideIndex: i, carouselAI: true } as any,
              },
            });
            mediaAssetIds.push(asset.id);
          } catch (slideErr) {
            this.logger.warn(`Failed to generate carousel slide ${i}: ${slideErr}`);
          }
        }
        
        // If no slides generated, fall back to single image
        if (mediaAssetIds.length === 0) {
          throw new Error('No carousel slides generated');
        }
      } catch (carouselErr) {
        this.logger.warn(`Carousel AI generation failed, falling back to single image: ${carouselErr}`);
        const result = await this.generateSingleImageWithProFallback(mainVersion, brief, llm, pipeline, workspaceId, imagePromptPrefix);
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
    } else if (isPromotional && pipelineMedia.length > 0) {
      // === PROMOTIONAL PATH: Use user's own product images + ImageComposer ===
      try {
        const composedAsset = await this.generatePromotionalImage(
          mainVersion, brief, theme, pipelineMedia, logoUrl, businessProfile, branding,
        );
        const asset = await this.prisma.mediaAsset.create({
          data: {
            contentVersionId: mainVersion.id,
            type: 'IMAGE',
            provider: 'image-composer',
            originalUrl: composedAsset.url,
            optimizedUrl: composedAsset.url,
            status: 'READY',
            metadata: { template: composedAsset.template, promotional: true } as any,
          },
        });
        mediaAssetIds.push(asset.id);
      } catch (promoErr) {
        this.logger.warn(`Promotional composition failed, falling back to AI image: ${promoErr}`);
        const result = await this.generateSingleImage(mainVersion, brief, llm, pipeline, imagePromptPrefix);
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
    } else {
      // Standard AI image generation path — try KIE Pro model first if API key available
      const result = await this.generateSingleImageWithProFallback(mainVersion, brief, llm, pipeline, workspaceId, imagePromptPrefix);

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
      include: { brief: { include: { editorialRun: { select: { workspaceId: true } } } } },
    });

    const workspaceId = version.brief.editorialRun?.workspaceId;
    const llm = workspaceId ? await this.getLlm(workspaceId) : this.fallbackLlm;
    const pipeline = workspaceId ? await this.getPipeline(workspaceId) : this.fallbackPipeline;

    let prompt: string;
    if (customPrompt) {
      prompt = customPrompt;
    } else {
      // Usar LLM para prompt contextual
      try {
        const llmResult = await llm.complete(
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
        prompt = pipeline.buildImagePromptFromBrief({
          angle: version.brief.angle,
          tone: version.brief.tone,
          format: version.brief.format,
          cta: version.brief.cta,
          copy: version.copy,
        });
      }
    }

    const result = await pipeline.generateImage(prompt);

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
   * Genera una imagen ADICIONAL para un content version (sin reemplazar las existentes).
   * Usada para crear slides extra cuando se necesita más de una imagen para un video slideshow.
   */
  async generateAdditionalImage(
    contentVersionId: string,
    variationIndex: number,
  ): Promise<{ mediaAssetId: string }> {
    this.logger.log(`Generating additional image #${variationIndex} for version ${contentVersionId}`);

    const version = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: { include: { editorialRun: { select: { workspaceId: true } } } } },
    });

    const workspaceId = version.brief.editorialRun?.workspaceId;
    const llm = workspaceId ? await this.getLlm(workspaceId) : this.fallbackLlm;
    const pipeline = workspaceId ? await this.getPipeline(workspaceId) : this.fallbackPipeline;

    // Use LLM to create a varied prompt for each additional slide
    let prompt: string;
    try {
      const llmResult = await llm.complete(
        `You are an expert at creating image generation prompts for social media.
Create a vivid, detailed image prompt for slide #${variationIndex + 1} of a multi-slide social media video.
Each slide should show a DIFFERENT visual angle or aspect of the same topic.
No text/typography in the image. Make it visually distinct from other slides.
Tone: ${version.brief.tone}. Format: ${version.brief.format}.
Topic: ${version.brief.angle}
Post content: ${version.copy.substring(0, 400)}

Respond ONLY with the English image prompt. Max 150 words.`,
        { temperature: 0.9, maxTokens: 300 },
      );
      prompt = llmResult.trim();
    } catch {
      prompt = pipeline.buildImagePromptFromBrief({
        angle: version.brief.angle,
        tone: version.brief.tone,
        format: version.brief.format,
        cta: version.brief.cta,
        copy: version.copy,
      });
    }

    const result = await this.generateSingleImageWithProFallback(
      version, version.brief, llm, pipeline, workspaceId,
    );

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
        metadata: { ...(result.metadata ?? {}), slideVariation: variationIndex } as any,
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
          include: {
            brief: {
              include: { editorialRun: { select: { workspaceId: true } } },
            },
          },
        },
      },
    });

    const workspaceId = asset.contentVersion?.brief?.editorialRun?.workspaceId;
    const llm = workspaceId ? await this.getLlm(workspaceId) : this.fallbackLlm;
    const pipeline = workspaceId ? await this.getPipeline(workspaceId) : this.fallbackPipeline;

    if (asset.type === 'CAROUSEL_SLIDE') {
      return this.aiEditSlide(asset, instruction, llm);
    } else {
      return this.aiEditImage(asset, instruction, llm, pipeline);
    }
  }

  /**
   * AI-edit a carousel slide: extract current text → LLM rewrites → regenerate SVG
   */
  private async aiEditSlide(
    asset: any,
    instruction: string,
    llm: LLMAdapter,
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

    const response = await llm.complete(prompt, { temperature: 0.7 });
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
    llm: LLMAdapter,
    pipeline: MediaPipeline,
  ): Promise<{ assetId: string; updatedUrl: string }> {
    const currentPrompt = asset.prompt ?? 'professional social media image';

    // Ask LLM to refine the image prompt
    const prompt = `Eres un experto en prompts para generación de imágenes IA.

Prompt actual de la imagen: "${currentPrompt}"

El usuario quiere este cambio: "${instruction}"

Genera un nuevo prompt de imagen optimizado que aplique el cambio solicitado.
Responde SOLO con el nuevo prompt, sin explicaciones, en inglés.
Máximo 200 palabras.`;

    const newPrompt = await llm.complete(prompt, { temperature: 0.7 });

    // Generate new image
    const result = await pipeline.generateImage(newPrompt.trim());

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
   * Regeneración Pro — genera imágenes con el modelo seleccionado.
   * Soporta modelos KIE (Ideogram, GPT Image, Flux-2, etc.), Replicate, o estándar.
   */
  async regenerateImagePro(
    contentVersionId: string,
    customPrompt?: string,
    modelId?: ProImageModelId,
  ): Promise<{ mediaAssetId: string }> {
    const effectiveModel: ProImageModelId = modelId ?? 'ideogram/v3-text-to-image';
    const modelDef = PRO_IMAGE_MODELS.find(m => m.id === effectiveModel);
    const modelLabel = modelDef?.name ?? effectiveModel;
    this.logger.log(`Pro regeneration (${modelLabel}) for version ${contentVersionId}`);

    const version = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: { include: { editorialRun: { select: { workspaceId: true } } } } },
    });

    const workspaceId = version.brief.editorialRun?.workspaceId;

    // Resolve the image adapter based on model selection
    let imageAdapter: ImageGeneratorAdapter;
    let providerLabel: string;

    if (effectiveModel === 'standard') {
      // Use the standard fallback pipeline (Pollinations → HF → Replicate)
      imageAdapter = workspaceId
        ? (await this.getPipeline(workspaceId) as any).imageGen
        : (this.fallbackPipeline as any).imageGen;
      providerLabel = 'standard';
    } else if (effectiveModel.startsWith('replicate/')) {
      const replicateToken = this.config.get<string>('REPLICATE_API_TOKEN', '');
      if (!replicateToken) throw new Error('REPLICATE_API_TOKEN not configured');
      const replicateModel = effectiveModel.replace('replicate/', '') as any;
      imageAdapter = new ReplicateImageAdapter({ apiToken: replicateToken, defaultModel: replicateModel });
      providerLabel = `replicate-${replicateModel}`;
    } else {
      // KIE API model
      const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
      if (!kieApiKey) throw new Error(`KIE_AI_API_KEY not configured — cannot use ${modelLabel}`);
      imageAdapter = new KieImageProAdapter({ apiKey: kieApiKey, modelId: effectiveModel as KieImageModelId });
      providerLabel = `kie-${effectiveModel.split('/')[0]}`;
    }

    // Build the prompt
    const isTextModel = modelDef?.textCapability === 'excellent' || modelDef?.textCapability === 'good';
    let prompt: string;
    if (customPrompt) {
      prompt = customPrompt;
    } else {
      const llm = workspaceId ? await this.getLlm(workspaceId) : this.fallbackLlm;
      try {
        const systemPrompt = isTextModel
          ? `You are an expert at creating image generation prompts optimized for ${modelLabel}, which excels at rendering text inside images.
Given this social media post, create a visually striking image prompt that INCLUDES readable text overlays as part of the design.
Design like a professional social media graphic with bold headlines and clean typography.`
          : `You are an expert at creating image generation prompts for ${modelLabel}.
Given this social media post, create a visually striking image prompt for a professional social media graphic.
Focus on visual impact, composition, and brand aesthetics.`;

        const llmResult = await llm.complete(
          `${systemPrompt}

Tone: ${version.brief.tone}. Format: ${version.brief.format}.
Topic: ${version.brief.angle}
Post content: ${version.copy.substring(0, 500)}

${isTextModel ? 'Include the key message as text IN the image. ' : ''}Respond ONLY with the prompt in English. Max 150 words.`,
          { temperature: 0.8, maxTokens: 300 },
        );
        prompt = llmResult.trim();
      } catch {
        prompt = isTextModel
          ? `Professional social media graphic about "${version.brief.angle}", bold headline text, clean modern typography, vibrant design, Instagram post style`
          : `Professional social media image about "${version.brief.angle}", vibrant, high quality, Instagram post style`;
      }
    }

    const result = await imageAdapter.generate(prompt);

    // Mark previous images as replaced
    await this.prisma.mediaAsset.updateMany({
      where: { contentVersionId, type: 'IMAGE' },
      data: { status: 'FAILED', metadata: { replaced: true, replacedAt: new Date().toISOString() } },
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId,
        type: 'IMAGE',
        prompt: result.prompt,
        provider: providerLabel,
        originalUrl: result.url,
        optimizedUrl: result.url,
        status: 'READY',
        metadata: { ...(result.metadata ?? {}), proRegeneration: true, model: effectiveModel } as any,
      },
    });

    return { mediaAssetId: asset.id };
  }

  /**
   * Genera música de fondo usando KIE Suno API.
   * Almacena como MediaAsset tipo AUDIO vinculado al ContentVersion.
   */
  async generateBackgroundMusic(
    contentVersionId: string,
    style?: string,
    customPrompt?: string,
  ): Promise<{ mediaAssetId: string; audioUrl: string }> {
    this.logger.log(`Generating background music for version ${contentVersionId}, style: ${style ?? 'upbeat'}`);

    const version = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: { include: { editorialRun: { select: { workspaceId: true } } } } },
    });

    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY not configured — cannot generate music');
    }

    const musicAdapter = new KieMusicAdapter({ apiKey: kieApiKey });

    const result = await musicAdapter.generateAndWait({
      style: style ?? 'upbeat',
      prompt: customPrompt,
      instrumental: true,
    });

    if (result.status !== 'completed' || !result.audioUrl) {
      throw new Error(`Music generation failed: ${JSON.stringify(result.metadata)}`);
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId,
        type: 'AUDIO',
        prompt: customPrompt ?? `Background music: ${style ?? 'upbeat'}`,
        provider: result.provider,
        originalUrl: result.audioUrl,
        optimizedUrl: result.audioUrl,
        status: 'READY',
        metadata: {
          musicStyle: style ?? 'upbeat',
          title: result.title,
          duration: result.duration,
        } as any,
      },
    });

    return { mediaAssetId: asset.id, audioUrl: result.audioUrl };
  }

  /**
   * Genera una imagen promocional usando SharpRenderer (raster real) con fallback a SVG.
   * 1. Intenta composición Sharp (background + product + logo + text → PNG)
   * 2. Sube el PNG a Cloudinary si disponible
   * 3. Cae a SVG data URI si Sharp falla o no hay imágenes reales
   */
  private async generatePromotionalImage(
    version: { copy: string; caption: string; hook: string; title: string },
    brief: { angle: string; tone: string; format: string; cta: string },
    theme: { type: string; productName?: string | null; productPrice?: string | null; discountText?: string | null } | null,
    pipelineMedia: Array<{ url: string; productName?: string | null; productPrice?: string | null }>,
    logoUrl: string | null,
    businessProfile: { brandColors?: string[]; promotionStyle?: string | null; businessName?: string } | null,
    branding: Partial<BrandingConfig>,
  ): Promise<{ url: string; template: string }> {
    // Select template based on theme type
    let template: CompositionTemplate = 'product-showcase';
    const themeType = theme?.type ?? 'PRODUCT';
    if (themeType === 'OFFER' || themeType === 'SEASONAL') {
      template = theme?.discountText ? 'offer-banner' : 'price-tag';
    } else if (themeType === 'ANNOUNCEMENT') {
      template = 'announcement';
    } else if (themeType === 'TESTIMONIAL') {
      template = 'testimonial-card';
    } else if (themeType === 'SERVICE') {
      template = 'minimal-product';
    }

    // Pick the best product image
    const productMedia = pipelineMedia[0];
    const productImageUrl = productMedia?.url ?? undefined;

    // Build colors
    // Priority: VisualStyleProfile (already merged into branding) > BusinessProfile.brandColors > defaults
    const bizColors = businessProfile?.brandColors ?? [];
    const primaryColor = branding.primaryColor ?? bizColors[0] ?? '#6C63FF';
    const secondaryColor = branding.secondaryColor ?? bizColors[1] ?? '#F4F4FF';
    const accentColor = branding.accentColor ?? bizColors[2] ?? '#FF6B35';

    // Build overlay text
    const productName = theme?.productName ?? productMedia?.productName ?? version.title;
    const productPrice = theme?.productPrice ?? productMedia?.productPrice ?? undefined;

    const overlayText = {
      headline: version.hook || productName || brief.angle,
      subtitle: version.copy.substring(0, 80),
      price: productPrice ?? undefined,
      discount: theme?.discountText ?? undefined,
      cta: brief.cta || 'Ver más',
    };

    const brandColors = {
      primaryColor,
      secondaryColor,
      accentColor,
      textColor: '#FFFFFF',
      font: branding.primaryFont
        ? `'${branding.primaryFont}', Arial, Helvetica, sans-serif`
        : 'Arial, Helvetica, sans-serif',
    };

    // --- Try Sharp-based composition (real pixel compositing) ---
    if (productImageUrl && !productImageUrl.startsWith('data:')) {
      try {
        const sharpRenderer = new SharpRenderer();
        const rendered = await sharpRenderer.compose({
          width: 1080,
          height: 1080,
          background: primaryColor, // Solid brand color as background
          productImage: productImageUrl,
          logoImage: logoUrl ?? undefined,
          logoPosition: 'top-right',
          logoSizePercent: 12,
          productSizePercent: 55,
          overlayText,
          branding: brandColors,
          format: 'png',
        });

        // Upload to Cloudinary if available
        const cloudinary = await this.getCloudinaryAdapter();
        if (cloudinary) {
          const base64 = `data:image/png;base64,${rendered.buffer.toString('base64')}`;
          const uploaded = await cloudinary.upload(base64, 'syndra/promotional');
          this.logger.log(`Sharp composition uploaded to Cloudinary: ${uploaded.secureUrl}`);
          return { url: uploaded.secureUrl, template: `sharp-${template}` };
        }

        // No Cloudinary — return as data URI
        const base64Uri = `data:image/png;base64,${rendered.buffer.toString('base64')}`;
        return { url: base64Uri, template: `sharp-${template}` };
      } catch (sharpErr) {
        this.logger.warn(`Sharp composition failed, falling back to SVG: ${sharpErr}`);
      }
    }

    // --- Fallback: SVG composition ---
    const composer = new ImageComposer();
    const options: ComposeImageOptions = {
      template,
      productImageUrl,
      logoUrl: logoUrl ?? undefined,
      overlayText,
      branding: brandColors,
      logoPosition: 'top-right',
    };

    const composed = composer.compose(options);

    return {
      url: composed.svgDataUri,
      template,
    };
  }

  /**
   * Get Cloudinary adapter for the current workspace or from env fallback.
   */
  private async getCloudinaryAdapter(): Promise<CloudinaryAdapter | null> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    if (cloudName && cloudKey && cloudSecret) {
      return new CloudinaryAdapter({ cloudName, apiKey: cloudKey, apiSecret: cloudSecret });
    }
    return null;
  }

  /**
   * Intenta usar KIE Pro (Ideogram V3) para generar la imagen del batch.
   * Si KIE_AI_API_KEY está configurado, genera con Ideogram (texto legible en imágenes).
   * Si no, hace fallback al pipeline estándar gratuito.
   */
  /** Track KIE credit failures — resets after 30 min so KIE is retried if credits are replenished */
  private kieCreditsExhaustedAt: number | null = null;
  private readonly KIE_CREDITS_COOLDOWN_MS = 30 * 60 * 1000;

  private async generateSingleImageWithProFallback(
    version: { copy: string; caption: string },
    brief: { angle: string; tone: string; format: string; cta: string },
    llm: LLMAdapter,
    pipeline: MediaPipeline,
    workspaceId?: string,
    promptPrefix?: string,
  ): Promise<ImagePipelineResult> {
    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
    const kieExhausted = this.kieCreditsExhaustedAt !== null && (Date.now() - this.kieCreditsExhaustedAt) < this.KIE_CREDITS_COOLDOWN_MS;
    if (this.kieCreditsExhaustedAt !== null && !kieExhausted) {
      this.logger.log('KIE credits cooldown expired (30 min) — will retry KIE');
      this.kieCreditsExhaustedAt = null;
    }
    this.logger.debug(`KIE check: apiKey=${kieApiKey ? 'SET(' + kieApiKey.length + 'chars)' : 'EMPTY'}, creditsExhausted=${kieExhausted}`);
    if (!kieApiKey || kieExhausted) {
      this.logger.log(`Skipping KIE Pro — ${!kieApiKey ? 'no API key' : 'credits exhausted (cooldown ' + Math.round((this.KIE_CREDITS_COOLDOWN_MS - (Date.now() - (this.kieCreditsExhaustedAt ?? 0))) / 60000) + ' min left)'}, using standard pipeline`);
      return this.generateSingleImage(version, brief, llm, pipeline, promptPrefix);
    }

    const modelId = DEFAULT_BATCH_KIE_MODEL;
    const modelDef = PRO_IMAGE_MODELS.find(m => m.id === modelId);
    const modelLabel = modelDef?.name ?? modelId;
    this.logger.log(`Batch image: using KIE Pro model ${modelLabel}`);

    try {
      const formatLower = brief.format.toLowerCase();
      const isTextModel = modelDef?.textCapability === 'excellent' || modelDef?.textCapability === 'good';

      const systemPrompt = isTextModel
        ? `You are an expert at creating image generation prompts optimized for ${modelLabel}, which excels at rendering text inside images.
Given this social media post, create a visually striking image prompt that INCLUDES readable text overlays as part of the design.
Design like a professional social media graphic with bold headlines and clean typography.
The image should look like a polished Instagram post with integrated text elements.
Include the MAIN MESSAGE or HOOK as readable text in the image design.`
        : `You are an expert at creating image generation prompts for ${modelLabel}.
Given this social media post, create a visually striking professional social media graphic.
Focus on visual impact, composition, and brand aesthetics.`;

      const userMessage = `Topic: ${brief.angle}
Content summary: ${version.copy.substring(0, 400)}
Tone: ${brief.tone}
Format: ${brief.format}
CTA: ${brief.cta}${promptPrefix ? `\nBrand style notes: ${promptPrefix}` : ''}

${isTextModel ? 'Include the key message as readable text IN the image design. ' : ''}Respond ONLY with the prompt in English. Max 150 words.`;

      let prompt: string;
      try {
        const llmResult = await llm.complete(`${systemPrompt}\n\n${userMessage}`, { temperature: 0.8, maxTokens: 300 });
        prompt = llmResult.trim();
      } catch {
        prompt = isTextModel
          ? `Professional social media graphic about "${brief.angle}", bold headline text, clean modern typography, vibrant design, Instagram post style`
          : `Professional social media image about "${brief.angle}", vibrant, high quality, Instagram post style`;
      }

      const imageAdapter = new KieImageProAdapter({ apiKey: kieApiKey, modelId });
      const result = await imageAdapter.generate(prompt);

      return {
        originalUrl: result.url,
        optimizedUrl: result.url,
        thumbnailUrl: result.url,
        prompt: result.prompt,
        provider: `kie-${modelId.split('/')[0]}`,
        metadata: { kieBatch: true, model: modelId, ...(result.metadata ?? {}) },
      };
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes('402') || errMsg.includes('Credits insufficient') || errMsg.includes('balance')) {
        this.kieCreditsExhaustedAt = Date.now();
        this.logger.warn(`KIE credits exhausted — skipping KIE for remaining batch items. Falling back to standard.`);
      } else {
        this.logger.warn(`KIE Pro batch generation failed, falling back to standard: ${err}`);
      }
      return this.generateSingleImage(version, brief, llm, pipeline, promptPrefix);
    }
  }

  /**
   * Genera una imagen para un post usando LLM para crear un prompt rico y contextual.
   * El LLM analiza el copy, ángulo, tono y formato para generar un prompt
   * de imagen que realmente refleje el contenido del post.
   */
  private async generateSingleImage(
    version: { copy: string; caption: string },
    brief: { angle: string; tone: string; format: string; cta: string },
    llm: LLMAdapter,
    pipeline: MediaPipeline,
    promptPrefix?: string,
  ): Promise<ImagePipelineResult> {
    const formatLower = brief.format.toLowerCase();
    const aspectRatio = formatLower === 'story' || formatLower === 'reel' ? '9:16 vertical (1080x1920)' : '4:5 (1080x1350)';
    
    const systemPrompt = `You are an expert social media visual designer who creates prompts for AI image generation.
Your goal is to create PROFESSIONAL, VISUALLY STRIKING images for Instagram ${brief.format} posts.

STYLE GUIDELINES (create images like top social media accounts):
- Clean, modern, professional design with vibrant colors
- Hand-drawn illustration style with bold outlines, like editorial illustrations
- Include relevant ICONS, DIAGRAMS, or VISUAL METAPHORS that represent the topic
- Use a clean background (white, light gradient, or soft pastel)
- The image should look like a professional infographic or editorial illustration
- Think of popular Instagram business/tech accounts with illustrated content
- DO NOT include any text, words, letters, numbers, or typography - the image must be purely visual
- DO NOT create photorealistic images - use illustration/digital art style

COMPOSITION:
- Central visual element that represents the main concept
- Supporting icons or small illustrations around it
- Professional color palette (2-3 main colors)
- Clean whitespace, not cluttered
- Aspect ratio: ${aspectRatio}

Respond ONLY with the image prompt in English, no explanations. Max 120 words.`;

    const userMessage = `Topic: ${brief.angle}
Content summary: ${version.copy.substring(0, 400)}
Tone: ${brief.tone}
CTA: ${brief.cta}${promptPrefix ? `\nBrand style notes: ${promptPrefix}` : ''}`;

    let prompt: string;
    try {
      const llmResult = await llm.complete(
        `${systemPrompt}\n\n${userMessage}`,
        { temperature: 0.8, maxTokens: 300 },
      );
      prompt = llmResult.trim();
      this.logger.log(`LLM-generated image prompt: ${prompt.substring(0, 100)}...`);
    } catch (err) {
      this.logger.warn(`LLM prompt generation failed, using basic prompt: ${err}`);
      prompt = `Professional illustrated infographic about ${brief.angle}, clean modern design, hand-drawn style icons and diagrams, vibrant colors on white background, editorial illustration, no text`;
    }

    const dimensions = formatLower === 'story' || formatLower === 'reel'
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };

    return pipeline.generateImage(prompt, dimensions);
  }

  private async generateCarouselMedia(
    version: { copy: string; caption: string; hook: string; title: string },
    branding: Partial<BrandingConfig>,
    brief: { angle: string; tone: string },
    pipeline: MediaPipeline,
  ): Promise<CarouselPipelineResult> {
    // Determinar template según tono
    const category = this.toneToCategory(brief.tone);
    const template = getTemplateForCategory(category);

    // Construir slides desde el copy
    const slides = this.buildSlidesFromCopy(version, brief);

    return pipeline.generateCarousel(slides, branding, template);
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

  /**
   * Builds unique image prompts for each carousel slide.
   * Each prompt is tailored to the slide's content (cover, content point, CTA)
   * and produces illustrated, infographic-style images.
   */
  private buildCarouselImagePrompts(
    slides: CarouselSlide[],
    brief: { angle: string; tone: string; format: string; cta: string },
  ): string[] {
    const baseStyle = 'professional illustrated infographic style, clean modern design, hand-drawn icons and diagrams, bold outlines, vibrant colors on white background, editorial illustration, 4:5 aspect ratio, no text no words no letters no typography';

    return slides.map((slide, index) => {
      if (slide.type === 'cover') {
        return `Hero illustration representing "${brief.angle}", large central visual metaphor with supporting icons, eye-catching composition, ${baseStyle}`;
      }

      if (slide.type === 'cta') {
        return `Call to action illustration, hands pointing or sharing gesture, community and engagement visual metaphor, warm inviting colors, ${baseStyle}`;
      }

      // Content slides: each one focuses on its specific point
      const topic = slide.title || `Point ${index}`;
      const context = slide.body ? ` — ${slide.body.substring(0, 100)}` : '';
      return `Illustration explaining "${topic}"${context}, relevant icons and mini diagrams, educational infographic visual, ${baseStyle}`;
    });
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
