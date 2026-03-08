// ============================================================
// AnalyticsService — Core analytics logic
// Fetches metrics from Meta, stores snapshots, computes aggregations
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  fetchInstagramMetrics,
  fetchFacebookMetrics,
  fetchPostFieldMetrics,
} from '@automatismos/publishers';
import type { MetaCredentials, PostMetrics } from '@automatismos/publishers';
import type { MetricBucket } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Metric Collection ───────────────────────────────────

  /**
   * Fetch and store metrics for all PUBLISHED publications
   * that haven't been updated recently.
   */
  async collectAllMetrics(workspaceId = 'default'): Promise<{
    updated: number;
    errors: number;
  }> {
    const publications = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        externalPostId: { not: null },
        editorialRun: { workspaceId },
      },
      select: {
        id: true,
        platform: true,
        externalPostId: true,
        publishedAt: true,
        metricsUpdatedAt: true,
      },
    });

    const credentials = this.getMetaCredentials();
    if (!credentials.accessToken) {
      this.logger.warn('No META_ACCESS_TOKEN configured — skipping metrics collection');
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    for (const pub of publications) {
      try {
        const metrics = await this.fetchMetricsForPublication(
          pub.platform,
          pub.externalPostId!,
          credentials,
        );

        await this.prisma.publication.update({
          where: { id: pub.id },
          data: {
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            saves: metrics.saves,
            reach: metrics.reach,
            impressions: metrics.impressions,
            engagementRate: metrics.engagementRate,
            metricsUpdatedAt: new Date(),
          },
        });

        // Determine snapshot bucket & store if appropriate
        await this.maybeStoreSnapshot(pub.id, pub.publishedAt, metrics);

        updated++;
      } catch (err) {
        this.logger.warn(`Failed to collect metrics for ${pub.id}: ${err}`);
        errors++;
      }
    }

    this.logger.log(`Metrics collection complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  }

  /**
   * Fetch metrics for a single publication
   */
  private async fetchMetricsForPublication(
    platform: string,
    externalPostId: string,
    credentials: MetaCredentials,
  ): Promise<PostMetrics> {
    try {
      if (platform === 'INSTAGRAM') {
        return await fetchInstagramMetrics(externalPostId, credentials);
      } else if (platform === 'FACEBOOK') {
        return await fetchFacebookMetrics(externalPostId, credentials);
      }
    } catch {
      // Fallback to basic field-level metrics
      const partial = await fetchPostFieldMetrics(externalPostId, credentials);
      return {
        likes: partial.likes ?? 0,
        comments: partial.comments ?? 0,
        shares: partial.shares ?? 0,
        saves: partial.saves ?? 0,
        reach: partial.reach ?? 0,
        impressions: partial.impressions ?? 0,
        engagementRate: partial.engagementRate ?? 0,
      };
    }
    return { likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, engagementRate: 0 };
  }

  /**
   * Store a metric snapshot at the appropriate time bucket
   */
  private async maybeStoreSnapshot(
    publicationId: string,
    publishedAt: Date | null,
    metrics: PostMetrics,
  ): Promise<void> {
    if (!publishedAt) return;

    const hoursSincePublish = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    let bucket: MetricBucket | null = null;

    // Map elapsed time to the closest bucket that hasn't been stored yet
    if (hoursSincePublish >= 1.5 && hoursSincePublish < 4) bucket = 'H2';
    else if (hoursSincePublish >= 5 && hoursSincePublish < 8) bucket = 'H6';
    else if (hoursSincePublish >= 20 && hoursSincePublish < 30) bucket = 'H24';
    else if (hoursSincePublish >= 42 && hoursSincePublish < 56) bucket = 'H48';
    else if (hoursSincePublish >= 156 && hoursSincePublish < 192) bucket = 'D7';

    if (!bucket) return;

    // Upsert: don't overwrite existing snapshot for this bucket
    const exists = await this.prisma.metricSnapshot.findUnique({
      where: { publicationId_bucket: { publicationId, bucket } },
    });

    if (!exists) {
      await this.prisma.metricSnapshot.create({
        data: {
          publicationId,
          bucket,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          reach: metrics.reach,
          impressions: metrics.impressions,
          engagementRate: metrics.engagementRate,
        },
      });
      this.logger.debug(`Snapshot ${bucket} stored for publication ${publicationId}`);
    }
  }

  // ── Dashboard Aggregations ─────────────────────────────

  /**
   * Get overview stats for the analytics dashboard
   */
  async getOverviewStats(workspaceId = 'default') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalPublished, last30, last7, avgMetrics, topPosts] = await Promise.all([
      // Total published ever
      this.prisma.publication.count({
        where: { status: 'PUBLISHED', editorialRun: { workspaceId } },
      }),
      // Published last 30 days
      this.prisma.publication.count({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
          editorialRun: { workspaceId },
        },
      }),
      // Published last 7 days
      this.prisma.publication.count({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
      }),
      // Average engagement metrics (last 30 days)
      this.prisma.publication.aggregate({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
          editorialRun: { workspaceId },
        },
        _avg: {
          likes: true,
          comments: true,
          shares: true,
          saves: true,
          reach: true,
          impressions: true,
          engagementRate: true,
        },
      }),
      // Top 5 posts by engagement
      this.prisma.publication.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
          editorialRun: { workspaceId },
        },
        orderBy: { engagementRate: 'desc' },
        take: 5,
        include: {
          editorialRun: {
            include: {
              contentBrief: { include: { theme: true } },
            },
          },
        },
      }),
    ]);

    return {
      totalPublished,
      last30Days: last30,
      last7Days: last7,
      averages: {
        likes: Math.round(avgMetrics._avg.likes ?? 0),
        comments: Math.round(avgMetrics._avg.comments ?? 0),
        shares: Math.round(avgMetrics._avg.shares ?? 0),
        saves: Math.round(avgMetrics._avg.saves ?? 0),
        reach: Math.round(avgMetrics._avg.reach ?? 0),
        impressions: Math.round(avgMetrics._avg.impressions ?? 0),
        engagementRate: Number((avgMetrics._avg.engagementRate ?? 0).toFixed(2)),
      },
      topPosts: topPosts.map((p) => ({
        id: p.id,
        platform: p.platform,
        permalink: p.permalink,
        publishedAt: p.publishedAt,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        saves: p.saves,
        reach: p.reach,
        engagementRate: p.engagementRate,
        theme: p.editorialRun?.contentBrief?.theme?.name ?? null,
        format: p.editorialRun?.contentBrief?.format ?? null,
        tone: p.editorialRun?.contentBrief?.tone ?? null,
      })),
    };
  }

  /**
   * Performance breakdown by theme / format / tone
   */
  async getPerformanceBreakdown(
    workspaceId = 'default',
    groupBy: 'theme' | 'format' | 'tone' = 'theme',
  ) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const publications = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: {
          include: {
            contentBrief: { include: { theme: true } },
          },
        },
      },
    });

    // Group by the requested dimension
    const groups = new Map<
      string,
      { count: number; totalLikes: number; totalComments: number; totalShares: number; totalSaves: number; totalReach: number; totalEngagement: number }
    >();

    for (const pub of publications) {
      const brief = pub.editorialRun?.contentBrief;
      let key = 'Sin clasificar';

      if (groupBy === 'theme') key = brief?.theme?.name ?? 'Sin tema';
      else if (groupBy === 'format') key = brief?.format ?? 'POST';
      else if (groupBy === 'tone') key = brief?.tone ?? 'Sin tono';

      const existing = groups.get(key) ?? {
        count: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        totalReach: 0,
        totalEngagement: 0,
      };

      existing.count++;
      existing.totalLikes += pub.likes;
      existing.totalComments += pub.comments;
      existing.totalShares += pub.shares;
      existing.totalSaves += pub.saves;
      existing.totalReach += pub.reach;
      existing.totalEngagement += pub.engagementRate ?? 0;

      groups.set(key, existing);
    }

    // Convert to sorted array
    return Array.from(groups.entries())
      .map(([label, data]) => ({
        label,
        count: data.count,
        avgLikes: Math.round(data.totalLikes / data.count),
        avgComments: Math.round(data.totalComments / data.count),
        avgShares: Math.round(data.totalShares / data.count),
        avgSaves: Math.round(data.totalSaves / data.count),
        avgReach: Math.round(data.totalReach / data.count),
        avgEngagement: Number((data.totalEngagement / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  /**
   * Best publishing hours based on historical performance
   */
  async getBestHours(workspaceId = 'default') {
    const publications = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        editorialRun: { workspaceId },
      },
      select: {
        publishedAt: true,
        engagementRate: true,
        likes: true,
        reach: true,
      },
    });

    const hourBuckets = new Map<number, { count: number; totalEngagement: number }>();

    for (const pub of publications) {
      if (!pub.publishedAt) continue;
      const hour = pub.publishedAt.getHours();
      const existing = hourBuckets.get(hour) ?? { count: 0, totalEngagement: 0 };
      existing.count++;
      existing.totalEngagement += pub.engagementRate ?? 0;
      hourBuckets.set(hour, existing);
    }

    return Array.from(hourBuckets.entries())
      .map(([hour, data]) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        count: data.count,
        avgEngagement: Number((data.totalEngagement / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  /**
   * Get metric snapshots for a specific publication (growth curve)
   */
  async getGrowthCurve(publicationId: string) {
    const snapshots = await this.prisma.metricSnapshot.findMany({
      where: { publicationId },
      orderBy: { collectedAt: 'asc' },
    });

    const pub = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: {
        likes: true,
        comments: true,
        shares: true,
        saves: true,
        reach: true,
        impressions: true,
        engagementRate: true,
        metricsUpdatedAt: true,
      },
    });

    return {
      snapshots: snapshots.map((s) => ({
        bucket: s.bucket,
        likes: s.likes,
        comments: s.comments,
        shares: s.shares,
        saves: s.saves,
        reach: s.reach,
        impressions: s.impressions,
        engagementRate: s.engagementRate,
        collectedAt: s.collectedAt,
      })),
      current: pub,
    };
  }

  /**
   * Executive summary — aggregated high-level KPIs for the dashboard
   */
  async getExecutiveSummary(workspaceId = 'default') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const baseWhere = (from: Date, to?: Date) => ({
      status: 'PUBLISHED' as const,
      editorialRun: { workspaceId },
      publishedAt: to ? { gte: from, lte: to } : { gte: from },
    });

    const [
      totalPubs,
      thisMonthPubs,
      prevMonthPubs,
      avgEngagement,
      platformStats,
      totalRuns,
      successRuns,
    ] = await Promise.all([
      this.prisma.publication.count({
        where: { status: 'PUBLISHED', editorialRun: { workspaceId } },
      }),
      this.prisma.publication.count({ where: baseWhere(startOfMonth) }),
      this.prisma.publication.count({ where: baseWhere(prevMonthStart, prevMonthEnd) }),
      this.prisma.publication.aggregate({
        where: baseWhere(startOfMonth),
        _avg: { engagementRate: true },
      }),
      this.prisma.publication.groupBy({
        by: ['platform'],
        where: { status: 'PUBLISHED', editorialRun: { workspaceId } },
        _count: true,
      }),
      this.prisma.editorialRun.count({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.editorialRun.count({
        where: { workspaceId, createdAt: { gte: startOfMonth }, status: 'PUBLISHED' },
      }),
    ]);

    const growth = prevMonthPubs > 0
      ? Math.round(((thisMonthPubs - prevMonthPubs) / prevMonthPubs) * 100)
      : thisMonthPubs > 0 ? 100 : 0;

    // Find best performing platform
    const platformMetrics = await Promise.all(
      platformStats.map(async (p) => {
        const agg = await this.prisma.publication.aggregate({
          where: { status: 'PUBLISHED', platform: p.platform, editorialRun: { workspaceId } },
          _avg: { engagementRate: true },
        });
        return { platform: p.platform, count: p._count, avgRate: agg._avg.engagementRate ?? 0 };
      }),
    );

    const bestPlatform = platformMetrics.sort((a, b) => b.avgRate - a.avgRate)[0] ?? null;

    const PLATFORM_ICONS: Record<string, string> = {
      INSTAGRAM: '📸', FACEBOOK: '📘', TELEGRAM: '✈️', LINKEDIN: '💼', TWITTER: '🐦', TIKTOK: '🎵',
    };

    const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    return {
      data: {
        period: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        publications: {
          total: totalPubs,
          thisMonth: thisMonthPubs,
          growth,
        },
        engagement: {
          avg: avgEngagement._avg.engagementRate ?? 0,
          best: bestPlatform
            ? { platform: bestPlatform.platform, rate: bestPlatform.avgRate }
            : null,
        },
        pipeline: {
          totalRuns,
          successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0,
          avgCycleDays: 0,
        },
        channels: platformMetrics.map((p) => ({
          name: p.platform,
          count: p.count,
          icon: PLATFORM_ICONS[p.platform] ?? '📱',
        })),
      },
    };
  }

  /**
   * Weekly summary data for Telegram report
   */
  async getWeeklySummary(workspaceId = 'default') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [published, avg, best, worst] = await Promise.all([
      this.prisma.publication.count({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
      }),
      this.prisma.publication.aggregate({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
        _avg: { engagementRate: true, likes: true, reach: true },
      }),
      this.prisma.publication.findFirst({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
        orderBy: { engagementRate: 'desc' },
        include: {
          editorialRun: {
            include: { contentBrief: { include: { theme: true } } },
          },
        },
      }),
      this.prisma.publication.findFirst({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
        orderBy: { engagementRate: 'asc' },
        include: {
          editorialRun: {
            include: { contentBrief: { include: { theme: true } } },
          },
        },
      }),
    ]);

    return {
      totalPublished: published,
      avgEngagement: Number((avg._avg.engagementRate ?? 0).toFixed(2)),
      avgLikes: Math.round(avg._avg.likes ?? 0),
      avgReach: Math.round(avg._avg.reach ?? 0),
      bestPost: best
        ? {
            platform: best.platform,
            engagementRate: best.engagementRate,
            likes: best.likes,
            reach: best.reach,
            theme: best.editorialRun?.contentBrief?.theme?.name ?? null,
            permalink: best.permalink,
          }
        : null,
      worstPost: worst
        ? {
            platform: worst.platform,
            engagementRate: worst.engagementRate,
            likes: worst.likes,
            theme: worst.editorialRun?.contentBrief?.theme?.name ?? null,
          }
        : null,
    };
  }

  // ── Helpers ────────────────────────────────────────────

  private getMetaCredentials(): MetaCredentials {
    return {
      accessToken: process.env.META_ACCESS_TOKEN ?? '',
      instagramAccountId: process.env.META_IG_USER_ID,
      facebookPageId: process.env.META_FB_PAGE_ID,
    };
  }
}
