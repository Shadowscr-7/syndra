// ============================================================
// Strategy Service — Selección de ángulo, formato, tono, CTA
// ============================================================

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import { LearningService, StrategyLearningData } from '../learning/learning.service';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  parseLLMJsonResponse,
  buildStrategyPrompt,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';

export interface StrategyResult {
  angle: string;
  format: string;
  cta: string;
  seedPrompt: string;
  tone: string;
  mediaType?: string;
  reasoning: string;
  references: string[];
  estimatedEngagement: string;
  suggestedHashtags: string[];
}

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
    private readonly businessProfileService: BusinessProfileService,
    @Optional() @Inject(LearningService) private readonly learningService?: LearningService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');

    if (provider === 'anthropic') {
      this.fallbackLlm = new AnthropicAdapter({ apiKey });
    } else {
      this.fallbackLlm = new OpenAIAdapter({ apiKey });
    }
  }

  /** Resolve workspace owner userId */
  private async resolveUserId(workspaceId: string): Promise<string | null> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    return wsUser?.userId ?? null;
  }

  /** Build LLM adapter: respects workspace credential preference */
  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'LLM');
      if (payload?.apiKey) {
        const provider = payload.provider ?? 'openai';
        this.logger.debug(`Using ${provider} LLM credential for workspace ${workspaceId}`);
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    return this.fallbackLlm;
  }

  /**
   * Ejecuta la estrategia: genera un ContentBrief a partir del research.
   *
   * 1. Lee el resumen de research del editorial run
   * 2. Obtiene contexto de marca y campaña
   * 3. Selecciona ángulo + formato + CTA con LLM
   * 4. Crea el ContentBrief en BD
   * 5. Actualiza status del run a CONTENT
   */
  async executeStrategy(editorialRunId: string, workspaceId: string): Promise<{
    briefId: string;
    strategy: StrategyResult;
  }> {
    this.logger.log(`Starting strategy for run ${editorialRunId}`);

    // 1. Obtener el editorial run con research
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: {
        campaign: true,
        researchSnapshots: {
          orderBy: { relevanceScore: 'desc' },
          take: 10,
        },
      },
    });

    // 2. Obtener brand profile
    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    // 2b. Obtener persona activa y perfil de contenido del usuario del workspace
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
    });
    const ownerId = wsUser?.userId;

    const activePersona = run.userPersonaId
      ? await this.prisma.userPersona.findUnique({ where: { id: run.userPersonaId } })
      : ownerId
        ? await this.prisma.userPersona.findFirst({
            where: { userId: ownerId, isActive: true },
          })
        : null;

    // Si el run tiene contentProfileId, usar ese; sino, el default del usuario
    const contentProfile = run.contentProfileId
      ? await this.prisma.contentProfile.findUnique({ where: { id: run.contentProfileId } })
      : ownerId
        ? await this.prisma.contentProfile.findFirst({
            where: { userId: ownerId, isDefault: true },
          })
        : null;

    // 3. Seleccionar tema más relevante
    //    Si hay campaña, usar los temas asociados a esa campaña (campaign_themes).
    //    Fallback: todos los temas activos del workspace.
    let themes: Awaited<ReturnType<typeof this.prisma.contentTheme.findMany>> = [];

    if (run.campaignId) {
      // Obtener temas vinculados a la campaña
      const campaignThemes = await this.prisma.campaignTheme.findMany({
        where: { campaignId: run.campaignId },
        include: { theme: true },
      });
      themes = campaignThemes
        .map((ct) => ct.theme)
        .filter((t) => t.isActive)
        .sort((a, b) => b.priority - a.priority);
      this.logger.log(
        `Campaign ${run.campaign?.name}: ${themes.length} theme(s) → [${themes.map((t) => t.name).join(', ')}]`,
      );
    }

    // Fallback: si la campaña no tiene temas asignados, usar todos los del workspace
    if (themes.length === 0) {
      themes = await this.prisma.contentTheme.findMany({
        where: { workspaceId, isActive: true },
        orderBy: { priority: 'desc' },
      });
    }

    // 4. Obtener ángulos previos para evitar repetición
    const recentRuns = await this.prisma.contentBrief.findMany({
      where: {
        editorialRun: { workspaceId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { angle: true, format: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 4b. Obtener contexto de negocio
    const businessCtx = await this.businessProfileService.buildPromptContext(workspaceId);

    // 5. Generar estrategia con LLM
    const llm = await this.getLlm(workspaceId);

    // Determine available formats: campaign's channelFormats > theme preferredFormats > defaults
    let availableFormats = themes[0]?.preferredFormats ?? ['post', 'carousel', 'reel', 'story'];
    if (run.campaign?.channelFormats && typeof run.campaign.channelFormats === 'object') {
      const cf = run.campaign.channelFormats as Record<string, string[]>;
      // Merge unique formats across all channels
      const allFormats = Object.values(cf).flat();
      if (allFormats.length > 0) {
        availableFormats = [...new Set(allFormats)];
      }
    }

    // 5a. Batch-aware format diversity: if this run belongs to a weekly planner batch,
    //     check what formats sibling items are using and suggest a different one.
    let preferredFormat: string | undefined;
    const plannedPub = await this.prisma.plannedPublication.findUnique({
      where: { editorialRunId },
      select: {
        sortOrder: true,
        batch: {
          select: {
            totalItems: true,
            items: {
              where: { editorialRunId: { not: null } },
              select: {
                editorialRun: {
                  select: {
                    contentBrief: { select: { format: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (plannedPub) {
      // Formats already used by sibling items in this batch
      const usedFormats = plannedPub.batch.items
        .map((i) => i.editorialRun?.contentBrief?.format?.toLowerCase())
        .filter(Boolean) as string[];

      // Assign format by cycling through available formats based on sortOrder
      if (availableFormats.length > 0) {
        preferredFormat = availableFormats[plannedPub.sortOrder % availableFormats.length];
        // If preferred is already heavily used, try next one
        const useCount = usedFormats.filter((f) => f === preferredFormat).length;
        const maxPerFormat = Math.ceil(plannedPub.batch.totalItems / availableFormats.length);
        if (useCount >= maxPerFormat && availableFormats.length > 1) {
          const alts = availableFormats.filter((f) => {
            const c = usedFormats.filter((u) => u === f).length;
            return c < maxPerFormat;
          });
          if (alts.length > 0) preferredFormat = alts[0];
        }
      }
      this.logger.log(
        `Batch format diversity: item ${plannedPub.sortOrder + 1}, ` +
        `usedFormats=[${usedFormats.join(',')}], preferredFormat=${preferredFormat}`,
      );
    }

    // 5b. Obtener datos de aprendizaje (Learning Loop)
    let learningData: StrategyLearningData | null | undefined = null;
    try {
      if (this.learningService) {
        learningData = await this.learningService.getLearningInsightsForStrategy(workspaceId);
        if (learningData) {
          this.logger.log(`Learning data available: confidence=${learningData.confidence.toFixed(2)}, autoApply=${learningData.autoApply}, insights=${learningData.insights.length}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch learning data: ${err}`);
    }

    const prompt = buildStrategyPrompt({
      researchSummary: run.researchSummary ?? 'No research summary available',
      brandVoice: brand?.voice ?? '',
      defaultTone: brand?.tone ?? 'didáctico',
      objective: run.campaign?.objective ?? 'AUTHORITY',
      availableFormats,
      preferredFormat,
      themeKeywords: themes.flatMap((t) => t.keywords),
      campaignContext: run.campaign
        ? `${run.campaign.name} (${run.campaign.objective})`
        : undefined,
      previousAngles: recentRuns.map((r) => r.angle).filter(Boolean),
      recentFormats: recentRuns.map((r) => r.format).filter(Boolean),
      industryContext: businessCtx.industryContext,
      businessContext: businessCtx.businessContext,
      persona: activePersona
        ? {
            brandName: activePersona.brandName,
            brandDescription: activePersona.brandDescription,
            tone: activePersona.tone,
            expertise: activePersona.expertise,
            targetAudience: activePersona.targetAudience,
            avoidTopics: activePersona.avoidTopics,
            languageStyle: activePersona.languageStyle,
          }
        : undefined,
      contentProfile: contentProfile
        ? {
            name: contentProfile.name,
            tone: contentProfile.tone,
            contentLength: contentProfile.contentLength,
            audience: contentProfile.audience,
            language: contentProfile.language,
            hashtags: contentProfile.hashtags,
            postingGoal: contentProfile.postingGoal,
          }
        : undefined,
      learningData: learningData ?? undefined,
    });

    let strategy: StrategyResult;
    try {
      const response = await llm.complete(prompt, {
        temperature: 0.7,
        maxTokens: 2048,
      });
      strategy = parseLLMJsonResponse<StrategyResult>(response);
    } catch (error) {
      this.logger.error('Strategy LLM failed, using fallback:', error);
      const fallbackTopic = themes[0]?.name ?? businessCtx.industryContext ?? 'contenido';
      strategy = {
        angle: run.researchSnapshots[0]?.suggestedAngle ?? `Insight sobre ${fallbackTopic}`,
        format: 'post',
        cta: brand?.baseCta ?? 'Síguenos para más contenido',
        seedPrompt: `Create content about: ${run.researchSnapshots[0]?.title ?? fallbackTopic}`,
        tone: brand?.tone ?? 'didáctico',
        reasoning: 'Fallback strategy due to LLM error',
        references: run.researchSnapshots.map((s) => s.sourceUrl),
        estimatedEngagement: 'medium',
        suggestedHashtags: brand?.hashtags ?? [`#${fallbackTopic.replace(/\s/g, '')}`, '#contenido', '#digital'],
      };
    }

    // 5c. Log learning decisions if learning data was used
    if (learningData && this.learningService) {
      try {
        const isAutoApply = learningData.autoApply;

        // Log format decision
        if (strategy.format) {
          await this.learningService.logDecision({
            workspaceId,
            editorialRunId,
            decisionType: 'CHOOSE_FORMAT',
            applied: isAutoApply,
            reasonSummary: `Formato "${strategy.format}" seleccionado${isAutoApply ? ' automáticamente' : ' como recomendación'} basado en datos de aprendizaje`,
            afterValue: strategy.format,
          });
        }

        // Log tone decision
        if (strategy.tone) {
          await this.learningService.logDecision({
            workspaceId,
            editorialRunId,
            decisionType: 'CHOOSE_TONE',
            applied: isAutoApply,
            reasonSummary: `Tono "${strategy.tone}" seleccionado${isAutoApply ? ' automáticamente' : ' como recomendación'} basado en datos de aprendizaje`,
            afterValue: strategy.tone,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to log learning decisions: ${err}`);
      }
    }

    // 6. Mapear formato a ContentFormat enum de Prisma
    const formatMap: Record<string, 'POST' | 'CAROUSEL' | 'REEL' | 'STORY' | 'AVATAR_VIDEO' | 'HYBRID_MOTION'> = {
      post: 'POST',
      carousel: 'CAROUSEL',
      reel: 'REEL',
      story: 'STORY',
      avatar_video: 'AVATAR_VIDEO',
      hybrid_motion: 'HYBRID_MOTION',
    };

    // 7. Crear ContentBrief (upsert para idempotencia — evita violación de unique constraint
    //    si la etapa se ejecuta más de una vez para el mismo editorialRunId)
    const briefData = {
      themeId: themes[0]?.id ?? null,
      angle: strategy.angle,
      format: formatMap[strategy.format] ?? 'POST',
      cta: strategy.cta,
      references: strategy.references,
      seedPrompt: strategy.seedPrompt,
      objective: run.campaign?.objective ?? 'AUTHORITY',
      tone: strategy.tone,
    };

    const brief = await this.prisma.contentBrief.upsert({
      where: { editorialRunId },
      create: { editorialRunId, ...briefData },
      update: briefData,
    });

    // 8. Actualizar status
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: 'CONTENT' },
    });

    this.logger.log(`Strategy complete: brief ${brief.id}, format=${strategy.format}`);

    return { briefId: brief.id, strategy };
  }

  /**
   * Obtiene el brief de un editorial run
   */
  async getBrief(editorialRunId: string) {
    return this.prisma.contentBrief.findUnique({
      where: { editorialRunId },
      include: { theme: true, contentVersions: true },
    });
  }
}
