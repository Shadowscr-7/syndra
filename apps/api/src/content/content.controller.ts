import { Controller, Get, Param, Post, Body, HttpCode } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * POST /api/content/generate
   * Genera copy para un editorial run
   */
  @Post('generate')
  @HttpCode(200)
  async generate(
    @Body() body: { editorialRunId: string; workspaceId: string },
  ) {
    const result = await this.contentService.executeContentGeneration(
      body.editorialRunId,
      body.workspaceId,
    );
    return { data: result };
  }

  /**
   * POST /api/content/correct
   * Corrige una versión basándose en feedback humano
   */
  @Post('correct')
  @HttpCode(200)
  async correct(
    @Body()
    body: {
      contentVersionId: string;
      feedback: string;
      workspaceId: string;
    },
  ) {
    const result = await this.contentService.applyCorrection(
      body.contentVersionId,
      body.feedback,
      body.workspaceId,
    );
    return { data: result };
  }

  /**
   * POST /api/content/change-tone
   * Cambia el tono de una versión
   */
  @Post('change-tone')
  @HttpCode(200)
  async changeTone(
    @Body()
    body: {
      contentVersionId: string;
      newTone: string;
      workspaceId: string;
    },
  ) {
    const result = await this.contentService.changeTone(
      body.contentVersionId,
      body.newTone,
      body.workspaceId,
    );
    return { data: result };
  }
}
