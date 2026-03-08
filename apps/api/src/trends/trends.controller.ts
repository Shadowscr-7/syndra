// ============================================================
// TrendsController — API REST para tendencias detectadas
// ============================================================

import { Controller, Get, Post, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
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
    @Query('workspaceId') workspaceId: string,
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

  /**
   * GET /trends/:id — Get a single trend
   */
  @Get(':id')
  async getTrend(@Param('id') id: string) {
    const trend = await this.trendService.getTrend(id);
    return { data: trend };
  }

  /**
   * POST /trends/detect — Trigger manual trend detection
   */
  @Post('detect')
  async detectTrends(@Query('workspaceId') workspaceId: string) {
    const result = await this.trendService.detectTrends(workspaceId);
    return { data: result };
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
    @Query('workspaceId') workspaceId: string,
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
    @Query('workspaceId') workspaceId: string,
  ) {
    const recommendation = await this.trendService.addTrendToPlan(id, workspaceId);
    return { data: recommendation };
  }
}
