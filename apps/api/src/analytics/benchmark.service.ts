// ============================================================
// BenchmarkService — Cross-platform performance comparison
// Compares engagement across channels, formats, campaigns
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChannelBenchmark {
  platform: string;
  totalPubs: number;
  avgEngagement: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  bestFormat: string | null;
  bestTone: string | null;
  bestObjective: string | null;
  trend: 'UP' | 'DOWN' | 'FLAT';
}

export interface FormatBenchmark {
  format: string;
  platforms: Array<{ platform: string; avgEngagement: number; count: number }>;
  overall: number;
}

export interface BenchmarkRecommendation {
  type: 'FOCUS' | 'EXPERIMENT' | 'REDUCE' | 'OPPORTUNITY';
  channel: string;
  title: string;
  description: string;
  confidence: number;
}

@Injectable()
export class BenchmarkService {
  private readonly logger = new Logger(BenchmarkService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Compare across platforms ──────────────────────────

  async compareByPlatform(workspaceId: string): Promise<ChannelBenchmark[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const pubs = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: {
          include: { contentBrief: true, campaign: true },
        },
      },
    });

    const byPlatform = new Map<string, typeof pubs>();
    for (const p of pubs) {
      const key = p.platform;
      if (!byPlatform.has(key)) byPlatform.set(key, []);
      byPlatform.get(key)!.push(p);
    }

    const results: ChannelBenchmark[] = [];

    for (const [platform, platPubs] of byPlatform) {
      const avgEng = this.avg(platPubs.map((p) => p.engagementRate ?? 0));
      const avgReach = this.avg(platPubs.map((p) => p.reach ?? 0));
      const avgLikes = this.avg(platPubs.map((p) => p.likes ?? 0));
      const avgComments = this.avg(platPubs.map((p) => p.comments ?? 0));
      const avgShares = this.avg(platPubs.map((p) => p.shares ?? 0));

      // Best format
      const formatMap = new Map<string, number[]>();
      for (const p of platPubs) {
        const f = p.editorialRun?.contentBrief?.format ?? 'POST';
        if (!formatMap.has(f)) formatMap.set(f, []);
        formatMap.get(f)!.push(p.engagementRate ?? 0);
      }
      let bestFormat: string | null = null;
      let bestFormatAvg = -1;
      for (const [f, rates] of formatMap) {
        const a = this.avg(rates);
        if (a > bestFormatAvg) { bestFormat = f; bestFormatAvg = a; }
      }

      // Best tone
      const toneMap = new Map<string, number[]>();
      for (const p of platPubs) {
        const t = p.editorialRun?.contentBrief?.tone ?? 'unknown';
        if (!toneMap.has(t)) toneMap.set(t, []);
        toneMap.get(t)!.push(p.engagementRate ?? 0);
      }
      let bestTone: string | null = null;
      let bestToneAvg = -1;
      for (const [t, rates] of toneMap) {
        const a = this.avg(rates);
        if (a > bestToneAvg) { bestTone = t; bestToneAvg = a; }
      }

      // Best objective
      const objMap = new Map<string, number[]>();
      for (const p of platPubs) {
        const o = p.editorialRun?.campaign?.objective ?? 'GENERAL';
        if (!objMap.has(o)) objMap.set(o, []);
        objMap.get(o)!.push(p.engagementRate ?? 0);
      }
      let bestObj: string | null = null;
      let bestObjAvg = -1;
      for (const [o, rates] of objMap) {
        const a = this.avg(rates);
        if (a > bestObjAvg) { bestObj = o; bestObjAvg = a; }
      }

      // Trend: compare first 15 days vs last 15 days
      const recent = platPubs.filter((p) => p.publishedAt && p.publishedAt >= fifteenDaysAgo);
      const older = platPubs.filter((p) => p.publishedAt && p.publishedAt < fifteenDaysAgo);
      const recentAvg = this.avg(recent.map((p) => p.engagementRate ?? 0));
      const olderAvg = this.avg(older.map((p) => p.engagementRate ?? 0));
      let trend: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
      if (olderAvg > 0) {
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.1) trend = 'UP';
        else if (change < -0.1) trend = 'DOWN';
      }

      results.push({
        platform,
        totalPubs: platPubs.length,
        avgEngagement: Number(avgEng.toFixed(2)),
        avgReach: Math.round(avgReach),
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        avgShares: Math.round(avgShares),
        bestFormat,
        bestTone,
        bestObjective: bestObj,
        trend,
      });
    }

    return results.sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  // ── Compare by format across platforms ────────────────

  async compareByFormat(workspaceId: string): Promise<FormatBenchmark[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const pubs = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: { include: { contentBrief: true } },
      },
    });

    const formatPlatform = new Map<string, Map<string, number[]>>();
    for (const p of pubs) {
      const format = p.editorialRun?.contentBrief?.format ?? 'POST';
      const platform = p.platform;
      if (!formatPlatform.has(format)) formatPlatform.set(format, new Map());
      const inner = formatPlatform.get(format)!;
      if (!inner.has(platform)) inner.set(platform, []);
      inner.get(platform)!.push(p.engagementRate ?? 0);
    }

    const results: FormatBenchmark[] = [];
    for (const [format, platMap] of formatPlatform) {
      const platforms: FormatBenchmark['platforms'] = [];
      let allRates: number[] = [];
      for (const [platform, rates] of platMap) {
        platforms.push({ platform, avgEngagement: Number(this.avg(rates).toFixed(2)), count: rates.length });
        allRates = allRates.concat(rates);
      }
      results.push({
        format,
        platforms: platforms.sort((a, b) => b.avgEngagement - a.avgEngagement),
        overall: Number(this.avg(allRates).toFixed(2)),
      });
    }

    return results.sort((a, b) => b.overall - a.overall);
  }

  // ── Compare by campaign ───────────────────────────────

  async compareByCampaign(workspaceId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const pubs = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: { include: { campaign: true, contentBrief: true } },
      },
    });

    const byCampaign = new Map<string, { name: string; objective: string; pubs: typeof pubs }>();
    for (const p of pubs) {
      const cId = p.editorialRun?.campaignId ?? 'none';
      const cName = p.editorialRun?.campaign?.name ?? 'Sin campaña';
      const cObj = p.editorialRun?.campaign?.objective ?? 'GENERAL';
      if (!byCampaign.has(cId)) byCampaign.set(cId, { name: cName, objective: cObj, pubs: [] });
      byCampaign.get(cId)!.pubs.push(p);
    }

    return Array.from(byCampaign.entries()).map(([id, data]) => ({
      campaignId: id,
      name: data.name,
      objective: data.objective,
      totalPubs: data.pubs.length,
      avgEngagement: Number(this.avg(data.pubs.map((p) => p.engagementRate ?? 0)).toFixed(2)),
      avgReach: Math.round(this.avg(data.pubs.map((p) => p.reach ?? 0))),
      platforms: [...new Set(data.pubs.map((p) => p.platform))],
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  // ── Generate recommendations ──────────────────────────

  async getRecommendations(workspaceId: string): Promise<BenchmarkRecommendation[]> {
    const channels = await this.compareByPlatform(workspaceId);
    const formats = await this.compareByFormat(workspaceId);
    const recs: BenchmarkRecommendation[] = [];

    if (channels.length === 0) return recs;

    // Best channel → FOCUS
    const best = channels[0];
    if (best && best.totalPubs >= 3) {
      recs.push({
        type: 'FOCUS',
        channel: best.platform,
        title: `${best.platform} es tu canal más fuerte`,
        description: `Con ${best.avgEngagement}% de engagement promedio y tendencia ${best.trend === 'UP' ? 'al alza' : best.trend === 'DOWN' ? 'a la baja' : 'estable'}. Mejor formato: ${best.bestFormat}, mejor tono: ${best.bestTone}.`,
        confidence: Math.min(best.totalPubs / 10, 1),
      });
    }

    // Worst channel → EXPERIMENT or REDUCE
    if (channels.length > 1) {
      const worst = channels[channels.length - 1]!;
      if (worst && worst.totalPubs < 5) {
        recs.push({
          type: 'EXPERIMENT',
          channel: worst.platform,
          title: `Experimenta más en ${worst.platform}`,
          description: `Solo ${worst.totalPubs} publicaciones en 30 días. Necesitas más datos para validar este canal.`,
          confidence: 0.3,
        });
      } else if (worst && best && worst.avgEngagement < best.avgEngagement * 0.5) {
        recs.push({
          type: 'REDUCE',
          channel: worst.platform,
          title: `Considera reducir esfuerzo en ${worst.platform}`,
          description: `${worst.avgEngagement}% engagement vs ${best.avgEngagement}% en ${best.platform}. Podría ser más eficiente redistribuir.`,
          confidence: Math.min(worst.totalPubs / 10, 0.8),
        });
      }
    }

    // Cross-format opportunity
    for (const fmt of formats) {
      if (fmt.platforms.length >= 2) {
        const top = fmt.platforms[0]!;
        const bottom = fmt.platforms[fmt.platforms.length - 1]!;
        if (top && bottom && top.avgEngagement > bottom.avgEngagement * 2 && bottom.count >= 2) {
          recs.push({
            type: 'OPPORTUNITY',
            channel: top.platform,
            title: `${fmt.format} rinde mejor en ${top.platform}`,
            description: `${top.avgEngagement}% en ${top.platform} vs ${bottom.avgEngagement}% en ${bottom.platform}. Enfoca ${fmt.format} donde funciona.`,
            confidence: Math.min(top.count / 5, 0.9),
          });
        }
      }
    }

    return recs.sort((a, b) => b.confidence - a.confidence);
  }

  // ── Helpers ───────────────────────────────────────────

  private avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}
