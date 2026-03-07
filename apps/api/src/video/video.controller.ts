// ============================================================
// Video Controller — REST endpoints para gestión de videos
// ============================================================

import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { VideoService } from './video.service';

@Controller('api/videos')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(private readonly videoService: VideoService) {}

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
}
