// ============================================================
// AnalyticsController — REST endpoints para Fase 5
// ============================================================

import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ScoringService } from './scoring.service';
import { BenchmarkService } from './benchmark.service';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';
import { CurrentWorkspace } from '../auth/decorators';

@Controller('analytics')
@UseGuards(PlanLimitsGuard)
@RequireFeature('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly scoring: ScoringService,
    private readonly benchmark: BenchmarkService,
  ) {}

  // ── Overview ──────────────────────────────────────────

  @Get('overview')
  async getOverview(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getOverviewStats(workspaceId);
  }

  // ── Breakdowns ────────────────────────────────────────

  @Get('breakdown/theme')
  async breakdownByTheme(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getPerformanceBreakdown(workspaceId, 'theme');
  }

  @Get('breakdown/format')
  async breakdownByFormat(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getPerformanceBreakdown(workspaceId, 'format');
  }

  @Get('breakdown/tone')
  async breakdownByTone(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getPerformanceBreakdown(workspaceId, 'tone');
  }

  @Get('best-hours')
  async bestHours(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getBestHours(workspaceId);
  }

  // ── Growth Curve per Publication ──────────────────────

  @Get('growth/:publicationId')
  async growthCurve(@Param('publicationId') publicationId: string) {
    return this.analytics.getGrowthCurve(publicationId);
  }

  // ── Insights ──────────────────────────────────────────

  @Get('insights')
  async getInsights(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.scoring.getActiveInsights(workspaceId);
  }

  // ── Scoring ───────────────────────────────────────────

  @Get('score')
  async predictScore(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
    @Query('themeId') themeId?: string,
    @Query('format') format?: string,
    @Query('tone') tone?: string,
    @Query('hour') hour?: string,
    @Query('day') day?: string,
  ) {
    return this.scoring.predictScore({
      workspaceId: wsFromQuery || wsFromJwt || 'default',
      themeId,
      format,
      tone,
      publishHour: hour ? Number(hour) : undefined,
      publishDayOfWeek: day ? Number(day) : undefined,
    });
  }

  // ── Manual Triggers ───────────────────────────────────

  @Post('collect')
  async triggerCollection(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    const result = await this.analytics.collectAllMetrics(workspaceId);
    return { message: 'Metric collection complete', ...result };
  }

  @Post('generate-insights')
  async triggerInsights(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    const count = await this.scoring.generateInsights(workspaceId);
    return { message: `Generated ${count} insights` };
  }

  // ── Executive Summary ──────────────────────────────────

  @Get('summary')
  async executiveSummary(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getExecutiveSummary(workspaceId);
  }

  // ── Weekly Summary ────────────────────────────────────

  @Get('weekly-summary')
  async weeklySummary(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.analytics.getWeeklySummary(workspaceId);
  }

  // ── Benchmarking ──────────────────────────────────────

  @Get('benchmark/platforms')
  async benchmarkPlatforms(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.benchmark.compareByPlatform(workspaceId);
  }

  @Get('benchmark/formats')
  async benchmarkFormats(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.benchmark.compareByFormat(workspaceId);
  }

  @Get('benchmark/campaigns')
  async benchmarkCampaigns(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.benchmark.compareByCampaign(workspaceId);
  }

  @Get('benchmark/recommendations')
  async benchmarkRecommendations(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
  ) {
    const workspaceId = wsFromQuery || wsFromJwt || 'default';
    return this.benchmark.getRecommendations(workspaceId);
  }

  // ── Advanced Scoring (#20) ────────────────────────────

  @Get('advanced-score')
  async advancedScore(
    @CurrentWorkspace() wsFromJwt: string,
    @Query('workspaceId') wsFromQuery?: string,
    @Query('themeId') themeId?: string,
    @Query('format') format?: string,
    @Query('tone') tone?: string,
    @Query('channel') channel?: string,
    @Query('hour') hour?: string,
    @Query('day') day?: string,
    @Query('industry') industry?: string,
  ) {
    return this.scoring.advancedScore({
      workspaceId: wsFromQuery || wsFromJwt || 'default',
      themeId,
      format,
      tone,
      channel,
      publishHour: hour ? Number(hour) : undefined,
      publishDayOfWeek: day ? Number(day) : undefined,
      industry,
    });
  }
}
