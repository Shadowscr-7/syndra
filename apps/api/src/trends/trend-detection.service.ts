// ============================================================
// TrendDetectionService — Motor de detección de tendencias
// Clusteriza artículos por similitud semántica, detecta temas
// emergentes, calcula scores multi-dimensión y persiste señales.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import { EditorialOrchestratorService } from '../editorial/editorial-orchestrator.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  fetchRSSFeed,
  parseLLMJsonResponse,
  buildTrendDetectionPrompt,
  buildTrendEnrichmentPrompt,
} from '@automatismos/ai';
import type { LLMAdapter, TrendDetectionInput } from '@automatismos/ai';

interface DetectedTrend {
  themeLabel: string;
  normalizedTopic: string;
  headline: string;
  excerpt: string;
  suggestedAngle?: string;
  sourceArticleIndices: number[];
  noveltyScore: number;
  momentumScore: number;
  brandFitScore: number;
  engagementPotentialScore: number;
  urgencyScore: number;
  recommendedWindowHours: number;
}

@Injectable()
export class TrendDetectionService {
  private readonly logger = new Logger(TrendDetectionService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
    private readonly orchestrator: EditorialOrchestratorService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.fallbackLlm = provider === 'anthropic'
      ? new AnthropicAdapter({ apiKey })
      : new OpenAIAdapter({ apiKey });
  }

  private async resolveUserId(workspaceId: string): Promise<string | null> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    return wsUser?.userId ?? null;
  }

  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'LLM');
      if (payload?.apiKey) {
        const provider = payload.provider ?? 'openai';
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    return this.fallbackLlm;
  }

  // ── Core detection ───────────────────────────────────────

  /**
   * Execute full trend detection cycle for a workspace:
   * 1. Fetch RSS articles from all active sources
   * 2. Send to LLM for semantic clustering + trend detection
   * 3. Calculate final scores (weighted average)
   * 4. Persist high-scoring signals to DB
   * 5. Return new trends found
   */
  async detectTrends(workspaceId: string): Promise<{
    trendsFound: number;
    trends: Array<{ id: string; themeLabel: string; finalScore: number }>;
  }> {
    this.logger.log(`🔍 Starting trend detection for workspace ${workspaceId}`);

    // 1. Fetch RSS sources
    const sources = await this.prisma.researchSource.findMany({
      where: { workspaceId, isActive: true },
    });

    if (sources.length === 0) {
      this.logger.warn('No active research sources configured');
      return { trendsFound: 0, trends: [] };
    }

    const feedResults = await Promise.allSettled(
      sources
        .filter(s => s.type === 'RSS' || s.type === 'BLOG')
        .map(s => fetchRSSFeed(s.url, s.name)),
    );

    const allArticles: TrendDetectionInput['articles'] = [];
    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        for (const item of result.value) {
          allArticles.push({
            title: item.title,
            source: item.source,
            sourceUrl: item.link,
            excerpt: (item.content || item.description)?.substring(0, 300),
            publishedAt: item.pubDate ?? undefined,
          });
        }
      }
    }

    this.logger.log(`Fetched ${allArticles.length} articles from ${sources.length} sources`);

    if (allArticles.length === 0) {
      return { trendsFound: 0, trends: [] };
    }

    // Filter to recent articles (last 48h) and limit
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentArticles = allArticles
      .filter(a => {
        if (!a.publishedAt) return true;
        return new Date(a.publishedAt) > cutoff;
      })
      .slice(0, 30);

    // 2. Get workspace context
    const [workspace, brand, themes, existingTrends] = await Promise.all([
      this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { industry: true, objectives: true },
      }),
      this.prisma.brandProfile.findUnique({ where: { workspaceId } }),
      this.prisma.contentTheme.findMany({
        where: { workspaceId, isActive: true },
        select: { keywords: true },
      }),
      this.prisma.trendSignal.findMany({
        where: {
          workspaceId,
          status: { in: ['NEW', 'USED'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { normalizedTopic: true, themeLabel: true, createdAt: true, status: true },
      }),
    ]);

    // 3. Detect trends via LLM
    const llm = await this.getLlm(workspaceId);
    const input: TrendDetectionInput = {
      articles: recentArticles,
      workspace: {
        industry: workspace.industry ?? undefined,
        objectives: workspace.objectives,
        brandVoice: brand?.voice ?? '',
        brandTone: brand?.tone ?? 'didáctico',
        themeKeywords: themes.flatMap(t => t.keywords),
      },
      existingTrends: existingTrends.map(t => ({
        topic: t.themeLabel,
        createdAt: t.createdAt.toISOString().split('T')[0]!,
        status: t.status as string,
      })),
    };

    const prompt = buildTrendDetectionPrompt(input);

    let detected: DetectedTrend[];
    try {
      const response = await llm.complete(prompt, { temperature: 0.4, maxTokens: 4096 });
      const parsed = parseLLMJsonResponse<{ trends: DetectedTrend[] }>(response);
      detected = parsed.trends ?? [];
    } catch (error) {
      this.logger.error('Trend detection LLM failed:', error);
      return { trendsFound: 0, trends: [] };
    }

    this.logger.log(`LLM detected ${detected.length} potential trends`);

    // 4. Calculate final scores and filter
    const scoredTrends = detected.map(t => {
      // Weighted average: brandFit 30% + engagement 25% + novelty 20% + momentum 15% + urgency 10%
      const finalScore =
        (t.brandFitScore ?? 0) * 0.30 +
        (t.engagementPotentialScore ?? 0) * 0.25 +
        (t.noveltyScore ?? 0) * 0.20 +
        (t.momentumScore ?? 0) * 0.15 +
        (t.urgencyScore ?? 0) * 0.10;

      return { ...t, finalScore };
    }).filter(t => t.finalScore >= 0.4);

    // 5. Filter out duplicates (same normalized topic already exists)
    const existingTopics = new Set(existingTrends.map(t => t.normalizedTopic));
    const newTrends = scoredTrends.filter(t => !existingTopics.has(t.normalizedTopic));

    // 6. Persist to database
    const createdTrends = [];
    for (const trend of newTrends) {
      // Resolve source info from first matching article
      const firstArticleIdx = trend.sourceArticleIndices?.[0];
      const sourceArticle = firstArticleIdx !== undefined ? recentArticles[firstArticleIdx - 1] : undefined;

      const created = await this.prisma.trendSignal.create({
        data: {
          workspaceId,
          themeLabel: trend.themeLabel,
          normalizedTopic: trend.normalizedTopic,
          sourceType: sourceArticle?.source ?? 'rss',
          sourceUrl: sourceArticle?.sourceUrl ?? null,
          headline: trend.headline,
          excerpt: trend.excerpt,
          publishedAt: sourceArticle?.publishedAt ? new Date(sourceArticle.publishedAt) : null,
          noveltyScore: trend.noveltyScore ?? 0,
          momentumScore: trend.momentumScore ?? 0,
          brandFitScore: trend.brandFitScore ?? 0,
          engagementPotentialScore: trend.engagementPotentialScore ?? 0,
          urgencyScore: trend.urgencyScore ?? 0,
          finalScore: trend.finalScore,
          recommendedWindowHours: trend.recommendedWindowHours ?? 24,
          suggestedAngle: trend.suggestedAngle ?? null,
          status: 'NEW',
        },
      });
      createdTrends.push(created);
    }

    this.logger.log(`✅ Persisted ${createdTrends.length} new trend signals`);

    return {
      trendsFound: createdTrends.length,
      trends: createdTrends.map(t => ({
        id: t.id,
        themeLabel: t.themeLabel,
        finalScore: t.finalScore,
      })),
    };
  }

  // ── Expire old trends ────────────────────────────────────

  async expireOldTrends(workspaceId: string) {
    const result = await this.prisma.trendSignal.updateMany({
      where: {
        workspaceId,
        status: 'NEW',
        createdAt: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) }, // > 72h old
      },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old trend signals`);
    }
    return result.count;
  }

  // ── Queries ──────────────────────────────────────────────

  async listTrends(workspaceId: string, status?: string, limit = 20) {
    return this.prisma.trendSignal.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: [{ finalScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async getTrend(id: string) {
    return this.prisma.trendSignal.findUniqueOrThrow({ where: { id } });
  }

  async updateTrendStatus(id: string, status: 'DISMISSED' | 'USED') {
    return this.prisma.trendSignal.update({
      where: { id },
      data: { status },
    });
  }

  // ── Actions ──────────────────────────────────────────────

  /**
   * Create an editorial run from a trend signal
   */
  async createRunFromTrend(trendId: string, workspaceId: string) {
    const trend = await this.prisma.trendSignal.findUniqueOrThrow({
      where: { id: trendId },
    });

    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { activeChannels: true },
    });

    // Pre-populate researchSummary so the research stage is skipped
    const trendResearch = JSON.stringify({
      dominantTheme: trend.themeLabel,
      summary: trend.excerpt,
      angles: [{
        angle: trend.suggestedAngle ?? trend.headline ?? trend.themeLabel,
        format: 'post',
        reasoning: `Tendencia detectada con score ${trend.finalScore.toFixed(2)} — ventana recomendada: ${trend.recommendedWindowHours}h`,
      }],
      engagementOpportunities: [
        `Tendencia "${trend.themeLabel}" con potencial de engagement: ${(trend.engagementPotentialScore * 100).toFixed(0)}%`,
      ],
    });

    // Create editorial run via orchestrator (triggers full pipeline)
    const priority = Math.min(10, Math.round(trend.finalScore * 10) + 2);
    const { editorialRunId } = await this.orchestrator.createRun({
      workspaceId,
      origin: 'trend',
      priority,
      targetChannels: ws.activeChannels,
      researchSummary: trendResearch,
    });

    // Mark trend as used
    await this.prisma.trendSignal.update({
      where: { id: trendId },
      data: { status: 'USED' },
    });

    this.logger.log(`Created editorial run ${editorialRunId} from trend "${trend.themeLabel}"`);
    return { id: editorialRunId, workspaceId };
  }

  /**
   * Add trend to the active strategy plan's references
   */
  async addTrendToPlan(trendId: string, workspaceId: string) {
    const trend = await this.prisma.trendSignal.findUniqueOrThrow({
      where: { id: trendId },
    });

    const activePlan = await this.prisma.strategyPlan.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activePlan) {
      this.logger.warn('No active strategy plan found');
      return null;
    }

    // Add trend as a recommendation
    const recommendation = await this.prisma.strategyRecommendation.create({
      data: {
        strategyPlanId: activePlan.id,
        type: 'TREND',
        title: `📈 ${trend.themeLabel}`,
        description: `${trend.excerpt ?? trend.headline}\n\nÁngulo sugerido: ${trend.suggestedAngle ?? 'A determinar'}`,
        priorityScore: trend.finalScore,
        confidenceScore: trend.brandFitScore,
        recommendedAction: `Crear contenido sobre "${trend.themeLabel}" en las próximas ${trend.recommendedWindowHours}h`,
        sourceData: {
          trendId: trend.id,
          noveltyScore: trend.noveltyScore,
          momentumScore: trend.momentumScore,
        } as any,
      },
    });

    // Mark trend as used
    await this.prisma.trendSignal.update({
      where: { id: trendId },
      data: { status: 'USED' },
    });

    this.logger.log(`Added trend "${trend.themeLabel}" to plan ${activePlan.id}`);
    return recommendation;
  }
}
