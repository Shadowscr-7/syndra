// ============================================================
// Video Controller — REST endpoints para gestión de videos
// ============================================================

import { Controller, Get, Post, Param, Query, Body, Req, Logger, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoTierRouterService } from './video-tier-router.service';
import { VideoCreditService } from './video-credit.service';
import { VideoCompositorService, AVAILABLE_VOICES } from './video-compositor.service';
import { AiDirectorService } from './ai-director.service';
import { AvatarSceneService } from './avatar-scene.service';
import type { AvatarSceneStoryboard } from './ai-director.service';
import { VIDEO_PRESETS } from './video-presets';
import { PlanLimitsGuard, PlanCheck, RequireFeature } from '../plans/plan-limits.guard';
import { UseCredits, CreditGuard } from '../credits/credit.guard';
import { CreditInterceptor } from '../credits/credit.interceptor';

@Controller('videos')
@UseGuards(PlanLimitsGuard)
@RequireFeature('video')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(
    private readonly videoService: VideoService,
    private readonly tierRouter: VideoTierRouterService,
    private readonly credits: VideoCreditService,
    private readonly compositor: VideoCompositorService,
    private readonly aiDirector: AiDirectorService,
    private readonly avatarScene: AvatarSceneService,
  ) {}

  // ── Rutas estáticas (ANTES de :id para evitar colisiones) ──

  /**
   * GET /api/videos — Lista video assets de un workspace
   */
  @Get()
  async listVideos(
    @Req() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const wsId = workspaceId ?? req.workspaceId ?? 'default';
    return this.videoService.listVideoAssets(wsId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /api/videos/templates — Lista templates de video disponibles
   */
  @Get('templates')
  async getTemplates() {
    return this.videoService.getTemplates();
  }

  /**
   * GET /api/videos/providers — Proveedores disponibles
   */
  @Get('providers')
  async getProviders() {
    return this.tierRouter.getAvailableProviders();
  }

  /**
   * GET /api/videos/credits — Créditos de video del workspace
   */
  @Get('credits')
  async getCredits(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const wsId = workspaceId ?? req.workspaceId;
    if (!wsId) throw new BadRequestException('workspaceId requerido');
    return this.credits.getCurrentCredits(wsId);
  }

  /**
   * GET /api/videos/credits/history — Historial de créditos
   */
  @Get('credits/history')
  async getCreditHistory(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const wsId = workspaceId ?? req.workspaceId;
    if (!wsId) throw new BadRequestException('workspaceId requerido');
    return this.credits.getCreditHistory(wsId);
  }

  /**
   * GET /api/videos/render — Lista render jobs
   */
  @Get('render')
  async listRenderJobs(
    @Req() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
  ) {
    const wsId = workspaceId ?? req.workspaceId;
    if (!wsId) throw new BadRequestException('workspaceId requerido');
    return this.credits.getRenderJobs(wsId, limit ? Number(limit) : undefined);
  }

  /**
   * GET /api/videos/render/:jobId — Poll render status
   */
  @Get('render/:jobId')
  async pollRender(@Param('jobId') jobId: string) {
    return this.tierRouter.pollRenderJob(jobId);
  }

  /**
   * GET /api/videos/status/:mediaAssetId — Check render status
   */
  @Get('status/:mediaAssetId')
  async checkStatus(@Param('mediaAssetId') mediaAssetId: string) {
    return this.videoService.pollVideoStatus(mediaAssetId);
  }

  /**
   * GET /api/videos/preview/:editorialRunId — Preview script sin renderizar
   */
  @Get('preview/:editorialRunId')
  async previewScript(
    @Param('editorialRunId') editorialRunId: string,
    @Query('mode') mode?: 'news' | 'educational' | 'cta' | 'hybrid_motion',
  ) {
    return this.videoService.previewScript(editorialRunId, mode);
  }

  /**
   * GET /api/videos/export/:editorialRunId — Exporta script como post
   */
  @Get('export/:editorialRunId')
  async exportAsPost(
    @Param('editorialRunId') editorialRunId: string,
    @Query('mode') mode?: 'news' | 'educational' | 'cta' | 'hybrid_motion',
  ) {
    return this.videoService.exportScriptAsPost(editorialRunId, mode);
  }

  // ── Video Compositor GET routes (MUST be before :id) ──

  /**
   * GET /api/videos/compositor/voices — Voces disponibles para TTS
   */
  @Get('compositor/voices')
  getVoices() {
    return { data: AVAILABLE_VOICES };
  }

  /**
   * GET /api/videos/compositor/presets — Presets de video disponibles
   */
  @Get('compositor/presets')
  getPresets() {
    return { data: VIDEO_PRESETS };
  }

  /**
   * POST /api/videos/compositor/generate-script — Genera guión completo con IA
   */
  @Post('compositor/generate-script')
  async generateScript(
    @Body() body: {
      topic: string;
      intent: string;
      targetPlatform: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
      duration?: number;
      language?: string;
      productInfo?: { name?: string; price?: string; features?: string };
    },
  ) {
    if (!body.topic?.trim()) {
      throw new BadRequestException('Se requiere un tema (topic)');
    }
    this.logger.log(`Generate script: topic="${body.topic}", platform=${body.targetPlatform}, intent=${body.intent}`);
    return this.compositor.generateScript({
      topic: body.topic.trim(),
      intent: body.intent ?? 'informar',
      targetPlatform: body.targetPlatform ?? 'reels',
      duration: body.duration,
      language: body.language,
      productInfo: body.productInfo,
    });
  }

  // ── Rutas con parámetro dinámico (al final de los GET) ────────────

  /**
   * GET /api/videos/:id — Detalle de un video asset
   */
  @Get(':id')
  async getVideo(@Param('id') id: string) {
    return this.videoService.getVideoAsset(id);
  }

  // ── POST endpoints ─────────────────────────────────────

  /**
   * POST /api/videos/generate — Genera video desde un editorial run
   */
  @Post('generate')
  @PlanCheck('VIDEOS')
  @UseCredits('VIDEO_REEL_15S')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async generateVideo(
    @Body() body: {
      editorialRunId: string;
      workspaceId: string;
      mode?: 'news' | 'educational' | 'cta' | 'hybrid_motion';
      avatarId?: string;
      voiceId?: string;
    },
  ) {
    this.logger.log(`Generate video for run ${body.editorialRunId}`);
    return this.videoService.generateVideoFromRun(
      body.editorialRunId,
      body.workspaceId,
      {
        mode: body.mode,
        avatarId: body.avatarId,
        voiceId: body.voiceId,
      },
    );
  }

  /**
   * POST /api/videos/convert/:editorialRunId — Convierte contenido a video
   */
  @Post('convert/:editorialRunId')
  @PlanCheck('VIDEOS')
  @UseCredits('VIDEO_REEL_10S')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async convertToVideo(
    @Param('editorialRunId') editorialRunId: string,
    @Body() body?: { mode?: 'news' | 'educational' | 'cta' | 'hybrid_motion' },
  ) {
    this.logger.log(`Convert to video: run ${editorialRunId}`);
    return this.videoService.convertToVideo(editorialRunId, {
      mode: body?.mode,
    });
  }

  /**
   * POST /api/videos/render — Crear render job
   */
  @Post('render')
  @PlanCheck('VIDEOS')
  async createRenderJob(
    @Body() body: {
      workspaceId: string;
      editorialRunId?: string;
      tier?: string;
      provider?: string;
      inputType?: string;
      script?: string;
      duration?: number;
      aspectRatio?: string;
      imageUrl?: string;
      motionPrompt?: string;
    },
  ) {
    const tier = (body.tier ?? 'MVP') as any;
    await this.credits.consumeCredits(body.workspaceId, tier);

    return this.tierRouter.createRenderJob({
      workspaceId: body.workspaceId,
      editorialRunId: body.editorialRunId,
      tier,
      provider: body.provider as any,
      inputType: body.imageUrl ? 'IMAGE_TO_VIDEO' : (body.inputType ?? 'SCRIPT'),
      inputPayload: {
        script: body.script,
        duration: body.duration,
        imageUrl: body.imageUrl,
        motionPrompt: body.motionPrompt,
      },
      options: { aspectRatio: body.aspectRatio ?? '9:16' },
    });
  }

  /**
   * POST /api/videos/credits/add — Agregar créditos manualmente
   */
  @Post('credits/add')
  async addCredits(@Body() body: { workspaceId: string; amount: number }) {
    return this.credits.addCredits(body.workspaceId, body.amount);
  }

  // ── Video Compositor (Opción 1 — FFmpeg Pro) ──

  /**
   * POST /api/videos/compositor/render — Renderizar video con compositor
   */
  @Post('compositor/render')
  async renderCompositor(
    @Req() req: any,
    @Body() body: {
      imageIds?: string[];
      imageUrls?: string[];
      imageSlides?: Array<{
        mediaId?: string;
        url?: string;
        role?: 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
        order?: number;
        durationMs?: number;
        animation?: 'ken-burns-in' | 'ken-burns-out' | 'pan-left' | 'pan-right' | 'zoom-pulse' | 'none' | 'auto';
        caption?: string;
      }>;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      narrationText?: string;
      voiceId?: string;
      voiceSpeed?: 'slow' | 'normal' | 'fast';
      voiceTone?: 'low' | 'normal' | 'high';
      voiceEngine?: 'edge' | 'piper';
      enableSubtitles?: boolean;
      subtitleStyle?: 'pill' | 'minimal' | 'word-by-word' | 'karaoke';
      overlayTheme?: 'none' | 'minimal' | 'modern' | 'neon' | 'elegant';
      autoGenerateImages?: boolean;
      enableMusic?: boolean;
      musicStyle?: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
      mode?: 'general' | 'product';
      logoId?: string;
      productImageId?: string;
      productName?: string;
      productPrice?: string;
      productCta?: string;
    },
  ) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;

    if (!body.imageIds?.length && !body.imageUrls?.length && !body.imageSlides?.length && !body.autoGenerateImages) {
      throw new Error('Se necesita al menos una imagen o activar auto-generación');
    }

    this.logger.log(`Compositor render: ${body.imageSlides?.length ?? body.imageIds?.length ?? 0} images, mode=${body.mode ?? 'general'}`);

    return this.compositor.render({
      workspaceId,
      userId,
      ...body,
    });
  }

  // ── Kie AI Reels (Opción 2 — Kling 2.6) ──

  /**
   * POST /api/videos/kie-reels/render — Generar reel con Kie AI (Kling 2.6)
   */
  @Post('kie-reels/render')
  async renderKieReels(
    @Req() req: any,
    @Body() body: {
      prompt: string;
      duration?: 5 | 10;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    },
  ) {
    const workspaceId = req.workspaceId;

    if (!body.prompt?.trim()) {
      throw new Error('Se necesita un prompt para generar el video');
    }

    this.logger.log(`Kie Reels render: duration=${body.duration ?? 5}s`);

    // Use existing tier router with KIE provider
    return this.tierRouter.createRenderJob({
      workspaceId,
      tier: 'MVP' as any,
      provider: 'KIE' as any,
      inputType: 'SCRIPT',
      inputPayload: {
        script: body.prompt,
        duration: body.duration ?? 5,
      },
      options: { aspectRatio: body.aspectRatio ?? '9:16' },
    });
  }

  // ── Compositor image generation (Kie Ideogram) ──

  /**
   * POST /api/videos/compositor/generate-image — Genera imagen con Kie Ideogram para el compositor
   */
  @Post('compositor/generate-image')
  async generateCompositorImage(
    @Req() req: any,
    @Body() body: {
      prompt: string;
      language?: 'es' | 'en';
      includeText?: boolean;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    },
  ) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;

    if (!body.prompt?.trim()) {
      throw new BadRequestException('Se necesita un prompt para generar la imagen');
    }

    return this.compositor.generateImage({
      userId,
      workspaceId,
      prompt: body.prompt,
      language: body.language ?? 'es',
      includeText: body.includeText ?? false,
      aspectRatio: body.aspectRatio ?? '9:16',
    });
  }

  // ── AI narration improvement ──

  /**
   * POST /api/videos/compositor/improve-text — Mejora narración con IA
   */
  @Post('compositor/improve-text')
  async improveText(
    @Req() req: any,
    @Body() body: {
      text: string;
      intent: string;
    },
  ) {
    if (!body.text?.trim()) {
      throw new BadRequestException('Se necesita un texto para mejorar');
    }
    if (!body.intent?.trim()) {
      throw new BadRequestException('Se necesita una intención');
    }

    return this.compositor.improveNarration(body.text, body.intent);
  }

  // ── Avatar Scene Engine ────────────────────────────────────

  /**
   * POST /api/videos/avatar-scene/storyboard
   * Generate a coordinated storyboard from a topic or editorial run.
   * Does not render — returns the storyboard for preview/editing.
   */
  @Post('avatar-scene/storyboard')
  @PlanCheck('VIDEOS')
  async generateStoryboard(
    @Body() body: {
      // Option A: free topic
      topic?: string;
      intent?: string;
      industry?: string;
      personaTone?: string;
      // Option B: from editorial run
      editorialRunId?: string;
      // Common
      platform?: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
      durationTarget?: number;
      language?: string;
    },
  ) {
    if (body.editorialRunId) {
      const storyboard = await this.aiDirector.fromEditorialRun({
        editorialRunId: body.editorialRunId,
        platform: body.platform ?? 'reels',
        durationTarget: body.durationTarget,
      });
      return { storyboard };
    }

    if (!body.topic?.trim()) {
      throw new BadRequestException('Se necesita topic o editorialRunId');
    }

    const storyboard = await this.aiDirector.fromTopic({
      topic: body.topic,
      intent: body.intent,
      industry: body.industry,
      personaTone: body.personaTone,
      platform: body.platform ?? 'reels',
      durationTarget: body.durationTarget,
      language: body.language ?? 'es',
    });

    return { storyboard };
  }

  /**
   * POST /api/videos/avatar-scene/render
   * Render a full avatar+scene video from a storyboard.
   * Requires VIDEOS plan feature. Costs credits (35 base).
   */
  @Post('avatar-scene/render')
  @PlanCheck('VIDEOS')
  async renderAvatarScene(
    @Req() req: any,
    @Body() body: {
      avatarId: string;
      voiceId?: string;
      storyboard: AvatarSceneStoryboard;
      enableMusic?: boolean;
    },
  ) {
    const workspaceId = req.workspaceId;

    if (!body.avatarId?.trim()) {
      throw new BadRequestException('Se necesita avatarId');
    }
    if (!body.storyboard?.segments?.length) {
      throw new BadRequestException('El storyboard debe tener al menos un segmento');
    }

    this.logger.log(
      `Avatar scene render: ${body.storyboard.segments.length} segments, mode=${body.storyboard.compositeMode}`,
    );

    return this.avatarScene.render({
      workspaceId,
      avatarId: body.avatarId,
      voiceId: body.voiceId,
      storyboard: body.storyboard,
      enableMusic: body.enableMusic ?? false,
    });
  }
}
