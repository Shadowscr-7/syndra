// ============================================================
// Media Controller — Endpoints REST para gestión de media assets
// ============================================================

import { Controller, Get, Post, Param, Query, Body, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaEngineService } from './media-engine.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';
import { UseCredits, CreditGuard } from '../credits/credit.guard';
import { CreditInterceptor } from '../credits/credit.interceptor';

@Controller('media')
@UseGuards(PlanLimitsGuard)
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaEngine: MediaEngineService) {}

  /**
   * GET /api/media/assets?workspaceId=...&type=...&status=...&limit=...
   * Lista assets de media con filtros opcionales
   */
  @Get('assets')
  async listAssets(
    @Query('workspaceId') workspaceId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const assets = await this.mediaEngine.listAssets(workspaceId, {
      type,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      data: assets,
      total: assets.length,
    };
  }

  /**
   * POST /api/media/generate
   * Dispara generación de media para un editorial run
   */
  @Post('generate')
  @PlanCheck('STORAGE_MB')
  @UseCredits('IMAGE_STANDARD')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async generateMedia(
    @Body() body: { editorialRunId: string; workspaceId: string },
  ) {
    this.logger.log(`Manual media generation for run ${body.editorialRunId}`);

    const result = await this.mediaEngine.executeMediaGeneration(
      body.editorialRunId,
      body.workspaceId,
    );

    return {
      success: true,
      mediaAssetIds: result.mediaAssetIds,
    };
  }

  /**
   * POST /api/media/regenerate/:contentVersionId
   * Regenera la imagen de una version de contenido
   */
  @Post('regenerate/:contentVersionId')
  @UseCredits('IMAGE_STANDARD')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async regenerateImage(
    @Param('contentVersionId') contentVersionId: string,
    @Body() body: { customPrompt?: string },
  ) {
    this.logger.log(`Regenerating image for version ${contentVersionId}`);

    const result = await this.mediaEngine.regenerateImage(
      contentVersionId,
      body.customPrompt,
    );

    return {
      success: true,
      mediaAssetId: result.mediaAssetId,
    };
  }

  /**
   * POST /api/media/asset/:id/ai-edit
   * Edita un asset con instrucciones de IA
   * Body: { instruction: string }
   */
  @Post('asset/:id/ai-edit')
  @UseCredits('IMAGE_TEXT')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async aiEditAsset(
    @Param('id') assetId: string,
    @Body() body: { instruction: string },
  ) {
    this.logger.log(`AI edit request for asset ${assetId}: "${body.instruction}"`);

    const result = await this.mediaEngine.aiEditAsset(assetId, body.instruction);

    return {
      success: true,
      assetId: result.assetId,
      updatedUrl: result.updatedUrl,
    };
  }

  /**
   * POST /api/media/regenerate-pro/:contentVersionId
   * Regeneración Pro — Ideogram V3 especializado en texto en imágenes
   * Body: { customPrompt?: string }
   */
  @Post('regenerate-pro/:contentVersionId')
  @UseCredits('IMAGE_PRO_TEXT')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async regenerateImagePro(
    @Param('contentVersionId') contentVersionId: string,
    @Body() body: { customPrompt?: string; model?: string },
  ) {
    const modelLabel = body.model ?? 'Ideogram V3';
    this.logger.log(`Pro regeneration (${modelLabel}) for version ${contentVersionId}`);

    const result = await this.mediaEngine.regenerateImagePro(
      contentVersionId,
      body.customPrompt,
      body.model as any,
    );

    return {
      success: true,
      mediaAssetId: result.mediaAssetId,
    };
  }

  /**
   * POST /api/media/generate-music
   * Genera música de fondo para una publicación
   * Body: { contentVersionId: string, style?: string, prompt?: string }
   */
  @Post('generate-music')
  @UseCredits('MUSIC_BACKGROUND')
  @UseGuards(CreditGuard)
  @UseInterceptors(CreditInterceptor)
  async generateMusic(
    @Body() body: { contentVersionId: string; style?: string; prompt?: string },
  ) {
    this.logger.log(`Music generation for version ${body.contentVersionId}, style: ${body.style ?? 'upbeat'}`);

    const result = await this.mediaEngine.generateBackgroundMusic(
      body.contentVersionId,
      body.style,
      body.prompt,
    );

    return {
      success: true,
      mediaAssetId: result.mediaAssetId,
      audioUrl: result.audioUrl,
    };
  }
}
