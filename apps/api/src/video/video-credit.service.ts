// ============================================================
// VideoCreditService — Track per-workspace video generation credits
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Credit cost per tier */
const TIER_COSTS: Record<string, number> = {
  MVP: 1,
  SELFHOST: 0,    // free (own GPU)
  PREMIUM: 5,
};

@Injectable()
export class VideoCreditService {
  private readonly logger = new Logger(VideoCreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create the current period's credit record for a workspace.
   */
  async getCurrentCredits(workspaceId: string) {
    const { start, end } = this.getCurrentPeriodDates();

    // Try to find existing record for current period
    let record = await this.prisma.videoCredit.findFirst({
      where: {
        workspaceId,
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
    });

    if (!record) {
      record = await this.prisma.videoCredit.create({
        data: {
          workspaceId,
          periodStart: start,
          periodEnd: end,
          totalCredits: 50, // default monthly allowance
          usedCredits: 0,
          source: 'PLAN',
        },
      });
    }

    return {
      ...record,
      remainingCredits: record.totalCredits - record.usedCredits,
      period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    };
  }

  /**
   * Consume credits for a video render. Throws if insufficient.
   */
  async consumeCredits(workspaceId: string, tier: string): Promise<number> {
    const cost = TIER_COSTS[tier] ?? 1;
    if (cost === 0) return 0;

    const credits = await this.getCurrentCredits(workspaceId);
    if (credits.remainingCredits < cost) {
      throw new BadRequestException(
        `Insufficient video credits. Need ${cost}, have ${credits.remainingCredits}. Period: ${credits.period}`,
      );
    }

    await this.prisma.videoCredit.update({
      where: { id: credits.id },
      data: { usedCredits: { increment: cost } },
    });

    this.logger.log(`Consumed ${cost} video credit(s) for workspace ${workspaceId} (tier: ${tier})`);
    return cost;
  }

  /**
   * Add credits (e.g. after purchase or plan upgrade).
   */
  async addCredits(workspaceId: string, amount: number) {
    const { start, end } = this.getCurrentPeriodDates();

    // Find existing record
    const existing = await this.prisma.videoCredit.findFirst({
      where: {
        workspaceId,
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
    });

    if (existing) {
      return this.prisma.videoCredit.update({
        where: { id: existing.id },
        data: { totalCredits: { increment: amount } },
      });
    }

    return this.prisma.videoCredit.create({
      data: {
        workspaceId,
        periodStart: start,
        periodEnd: end,
        totalCredits: amount,
        usedCredits: 0,
        source: 'ADDON',
      },
    });
  }

  /**
   * Get credit usage history for a workspace.
   */
  async getCreditHistory(workspaceId: string) {
    return this.prisma.videoCredit.findMany({
      where: { workspaceId },
      orderBy: { periodStart: 'desc' },
      take: 12,
    });
  }

  /**
   * List render jobs for a workspace.
   */
  async getRenderJobs(workspaceId: string, limit = 50) {
    return this.prisma.videoRenderJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private getCurrentPeriodDates(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
}
