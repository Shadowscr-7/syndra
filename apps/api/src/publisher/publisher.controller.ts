// ============================================================
// Publisher Controller — Endpoints REST para publicaciones
// ============================================================

import { Controller, Get, Post, Param, Query, Body, Logger, UseGuards } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';

@Controller('publications')
@UseGuards(PlanLimitsGuard)
export class PublisherController {
  private readonly logger = new Logger(PublisherController.name);

  constructor(private readonly publisherService: PublisherService) {}

  /**
   * GET /api/publications — Lista publicaciones con filtros
   */
  @Get()
  async list(
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('editorialRunId') editorialRunId?: string,
    @Query('take') take?: string,
  ) {
    const publications = await this.publisherService.listPublications({
      platform,
      status,
      editorialRunId,
      take: take ? parseInt(take, 10) : undefined,
    });

    return { data: publications, count: publications.length };
  }

  /**
   * GET /api/publications/:id — Detalle de una publicación
   */
  @Get(':id')
  async detail(@Param('id') id: string) {
    const publication = await this.publisherService.getPublication(id);
    return { data: publication };
  }

  /**
   * POST /api/publications/retry/:id — Reintentar publicación fallida
   */
  @Post('retry/:id')
  async retry(@Param('id') id: string) {
    this.logger.log(`Manual retry requested for publication ${id}`);
    const result = await this.publisherService.retryPublication(id);
    return { data: result };
  }

  /**
   * POST /api/publications/publish/:editorialRunId — Publicar manualmente un run aprobado
   */
  @Post('publish/:editorialRunId')
  @PlanCheck('PUBLICATIONS')
  async publishManually(@Param('editorialRunId') editorialRunId: string) {
    this.logger.log(`Manual publish requested for run ${editorialRunId}`);
    const results = await this.publisherService.publishManually(editorialRunId);
    return { data: results };
  }

  /**
   * POST /api/publications/enqueue — Encolar publicación desde pipeline
   */
  @Post('enqueue')
  @PlanCheck('PUBLICATIONS')
  async enqueue(
    @Body() body: { editorialRunId: string; workspaceId: string },
  ) {
    const ids = await this.publisherService.enqueuePublication(
      body.editorialRunId,
      body.workspaceId,
    );
    return { data: { publicationIds: ids } };
  }
}
