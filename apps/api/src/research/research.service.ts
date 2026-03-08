// ============================================================
// Research Service — Motor de investigación diaria
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  fetchRSSFeed,
  parseLLMJsonResponse,
  buildResearchExtractionPrompt,
  buildResearchSummaryPrompt,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';
import type { RSSItem } from '@automatismos/ai';

export interface ExtractedArticle {
  title: string;
  source: string;
  sourceUrl: string;
  keyPoints: string[];
  suggestedAngle: string | null;
  relevanceScore: number;
  trending: boolean;
}

interface ResearchSummary {
  dominantTheme: string;
  summary: string;
  angles: Array<{
    angle: string;
    format: string;
    reasoning: string;
  }>;
  engagementOpportunities: string[];
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {
    // Env-var fallback adapter (used when no DB credentials are configured)
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');

    if (provider === 'anthropic') {
      this.fallbackLlm = new AnthropicAdapter({ apiKey });
    } else {
      this.fallbackLlm = new OpenAIAdapter({ apiKey });
    }
  }

  /**
   * Resolve workspace owner userId for credential lookups
   */
  private async resolveUserId(workspaceId: string): Promise<string | null> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    return wsUser?.userId ?? null;
  }

  /**
   * Build LLM adapter: DB credentials first, env-var fallback
   */
  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      const payload = await this.credentialsService.getDecryptedPayload(userId, 'LLM');
      if (payload?.apiKey) {
        const provider = payload.provider ?? 'openai';
        this.logger.debug(`Using DB LLM credential (${provider}) for user ${userId}`);
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    this.logger.debug('Using env-var fallback LLM adapter');
    return this.fallbackLlm;
  }

  /**
   * Ejecuta el ciclo completo de research para un editorial run:
   * 1. Fetch RSS de todas las fuentes activas
   * 2. Extrae puntos clave con LLM
   * 3. Filtra por relevanceScore
   * 4. Genera resumen editorial
   * 5. Persiste snapshots
   */
  async executeResearch(editorialRunId: string, workspaceId: string): Promise<{
    snapshotCount: number;
    summary: string;
    topArticles: ExtractedArticle[];
  }> {
    this.logger.log(`Starting research for run ${editorialRunId}`);

    // 0. Load campaign context (if any) for scoped research
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: { campaign: true },
    });

    let campaignContext:
      | { campaignName: string; objective: string; themeNames: string[]; themeKeywords: string[] }
      | undefined;

    if (run.campaignId) {
      const campaignThemes = await this.prisma.campaignTheme.findMany({
        where: { campaignId: run.campaignId },
        include: { theme: true },
      });
      const activeThemes = campaignThemes.map((ct) => ct.theme).filter((t) => t.isActive);
      if (activeThemes.length > 0) {
        campaignContext = {
          campaignName: run.campaign?.name ?? '',
          objective: run.campaign?.objective ?? 'AUTHORITY',
          themeNames: activeThemes.map((t) => t.name),
          themeKeywords: activeThemes.flatMap((t) => t.keywords),
        };
        this.logger.log(
          `Campaign "${campaignContext.campaignName}" → themes: [${campaignContext.themeNames.join(', ')}], keywords: [${campaignContext.themeKeywords.join(', ')}]`,
        );
      }
    }

    // 1. Obtener fuentes activas del workspace
    const sources = await this.prisma.researchSource.findMany({
      where: { workspaceId, isActive: true },
    });

    if (sources.length === 0) {
      this.logger.warn(`No active research sources for workspace ${workspaceId}`);
      return { snapshotCount: 0, summary: 'No sources configured', topArticles: [] };
    }

    // 2. Fetch RSS en paralelo
    const feedResults = await Promise.allSettled(
      sources
        .filter((s) => s.type === 'RSS' || s.type === 'BLOG')
        .map((s) =>
          fetchRSSFeed(s.url, s.name).then((items) => {
            // Update lastFetched
            this.prisma.researchSource
              .update({ where: { id: s.id }, data: { lastFetched: new Date() } })
              .catch(() => {});
            return items;
          }),
        ),
    );

    const allItems: RSSItem[] = [];
    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      } else {
        this.logger.warn(`RSS fetch failed: ${result.reason}`);
      }
    }

    this.logger.log(`Fetched ${allItems.length} articles from ${sources.length} sources`);

    if (allItems.length === 0) {
      return { snapshotCount: 0, summary: 'No articles fetched', topArticles: [] };
    }

    // Resolve LLM adapter for this workspace
    const llm = await this.getLlm(workspaceId);

    // 3. Filtrar artículos recientes (últimas 48 horas)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentItems = allItems.filter((item) => {
      if (!item.pubDate) return true; // incluir si no tiene fecha
      const pubDate = new Date(item.pubDate);
      return pubDate > cutoff;
    });

    // Limitar a 20 artículos más recientes para no exceder contexto del LLM
    const itemsToAnalyze = recentItems.slice(0, 20);

    // 4. Extraer puntos clave con LLM (campaign-aware cuando hay campaña activa)
    const extractionPrompt = buildResearchExtractionPrompt(
      itemsToAnalyze.map((i) => ({
        title: i.title,
        content: i.content || i.description,
        source: i.source,
        url: i.link,
      })),
      campaignContext,
    );

    let extracted: ExtractedArticle[] = [];
    try {
      const response = await llm.complete(extractionPrompt, {
        temperature: 0.3,
        maxTokens: 4096,
      });
      const parsed = parseLLMJsonResponse<{ articles: ExtractedArticle[] }>(response);
      extracted = parsed.articles ?? [];
    } catch (error) {
      this.logger.error('LLM extraction failed:', error);
      // Fallback: crear snapshots básicos sin análisis LLM
      extracted = itemsToAnalyze.map((i) => ({
        title: i.title,
        source: i.source,
        sourceUrl: i.link,
        keyPoints: [i.description.substring(0, 200)],
        suggestedAngle: null,
        relevanceScore: 0.5,
        trending: false,
      }));
    }

    // 5. Filtrar por relevancia (> 0.4)
    const relevant = extracted
      .filter((a) => a.relevanceScore > 0.4)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 6. Persistir snapshots en BD
    const snapshots = await Promise.all(
      relevant.map((article) =>
        this.prisma.researchSnapshot.create({
          data: {
            editorialRunId,
            title: article.title,
            source: article.source,
            sourceUrl: article.sourceUrl,
            keyPoints: article.keyPoints,
            suggestedAngle: article.suggestedAngle,
            relevanceScore: article.relevanceScore,
          },
        }),
      ),
    );

    // 7. Generar resumen editorial
    const brandProfile = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    // Use campaign-specific keywords when available, otherwise all workspace themes
    let summaryKeywords: string[];
    if (campaignContext) {
      summaryKeywords = campaignContext.themeKeywords;
    } else {
      const themes = await this.prisma.contentTheme.findMany({
        where: { workspaceId, isActive: true },
      });
      summaryKeywords = themes.flatMap((t) => t.keywords);
    }

    const summaryPrompt = buildResearchSummaryPrompt(
      relevant.slice(0, 10).map((a) => ({
        title: a.title,
        keyPoints: a.keyPoints,
        relevanceScore: a.relevanceScore,
      })),
      {
        voice: brandProfile?.voice ?? '',
        tone: brandProfile?.tone ?? 'didáctico',
        keywords: summaryKeywords,
      },
      undefined, // persona — not loaded here
      campaignContext,
    );

    let summaryText = '';
    try {
      const summaryResponse = await llm.complete(summaryPrompt, {
        temperature: 0.5,
        maxTokens: 2048,
      });
      const summaryParsed = parseLLMJsonResponse<ResearchSummary>(summaryResponse);
      summaryText = JSON.stringify(summaryParsed);
    } catch (error) {
      this.logger.error('Summary generation failed:', error);
      summaryText = JSON.stringify({
        dominantTheme: relevant[0]?.title ?? 'N/A',
        summary: `${relevant.length} articles found`,
        angles: [],
        engagementOpportunities: [],
      });
    }

    // 8. Actualizar editorial run con el resumen
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: {
        researchSummary: summaryText,
        status: 'STRATEGY',
      },
    });

    this.logger.log(
      `Research complete: ${snapshots.length} snapshots, moving to STRATEGY`,
    );

    return {
      snapshotCount: snapshots.length,
      summary: summaryText,
      topArticles: relevant.slice(0, 5),
    };
  }

  /**
   * Obtiene los snapshots de research de un run
   */
  async getSnapshots(editorialRunId: string) {
    return this.prisma.researchSnapshot.findMany({
      where: { editorialRunId },
      orderBy: { relevanceScore: 'desc' },
    });
  }
}
