// ============================================================
// ObservabilityService — Métricas operativas del SaaS
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Daily snapshot cron ───────────────────────────────

  @Cron('0 2 * * *', { name: 'daily-operational-metrics' }) // 2 AM daily
  async snapshotDailyMetrics() {
    this.logger.log('📊 Capturing daily operational metrics...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      runsCreated,
      runsFailed,
      runsPublished,
      runsApproved,
      runsRejected,
      pubsPublished,
      pubsFailed,
      totalWorkspaces,
      activeWorkspaces,
    ] = await Promise.all([
      this.prisma.editorialRun.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.editorialRun.count({ where: { status: 'FAILED', updatedAt: { gte: yesterday, lt: today } } }),
      this.prisma.editorialRun.count({ where: { status: 'PUBLISHED', updatedAt: { gte: yesterday, lt: today } } }),
      this.prisma.editorialRun.count({ where: { status: 'APPROVED', updatedAt: { gte: yesterday, lt: today } } }),
      this.prisma.editorialRun.count({ where: { status: 'REJECTED', updatedAt: { gte: yesterday, lt: today } } }),
      this.prisma.publication.count({ where: { status: 'PUBLISHED', publishedAt: { gte: yesterday, lt: today } } }),
      this.prisma.publication.count({ where: { status: 'FAILED', createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.workspace.count(),
      this.prisma.editorialRun.groupBy({
        by: ['workspaceId'],
        where: { createdAt: { gte: yesterday } },
      }).then((r) => r.length),
    ]);

    const metrics: { metric: string; value: number }[] = [
      { metric: 'runs_created', value: runsCreated },
      { metric: 'runs_failed', value: runsFailed },
      { metric: 'runs_published', value: runsPublished },
      { metric: 'runs_approved', value: runsApproved },
      { metric: 'runs_rejected', value: runsRejected },
      { metric: 'pubs_published', value: pubsPublished },
      { metric: 'pubs_failed', value: pubsFailed },
      { metric: 'total_workspaces', value: totalWorkspaces },
      { metric: 'active_workspaces', value: activeWorkspaces },
    ];

    // Approval rate
    const totalDecisions = runsApproved + runsRejected;
    if (totalDecisions > 0) {
      metrics.push({ metric: 'approval_rate', value: Math.round((runsApproved / totalDecisions) * 100) });
    }

    // Avg cycle time (idea → published) for the day
    const publishedRuns = await this.prisma.editorialRun.findMany({
      where: { status: 'PUBLISHED', updatedAt: { gte: yesterday, lt: today } },
      select: { createdAt: true, updatedAt: true },
    });
    if (publishedRuns.length > 0) {
      const totalHours = publishedRuns.reduce((sum, r) => {
        return sum + (r.updatedAt.getTime() - r.createdAt.getTime()) / 3600000;
      }, 0);
      metrics.push({ metric: 'avg_cycle_hours', value: Math.round((totalHours / publishedRuns.length) * 10) / 10 });
    }

    // Upsert each metric
    for (const { metric, value } of metrics) {
      await this.prisma.operationalMetric.upsert({
        where: { date_metric: { date: yesterday, metric } },
        update: { value },
        create: { date: yesterday, metric, value },
      });
    }

    this.logger.log(`📊 Stored ${metrics.length} operational metrics for ${yesterday.toISOString().split('T')[0]}`);
  }

  // ── Realtime dashboard (admin) ────────────────────────

  async getRealTimeMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      runsToday,
      runsFailedToday,
      pubsToday,
      pubsFailedToday,
      totalRuns30d,
      failedRuns30d,
      publishedRuns30d,
      approvedRuns30d,
      rejectedRuns30d,
      totalWorkspaces,
      inactiveWorkspaces,
      avgCycleTime,
    ] = await Promise.all([
      this.prisma.editorialRun.count({ where: { createdAt: { gte: today } } }),
      this.prisma.editorialRun.count({ where: { status: 'FAILED', updatedAt: { gte: today } } }),
      this.prisma.publication.count({ where: { status: 'PUBLISHED', publishedAt: { gte: today } } }),
      this.prisma.publication.count({ where: { status: 'FAILED', createdAt: { gte: today } } }),
      this.prisma.editorialRun.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.editorialRun.count({ where: { status: 'FAILED', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.editorialRun.count({ where: { status: 'PUBLISHED', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.editorialRun.count({ where: { status: 'APPROVED', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.editorialRun.count({ where: { status: 'REJECTED', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.workspace.count(),
      this.prisma.workspace.count({
        where: { editorialRuns: { none: { createdAt: { gte: sevenDaysAgo } } } },
      }),
      this.prisma.editorialRun.findMany({
        where: { status: 'PUBLISHED', createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, updatedAt: true },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const avgCycleHours = avgCycleTime.length > 0
      ? Math.round(
          (avgCycleTime.reduce((s, r) => s + (r.updatedAt.getTime() - r.createdAt.getTime()), 0) /
            avgCycleTime.length /
            3600000) *
            10,
        ) / 10
      : 0;

    const totalDecisions = approvedRuns30d + rejectedRuns30d;
    const approvalRate = totalDecisions > 0 ? Math.round((approvedRuns30d / totalDecisions) * 100) : 0;
    const failureRate = totalRuns30d > 0 ? Math.round((failedRuns30d / totalRuns30d) * 100) : 0;

    return {
      today: {
        runsCreated: runsToday,
        runsFailed: runsFailedToday,
        pubsPublished: pubsToday,
        pubsFailed: pubsFailedToday,
      },
      last30d: {
        totalRuns: totalRuns30d,
        failedRuns: failedRuns30d,
        publishedRuns: publishedRuns30d,
        approvedRuns: approvedRuns30d,
        rejectedRuns: rejectedRuns30d,
        approvalRate,
        failureRate,
        avgCycleHours,
      },
      health: {
        totalWorkspaces,
        inactiveWorkspaces,
        activeWorkspaces: totalWorkspaces - inactiveWorkspaces,
      },
    };
  }

  // ── Historical trend (last 14 days) ───────────────────

  async getMetricTrend(metric: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return this.prisma.operationalMetric.findMany({
      where: { metric, date: { gte: since } },
      orderBy: { date: 'asc' },
      select: { date: true, value: true },
    });
  }

  async getAllTrends(days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const raw = await this.prisma.operationalMetric.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // Group by metric
    const grouped: Record<string, { date: string; value: number }[]> = {};
    for (const r of raw) {
      if (!grouped[r.metric]) grouped[r.metric] = [];
      grouped[r.metric]!.push({ date: r.date.toISOString().split('T')[0] ?? '', value: r.value });
    }
    return grouped;
  }
}
