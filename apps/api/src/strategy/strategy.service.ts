// ============================================================
// Strategy Service — Selección de ángulo, formato, tono, CTA
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
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
  reasoning: string;
  references: string[];
  estimatedEngagement: string;
  suggestedHashtags: string[];
}

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private llm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');

    if (provider === 'anthropic') {
      this.llm = new AnthropicAdapter({ apiKey });
    } else {
      this.llm = new OpenAIAdapter({ apiKey });
    }
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

    // 3. Seleccionar tema más relevante
    const themes = await this.prisma.contentTheme.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    // 4. Obtener ángulos previos para evitar repetición
    const recentRuns = await this.prisma.contentBrief.findMany({
      where: {
        editorialRun: { workspaceId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { angle: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 5. Generar estrategia con LLM
    const prompt = buildStrategyPrompt({
      researchSummary: run.researchSummary ?? 'No research summary available',
      brandVoice: brand?.voice ?? '',
      defaultTone: brand?.tone ?? 'didáctico',
      objective: run.campaign?.objective ?? 'AUTHORITY',
      availableFormats: themes[0]?.preferredFormats ?? ['post', 'carousel'],
      themeKeywords: themes.flatMap((t) => t.keywords),
      campaignContext: run.campaign
        ? `${run.campaign.name} (${run.campaign.objective})`
        : undefined,
      previousAngles: recentRuns.map((r) => r.angle).filter(Boolean),
    });

    let strategy: StrategyResult;
    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.7,
        maxTokens: 2048,
      });
      strategy = parseLLMJsonResponse<StrategyResult>(response);
    } catch (error) {
      this.logger.error('Strategy LLM failed, using fallback:', error);
      strategy = {
        angle: run.researchSnapshots[0]?.suggestedAngle ?? 'General tech insight',
        format: 'post',
        cta: brand?.baseCta ?? 'Síguenos para más contenido',
        seedPrompt: `Create content about: ${run.researchSnapshots[0]?.title ?? 'AI trends'}`,
        tone: brand?.tone ?? 'didáctico',
        reasoning: 'Fallback strategy due to LLM error',
        references: run.researchSnapshots.map((s) => s.sourceUrl),
        estimatedEngagement: 'medium',
        suggestedHashtags: ['#AI', '#tech', '#automation'],
      };
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

    // 7. Crear ContentBrief
    const brief = await this.prisma.contentBrief.create({
      data: {
        editorialRunId,
        themeId: themes[0]?.id ?? null,
        angle: strategy.angle,
        format: formatMap[strategy.format] ?? 'POST',
        cta: strategy.cta,
        references: strategy.references,
        seedPrompt: strategy.seedPrompt,
        objective: run.campaign?.objective ?? 'AUTHORITY',
        tone: strategy.tone,
      },
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
