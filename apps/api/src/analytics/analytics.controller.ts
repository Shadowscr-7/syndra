// ============================================================
// AnalyticsController — REST endpoints para Fase 5
// ============================================================

import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ScoringService } from './scoring.service';
import { BenchmarkService } from './benchmark.service';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';

@Controller('api/analytics')
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
  async getOverview(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getOverviewStats(workspaceId);
  }

  // ── Breakdowns ────────────────────────────────────────

  @Get('breakdown/theme')
  async breakdownByTheme(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getPerformanceBreakdown(workspaceId, 'theme');
  }

  @Get('breakdown/format')
  async breakdownByFormat(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getPerformanceBreakdown(workspaceId, 'format');
  }

  @Get('breakdown/tone')
  async breakdownByTone(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getPerformanceBreakdown(workspaceId, 'tone');
  }

  @Get('best-hours')
  async bestHours(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getBestHours(workspaceId);
  }

  // ── Growth Curve per Publication ──────────────────────

  @Get('growth/:publicationId')
  async growthCurve(@Param('publicationId') publicationId: string) {
    return this.analytics.getGrowthCurve(publicationId);
  }

  // ── Insights ──────────────────────────────────────────

  @Get('insights')
  async getInsights(@Query('workspaceId') workspaceId = 'default') {
    return this.scoring.getActiveInsights(workspaceId);
  }

  // ── Scoring ───────────────────────────────────────────

  @Get('score')
  async predictScore(
    @Query('workspaceId') workspaceId: string,
    @Query('themeId') themeId?: string,
    @Query('format') format?: string,
    @Query('tone') tone?: string,
    @Query('hour') hour?: string,
    @Query('day') day?: string,
  ) {
    return this.scoring.predictScore({
      workspaceId: workspaceId || 'default',
      themeId,
      format,
      tone,
      publishHour: hour ? Number(hour) : undefined,
      publishDayOfWeek: day ? Number(day) : undefined,
    });
  }

  // ── Manual Triggers ───────────────────────────────────

  @Post('collect')
  async triggerCollection(@Query('workspaceId') workspaceId = 'default') {
    const result = await this.analytics.collectAllMetrics(workspaceId);
    return { message: 'Metric collection complete', ...result };
  }

  @Post('generate-insights')
  async triggerInsights(@Query('workspaceId') workspaceId = 'default') {
    const count = await this.scoring.generateInsights(workspaceId);
    return { message: `Generated ${count} insights` };
  }

  // ── Executive Summary ──────────────────────────────────

  @Get('summary')
  async executiveSummary(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getExecutiveSummary(workspaceId);
  }

  // ── Weekly Summary ────────────────────────────────────

  @Get('weekly-summary')
  async weeklySummary(@Query('workspaceId') workspaceId = 'default') {
    return this.analytics.getWeeklySummary(workspaceId);
  }

  // ── Benchmarking ──────────────────────────────────────

  @Get('benchmark/platforms')
  async benchmarkPlatforms(@Query('workspaceId') workspaceId = 'default') {
    return this.benchmark.compareByPlatform(workspaceId);
  }

  @Get('benchmark/formats')
  async benchmarkFormats(@Query('workspaceId') workspaceId = 'default') {
    return this.benchmark.compareByFormat(workspaceId);
  }

  @Get('benchmark/campaigns')
  async benchmarkCampaigns(@Query('workspaceId') workspaceId = 'default') {
    return this.benchmark.compareByCampaign(workspaceId);
  }

  @Get('benchmark/recommendations')
  async benchmarkRecommendations(@Query('workspaceId') workspaceId = 'default') {
    return this.benchmark.getRecommendations(workspaceId);
  }

  // ── Advanced Scoring (#20) ────────────────────────────

  @Get('advanced-score')
  async advancedScore(
    @Query('workspaceId') workspaceId: string,
    @Query('themeId') themeId?: string,
    @Query('format') format?: string,
    @Query('tone') tone?: string,
    @Query('channel') channel?: string,
    @Query('hour') hour?: string,
    @Query('day') day?: string,
    @Query('industry') industry?: string,
  ) {
    return this.scoring.advancedScore({
      workspaceId: workspaceId || 'default',
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
