// ============================================================
// Research Service — Motor de investigación diaria
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import { BusinessBriefsService } from '../business-briefs/business-briefs.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  fetchRSSFeed,
  parseLLMJsonResponse,
  buildResearchExtractionPrompt,
  buildResearchSummaryPrompt,
  buildBusinessResearchPrompt,
  type BusinessBriefInput,
  type BusinessProfileInput,
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
    private readonly businessProfileService: BusinessProfileService,
    private readonly businessBriefsService: BusinessBriefsService,
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

    // Resolve business context for industry-aware prompts
    const businessCtx = await this.businessProfileService.buildPromptContext(workspaceId);

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
      businessCtx.industryContext,
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
      businessCtx.industryContext,
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

  // ============================================================
  // Theme type helpers
  // ============================================================

  /** ThemeTypes that should use internal business research instead of RSS */
  private static readonly PROMOTIONAL_THEME_TYPES = new Set([
    'PRODUCT', 'SERVICE', 'OFFER', 'SEASONAL', 'TESTIMONIAL',
    'BEHIND_SCENES', 'EDUCATIONAL', 'ANNOUNCEMENT',
  ]);

  /**
   * Check if a theme type is promotional (should use internal research)
   */
  isPromotionalThemeType(themeType: string): boolean {
    return ResearchService.PROMOTIONAL_THEME_TYPES.has(themeType);
  }

  // ============================================================
  // Internal Research — Uses BusinessBriefs instead of RSS
  // ============================================================

  /**
   * Execute research from internal business data (no RSS).
   * Used when the editorial theme is promotional (PRODUCT, OFFER, etc).
   */
  async executeInternalResearch(
    editorialRunId: string,
    workspaceId: string,
    themeType?: string,
  ): Promise<{
    snapshotCount: number;
    summary: string;
    topArticles: ExtractedArticle[];
  }> {
    this.logger.log(`Starting INTERNAL research for run ${editorialRunId} (themeType: ${themeType ?? 'any'})`);

    // 1. Load active BusinessBriefs for this workspace + theme type
    const briefs = await this.businessBriefsService.getActiveBriefsForResearch(
      workspaceId,
      themeType,
    );

    if (briefs.length === 0) {
      this.logger.warn(`No active business briefs for workspace ${workspaceId}, falling back to RSS`);
      // Fallback to normal RSS research if no briefs found
      return this.executeResearch(editorialRunId, workspaceId);
    }

    this.logger.log(`Found ${briefs.length} active business briefs for internal research`);

    // 2. Load business profile for prompt context
    const profile = await this.businessProfileService.get(workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { industry: true, name: true },
    });

    const profileInput: BusinessProfileInput = {
      businessName: profile?.businessName || workspace?.name || 'Mi Negocio',
      businessType: profile?.businessType || workspace?.industry || 'general',
      description: profile?.description || '',
      slogan: profile?.slogan || undefined,
      usp: profile?.usp || undefined,
      targetMarket: profile?.targetMarket || undefined,
      products: profile?.products || [],
      priceRange: profile?.priceRange || undefined,
      promotionStyle: profile?.promotionStyle || undefined,
      contentGoals: profile?.contentGoals || [],
    };

    const briefInputs: BusinessBriefInput[] = briefs.map((b) => ({
      type: b.type as BusinessBriefInput['type'],
      title: b.title,
      content: b.content,
      productName: b.productName || undefined,
      productPrice: b.productPrice || undefined,
      productUrl: b.productUrl || undefined,
      discountText: b.discountText || undefined,
      validFrom: b.validFrom?.toISOString(),
      validUntil: b.validUntil?.toISOString(),
    }));

    // 3. Load campaign context (if any)
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: { campaign: true },
    });

    const campaignObjective = run.campaign?.objective || undefined;

    // 4. Resolve LLM adapter
    const llm = await this.getLlm(workspaceId);

    // 5. Generate editorial angles using business research prompt
    const researchPrompt = buildBusinessResearchPrompt(
      briefInputs,
      profileInput,
      campaignObjective,
    );

    interface ResearchAngle {
      briefTitle: string;
      angle: string;
      format: string;
      reasoning: string;
      hooks?: string[];
      urgency?: string;
      suggestedVisual?: string;
    }

    let angles: ResearchAngle[] = [];
    try {
      const response = await llm.complete(researchPrompt, {
        temperature: 0.5,
        maxTokens: 4096,
      });
      const parsed = parseLLMJsonResponse<{ angles: ResearchAngle[] }>(response);
      angles = parsed.angles ?? [];
    } catch (error) {
      this.logger.error('LLM business research failed:', error);
      // Fallback: create basic angles from briefs directly
      angles = briefs.map((b) => ({
        briefTitle: b.title,
        angle: `Promocionar: ${b.title}${b.discountText ? ` con ${b.discountText}` : ''}`,
        format: 'post',
        reasoning: 'Contenido directo del brief de negocio',
        urgency: b.discountText ? 'high' : 'medium',
      }));
    }

    // 6. Create ResearchSnapshots from angles + briefs
    const snapshots = await Promise.all(
      angles.map((angle, idx) => {
        const matchedBrief = briefs.find((b) => b.title === angle.briefTitle) || briefs[0];
        return this.prisma.researchSnapshot.create({
          data: {
            editorialRunId,
            title: angle.angle,
            source: `BusinessBrief: ${matchedBrief?.title || 'Internal'}`,
            sourceUrl: matchedBrief?.productUrl || '',
            keyPoints: [
              matchedBrief?.content || '',
              matchedBrief?.productName ? `Producto: ${matchedBrief.productName}` : '',
              matchedBrief?.discountText ? `Oferta: ${matchedBrief.discountText}` : '',
              matchedBrief?.productPrice ? `Precio: ${matchedBrief.productPrice}` : '',
              angle.reasoning,
              ...(angle.hooks || []),
            ].filter(Boolean),
            suggestedAngle: angle.suggestedVisual || angle.angle,
            relevanceScore: angle.urgency === 'high' ? 0.95 : angle.urgency === 'medium' ? 0.8 : 0.65,
          },
        });
      }),
    );

    // 7. Increment usage count on used briefs
    const usedBriefIds = new Set(
      angles
        .map((a) => briefs.find((b) => b.title === a.briefTitle)?.id)
        .filter(Boolean) as string[],
    );
    await Promise.all(
      [...usedBriefIds].map((id) => this.businessBriefsService.incrementUsage(id)),
    );

    // 8. Build summary
    const summaryText = JSON.stringify({
      dominantTheme: `${profileInput.businessName} — ${themeType || 'Promocional'}`,
      summary: `${angles.length} ángulos editoriales generados desde ${briefs.length} briefs internos del negocio.`,
      angles: angles.map((a) => ({
        angle: a.angle,
        format: a.format,
        reasoning: a.reasoning,
      })),
      engagementOpportunities: angles
        .filter((a) => a.urgency === 'high')
        .map((a) => a.angle),
      source: 'internal_business',
    });

    // 9. Update editorial run
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: {
        researchSummary: summaryText,
        status: 'STRATEGY',
      },
    });

    // Convert to ExtractedArticle format for compatibility
    const topArticles: ExtractedArticle[] = angles.map((a) => ({
      title: a.angle,
      source: `BusinessBrief: ${a.briefTitle}`,
      sourceUrl: '',
      keyPoints: [a.reasoning, ...(a.hooks || [])],
      suggestedAngle: a.suggestedVisual || a.angle,
      relevanceScore: a.urgency === 'high' ? 0.95 : 0.8,
      trending: false,
    }));

    this.logger.log(
      `Internal research complete: ${snapshots.length} snapshots from ${briefs.length} briefs, moving to STRATEGY`,
    );

    return {
      snapshotCount: snapshots.length,
      summary: summaryText,
      topArticles,
    };
  }
}
