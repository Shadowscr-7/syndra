// ============================================================
// BrandMemoryService — Memoria de marca y detección de fatiga
// Analiza contenido publicado para evitar repetición excesiva
// de temas, CTAs, tonos y frases.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface PhraseEntry { phrase: string; count: number; lastUsed: string }
interface ThemeEntry { theme: string; count: number; lastUsed: string; fatigueLevel: string }

@Injectable()
export class BrandMemoryService {
  private readonly logger = new Logger(BrandMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Analyze published content for a workspace ─────────────

  async analyzeWorkspace(workspaceId: string) {
    this.logger.log(`Analyzing brand memory for workspace ${workspaceId}`);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all published content in the last 30 days
    const runs = await this.prisma.editorialRun.findMany({
      where: {
        workspaceId,
        status: 'PUBLISHED',
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        contentBrief: {
          include: { contentVersions: { where: { isMain: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const phrases: Map<string, PhraseEntry> = new Map();
    const claims: Map<string, { claim: string; count: number }> = new Map();
    const ctas: Map<string, { cta: string; count: number }> = new Map();
    const themes: Map<string, ThemeEntry> = new Map();
    const wordCount: Map<string, number> = new Map();

    for (const run of runs) {
      const brief = run.contentBrief;
      const version = brief?.contentVersions[0];
      if (!brief || !version) continue;

      // Track CTAs
      if (brief.cta) {
        const key = brief.cta.toLowerCase().trim();
        const existing = ctas.get(key);
        ctas.set(key, { cta: brief.cta, count: (existing?.count ?? 0) + 1 });
      }

      // Track themes
      if (brief.angle) {
        const key = brief.angle.toLowerCase().substring(0, 50);
        const existing = themes.get(key);
        themes.set(key, {
          theme: brief.angle,
          count: (existing?.count ?? 0) + 1,
          lastUsed: run.createdAt.toISOString(),
          fatigueLevel: (existing?.count ?? 0) >= 5 ? 'HIGH' : (existing?.count ?? 0) >= 3 ? 'MEDIUM' : 'LOW',
        });
      }

      // Track phrases from copy
      const text = `${version.hook} ${version.copy} ${version.caption}`;
      const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20);
      for (const sentence of sentences) {
        const existing = phrases.get(sentence);
        phrases.set(sentence, {
          phrase: sentence,
          count: (existing?.count ?? 0) + 1,
          lastUsed: run.createdAt.toISOString(),
        });
      }

      // Track word frequency
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
      }
    }

    // Detect overused words (> 15 times in 30 days)
    const overusedWords = Array.from(wordCount.entries())
      .filter(([_, count]) => count > 15)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // Persist brand memory
    await this.prisma.brandMemory.upsert({
      where: { workspaceId },
      update: {
        frequentPhrases: Array.from(phrases.values()).filter(p => p.count > 1).slice(0, 30) as any,
        usedCTAs: Array.from(ctas.values()).sort((a, b) => b.count - a.count).slice(0, 20) as any,
        usedClaims: Array.from(claims.values()).slice(0, 30) as any,
        overusedWords: overusedWords as any,
        exploitedThemes: Array.from(themes.values()).sort((a, b) => b.count - a.count).slice(0, 20) as any,
        lastAnalyzedAt: new Date(),
      },
      create: {
        workspaceId,
        frequentPhrases: Array.from(phrases.values()).filter(p => p.count > 1).slice(0, 30) as any,
        usedCTAs: Array.from(ctas.values()).sort((a, b) => b.count - a.count).slice(0, 20) as any,
        usedClaims: [] as any,
        overusedWords: overusedWords as any,
        exploitedThemes: Array.from(themes.values()).sort((a, b) => b.count - a.count).slice(0, 20) as any,
        lastAnalyzedAt: new Date(),
      },
    });

    // Update fatigue scores
    await this.updateFatigueScores(workspaceId, runs);

    this.logger.log(`Brand memory analysis complete for ${workspaceId}: ${runs.length} runs analyzed`);
    return { runsAnalyzed: runs.length, overusedWords: overusedWords.length };
  }

  // ── Fatigue score calculation ─────────────────────────────

  private async updateFatigueScores(workspaceId: string, runs: any[]) {
    const dimensionCounts: Map<string, Map<string, number>> = new Map();

    for (const run of runs) {
      const brief = run.contentBrief;
      if (!brief) continue;

      // Format
      this.incrementDimension(dimensionCounts, 'FORMAT', brief.format);
      // Tone
      this.incrementDimension(dimensionCounts, 'TONE', brief.tone);
      // CTA
      if (brief.cta) this.incrementDimension(dimensionCounts, 'CTA', brief.cta.toLowerCase());
      // Theme angle
      if (brief.angle) this.incrementDimension(dimensionCounts, 'THEME', brief.angle.substring(0, 50).toLowerCase());
    }

    const totalRuns = runs.length || 1;

    for (const [dimensionType, values] of dimensionCounts.entries()) {
      for (const [dimensionValue, count] of values.entries()) {
        // Fatigue = usage frequency × recency weight
        const usageRatio = count / totalRuns;
        const fatigueScore = Math.min(100, usageRatio * 100 * (count > 3 ? 1.5 : 1));
        const suggestedCooldown = fatigueScore > 70 ? 7 : fatigueScore > 50 ? 3 : 0;

        await this.prisma.contentFatigueScore.upsert({
          where: {
            workspaceId_dimensionType_dimensionValue: {
              workspaceId,
              dimensionType: dimensionType as any,
              dimensionValue,
            },
          },
          update: {
            recentUsageCount: count,
            fatigueScore,
            suggestedCooldownDays: suggestedCooldown,
          },
          create: {
            workspaceId,
            dimensionType: dimensionType as any,
            dimensionValue,
            recentUsageCount: count,
            fatigueScore,
            suggestedCooldownDays: suggestedCooldown,
          },
        });
      }
    }
  }

  private incrementDimension(map: Map<string, Map<string, number>>, dim: string, val: string) {
    if (!val) return;
    if (!map.has(dim)) map.set(dim, new Map());
    const inner = map.get(dim)!;
    inner.set(val, (inner.get(val) ?? 0) + 1);
  }

  // ── Query methods ─────────────────────────────────────────

  async getBrandMemory(workspaceId: string) {
    return this.prisma.brandMemory.findUnique({ where: { workspaceId } });
  }

  async getFatigueScores(workspaceId: string, dimensionType?: string) {
    return this.prisma.contentFatigueScore.findMany({
      where: {
        workspaceId,
        ...(dimensionType ? { dimensionType: dimensionType as any } : {}),
      },
      orderBy: { fatigueScore: 'desc' },
    });
  }

  async getHighFatigueItems(workspaceId: string, threshold = 60) {
    return this.prisma.contentFatigueScore.findMany({
      where: { workspaceId, fatigueScore: { gte: threshold } },
      orderBy: { fatigueScore: 'desc' },
    });
  }

  // ── Cron: daily analysis ──────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cronAnalyzeAll() {
    this.logger.log('Running daily brand memory analysis for all workspaces...');
    const workspaces = await this.prisma.workspace.findMany({ select: { id: true } });
    for (const ws of workspaces) {
      try {
        await this.analyzeWorkspace(ws.id);
      } catch (err) {
        this.logger.error(`Brand memory analysis failed for ${ws.id}: ${err}`);
      }
    }
    this.logger.log('Daily brand memory analysis complete');
  }
}
