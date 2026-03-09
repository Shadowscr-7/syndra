// ============================================================
// Research Controller — Endpoints de investigación
// ============================================================

import { Controller, Get, Param, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ResearchService } from './research.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';

@Controller('research')
@UseGuards(PlanLimitsGuard)
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  /**
   * GET /api/research/:editorialRunId/snapshots
   * Devuelve los snapshots de research de un run
   */
  @Get(':editorialRunId/snapshots')
  async getSnapshots(@Param('editorialRunId') editorialRunId: string) {
    const snapshots = await this.researchService.getSnapshots(editorialRunId);
    return { data: snapshots, count: snapshots.length };
  }

  /**
   * POST /api/research/execute
   * Ejecuta el ciclo de research manualmente
   */
  @Post('execute')
  @HttpCode(200)
  @PlanCheck('RESEARCH_SOURCES')
  async executeResearch(
    @Body() body: { editorialRunId: string; workspaceId: string },
  ) {
    const result = await this.researchService.executeResearch(
      body.editorialRunId,
      body.workspaceId,
    );
    return { data: result };
  }
}
