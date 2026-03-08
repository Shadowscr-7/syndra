// ============================================================
// Content Service — Generación de copy con LLM
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  parseLLMJsonResponse,
  buildPostCopyPrompt,
  buildCarouselCopyPrompt,
  buildToneVariantPrompt,
  buildCorrectionPrompt,
  buildComplianceCheckPrompt,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';
import { INSTAGRAM_LIMITS } from '@automatismos/shared';

interface GeneratedCopy {
  hook: string;
  copy: string;
  caption: string;
  title: string;
  hashtags: string[];
  imagePrompt?: string;
  slides?: Array<{
    slideNumber: number;
    heading: string;
    body: string;
    imagePrompt: string;
  }>;
}

export interface ComplianceResult {
  isCompliant: boolean;
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
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

  /** Build LLM adapter: DB credentials first, env-var fallback */
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
    return this.fallbackLlm;
  }

  /**
   * Ejecuta la generación de contenido:
   * 1. Lee el ContentBrief del run
   * 2. Genera copy principal (v1)
   * 3. Genera variante alternativa (v2) con tono diferente
   * 4. Valida compliance
   * 5. Persiste ContentVersions
   * 6. Transiciona a MEDIA o REVIEW según formato
   */
  async executeContentGeneration(
    editorialRunId: string,
    workspaceId: string,
  ): Promise<{
    mainVersionId: string;
    variantVersionId: string;
    complianceCheck: ComplianceResult;
  }> {
    this.logger.log(`Starting content generation for run ${editorialRunId}`);

    // 1. Obtener brief
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: { theme: true },
    });

    // 2. Obtener perfil de marca
    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    // 2b. Obtener persona activa y perfil de contenido del usuario
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
    });
    const ownerId = wsUser?.userId;

    // Cargar perfil de contenido del run o el default
    const editRun = await this.prisma.editorialRun.findUnique({
      where: { id: editorialRunId },
      select: { contentProfileId: true, userPersonaId: true },
    });

    const activePersona = editRun?.userPersonaId
      ? await this.prisma.userPersona.findUnique({ where: { id: editRun.userPersonaId } })
      : ownerId
        ? await this.prisma.userPersona.findFirst({
            where: { userId: ownerId, isActive: true },
          })
        : null;

    const contentProfile = editRun?.contentProfileId
      ? await this.prisma.contentProfile.findUnique({ where: { id: editRun.contentProfileId } })
      : ownerId
        ? await this.prisma.contentProfile.findFirst({
            where: { userId: ownerId, isDefault: true },
          })
        : null;

    // Build persona/profile objects for prompt injection
    const personaCtx = activePersona
      ? {
          brandName: activePersona.brandName,
          brandDescription: activePersona.brandDescription,
          tone: activePersona.tone,
          expertise: activePersona.expertise,
          targetAudience: activePersona.targetAudience,
          avoidTopics: activePersona.avoidTopics,
          languageStyle: activePersona.languageStyle,
          examplePhrases: activePersona.examplePhrases,
        }
      : undefined;

    const profileCtx = contentProfile
      ? {
          name: contentProfile.name,
          tone: contentProfile.tone,
          contentLength: contentProfile.contentLength,
          audience: contentProfile.audience,
          language: contentProfile.language,
          hashtags: contentProfile.hashtags,
          postingGoal: contentProfile.postingGoal,
        }
      : undefined;

    // 3. Generar copy según formato
    const llm = await this.getLlm(workspaceId);
    let mainCopy: GeneratedCopy;
    const formatLower = brief.format.toLowerCase();

    if (formatLower === 'carousel') {
      mainCopy = await this.generateCarouselCopy(brief, brand, personaCtx, profileCtx, llm);
    } else {
      mainCopy = await this.generatePostCopy(brief, brand, personaCtx, profileCtx, llm);
    }

    // 4. Crear ContentVersion principal (v1)
    const mainVersion = await this.prisma.contentVersion.create({
      data: {
        briefId: brief.id,
        version: 1,
        isMain: true,
        hook: mainCopy.hook,
        copy: mainCopy.copy,
        caption: this.truncateCaption(mainCopy.caption),
        title: mainCopy.title,
        hashtags: mainCopy.hashtags.slice(0, INSTAGRAM_LIMITS.HASHTAGS_MAX),
        llmPromptUsed: brief.seedPrompt,
      },
    });

    // 5. Generar variante con tono alternativo (v2)
    const altTone = this.pickAlternativeTone(brief.tone);
    let variantCopy: GeneratedCopy;
    try {
      const variantResponse = await llm.complete(
        buildToneVariantPrompt({
          originalCopy: mainCopy.caption,
          newTone: altTone,
          brandVoice: brand?.voice ?? '',
        }),
        { temperature: 0.8, maxTokens: 2048 },
      );
      variantCopy = parseLLMJsonResponse<GeneratedCopy>(variantResponse);
    } catch {
      this.logger.warn('Variant generation failed, using main copy with modified tone tag');
      variantCopy = { ...mainCopy, title: `${mainCopy.title} (${altTone})` };
    }

    const variantVersion = await this.prisma.contentVersion.create({
      data: {
        briefId: brief.id,
        version: 2,
        isMain: false,
        hook: variantCopy.hook,
        copy: variantCopy.copy,
        caption: this.truncateCaption(variantCopy.caption),
        title: variantCopy.title,
        hashtags: variantCopy.hashtags?.slice(0, INSTAGRAM_LIMITS.HASHTAGS_MAX) ?? mainCopy.hashtags,
        llmPromptUsed: `tone_variant:${altTone}`,
      },
    });

    // 6. Validar compliance (includes whitelist/blacklist filtering)
    const complianceCheck = await this.checkCompliance(
      mainCopy.caption,
      brand?.prohibitedTopics ?? [],
      brand?.allowedClaims ?? [],
      llm,
      brand?.topicWhitelist ?? [],
      brand?.topicBlacklist ?? [],
    );

    // 7. Determinar siguiente status
    // Si es post simple → REVIEW (no necesita media generada)
    // Si es carousel/reel/video → MEDIA
    const nextStatus =
      formatLower === 'post' || formatLower === 'story'
        ? 'REVIEW'
        : 'MEDIA';

    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: nextStatus },
    });

    this.logger.log(
      `Content generated: v1=${mainVersion.id}, v2=${variantVersion.id}, next=${nextStatus}`,
    );

    return {
      mainVersionId: mainVersion.id,
      variantVersionId: variantVersion.id,
      complianceCheck,
    };
  }

  /**
   * Genera copy corregido basado en feedback humano (desde Telegram)
   */
  async applyCorrection(
    contentVersionId: string,
    feedback: string,
    workspaceId: string,
  ): Promise<{ newVersionId: string }> {
    const original = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: true },
    });

    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    const llm = await this.getLlm(workspaceId);
    const correctionResponse = await llm.complete(
      buildCorrectionPrompt({
        originalCopy: original.caption,
        feedback,
        tone: original.brief.tone,
        brandVoice: brand?.voice ?? '',
      }),
      { temperature: 0.5, maxTokens: 2048 },
    );

    const corrected = parseLLMJsonResponse<GeneratedCopy>(correctionResponse);

    // Obtener el siguiente número de versión
    const maxVersion = await this.prisma.contentVersion.aggregate({
      where: { briefId: original.briefId },
      _max: { version: true },
    });

    const newVersion = await this.prisma.contentVersion.create({
      data: {
        briefId: original.briefId,
        version: (maxVersion._max.version ?? 0) + 1,
        isMain: true,
        hook: corrected.hook,
        copy: corrected.copy,
        caption: this.truncateCaption(corrected.caption),
        title: corrected.title,
        hashtags: corrected.hashtags ?? original.hashtags,
        humanFeedback: feedback,
        llmPromptUsed: `correction:${feedback.substring(0, 100)}`,
      },
    });

    // Desmarcar la versión anterior como main
    await this.prisma.contentVersion.update({
      where: { id: original.id },
      data: { isMain: false },
    });

    return { newVersionId: newVersion.id };
  }

  /**
   * Cambia el tono de una versión
   */
  async changeTone(
    contentVersionId: string,
    newTone: string,
    workspaceId: string,
  ): Promise<{ newVersionId: string }> {
    const original = await this.prisma.contentVersion.findUniqueOrThrow({
      where: { id: contentVersionId },
      include: { brief: true },
    });

    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    const llm = await this.getLlm(workspaceId);
    const response = await llm.complete(
      buildToneVariantPrompt({
        originalCopy: original.caption,
        newTone,
        brandVoice: brand?.voice ?? '',
      }),
      { temperature: 0.7, maxTokens: 2048 },
    );

    const variant = parseLLMJsonResponse<GeneratedCopy>(response);

    const maxVersion = await this.prisma.contentVersion.aggregate({
      where: { briefId: original.briefId },
      _max: { version: true },
    });

    const newVersion = await this.prisma.contentVersion.create({
      data: {
        briefId: original.briefId,
        version: (maxVersion._max.version ?? 0) + 1,
        isMain: true,
        hook: variant.hook,
        copy: variant.copy,
        caption: this.truncateCaption(variant.caption),
        title: variant.title,
        hashtags: variant.hashtags ?? original.hashtags,
        humanFeedback: `tone_change:${newTone}`,
        llmPromptUsed: `tone_variant:${newTone}`,
      },
    });

    await this.prisma.contentVersion.update({
      where: { id: original.id },
      data: { isMain: false },
    });

    return { newVersionId: newVersion.id };
  }

  // ============================================================
  // Private methods
  // ============================================================

  private async generatePostCopy(
    brief: { angle: string; tone: string; cta: string; seedPrompt: string; references: string[] },
    brand: { voice: string } | null,
    persona?: any,
    contentProfile?: any,
    llm?: LLMAdapter,
  ): Promise<GeneratedCopy> {
    const adapter = llm ?? this.fallbackLlm;
    const prompt = buildPostCopyPrompt({
      angle: brief.angle,
      tone: brief.tone,
      cta: brief.cta,
      seedPrompt: brief.seedPrompt,
      brandVoice: brand?.voice ?? '',
      references: brief.references,
      maxCaptionLength: INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH,
      hashtagLimit: INSTAGRAM_LIMITS.HASHTAGS_MAX,
      persona,
      contentProfile,
    });

    const response = await adapter.complete(prompt, {
      temperature: 0.7,
      maxTokens: 3000,
    });

    return parseLLMJsonResponse<GeneratedCopy>(response);
  }

  private async generateCarouselCopy(
    brief: { angle: string; tone: string; cta: string; seedPrompt: string; references: string[] },
    brand: { voice: string } | null,
    persona?: any,
    contentProfile?: any,
    llm?: LLMAdapter,
  ): Promise<GeneratedCopy> {
    const adapter = llm ?? this.fallbackLlm;
    const prompt = buildCarouselCopyPrompt({
      angle: brief.angle,
      tone: brief.tone,
      cta: brief.cta,
      seedPrompt: brief.seedPrompt,
      brandVoice: brand?.voice ?? '',
      references: brief.references,
      slideCount: 8,
      persona,
      contentProfile,
    });

    const response = await adapter.complete(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    return parseLLMJsonResponse<GeneratedCopy>(response);
  }

  private async checkCompliance(
    content: string,
    prohibitedTopics: string[],
    allowedClaims: string[],
    llm?: LLMAdapter,
    topicWhitelist: string[] = [],
    topicBlacklist: string[] = [],
  ): Promise<ComplianceResult> {
    const issues: string[] = [];

    // Pre-LLM: check topic blacklist (fast keyword match)
    if (topicBlacklist.length > 0) {
      const contentLower = content.toLowerCase();
      for (const blocked of topicBlacklist) {
        if (contentLower.includes(blocked.toLowerCase())) {
          issues.push(`Contenido menciona tema bloqueado: "${blocked}"`);
        }
      }
    }

    // Pre-LLM: if whitelist is set, verify at least one whitelisted topic appears
    if (topicWhitelist.length > 0) {
      const contentLower = content.toLowerCase();
      const hasWhitelisted = topicWhitelist.some((t) => contentLower.includes(t.toLowerCase()));
      if (!hasWhitelisted) {
        issues.push(`Contenido no incluye ningún tema de la lista blanca: ${topicWhitelist.join(', ')}`);
      }
    }

    // If pre-checks already found issues, return early as non-compliant
    if (issues.length > 0) {
      return {
        isCompliant: false,
        issues,
        suggestions: ['Ajusta el contenido para respetar la whitelist/blacklist de temas configurada.'],
        riskLevel: 'medium',
      };
    }

    try {
      const adapter = llm ?? this.fallbackLlm;
      const prompt = buildComplianceCheckPrompt(content, prohibitedTopics, allowedClaims);
      const response = await adapter.complete(prompt, {
        temperature: 0.1,
        maxTokens: 1024,
      });
      return parseLLMJsonResponse<ComplianceResult>(response);
    } catch {
      return { isCompliant: true, issues: [], suggestions: [], riskLevel: 'low' };
    }
  }

  private truncateCaption(caption: string): string {
    if (caption.length <= INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH) return caption;
    return caption.substring(0, INSTAGRAM_LIMITS.CAPTION_MAX_LENGTH - 3) + '...';
  }

  private pickAlternativeTone(currentTone: string): string {
    const tones = ['didáctico', 'técnico', 'aspiracional', 'cercano', 'polémico', 'premium'];
    const filtered = tones.filter((t) => t !== currentTone);
    return filtered[Math.floor(Math.random() * filtered.length)] ?? 'cercano';
  }
}
