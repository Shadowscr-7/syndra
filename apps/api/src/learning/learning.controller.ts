// ============================================================
// LearningController — API endpoints para el Learning Loop
// ============================================================

import { Controller, Get, Post, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { LearningService, LearningConfig } from './learning.service';

@Controller('learning')
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  /** GET /api/learning/profile — Full learning profile with patterns by dimension */
  @Get('profile')
  async getProfile(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: null, message: 'workspaceId required' };

    const result = await this.learningService.getPatternsByDimension(workspaceId);
    const config = await this.learningService.getLearningConfig(workspaceId);
    return { data: { ...result, config } };
  }

  /** GET /api/learning/patterns — Top and weak patterns */
  @Get('patterns')
  async getPatterns(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: null };

    const l = limit ? parseInt(limit, 10) : 5;
    const [top, weak] = await Promise.all([
      this.learningService.getTopPatterns(workspaceId, l),
      this.learningService.getWeakPatterns(workspaceId, l),
    ]);
    return { data: { top, weak } };
  }

  /** GET /api/learning/decisions — Recent decision logs */
  @Get('decisions')
  async getDecisions(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: [] };

    const l = limit ? parseInt(limit, 10) : 20;
    const decisions = await this.learningService.getDecisionLogs(workspaceId, l);
    return { data: decisions };
  }

  /** POST /api/learning/recalculate — Manual recalculation trigger */
  @Post('recalculate')
  async recalculate(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };

    const result = await this.learningService.recalculateProfiles(workspaceId);
    return { data: result };
  }

  /** PATCH /api/learning/config — Update learning configuration */
  @Patch('config')
  async updateConfig(
    @Req() req: any,
    @Body() body: Partial<LearningConfig>,
  ) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };

    const config = await this.learningService.updateLearningConfig(workspaceId, body);
    return { data: config };
  }

  /** GET /api/learning/config — Get current learning configuration */
  @Get('config')
  async getConfig(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: null };

    const config = await this.learningService.getLearningConfig(workspaceId);
    return { data: config };
  }

  /** GET /api/learning/insights — Strategy-ready insights (what the LLM would see) */
  @Get('insights')
  async getInsights(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: null };

    const insights = await this.learningService.getLearningInsightsForStrategy(workspaceId);
    return { data: insights };
  }
}
