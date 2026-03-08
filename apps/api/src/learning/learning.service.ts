// ============================================================
// LearningService — Motor de aprendizaje adaptativo
// Analiza rendimiento histórico y genera perfiles de patrones
// que alimentan al StrategyService.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Shape of the learningConfig JSON stored in Workspace */
export interface LearningConfig {
  autoApply: boolean;          // true = strategy auto-uses learnings, false = recommendation only
  dimensions: string[];        // Which PatternDimension enums are enabled
  minConfidence: number;       // 0-1, minimum confidence to apply a pattern
  dataWindowDays: number;      // Rolling window for data aggregation
}

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  autoApply: false,            // Default: recommendation only
  dimensions: ['THEME', 'FORMAT', 'TONE', 'CTA', 'HOUR', 'DAY'],
  minConfidence: 0.3,
  dataWindowDays: 30,
};

/** Insight ready for prompt injection */
export interface LearningInsight {
  dimension: string;
  topPerformers: { value: string; score: number; trend: string; sampleSize: number }[];
  lowPerformers: { value: string; score: number; trend: string }[];
}

/** Full learning data for strategy prompt */
export interface StrategyLearningData {
  autoApply: boolean;
  confidence: number;
  profileStatus: string;
  insights: LearningInsight[];
  summary: string;
}

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Configuration helpers ────────────────────────────────

  async getLearningConfig(workspaceId: string): Promise<LearningConfig> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { learningConfig: true },
    });
    if (!ws?.learningConfig || typeof ws.learningConfig !== 'object') {
      return { ...DEFAULT_LEARNING_CONFIG };
    }
    return { ...DEFAULT_LEARNING_CONFIG, ...(ws.learningConfig as Record<string, unknown>) } as LearningConfig;
  }

  async updateLearningConfig(workspaceId: string, patch: Partial<LearningConfig>): Promise<LearningConfig> {
    const current = await this.getLearningConfig(workspaceId);
    const merged = { ...current, ...patch };
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { learningConfig: merged as any },
    });
    return merged;
  }

  // ── Core recalculation engine ───────────────────────────

  /**
   * Recalculates the ContentLearningProfile and all ContentPatternScores
   * for a workspace using historical publication data.
   */
  async recalculateProfiles(workspaceId: string): Promise<{ patternsUpdated: number; confidence: number }> {
    const config = await this.getLearningConfig(workspaceId);
    const windowDays = config.dataWindowDays;
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    this.logger.log(`Recalculating learning profiles for workspace ${workspaceId} (window: ${windowDays}d)`);

    // Fetch published content with metrics
    const publications = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: cutoff },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: {
          include: {
            contentBrief: {
              include: {
                theme: true,
                contentVersions: { take: 1, orderBy: { score: 'desc' } },
              },
            },
          },
        },
      },
    });

    if (publications.length === 0) {
      this.logger.log(`No publications found for workspace ${workspaceId}, skipping`);
      return { patternsUpdated: 0, confidence: 0 };
    }

    // Upsert learning profile (null platform = ALL)
    const profile = await this.prisma.contentLearningProfile.upsert({
      where: { workspaceId_platform: { workspaceId, platform: 'ALL' } },
      create: {
        workspaceId,
        platform: 'ALL',
        dataWindowDays: windowDays,
        minimumDataThreshold: 3,
        status: publications.length >= 5 ? 'ACTIVE' : 'LOW_DATA',
        lastCalculatedAt: new Date(),
      },
      update: {
        dataWindowDays: windowDays,
        lastCalculatedAt: new Date(),
        status: publications.length >= 5 ? 'ACTIVE' : 'LOW_DATA',
      },
    });

    // Build aggregation maps for each enabled dimension
    const dimensions = config.dimensions;
    const patternData: Map<string, Map<string, {
      engagements: number[];
      reaches: number[];
      saves: number[];
      comments: number[];
    }>> = new Map();

    for (const dim of dimensions) {
      patternData.set(dim, new Map());
    }

    // Compute global baseline for normalization
    const allEngagements = publications.map(p => p.engagementRate ?? 0);
    const baseline = allEngagements.reduce((a, b) => a + b, 0) / Math.max(allEngagements.length, 1);

    for (const pub of publications) {
      const run = pub.editorialRun as any;
      const brief = run?.contentBrief;
      const version = brief?.contentVersions?.[0];

      const eng = pub.engagementRate ?? 0;
      const reach = pub.reach ?? 0;
      const saves = pub.saves ?? 0;
      const comments = pub.comments ?? 0;

      const addData = (dim: string, val: string | undefined | null) => {
        if (!val || !patternData.has(dim)) return;
        const dimMap = patternData.get(dim)!;
        if (!dimMap.has(val)) {
          dimMap.set(val, { engagements: [], reaches: [], saves: [], comments: [] });
        }
        const bucket = dimMap.get(val)!;
        bucket.engagements.push(eng);
        bucket.reaches.push(reach);
        bucket.saves.push(saves);
        bucket.comments.push(comments);
      };

      // Extract dimension values from each publication
      addData('FORMAT', brief?.format);
      addData('TONE', brief?.tone);
      addData('THEME', brief?.theme?.name);
      addData('CTA', brief?.cta ? this.classifyCTA(brief.cta) : null);
      addData('HOUR', pub.publishedAt ? pub.publishedAt.getHours().toString().padStart(2, '0') : null);
      addData('DAY', pub.publishedAt ? ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'][pub.publishedAt.getDay()] : null);
      addData('HOOK_TYPE', version?.hook ? this.classifyHook(version.hook) : null);
      addData('LENGTH', version?.copy ? this.classifyLength(version.copy) : null);
    }

    // Upsert pattern scores
    let patternsUpdated = 0;

    for (const [dim, values] of patternData) {
      for (const [value, metrics] of values) {
        if (metrics.engagements.length === 0) continue;

        const n = metrics.engagements.length;
        const avgEng = metrics.engagements.reduce((a, b) => a + b, 0) / n;
        const avgReach = metrics.reaches.reduce((a, b) => a + b, 0) / n;
        const avgSaves = metrics.saves.reduce((a, b) => a + b, 0) / n;
        const avgComments = metrics.comments.reduce((a, b) => a + b, 0) / n;

        // Weighted score: engagement(50%) + reach(20%) + saves(20%) + comments(10%)
        // Normalized to 0-100 scale against baseline
        const rawScore = baseline > 0
          ? ((avgEng / baseline) * 50) + ((avgReach / Math.max(avgReach, 1)) * 20) +
            ((avgSaves / Math.max(avgSaves, 1)) * 20) + ((avgComments / Math.max(avgComments, 1)) * 10)
          : 50;
        const weightedScore = Math.min(Math.max(rawScore, 0), 100);

        // Trend detection: compare first half vs second half
        const trend = this.detectTrend(metrics.engagements);

        // Confidence based on sample size
        const confidence = Math.min(n / 10, 1);

        await this.prisma.contentPatternScore.upsert({
          where: {
            learningProfileId_dimensionType_dimensionValue: {
              learningProfileId: profile.id,
              dimensionType: dim as any,
              dimensionValue: value,
            },
          },
          create: {
            learningProfileId: profile.id,
            dimensionType: dim as any,
            dimensionValue: value,
            sampleSize: n,
            avgEngagement: Number(avgEng.toFixed(4)),
            avgReach: Number(avgReach.toFixed(2)),
            avgSaves: Number(avgSaves.toFixed(2)),
            avgComments: Number(avgComments.toFixed(2)),
            weightedScore: Number(weightedScore.toFixed(2)),
            trendDirection: trend,
            confidenceScore: Number(confidence.toFixed(2)),
          },
          update: {
            sampleSize: n,
            avgEngagement: Number(avgEng.toFixed(4)),
            avgReach: Number(avgReach.toFixed(2)),
            avgSaves: Number(avgSaves.toFixed(2)),
            avgComments: Number(avgComments.toFixed(2)),
            weightedScore: Number(weightedScore.toFixed(2)),
            trendDirection: trend,
            confidenceScore: Number(confidence.toFixed(2)),
          },
        });

        patternsUpdated++;
      }
    }

    // Update profile confidence as average of pattern confidences
    const avgConfidence = patternsUpdated > 0
      ? (await this.prisma.contentPatternScore.aggregate({
          where: { learningProfileId: profile.id },
          _avg: { confidenceScore: true },
        }))._avg.confidenceScore ?? 0
      : 0;

    await this.prisma.contentLearningProfile.update({
      where: { id: profile.id },
      data: { confidenceScore: avgConfidence },
    });

    this.logger.log(`Recalculated ${patternsUpdated} patterns, confidence=${avgConfidence.toFixed(2)}`);
    return { patternsUpdated, confidence: avgConfidence };
  }

  // ── Query methods ───────────────────────────────────────

  /** Return top-performing patterns per dimension */
  async getTopPatterns(workspaceId: string, limit = 5) {
    const profile = await this.prisma.contentLearningProfile.findUnique({
      where: { workspaceId_platform: { workspaceId, platform: 'ALL' } },
    });
    if (!profile) return [];

    return this.prisma.contentPatternScore.findMany({
      where: { learningProfileId: profile.id, sampleSize: { gte: 2 } },
      orderBy: { weightedScore: 'desc' },
      take: limit,
    });
  }

  /** Return underperforming patterns */
  async getWeakPatterns(workspaceId: string, limit = 5) {
    const profile = await this.prisma.contentLearningProfile.findUnique({
      where: { workspaceId_platform: { workspaceId, platform: 'ALL' } },
    });
    if (!profile) return [];

    return this.prisma.contentPatternScore.findMany({
      where: { learningProfileId: profile.id, sampleSize: { gte: 2 } },
      orderBy: { weightedScore: 'asc' },
      take: limit,
    });
  }

  /** Return patterns grouped by dimension for the dashboard */
  async getPatternsByDimension(workspaceId: string) {
    const profile = await this.prisma.contentLearningProfile.findUnique({
      where: { workspaceId_platform: { workspaceId, platform: 'ALL' } },
      include: {
        patternScores: {
          where: { sampleSize: { gte: 1 } },
          orderBy: { weightedScore: 'desc' },
        },
      },
    });

    if (!profile) return { profile: null, dimensions: {} };

    // Group patterns by dimension
    const dimensions: Record<string, typeof profile.patternScores> = {};
    for (const score of profile.patternScores) {
      const dim = score.dimensionType;
      if (!dimensions[dim]) dimensions[dim] = [];
      dimensions[dim].push(score);
    }

    return { profile, dimensions };
  }

  /** Return recent decision logs */
  async getDecisionLogs(workspaceId: string, limit = 20) {
    return this.prisma.learningDecisionLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Strategy integration ────────────────────────────────

  /**
   * Builds the learning data payload to inject into buildStrategyPrompt.
   * This is the core "feedback loop" method.
   */
  async getLearningInsightsForStrategy(workspaceId: string): Promise<StrategyLearningData | null> {
    const config = await this.getLearningConfig(workspaceId);

    const profile = await this.prisma.contentLearningProfile.findUnique({
      where: { workspaceId_platform: { workspaceId, platform: 'ALL' } },
      include: {
        patternScores: {
          where: {
            sampleSize: { gte: 2 },
            confidenceScore: { gte: config.minConfidence },
          },
          orderBy: { weightedScore: 'desc' },
        },
      },
    });

    if (!profile || profile.patternScores.length === 0) return null;

    // Group by dimension
    const byDim: Record<string, typeof profile.patternScores> = {};
    for (const s of profile.patternScores) {
      const d = s.dimensionType;
      if (!byDim[d]) byDim[d] = [];
      byDim[d].push(s);
    }

    const insights: LearningInsight[] = [];
    const summaryParts: string[] = [];

    for (const [dim, scores] of Object.entries(byDim)) {
      if (!config.dimensions.includes(dim)) continue;

      const sorted = [...scores].sort((a, b) => b.weightedScore - a.weightedScore);
      const top = sorted.slice(0, 3).map(s => ({
        value: s.dimensionValue,
        score: s.weightedScore,
        trend: s.trendDirection,
        sampleSize: s.sampleSize,
      }));

      const low = sorted.slice(-2).filter(s => s.weightedScore < 40).map(s => ({
        value: s.dimensionValue,
        score: s.weightedScore,
        trend: s.trendDirection,
      }));

      insights.push({ dimension: dim, topPerformers: top, lowPerformers: low });

      if (top.length > 0) {
        const dimLabel = this.getDimensionLabel(dim);
        const t = top[0]!;
        summaryParts.push(`${dimLabel}: mejor → ${t.value} (score ${t.score.toFixed(0)}, ${t.trend === 'UP' ? '📈 subiendo' : t.trend === 'DOWN' ? '📉 bajando' : '→ estable'})`);
      }
    }

    return {
      autoApply: config.autoApply,
      confidence: profile.confidenceScore,
      profileStatus: profile.status,
      insights,
      summary: summaryParts.join('\n'),
    };
  }

  // ── Decision logging ────────────────────────────────────

  /**
   * Logs a learning-driven decision for audit trail.
   */
  async logDecision(params: {
    workspaceId: string;
    editorialRunId?: string;
    decisionType: string;
    applied: boolean;
    reasonSummary: string;
    sourcePatternIds?: string[];
    beforeValue?: string;
    afterValue?: string;
    impactPrediction?: string;
  }) {
    return this.prisma.learningDecisionLog.create({
      data: {
        workspaceId: params.workspaceId,
        editorialRunId: params.editorialRunId,
        decisionType: params.decisionType as any,
        applied: params.applied,
        reasonSummary: params.reasonSummary,
        sourcePatternIds: params.sourcePatternIds ?? [],
        beforeValue: params.beforeValue,
        afterValue: params.afterValue,
        impactPrediction: params.impactPrediction,
      },
    });
  }

  // ── Classification helpers ──────────────────────────────

  /** Classify CTA text into a category */
  private classifyCTA(cta: string): string {
    const lower = cta.toLowerCase();
    if (lower.includes('comenta') || lower.includes('opina') || lower.includes('cuéntanos')) return 'ENGAGEMENT';
    if (lower.includes('guarda') || lower.includes('save')) return 'SAVE';
    if (lower.includes('comparte') || lower.includes('share') || lower.includes('envía')) return 'SHARE';
    if (lower.includes('link') || lower.includes('bio') || lower.includes('descarga') || lower.includes('regístrate')) return 'CLICK';
    if (lower.includes('sigue') || lower.includes('follow')) return 'FOLLOW';
    return 'OTHER';
  }

  /** Classify hook type from the first line */
  private classifyHook(hook: string): string {
    const lower = hook.toLowerCase();
    if (lower.includes('?') || lower.includes('sabías')) return 'QUESTION';
    if (lower.includes('error') || lower.includes('no hagas') || lower.includes('evita')) return 'NEGATIVE';
    if (lower.match(/^\d|top\s?\d|lista/)) return 'LISTICLE';
    if (lower.includes('secreto') || lower.includes('nadie') || lower.includes('pocos')) return 'CURIOSITY';
    if (lower.includes('cómo') || lower.includes('guía') || lower.includes('paso')) return 'HOW_TO';
    if (lower.includes('dato') || lower.includes('estudio') || lower.includes('%')) return 'STATISTIC';
    return 'STATEMENT';
  }

  /** Classify content length */
  private classifyLength(copy: string): string {
    const words = copy.split(/\s+/).length;
    if (words < 50) return 'SHORT';
    if (words < 150) return 'MEDIUM';
    if (words < 300) return 'LONG';
    return 'EXTRA_LONG';
  }

  /** Detect trend: compare first half engagement vs second half */
  private detectTrend(values: number[]): 'UP' | 'DOWN' | 'FLAT' {
    if (values.length < 4) return 'FLAT';
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;
    if (change > 0.15) return 'UP';
    if (change < -0.15) return 'DOWN';
    return 'FLAT';
  }

  /** Human-readable dimension labels */
  private getDimensionLabel(dim: string): string {
    const labels: Record<string, string> = {
      THEME: '🎯 Temática',
      FORMAT: '📐 Formato',
      TONE: '🎭 Tono',
      CTA: '📢 CTA',
      HOUR: '🕐 Hora',
      DAY: '📅 Día',
      HOOK_TYPE: '🪝 Hook',
      LENGTH: '📏 Extensión',
      VISUAL_STYLE: '🎨 Estilo visual',
    };
    return labels[dim] ?? dim;
  }
}
