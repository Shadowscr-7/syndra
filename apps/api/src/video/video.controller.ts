// ============================================================
// Video Controller — REST endpoints para gestión de videos
// ============================================================

import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoTierRouterService } from './video-tier-router.service';
import { VideoCreditService } from './video-credit.service';

@Controller('api/videos')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(
    private readonly videoService: VideoService,
    private readonly tierRouter: VideoTierRouterService,
    private readonly credits: VideoCreditService,
  ) {}

  /**
   * GET /api/videos — Lista video assets de un workspace
   */
  @Get()
  async listVideos(
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const wsId = workspaceId ?? 'default';
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
   * GET /api/videos/:id — Detalle de un video asset
   */
  @Get(':id')
  async getVideo(@Param('id') id: string) {
    return this.videoService.getVideoAsset(id);
  }

  /**
   * POST /api/videos/generate — Genera video desde un editorial run
   */
  @Post('generate')
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

  // ── Tier Router endpoints (#21) ────────────────────────

  @Get('providers')
  async getProviders() {
    return this.tierRouter.getAvailableProviders();
  }

  @Post('render')
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
    },
  ) {
    // Consume credits first
    const tier = (body.tier ?? 'MVP') as any;
    await this.credits.consumeCredits(body.workspaceId, tier);

    return this.tierRouter.createRenderJob({
      workspaceId: body.workspaceId,
      editorialRunId: body.editorialRunId,
      tier,
      provider: body.provider as any,
      inputType: body.inputType ?? 'SCRIPT',
      inputPayload: { script: body.script, duration: body.duration },
      options: { aspectRatio: body.aspectRatio ?? '9:16' },
    });
  }

  @Get('render/:jobId')
  async pollRender(@Param('jobId') jobId: string) {
    return this.tierRouter.pollRenderJob(jobId);
  }

  @Get('render')
  async listRenderJobs(
    @Query('workspaceId') workspaceId = 'default',
    @Query('limit') limit?: string,
  ) {
    return this.credits.getRenderJobs(workspaceId, limit ? Number(limit) : undefined);
  }

  // ── Credit endpoints ───────────────────────────────────

  @Get('credits')
  async getCredits(@Query('workspaceId') workspaceId = 'default') {
    return this.credits.getCurrentCredits(workspaceId);
  }

  @Get('credits/history')
  async getCreditHistory(@Query('workspaceId') workspaceId = 'default') {
    return this.credits.getCreditHistory(workspaceId);
  }

  @Post('credits/add')
  async addCredits(@Body() body: { workspaceId: string; amount: number }) {
    return this.credits.addCredits(body.workspaceId, body.amount);
  }
}
