// ============================================================
// TrendsController — API REST para tendencias detectadas
// ============================================================

import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentWorkspace } from '../auth/decorators';
import { TrendDetectionService } from './trend-detection.service';

@Controller('trends')
@UseGuards(AuthGuard)
export class TrendsController {
  constructor(private readonly trendService: TrendDetectionService) {}

  /**
   * GET /trends — List trends for workspace
   */
  @Get()
  async listTrends(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const trends = await this.trendService.listTrends(
      workspaceId,
      status,
      limit ? parseInt(limit) : 20,
    );
    return { data: trends };
  }

  // ── Source management (before :id routes) ────────────────

  /**
   * GET /trends/sources — List all research sources for workspace
   */
  @Get('sources')
  async listSources(@CurrentWorkspace() workspaceId: string) {
    const sources = await this.trendService.listSources(workspaceId);
    return { data: sources };
  }

  /**
   * POST /trends/sources — Create a new research source (RSS, Reddit, Google Alert)
   */
  @Post('sources')
  async createSource(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; type: string; url: string },
  ) {
    const source = await this.trendService.createSource(workspaceId, body);
    return { data: source };
  }

  /**
   * PATCH /trends/sources/:id — Update a research source
   */
  @Patch('sources/:id')
  async updateSource(
    @Param('id') id: string,
    @Body() body: { name?: string; url?: string; isActive?: boolean },
  ) {
    const source = await this.trendService.updateSource(id, body);
    return { data: source };
  }

  /**
   * DELETE /trends/sources/:id — Delete a research source
   */
  @Delete('sources/:id')
  async deleteSource(@Param('id') id: string) {
    await this.trendService.deleteSource(id);
    return { data: { deleted: true } };
  }

  /**
   * POST /trends/detect — Trigger manual trend detection
   */
  @Post('detect')
  async detectTrends(@CurrentWorkspace() workspaceId: string) {
    const result = await this.trendService.detectTrends(workspaceId);
    return { data: result };
  }

  // ── Parameterized routes ─────────────────────────────────

  /**
   * GET /trends/:id — Get a single trend
   */
  @Get(':id')
  async getTrend(@Param('id') id: string) {
    const trend = await this.trendService.getTrend(id);
    return { data: trend };
  }

  /**
   * PATCH /trends/:id/dismiss — Dismiss a trend
   */
  @Patch(':id/dismiss')
  async dismissTrend(@Param('id') id: string) {
    const trend = await this.trendService.updateTrendStatus(id, 'DISMISSED');
    return { data: trend };
  }

  /**
   * PATCH /trends/:id/use — Mark trend as used
   */
  @Patch(':id/use')
  async useTrend(@Param('id') id: string) {
    const trend = await this.trendService.updateTrendStatus(id, 'USED');
    return { data: trend };
  }

  /**
   * POST /trends/:id/create-run — Create editorial run from trend
   */
  @Post(':id/create-run')
  async createRunFromTrend(
    @Param('id') id: string,
    @CurrentWorkspace() workspaceId: string,
  ) {
    const run = await this.trendService.createRunFromTrend(id, workspaceId);
    return { data: run };
  }

  /**
   * POST /trends/:id/add-to-plan — Add trend to active strategy plan
   */
  @Post(':id/add-to-plan')
  async addTrendToPlan(
    @Param('id') id: string,
    @CurrentWorkspace() workspaceId: string,
  ) {
    const recommendation = await this.trendService.addTrendToPlan(id, workspaceId);
    return { data: recommendation };
  }
}
