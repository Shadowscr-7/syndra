// ============================================================
// ScoringService — Predictive scoring & auto-suggestions
// Fase 5.3 — Feedback loop al pipeline
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ContentScore {
  expectedEngagement: number;
  confidence: number;
  factors: string[];
  suggestions: string[];
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Predict expected engagement for a new editorial proposal.
   * Uses historical data by theme, format, tone, and day-of-week.
   */
  async predictScore(params: {
    workspaceId?: string;
    themeId?: string;
    format?: string;
    tone?: string;
    publishHour?: number;
    publishDayOfWeek?: number; // 0=Sunday
  }): Promise<ContentScore> {
    const wid = params.workspaceId ?? 'default';
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch historical publications for comparison
    const historical = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: {
          workspaceId: wid,
          contentBrief: params.themeId ? { themeId: params.themeId } : undefined,
        },
      },
      include: {
        editorialRun: {
          include: { contentBrief: { include: { theme: true } } },
        },
      },
    });

    if (historical.length < 3) {
      return {
        expectedEngagement: 0,
        confidence: 0,
        factors: ['Datos insuficientes — se necesitan al menos 3 publicaciones'],
        suggestions: ['Publica más contenido para obtener predicciones precisas'],
      };
    }

    // Compute baseline
    const allRates = historical.map((p) => p.engagementRate ?? 0);
    const baseline = allRates.reduce((a, b) => a + b, 0) / allRates.length;

    // Factor multipliers
    let score = baseline;
    const factors: string[] = [];
    const suggestions: string[] = [];
    let dataPoints = 0;

    // Format factor
    if (params.format) {
      const byFormat = historical.filter(
        (p) => p.editorialRun?.contentBrief?.format === params.format,
      );
      if (byFormat.length >= 2) {
        const formatAvg =
          byFormat.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / byFormat.length;
        const formatMultiplier = formatAvg / Math.max(baseline, 0.01);
        score *= formatMultiplier;
        dataPoints++;
        if (formatMultiplier > 1.1) {
          factors.push(`Formato ${params.format}: +${Math.round((formatMultiplier - 1) * 100)}% vs promedio`);
        } else if (formatMultiplier < 0.9) {
          factors.push(`Formato ${params.format}: ${Math.round((formatMultiplier - 1) * 100)}% vs promedio`);
          suggestions.push(`Considera cambiar de formato — ${params.format} rinde por debajo del promedio`);
        }
      }
    }

    // Tone factor
    if (params.tone) {
      const byTone = historical.filter(
        (p) => p.editorialRun?.contentBrief?.tone === params.tone,
      );
      if (byTone.length >= 2) {
        const toneAvg =
          byTone.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / byTone.length;
        const toneMultiplier = toneAvg / Math.max(baseline, 0.01);
        score *= toneMultiplier;
        dataPoints++;
        if (toneMultiplier > 1.1) {
          factors.push(`Tono "${params.tone}": +${Math.round((toneMultiplier - 1) * 100)}% vs promedio`);
        } else if (toneMultiplier < 0.9) {
          suggestions.push(`El tono "${params.tone}" tiende a generar menos engagement`);
        }
      }
    }

    // Day-of-week factor
    if (params.publishDayOfWeek !== undefined) {
      const byDay = historical.filter((p) => {
        if (!p.publishedAt) return false;
        return p.publishedAt.getDay() === params.publishDayOfWeek;
      });
      if (byDay.length >= 2) {
        const dayAvg = byDay.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / byDay.length;
        const dayMul = dayAvg / Math.max(baseline, 0.01);
        dataPoints++;
        if (dayMul > 1.15) {
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          factors.push(`${dayNames[params.publishDayOfWeek]}: día de alto rendimiento (+${Math.round((dayMul - 1) * 100)}%)`);
        }
      }
    }

    // Hour factor
    if (params.publishHour !== undefined) {
      const byHour = historical.filter((p) => {
        if (!p.publishedAt) return false;
        return p.publishedAt.getHours() === params.publishHour;
      });
      if (byHour.length >= 2) {
        const hourAvg = byHour.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / byHour.length;
        const hourMul = hourAvg / Math.max(baseline, 0.01);
        dataPoints++;
        if (hourMul < 0.85) {
          suggestions.push(`Considera publicar a otra hora — las ${params.publishHour}:00 tiene bajo rendimiento`);
        }
      }
    }

    const confidence = Math.min(dataPoints / 4, 1) * Math.min(historical.length / 20, 1);

    return {
      expectedEngagement: Number(score.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      factors: factors.length > 0 ? factors : ['Basado en el promedio general del workspace'],
      suggestions,
    };
  }

  /**
   * Generate periodic insights and store them in PerformanceInsight table
   */
  async generateInsights(workspaceId = 'default'): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const publications = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      include: {
        editorialRun: {
          include: { contentBrief: { include: { theme: true } } },
        },
      },
    });

    if (publications.length < 5) return 0;

    // Deactivate old insights
    await this.prisma.performanceInsight.updateMany({
      where: { workspaceId, isActive: true },
      data: { isActive: false },
    });

    const insights: Array<{
      workspaceId: string;
      type: string;
      title: string;
      description: string;
      data: unknown;
      score: number;
    }> = [];

    // ── Best Format ──
    const formatMap = this.groupBy(publications, (p) => p.editorialRun?.contentBrief?.format ?? 'POST');
    const bestFormat = this.findBest(formatMap);
    if (bestFormat) {
      insights.push({
        workspaceId,
        type: 'BEST_FORMAT',
        title: `Mejor formato: ${bestFormat.label}`,
        description: `Los ${bestFormat.label} tienen ${bestFormat.avgEngagement.toFixed(1)}% engagement promedio (${bestFormat.count} publicaciones).`,
        data: bestFormat,
        score: bestFormat.avgEngagement,
      });
    }

    // ── Best Theme ──
    const themeMap = this.groupBy(publications, (p) => p.editorialRun?.contentBrief?.theme?.name ?? 'Sin tema');
    const bestTheme = this.findBest(themeMap);
    if (bestTheme) {
      insights.push({
        workspaceId,
        type: 'BEST_THEME',
        title: `Mejor temática: ${bestTheme.label}`,
        description: `"${bestTheme.label}" genera ${bestTheme.avgEngagement.toFixed(1)}% engagement vs ${this.globalAvg(publications).toFixed(1)}% promedio general.`,
        data: bestTheme,
        score: bestTheme.avgEngagement,
      });
    }

    // ── Best Tone ──
    const toneMap = this.groupBy(publications, (p) => p.editorialRun?.contentBrief?.tone ?? 'Sin tono');
    const bestTone = this.findBest(toneMap);
    if (bestTone) {
      insights.push({
        workspaceId,
        type: 'BEST_TONE',
        title: `Mejor tono: ${bestTone.label}`,
        description: `El tono "${bestTone.label}" tiene ${bestTone.avgEngagement.toFixed(1)}% de engagement promedio.`,
        data: bestTone,
        score: bestTone.avgEngagement,
      });
    }

    // ── Best Hour ──
    const hourMap = this.groupBy(publications, (p) => {
      if (!p.publishedAt) return 'Desconocido';
      return `${p.publishedAt.getHours().toString().padStart(2, '0')}:00`;
    });
    const bestHour = this.findBest(hourMap);
    if (bestHour && bestHour.count >= 2) {
      insights.push({
        workspaceId,
        type: 'BEST_HOUR',
        title: `Mejor hora: ${bestHour.label}`,
        description: `Publicar a las ${bestHour.label} genera ${bestHour.avgEngagement.toFixed(1)}% engagement (${bestHour.count} publicaciones).`,
        data: bestHour,
        score: bestHour.avgEngagement,
      });
    }

    // Store all insights
    if (insights.length > 0) {
      await this.prisma.performanceInsight.createMany({
        data: insights.map((i) => ({
          workspaceId: i.workspaceId,
          type: i.type as never,
          title: i.title,
          description: i.description,
          data: i.data as never,
          score: i.score,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })),
      });
    }

    this.logger.log(`Generated ${insights.length} insights for workspace ${workspaceId}`);
    return insights.length;
  }

  /**
   * Get active insights for dashboard
   */
  async getActiveInsights(workspaceId = 'default') {
    return this.prisma.performanceInsight.findMany({
      where: {
        workspaceId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: { score: 'desc' },
    });
  }

  // ── Helper methods ──────────────────────────────────────

  private groupBy(
    pubs: Array<{ engagementRate: number | null }>,
    keyFn: (p: any) => string,
  ): Map<string, { count: number; totalEngagement: number }> {
    const map = new Map<string, { count: number; totalEngagement: number }>();
    for (const p of pubs) {
      const key = keyFn(p);
      const existing = map.get(key) ?? { count: 0, totalEngagement: 0 };
      existing.count++;
      existing.totalEngagement += p.engagementRate ?? 0;
      map.set(key, existing);
    }
    return map;
  }

  private findBest(map: Map<string, { count: number; totalEngagement: number }>) {
    let best: { label: string; count: number; avgEngagement: number } | null = null;
    for (const [label, data] of map) {
      if (data.count < 2) continue;
      const avg = data.totalEngagement / data.count;
      if (!best || avg > best.avgEngagement) {
        best = { label, count: data.count, avgEngagement: avg };
      }
    }
    return best;
  }

  private globalAvg(pubs: Array<{ engagementRate: number | null }>): number {
    const rates = pubs.map((p) => p.engagementRate ?? 0);
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  }
}
