// ============================================================
// ExperimentService — A/B Testing editorial real
// Crea, evalúa y cierra experimentos comparando variantes de
// contenido (tono, CTA, formato) y alimenta el learning loop.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsService } from '../credentials/credentials.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  parseLLMJsonResponse,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';

interface VariantGenerationResult {
  label: string;
  variantConfig: Record<string, unknown>;
  description: string;
}

@Injectable()
export class ExperimentService {
  private readonly logger = new Logger(ExperimentService.name);
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

  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    if (wsUser?.userId) {
      const { payload } = await this.credentialsService.resolveCredential(workspaceId, wsUser.userId, 'LLM');
      if (payload?.apiKey) {
        const provider = payload.provider ?? 'openai';
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    return this.fallbackLlm;
  }

  // ── Create experiment ─────────────────────────────────────

  async createExperiment(params: {
    workspaceId: string;
    editorialRunId?: string;
    experimentType: string;
    hypothesis?: string;
  }) {
    const { workspaceId, editorialRunId, experimentType, hypothesis } = params;

    // Get the original editorial run to create variant B
    let variantAConfig: Record<string, unknown> = {};
    let variantBConfig: Record<string, unknown> = {};

    if (editorialRunId) {
      const run = await this.prisma.editorialRun.findUnique({
        where: { id: editorialRunId },
        include: {
          contentBrief: { include: { contentVersions: { where: { isMain: true } } } },
        },
      });

      if (!run) throw new NotFoundException('Editorial run not found');

      const brief = run.contentBrief;
      const mainVersion = brief?.contentVersions[0];

      variantAConfig = {
        label: 'Original',
        tone: brief?.tone ?? 'didáctico',
        format: brief?.format ?? 'POST',
        cta: brief?.cta ?? '',
        hook: mainVersion?.hook ?? '',
        copy: mainVersion?.copy ?? '',
      };

      // Generate variant B via LLM
      const llm = await this.getLlm(workspaceId);
      const variantB = await this.generateVariantB(llm, experimentType, variantAConfig);
      variantBConfig = variantB;
    } else {
      variantAConfig = { label: 'Variant A', note: 'Manual experiment' };
      variantBConfig = { label: 'Variant B', note: 'Manual experiment' };
    }

    const experiment = await this.prisma.contentExperiment.create({
      data: {
        workspaceId,
        editorialRunId,
        experimentType: experimentType as any,
        hypothesis,
        status: 'RUNNING',
        variants: {
          create: [
            { label: 'A', variantConfig: variantAConfig as any },
            { label: 'B', variantConfig: variantBConfig as any },
          ],
        },
      },
      include: { variants: true },
    });

    this.logger.log(`Experiment ${experiment.id} created: ${experimentType} with 2 variants`);
    return experiment;
  }

  private async generateVariantB(
    llm: LLMAdapter,
    experimentType: string,
    originalConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const prompt = `Eres un estratega de contenido haciendo A/B testing.
Tipo de experimento: ${experimentType}
Configuración original (Variant A):
${JSON.stringify(originalConfig, null, 2)}

Genera una Variant B que modifique SOLO el aspecto del tipo de experimento (${experimentType}).
Si el tipo es TONE, cambia el tono. Si es CTA, cambia el CTA. Si es FORMAT, cambia el formato. Si es HOOK, cambia el hook.

Responde en JSON con este formato exacto:
{
  "label": "Variante alternativa",
  "tone": "...",
  "format": "...",
  "cta": "...",
  "hook": "...",
  "copy": "...",
  "reasoning": "Explicación breve de por qué esta variante podría funcionar mejor"
}`;

    const raw = await llm.complete(prompt, { temperature: 0.8, maxTokens: 1000 });
    try {
      const parsed = parseLLMJsonResponse<Record<string, unknown>>(raw);
      return parsed;
    } catch {
      return { label: 'Variant B', note: 'Auto-generated', ...originalConfig };
    }
  }

  // ── Evaluate experiment ───────────────────────────────────

  async evaluateExperiment(experimentId: string) {
    const experiment = await this.prisma.contentExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });
    if (!experiment) throw new NotFoundException('Experiment not found');
    if (experiment.status !== 'RUNNING') return experiment;

    // Calculate performance scores from linked publications
    const updatedVariants = await Promise.all(
      experiment.variants.map(async (variant) => {
        if (!variant.publicationId) return variant;

        const pub = await this.prisma.publication.findUnique({
          where: { id: variant.publicationId },
        });
        if (!pub) return variant;

        const score =
          (pub.likes * 1) +
          (pub.comments * 2) +
          (pub.shares * 3) +
          (pub.saves * 2.5) +
          (pub.reach * 0.01);

        return this.prisma.contentExperimentVariant.update({
          where: { id: variant.id },
          data: {
            performanceScore: score,
            metrics: {
              likes: pub.likes,
              comments: pub.comments,
              shares: pub.shares,
              saves: pub.saves,
              reach: pub.reach,
              engagementRate: pub.engagementRate,
            },
          },
        });
      }),
    );

    // Check if both variants have scores and enough time has passed
    const allScored = updatedVariants.every((v) => v.performanceScore !== null);
    const hoursElapsed = (Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60);

    if (allScored && hoursElapsed >= 48) {
      return this.declareWinner(experiment.id);
    }

    return this.prisma.contentExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });
  }

  // ── Declare winner ────────────────────────────────────────

  async declareWinner(experimentId: string) {
    const experiment = await this.prisma.contentExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });
    if (!experiment) throw new NotFoundException('Experiment not found');

    const scoredVariants = experiment.variants
      .filter((v) => v.performanceScore !== null)
      .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0));

    if (scoredVariants.length === 0) return experiment;

    const winner = scoredVariants[0]!;
    const loser = scoredVariants[1];

    const improvementPct = loser?.performanceScore
      ? (((winner.performanceScore ?? 0) - (loser.performanceScore ?? 0)) / (loser.performanceScore ?? 1)) * 100
      : 0;

    // Update winner
    await this.prisma.contentExperimentVariant.update({
      where: { id: winner.id },
      data: { isWinner: true },
    });

    // Feed the learning loop
    await this.feedLearningLoop(experiment.workspaceId, experiment.experimentType, winner, improvementPct);

    // Close experiment
    const updated = await this.prisma.contentExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'COMPLETED',
        winnerVariantId: winner.id,
        endedAt: new Date(),
        conclusion: `Variante ${winner.label} ganó con ${improvementPct.toFixed(1)}% más rendimiento.`,
      },
      include: { variants: true },
    });

    this.logger.log(`Experiment ${experimentId} completed. Winner: ${winner.label} (+${improvementPct.toFixed(1)}%)`);
    return updated;
  }

  private async feedLearningLoop(
    workspaceId: string,
    experimentType: string,
    winner: { variantConfig: any; performanceScore: number | null },
    improvementPct: number,
  ) {
    try {
      const dimensionMap: Record<string, string> = {
        TONE: 'TONE', FORMAT: 'FORMAT', CTA: 'CTA',
        HOOK: 'HOOK_TYPE', HOUR: 'HOUR', IMAGE_STYLE: 'VISUAL_STYLE',
      };
      const dimension = dimensionMap[experimentType] ?? 'TONE';
      const config = winner.variantConfig as Record<string, unknown>;
      const value = (config[experimentType.toLowerCase()] ?? config['tone'] ?? 'unknown') as string;

      const profile = await this.prisma.contentLearningProfile.findFirst({
        where: { workspaceId },
      });

      if (profile) {
        await this.prisma.contentPatternScore.upsert({
          where: {
            learningProfileId_dimensionType_dimensionValue: {
              learningProfileId: profile.id,
              dimensionType: dimension as any,
              dimensionValue: value,
            },
          },
          update: {
            weightedScore: { increment: improvementPct > 0 ? 0.05 : -0.02 },
            sampleSize: { increment: 1 },
          },
          create: {
            learningProfileId: profile.id,
            dimensionType: dimension as any,
            dimensionValue: value,
            weightedScore: improvementPct > 0 ? 0.6 : 0.4,
            sampleSize: 1,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to feed learning loop: ${err}`);
    }
  }

  // ── Cancel experiment ─────────────────────────────────────

  async cancelExperiment(experimentId: string) {
    return this.prisma.contentExperiment.update({
      where: { id: experimentId },
      data: { status: 'CANCELLED', endedAt: new Date() },
      include: { variants: true },
    });
  }

  // ── Link publication to variant ───────────────────────────

  async linkPublicationToVariant(variantId: string, publicationId: string) {
    return this.prisma.contentExperimentVariant.update({
      where: { id: variantId },
      data: { publicationId },
    });
  }

  // ── List experiments ──────────────────────────────────────

  async listExperiments(workspaceId: string, status?: string, limit = 20) {
    return this.prisma.contentExperiment.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as any } : {}),
      },
      include: { variants: true },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getExperiment(id: string) {
    const exp = await this.prisma.contentExperiment.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!exp) throw new NotFoundException('Experiment not found');
    return exp;
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats(workspaceId: string) {
    const [total, running, completed, avgImprovement] = await Promise.all([
      this.prisma.contentExperiment.count({ where: { workspaceId } }),
      this.prisma.contentExperiment.count({ where: { workspaceId, status: 'RUNNING' } }),
      this.prisma.contentExperiment.count({ where: { workspaceId, status: 'COMPLETED' } }),
      this.prisma.contentExperiment.findMany({
        where: { workspaceId, status: 'COMPLETED', winnerVariantId: { not: null } },
        include: { variants: true },
      }),
    ]);

    let totalImprovement = 0;
    let completedWithScore = 0;
    for (const exp of avgImprovement) {
      const sorted = exp.variants
        .filter((v) => v.performanceScore != null)
        .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0));
      if (sorted.length >= 2) {
        const diff = ((sorted[0]!.performanceScore ?? 0) - (sorted[1]!.performanceScore ?? 0)) /
          Math.max(sorted[1]!.performanceScore ?? 1, 1) * 100;
        totalImprovement += diff;
        completedWithScore++;
      }
    }

    return {
      total,
      running,
      completed,
      cancelled: total - running - completed,
      averageImprovementPct: completedWithScore > 0 ? totalImprovement / completedWithScore : 0,
    };
  }
}
