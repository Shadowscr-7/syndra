// ============================================================
// StrategyPlanService — Motor de generación de planes estratégicos IA
// Genera planes semanales/mensuales con recomendaciones accionables
// basados en analytics, learning profile, trends y campañas.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  parseLLMJsonResponse,
  buildStrategyPlanPrompt,
  buildRunsFromPlanPrompt,
} from '@automatismos/ai';
import type { LLMAdapter, StrategyPlanInput } from '@automatismos/ai';

interface GeneratedPlan {
  summary: string;
  weeklyPostTarget: number;
  themeMix: Array<{ theme: string; percentage: number; reasoning: string }>;
  formatMix: Array<{ format: string; percentage: number; reasoning: string }>;
  toneMix: Array<{ tone: string; percentage: number; reasoning: string }>;
  postingWindows: Array<{ day: string; hours: string[]; reasoning: string }>;
  recommendedCTAs: string[];
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priorityScore: number;
    confidenceScore: number;
    recommendedAction: string;
  }>;
}

@Injectable()
export class StrategyPlanService {
  private readonly logger = new Logger(StrategyPlanService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.fallbackLlm = provider === 'anthropic'
      ? new AnthropicAdapter({ apiKey })
      : new OpenAIAdapter({ apiKey });
  }

  // ── LLM resolver ─────────────────────────────────────────

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

  // ── Gather inputs ────────────────────────────────────────

  private async gatherAnalytics(workspaceId: string): Promise<StrategyPlanInput['analytics']> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const publications = await this.prisma.publication.findMany({
      where: {
        editorialRun: { workspaceId },
        publishedAt: { gte: thirtyDaysAgo },
      },
      include: {
        editorialRun: {
          include: { contentBrief: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (publications.length === 0) {
      return {
        totalPosts: 0,
        avgEngagement: 0,
        avgReach: 0,
        topFormat: 'post',
        topTone: 'didáctico',
        topHour: '10:00',
        topDay: 'martes',
      };
    }

    const totalPosts = publications.length;
    const avgEngagement = publications.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / totalPosts;
    const avgReach = publications.reduce((s, p) => s + (p.reach ?? 0), 0) / totalPosts;

    // Count formats
    const formatCounts: Record<string, number> = {};
    const toneCounts: Record<string, number> = {};
    const hourCounts: Record<string, { count: number; engagement: number }> = {};
    const dayCounts: Record<string, { count: number; engagement: number }> = {};

    let bestPost: StrategyPlanInput['analytics']['bestPost'];
    let worstPost: StrategyPlanInput['analytics']['worstPost'];
    let bestEng = -1;
    let worstEng = Infinity;

    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    for (const pub of publications) {
      const brief = pub.editorialRun?.contentBrief;
      const format = brief?.format ?? 'POST';
      const tone = brief?.tone ?? 'didáctico';
      const eng = pub.engagementRate ?? 0;

      formatCounts[format] = (formatCounts[format] ?? 0) + 1;
      toneCounts[tone] = (toneCounts[tone] ?? 0) + 1;

      if (pub.publishedAt) {
        const h = pub.publishedAt.getHours().toString().padStart(2, '0') + ':00';
        if (!hourCounts[h]) hourCounts[h] = { count: 0, engagement: 0 };
        hourCounts[h].count++;
        hourCounts[h].engagement += eng;

        const d = dayNames[pub.publishedAt.getDay()]!;
        if (!dayCounts[d]) dayCounts[d] = { count: 0, engagement: 0 };
        dayCounts[d]!.count++;
        dayCounts[d]!.engagement += eng;
      }

      if (eng > bestEng) {
        bestEng = eng;
        bestPost = { angle: brief?.angle ?? '', engagement: eng, format: format.toLowerCase() };
      }
      if (eng < worstEng) {
        worstEng = eng;
        worstPost = { angle: brief?.angle ?? '', engagement: eng, format: format.toLowerCase() };
      }
    }

    const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'post';
    const topTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'didáctico';
    const topHour = Object.entries(hourCounts).sort((a, b) => (b[1].engagement / b[1].count) - (a[1].engagement / a[1].count))[0]?.[0] ?? '10:00';
    const topDay = Object.entries(dayCounts).sort((a, b) => (b[1].engagement / b[1].count) - (a[1].engagement / a[1].count))[0]?.[0] ?? 'martes';

    return {
      totalPosts,
      avgEngagement,
      avgReach,
      topFormat: topFormat.toLowerCase(),
      topTone,
      topHour,
      topDay,
      bestPost,
      worstPost,
    };
  }

  private async gatherLearningInsights(workspaceId: string) {
    const profiles = await this.prisma.contentLearningProfile.findMany({
      where: { workspaceId },
      include: {
        patternScores: {
          orderBy: { weightedScore: 'desc' },
          take: 30,
        },
      },
    });

    const insights: StrategyPlanInput['learningInsights'] = [];
    for (const profile of profiles) {
      const byDimension = new Map<string, typeof profile.patternScores>();
      for (const score of profile.patternScores) {
        const key = score.dimensionType;
        if (!byDimension.has(key)) byDimension.set(key, []);
        byDimension.get(key)!.push(score);
      }
      for (const [dim, scores] of byDimension) {
        insights.push({
          dimension: dim,
          topPerformers: scores.slice(0, 3).map(s => ({
            value: s.dimensionValue,
            score: s.weightedScore,
            trend: s.trendDirection,
          })),
        });
      }
    }
    return insights;
  }

  // ── Core generation ──────────────────────────────────────

  async generatePlan(
    workspaceId: string,
    periodType: 'WEEKLY' | 'MONTHLY' = 'WEEKLY',
    userId = 'SYSTEM',
  ) {
    this.logger.log(`Generating ${periodType} strategy plan for workspace ${workspaceId}`);

    // Calculate dates
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);
    if (periodType === 'WEEKLY') {
      // Start on next Monday
      const daysToMonday = (8 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysToMonday);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate.setDate(1);
      startDate.setMonth(startDate.getMonth() + 1);
      endDate.setMonth(startDate.getMonth() + 1);
      endDate.setDate(0);
    }

    // Gather all inputs + frequency analysis
    const [analytics, learningInsights, activeCampaigns, recentResearch, detectedTrends, workspace, brand, subscription, frequencyRec] = await Promise.all([
      this.gatherAnalytics(workspaceId),
      this.gatherLearningInsights(workspaceId),
      this.prisma.campaign.findMany({
        where: { workspaceId, isActive: true },
        include: { campaignThemes: { include: { theme: true } } },
      }),
      this.prisma.researchSnapshot.findMany({
        where: { editorialRun: { workspaceId } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      this.prisma.trendSignal.findMany({
        where: { workspaceId, status: 'NEW' },
        orderBy: { finalScore: 'desc' },
        take: 10,
      }),
      this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { industry: true, objectives: true, activeChannels: true },
      }),
      this.prisma.brandProfile.findUnique({ where: { workspaceId } }),
      this.prisma.subscription.findFirst({ where: { workspaceId, status: 'ACTIVE' }, include: { plan: true } }),
      this.computeFrequencyRecommendation(workspaceId),
    ]);

    const maxPostsPerWeek = (subscription?.plan as any)?.maxRunsPerMonth
      ? Math.ceil(((subscription!.plan as any).maxRunsPerMonth as number) / 4)
      : 5;

    // Use frequency recommendation if available, capped by plan limits
    const recommendedPostsPerWeek = frequencyRec.hasData
      ? Math.min(frequencyRec.optimalPostsPerWeek, maxPostsPerWeek)
      : maxPostsPerWeek;

    const input: StrategyPlanInput = {
      analytics,
      learningInsights: learningInsights.length > 0 ? learningInsights : undefined,
      activeCampaigns: activeCampaigns.map(c => ({
        name: c.name,
        objective: c.objective,
        themes: c.campaignThemes.map(ct => ct.theme.name),
      })),
      recentResearch: recentResearch.map(r => ({
        title: r.title,
        keyPoints: r.keyPoints,
        relevanceScore: r.relevanceScore,
      })),
      detectedTrends: detectedTrends.map(t => ({
        topic: t.themeLabel,
        score: t.finalScore,
        suggestedAngle: t.suggestedAngle ?? undefined,
      })),
      workspace: {
        industry: workspace.industry ?? undefined,
        objectives: workspace.objectives,
        activeChannels: workspace.activeChannels,
        brandVoice: brand?.voice ?? '',
        brandTone: brand?.tone ?? 'didáctico',
      },
      planLimits: { maxPostsPerWeek: recommendedPostsPerWeek },
      periodType,
      startDate: startDate.toISOString().split('T')[0]!,
      endDate: endDate.toISOString().split('T')[0]!,
    };

    // Generate with LLM
    const llm = await this.getLlm(workspaceId);
    const prompt = buildStrategyPlanPrompt(input);

    let generated: GeneratedPlan;
    try {
      const response = await llm.complete(prompt, { temperature: 0.7, maxTokens: 4096 });
      generated = parseLLMJsonResponse<GeneratedPlan>(response);
    } catch (error) {
      this.logger.error('Strategy plan LLM failed, using safe fallback:', error);
      generated = this.buildFallbackPlan(analytics, periodType, maxPostsPerWeek);
    }

    // Archive previous active plans
    await this.prisma.strategyPlan.updateMany({
      where: { workspaceId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    // Auto-increment version for same period
    const lastPlan = await this.prisma.strategyPlan.findFirst({
      where: { workspaceId, periodType },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastPlan?.version ?? 0) + 1;

    // Persist the plan
    const plan = await this.prisma.strategyPlan.create({
      data: {
        workspaceId,
        periodType,
        startDate,
        endDate,
        version: nextVersion,
        objective: workspace.objectives[0] ?? 'engagement',
        summary: generated.summary,
        recommendedThemeMix: generated.themeMix as any,
        recommendedFormatMix: generated.formatMix as any,
        recommendedToneMix: generated.toneMix as any,
        recommendedPostingWindows: generated.postingWindows as any,
        recommendedCTAs: generated.recommendedCTAs as any,
        trendReferences: detectedTrends.slice(0, 5).map(t => ({ topic: t.themeLabel, score: t.finalScore })) as any,
        weeklyPostTarget: generated.weeklyPostTarget ?? maxPostsPerWeek,
        status: 'ACTIVE',
        createdBy: userId,
      },
    });

    // Persist recommendations
    if (generated.recommendations?.length > 0) {
      await this.prisma.strategyRecommendation.createMany({
        data: generated.recommendations.map(r => ({
          strategyPlanId: plan.id,
          type: this.mapRecommendationType(r.type),
          title: r.title,
          description: r.description,
          priorityScore: r.priorityScore ?? 0.5,
          confidenceScore: r.confidenceScore ?? 0.5,
          recommendedAction: r.recommendedAction ?? null,
          sourceData: undefined,
        })),
      });
    }

    // Add AI-frequency recommendation if we have data
    if (frequencyRec.hasData && frequencyRec.channelBreakdown.length > 0) {
      const channelSummary = frequencyRec.channelBreakdown
        .map(c => `${c.platform}: ${c.optimalPostsPerWeek}/sem (eng: ${c.avgEngagement}%)`)
        .join(', ');

      await this.prisma.strategyRecommendation.create({
        data: {
          strategyPlanId: plan.id,
          type: 'POST_COUNT',
          title: `Frecuencia óptima: ${frequencyRec.optimalPostsPerWeek} posts/semana`,
          description: `Recomendación basada en datos: ${channelSummary}. ${frequencyRec.reasoning}`,
          priorityScore: 0.85,
          confidenceScore: Math.min(0.9, 0.5 + (frequencyRec.channelBreakdown[0]?.avgEngagement ?? 0) / 10),
          recommendedAction: `Publica ${frequencyRec.optimalPostsPerWeek} veces por semana para maximizar engagement.`,
          sourceData: frequencyRec as any,
        },
      });
    }

    this.logger.log(`Strategy plan created: ${plan.id} with ${generated.recommendations?.length ?? 0} recommendations`);

    return this.prisma.strategyPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { recommendations: { orderBy: { priorityScore: 'desc' } } },
    });
  }

  private mapRecommendationType(type: string): any {
    const map: Record<string, string> = {
      POST_COUNT: 'POST_COUNT',
      FORMAT: 'FORMAT',
      TONE: 'TONE',
      HOUR: 'HOUR',
      THEME: 'THEME',
      CTA: 'CTA',
      TREND: 'TREND',
      CAMPAIGN: 'CAMPAIGN',
    };
    return map[type] ?? 'THEME';
  }

  private buildFallbackPlan(analytics: StrategyPlanInput['analytics'], periodType: string, maxPosts: number): GeneratedPlan {
    return {
      summary: 'Plan generado con datos de rendimiento histórico. Se recomienda priorizar los formatos y temas con mejor engagement.',
      weeklyPostTarget: maxPosts,
      themeMix: [
        { theme: 'contenido educativo', percentage: 50, reasoning: 'Mayor engagement histórico' },
        { theme: 'tendencias', percentage: 30, reasoning: 'Mantener relevancia' },
        { theme: 'detrás de escenas', percentage: 20, reasoning: 'Humanizar la marca' },
      ],
      formatMix: [
        { format: analytics.topFormat || 'carousel', percentage: 50, reasoning: 'Mejor formato según datos' },
        { format: 'post', percentage: 30, reasoning: 'Base consistente' },
        { format: 'reel', percentage: 20, reasoning: 'Alcance orgánico' },
      ],
      toneMix: [
        { tone: analytics.topTone || 'didáctico', percentage: 60, reasoning: 'Mejor rendimiento' },
        { tone: 'conversacional', percentage: 40, reasoning: 'Diversificar' },
      ],
      postingWindows: [
        { day: analytics.topDay || 'martes', hours: [analytics.topHour || '10:00', '19:00'], reasoning: 'Mejor rendimiento histórico' },
      ],
      recommendedCTAs: ['Guarda este post', 'Comenta tu experiencia', 'Comparte con alguien que necesite esto'],
      recommendations: [
        {
          type: 'FORMAT',
          title: `Priorizar ${analytics.topFormat || 'carousels'}`,
          description: `El formato ${analytics.topFormat || 'carousel'} tiene el mejor rendimiento con ${(analytics.avgEngagement * 100).toFixed(1)}% de engagement promedio.`,
          priorityScore: 0.9,
          confidenceScore: 0.6,
          recommendedAction: `Crear al menos ${Math.ceil(maxPosts * 0.5)} ${analytics.topFormat || 'carousels'} esta semana`,
        },
      ],
    };
  }

  // ── Frequency recommendation engine ────────────────────

  async computeFrequencyRecommendation(workspaceId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get publications with engagement data per channel
    const publications = await this.prisma.publication.findMany({
      where: {
        editorialRun: { workspaceId },
        publishedAt: { gte: thirtyDaysAgo },
        status: 'PUBLISHED',
      },
      include: {
        editorialRun: { include: { contentBrief: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (publications.length < 3) {
      // Not enough data — return sensible defaults
      return {
        hasData: false,
        optimalPostsPerWeek: 4,
        channelBreakdown: [],
        formatMixRecommendation: [],
        reasoning: 'Datos insuficientes — se necesitan al menos 3 publicaciones para recomendaciones personalizadas.',
      };
    }

    // Group by platform/channel
    const byPlatform: Record<string, { count: number; totalEng: number; bestDay: Record<string, number>; bestHour: Record<string, number> }> = {};
    const byFormat: Record<string, { count: number; totalEng: number }> = {};

    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    let totalWeeks = 0;

    // Calculate days span
    const oldestPub = publications[publications.length - 1]?.publishedAt;
    const newestPub = publications[0]?.publishedAt;
    if (oldestPub && newestPub) {
      totalWeeks = Math.max(1, Math.ceil((newestPub.getTime() - oldestPub.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    } else {
      totalWeeks = 4;
    }

    for (const pub of publications) {
      const platform = pub.platform?.toLowerCase() ?? 'instagram';
      const eng = pub.engagementRate ?? 0;
      const format = pub.editorialRun?.contentBrief?.format?.toLowerCase() ?? 'post';

      if (!byPlatform[platform]) byPlatform[platform] = { count: 0, totalEng: 0, bestDay: {}, bestHour: {} };
      byPlatform[platform]!.count++;
      byPlatform[platform]!.totalEng += eng;

      if (!byFormat[format]) byFormat[format] = { count: 0, totalEng: 0 };
      byFormat[format]!.count++;
      byFormat[format]!.totalEng += eng;

      if (pub.publishedAt) {
        const day = dayNames[pub.publishedAt.getDay()]!;
        const hour = pub.publishedAt.getHours().toString().padStart(2, '0') + ':00';
        byPlatform[platform]!.bestDay[day] = (byPlatform[platform]!.bestDay[day] ?? 0) + eng;
        byPlatform[platform]!.bestHour[hour] = (byPlatform[platform]!.bestHour[hour] ?? 0) + eng;
      }
    }

    // Compute per-channel optimal frequency
    const channelBreakdown = Object.entries(byPlatform).map(([platform, data]) => {
      const avgEngPerPost = data.totalEng / data.count;
      const postsPerWeek = data.count / totalWeeks;

      // Optimal posts: if current engagement is good (>2%), maintain; if low, suggest reducing
      let optimalPerWeek: number;
      if (avgEngPerPost > 3) {
        optimalPerWeek = Math.min(Math.ceil(postsPerWeek * 1.2), 7); // increase slightly
      } else if (avgEngPerPost > 1.5) {
        optimalPerWeek = Math.round(postsPerWeek); // maintain
      } else {
        optimalPerWeek = Math.max(Math.floor(postsPerWeek * 0.8), 2); // reduce slightly
      }

      const bestDay = Object.entries(data.bestDay).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'martes';
      const bestHour = Object.entries(data.bestHour).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '10:00';

      return {
        platform,
        currentPostsPerWeek: Math.round(postsPerWeek * 10) / 10,
        optimalPostsPerWeek: optimalPerWeek,
        avgEngagement: Math.round(avgEngPerPost * 100) / 100,
        bestDay,
        bestHour,
      };
    }).sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Compute format mix recommendation
    const formatMixRecommendation = Object.entries(byFormat)
      .map(([format, data]) => {
        const avgEng = data.totalEng / data.count;
        const share = data.count / publications.length;
        // Recommend increasing high-engagement formats
        const recommendedShare = avgEng > 2
          ? Math.min(share * 1.3, 0.6)
          : avgEng > 1
            ? share
            : Math.max(share * 0.7, 0.1);
        return {
          format,
          currentShare: Math.round(share * 100),
          recommendedShare: Math.round(recommendedShare * 100),
          avgEngagement: Math.round(avgEng * 100) / 100,
        };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Normalize recommended shares to 100%
    const totalRecommended = formatMixRecommendation.reduce((s, f) => s + f.recommendedShare, 0);
    if (totalRecommended > 0) {
      for (const f of formatMixRecommendation) {
        f.recommendedShare = Math.round((f.recommendedShare / totalRecommended) * 100);
      }
    }

    const optimalPostsPerWeek = channelBreakdown.reduce((s, c) => s + c.optimalPostsPerWeek, 0);

    return {
      hasData: true,
      optimalPostsPerWeek,
      channelBreakdown,
      formatMixRecommendation,
      reasoning: `Basado en ${publications.length} publicaciones de los últimos 30 días (${totalWeeks} semanas).`,
    };
  }

  // ── Queries ──────────────────────────────────────────────

  async getActivePlan(workspaceId: string) {
    return this.prisma.strategyPlan.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
      include: { recommendations: { orderBy: { priorityScore: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlanById(planId: string) {
    return this.prisma.strategyPlan.findUniqueOrThrow({
      where: { id: planId },
      include: { recommendations: { orderBy: { priorityScore: 'desc' } } },
    });
  }

  async listPlans(workspaceId: string, limit = 10) {
    return this.prisma.strategyPlan.findMany({
      where: { workspaceId },
      include: { recommendations: { orderBy: { priorityScore: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async archivePlan(planId: string) {
    return this.prisma.strategyPlan.update({
      where: { id: planId },
      data: { status: 'ARCHIVED' },
    });
  }

  // ── Actions from plan ────────────────────────────────────

  async createCampaignFromPlan(planId: string, workspaceId: string) {
    const plan = await this.prisma.strategyPlan.findUniqueOrThrow({
      where: { id: planId },
      include: { recommendations: true },
    });

    const themeMix = (plan.recommendedThemeMix as any[]) ?? [];
    const topTheme = themeMix[0]?.theme ?? 'Estrategia IA';

    const campaign = await this.prisma.campaign.create({
      data: {
        workspaceId,
        name: `Plan ${plan.periodType === 'WEEKLY' ? 'Semanal' : 'Mensual'} — ${topTheme}`,
        objective: (plan.objective as any) ?? 'AUTHORITY',
        startDate: plan.startDate,
        endDate: plan.endDate,
        isActive: true,
      },
    });

    this.logger.log(`Campaign ${campaign.id} created from plan ${planId}`);
    return campaign;
  }

  async generateRunsFromPlan(planId: string, workspaceId: string) {
    const plan = await this.prisma.strategyPlan.findUniqueOrThrow({
      where: { id: planId },
    });

    const brand = await this.prisma.brandProfile.findUnique({ where: { workspaceId } });
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { activeChannels: true },
    });

    const themeMix = (plan.recommendedThemeMix as any[]) ?? [];
    const formatMix = (plan.recommendedFormatMix as any[]) ?? [];
    const toneMix = (plan.recommendedToneMix as any[]) ?? [];

    const llm = await this.getLlm(workspaceId);
    const prompt = buildRunsFromPlanPrompt({
      planSummary: plan.summary ?? '',
      themeMix: themeMix.map(t => ({ theme: t.theme, percentage: t.percentage })),
      formatMix: formatMix.map(f => ({ format: f.format, percentage: f.percentage })),
      toneMix: toneMix.map(t => ({ tone: t.tone, percentage: t.percentage })),
      postCount: plan.weeklyPostTarget,
      channels: ws.activeChannels,
      brandVoice: brand?.voice ?? '',
    });

    let briefs: Array<{ angle: string; format: string; tone: string; cta: string; priority: number }>;
    try {
      const response = await llm.complete(prompt, { temperature: 0.7, maxTokens: 2048 });
      const parsed = parseLLMJsonResponse<{ briefs: typeof briefs }>(response);
      briefs = parsed.briefs ?? [];
    } catch (error) {
      this.logger.error('Run generation from plan failed:', error);
      briefs = [
        { angle: 'Contenido educativo de la semana', format: 'carousel', tone: 'didáctico', cta: 'Guarda este post', priority: 5 },
      ];
    }

    // Create editorial runs
    const runs = [];
    for (const brief of briefs) {
      const run = await this.prisma.editorialRun.create({
        data: {
          workspaceId,
          status: 'PENDING',
          origin: 'strategist',
          priority: brief.priority ?? 5,
          targetChannels: ws.activeChannels,
        },
      });
      runs.push(run);
    }

    this.logger.log(`Generated ${runs.length} editorial runs from plan ${planId}`);
    return { runs, briefs };
  }

  // ── Strategy Versioning ───────────────────────────────

  async getPlanHistory(workspaceId: string) {
    return this.prisma.strategyPlan.findMany({
      where: { workspaceId },
      include: { recommendations: { orderBy: { priorityScore: 'desc' }, take: 3 } },
      orderBy: [{ startDate: 'desc' }, { version: 'desc' }],
    });
  }

  async comparePlanVersions(planIdA: string, planIdB: string) {
    const [planA, planB] = await Promise.all([
      this.prisma.strategyPlan.findUniqueOrThrow({
        where: { id: planIdA },
        include: { recommendations: true },
      }),
      this.prisma.strategyPlan.findUniqueOrThrow({
        where: { id: planIdB },
        include: { recommendations: true },
      }),
    ]);

    const themeA = (planA.recommendedThemeMix as any[]) ?? [];
    const themeB = (planB.recommendedThemeMix as any[]) ?? [];
    const formatA = (planA.recommendedFormatMix as any[]) ?? [];
    const formatB = (planB.recommendedFormatMix as any[]) ?? [];

    return {
      planA: { id: planA.id, version: planA.version, period: `${planA.startDate.toISOString().split('T')[0]} → ${planA.endDate.toISOString().split('T')[0]}`, status: planA.status, weeklyPostTarget: planA.weeklyPostTarget },
      planB: { id: planB.id, version: planB.version, period: `${planB.startDate.toISOString().split('T')[0]} → ${planB.endDate.toISOString().split('T')[0]}`, status: planB.status, weeklyPostTarget: planB.weeklyPostTarget },
      differences: {
        postTarget: { a: planA.weeklyPostTarget, b: planB.weeklyPostTarget },
        themesAdded: themeB.filter((t: any) => !themeA.some((a: any) => a.theme === t.theme)).map((t: any) => t.theme),
        themesRemoved: themeA.filter((t: any) => !themeB.some((b: any) => b.theme === t.theme)).map((t: any) => t.theme),
        formatsAdded: formatB.filter((f: any) => !formatA.some((a: any) => a.format === f.format)).map((f: any) => f.format),
        formatsRemoved: formatA.filter((f: any) => !formatB.some((b: any) => b.format === f.format)).map((f: any) => f.format),
        recsCountA: planA.recommendations.length,
        recsCountB: planB.recommendations.length,
      },
      impactA: planA.impactMetrics,
      impactB: planB.impactMetrics,
    };
  }

  async measurePlanImpact(planId: string) {
    const plan = await this.prisma.strategyPlan.findUniqueOrThrow({ where: { id: planId } });

    const pubs = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: plan.startDate, lte: plan.endDate },
        editorialRun: { workspaceId: plan.workspaceId },
      },
    });

    const metrics = {
      totalPublications: pubs.length,
      avgEngagement: pubs.length > 0 ? pubs.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / pubs.length : 0,
      avgReach: pubs.length > 0 ? pubs.reduce((s, p) => s + (p.reach ?? 0), 0) / pubs.length : 0,
      totalLikes: pubs.reduce((s, p) => s + (p.likes ?? 0), 0),
      totalComments: pubs.reduce((s, p) => s + (p.comments ?? 0), 0),
      calculatedAt: new Date().toISOString(),
    };

    await this.prisma.strategyPlan.update({
      where: { id: planId },
      data: { impactMetrics: metrics as any },
    });

    return metrics;
  }
}
