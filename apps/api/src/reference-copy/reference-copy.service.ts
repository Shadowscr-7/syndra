// ============================================================
// ReferenceCopyService — Análisis de copies de referencia
// Permite al usuario subir copies publicitarios para que la IA
// aprenda de su estilo creativo, tono, hooks y CTAs favoritos.
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

export interface CopyAnalysisResult {
  tone: string;
  hookType: 'QUESTION' | 'STATISTIC' | 'STORY' | 'BOLD_CLAIM' | 'EMPATHY' | 'OTHER';
  cta: string;
  lengthClass: 'SHORT' | 'MEDIUM' | 'LONG';
  topPhrases: string[];
  keywords: string[];
}

interface CreateDto {
  title?: string;
  body: string;
  type: 'AD_PAID' | 'ORGANIC' | 'EMAIL' | 'CAPTION' | 'STORY' | 'OTHER';
  platform?: string;
  tags?: string[];
  notes?: string;
}

function buildCopyAnalysisPrompt(body: string): string {
  return `Analiza el siguiente copy publicitario y extrae información estructurada.
Responde ÚNICAMENTE con un objeto JSON válido — sin markdown, sin explicaciones.

COPY:
"""
${body}
"""

Devuelve exactamente esta estructura JSON:
{
  "tone": "<un adjetivo descriptivo: ej. urgente, inspiracional, didáctico, conversacional, provocador>",
  "hookType": "<uno de: QUESTION, STATISTIC, STORY, BOLD_CLAIM, EMPATHY, OTHER>",
  "cta": "<la frase exacta del llamado a la acción, o cadena vacía si no hay>",
  "lengthClass": "<SHORT si menos de 50 palabras, MEDIUM si 50-150 palabras, LONG si más de 150>",
  "topPhrases": ["<frase 1>", "<frase 2>", "<frase 3>"],
  "keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>"]
}

Reglas:
- topPhrases: 2-5 frases memorables o recurrentes del texto (literales o muy cercanas)
- keywords: 3-6 palabras clave del tema, en minúsculas, sin stopwords
- Si un campo no puede determinarse, usa cadena vacía o arreglo vacío`;
}

@Injectable()
export class ReferenceCopyService {
  private readonly logger = new Logger(ReferenceCopyService.name);
  private readonly fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.fallbackLlm =
      provider === 'anthropic'
        ? new AnthropicAdapter({ apiKey })
        : new OpenAIAdapter({ apiKey });
  }

  // ── LLM resolution (same pattern as StrategyService) ─────

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
        const provider = (payload as any).provider ?? 'openai';
        return provider === 'anthropic'
          ? new AnthropicAdapter({ apiKey: payload.apiKey })
          : new OpenAIAdapter({ apiKey: payload.apiKey });
      }
    }
    return this.fallbackLlm;
  }

  // ── CRUD ─────────────────────────────────────────────────

  async list(workspaceId: string) {
    return this.prisma.referenceCopy.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, dto: CreateDto) {
    return this.prisma.referenceCopy.create({
      data: {
        workspaceId,
        title: dto.title ?? null,
        body: dto.body,
        type: dto.type,
        platform: dto.platform ?? null,
        tags: dto.tags ?? [],
        notes: dto.notes ?? null,
      },
    });
  }

  async update(workspaceId: string, id: string, dto: Partial<CreateDto>) {
    await this.assertOwnership(workspaceId, id);
    return this.prisma.referenceCopy.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.assertOwnership(workspaceId, id);
    await this.prisma.referenceCopy.delete({ where: { id } });
  }

  // ── Analysis ──────────────────────────────────────────────

  async analyzeOne(workspaceId: string, id: string): Promise<CopyAnalysisResult | null> {
    const copy = await this.prisma.referenceCopy.findFirst({
      where: { id, workspaceId },
    });
    if (!copy) return null;

    const llm = await this.getLlm(workspaceId);
    const result = await this.runAnalysis(llm, copy.body);

    await this.prisma.referenceCopy.update({
      where: { id },
      data: { analyzed: true, analysisResult: result as any },
    });

    // Merge this single result into BrandMemory
    await this.mergeToBrandMemory(workspaceId);

    return result;
  }

  async analyzeAll(workspaceId: string): Promise<{ analyzed: number; skipped: number }> {
    const unanalyzed = await this.prisma.referenceCopy.findMany({
      where: { workspaceId, analyzed: false },
    });

    if (unanalyzed.length === 0) return { analyzed: 0, skipped: 0 };

    const llm = await this.getLlm(workspaceId);
    let analyzed = 0;
    let skipped = 0;

    for (const copy of unanalyzed) {
      try {
        const result = await this.runAnalysis(llm, copy.body);
        await this.prisma.referenceCopy.update({
          where: { id: copy.id },
          data: { analyzed: true, analysisResult: result as any },
        });
        analyzed++;
      } catch (err) {
        this.logger.warn(`Failed to analyze copy ${copy.id}: ${err}`);
        skipped++;
      }
    }

    // Merge all analyzed copies into BrandMemory
    if (analyzed > 0) {
      await this.mergeToBrandMemory(workspaceId);
    }

    return { analyzed, skipped };
  }

  // ── LLM call ─────────────────────────────────────────────

  private async runAnalysis(llm: LLMAdapter, body: string): Promise<CopyAnalysisResult> {
    const prompt = buildCopyAnalysisPrompt(body);
    const raw = await llm.complete(prompt, { temperature: 0.2, maxTokens: 512 });
    return parseLLMJsonResponse<CopyAnalysisResult>(raw);
  }

  // ── BrandMemory merge ─────────────────────────────────────

  private async mergeToBrandMemory(workspaceId: string): Promise<void> {
    const copies = await this.prisma.referenceCopy.findMany({
      where: { workspaceId, analyzed: true },
      select: { analysisResult: true },
    });

    const allPhrases: string[] = [];
    const allCTAs: string[] = [];
    const allKeywords: string[] = [];

    for (const c of copies) {
      const r = c.analysisResult as CopyAnalysisResult | null;
      if (!r) continue;
      if (r.topPhrases?.length) allPhrases.push(...r.topPhrases);
      if (r.cta) allCTAs.push(r.cta);
      if (r.keywords?.length) allKeywords.push(...r.keywords);
    }

    const existing = await this.prisma.brandMemory.findUnique({ where: { workspaceId } });

    // Merge CTAs
    const existingCTAs: Array<{ cta: string; count: number }> =
      (existing?.usedCTAs as any) ?? [];
    const ctaMap = new Map(existingCTAs.map(c => [c.cta.toLowerCase(), c]));
    for (const cta of allCTAs) {
      const key = cta.toLowerCase().trim();
      if (!key) continue;
      ctaMap.set(key, { cta, count: (ctaMap.get(key)?.count ?? 0) + 1 });
    }
    const mergedCTAs = [...ctaMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Merge phrases
    const existingPhrases: Array<{ phrase: string; count: number; lastUsed: string }> =
      (existing?.frequentPhrases as any) ?? [];
    const phraseMap = new Map(existingPhrases.map(p => [p.phrase.toLowerCase(), p]));
    for (const phrase of allPhrases) {
      const key = phrase.toLowerCase().trim();
      if (!key) continue;
      phraseMap.set(key, {
        phrase,
        count: (phraseMap.get(key)?.count ?? 0) + 1,
        lastUsed: new Date().toISOString(),
      });
    }
    const mergedPhrases = [...phraseMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    await this.prisma.brandMemory.upsert({
      where: { workspaceId },
      update: {
        frequentPhrases: mergedPhrases as any,
        usedCTAs: mergedCTAs as any,
      },
      create: {
        workspaceId,
        frequentPhrases: mergedPhrases as any,
        usedCTAs: mergedCTAs as any,
        usedClaims: [],
        overusedWords: [],
        exploitedThemes: [],
      },
    });

    this.logger.log(
      `BrandMemory updated for workspace ${workspaceId}: ${mergedPhrases.length} phrases, ${mergedCTAs.length} CTAs`,
    );
  }

  // ── Ownership guard ───────────────────────────────────────

  private async assertOwnership(workspaceId: string, id: string) {
    const copy = await this.prisma.referenceCopy.findFirst({
      where: { id, workspaceId },
    });
    if (!copy) throw new NotFoundException(`ReferenceCopy ${id} not found`);
    return copy;
  }
}
