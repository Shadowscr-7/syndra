// ============================================================
// Plans Service — Gestión de planes y suscripciones
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default seed plans
const DEFAULT_PLANS = [
  {
    name: 'FREE',
    displayName: 'Gratis',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxPublications: 30,
    maxVideos: 5,
    maxSources: 5,
    maxChannels: 2,
    maxEditors: 1,
    analyticsEnabled: false,
    aiScoringEnabled: true,
    prioritySupport: false,
    customBranding: false,
  },
  {
    name: 'PRO',
    displayName: 'Profesional',
    monthlyPrice: 29,
    yearlyPrice: 290,
    maxPublications: 300,
    maxVideos: 50,
    maxSources: 50,
    maxChannels: 10,
    maxEditors: 5,
    analyticsEnabled: true,
    aiScoringEnabled: true,
    prioritySupport: false,
    customBranding: true,
  },
  {
    name: 'ENTERPRISE',
    displayName: 'Empresa',
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxPublications: -1, // unlimited
    maxVideos: -1,
    maxSources: -1,
    maxChannels: -1,
    maxEditors: -1,
    analyticsEnabled: true,
    aiScoringEnabled: true,
    prioritySupport: true,
    customBranding: true,
  },
];

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Seed default plans ───────────────────────────────
  async seedPlans() {
    for (const plan of DEFAULT_PLANS) {
      await this.prisma.plan.upsert({
        where: { name: plan.name },
        update: { ...plan },
        create: { ...plan },
      });
    }
    this.logger.log(`✅ ${DEFAULT_PLANS.length} plans seeded`);
  }

  // ── List all plans ───────────────────────────────────
  async listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  // ── Get specific plan ────────────────────────────────
  async getPlan(planId: string) {
    return this.prisma.plan.findUniqueOrThrow({ where: { id: planId } });
  }

  async getPlanByName(name: string) {
    return this.prisma.plan.findUniqueOrThrow({ where: { name } });
  }

  // ── Workspace subscription ───────────────────────────
  async getSubscription(workspaceId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub) {
      // Default to FREE plan
      const freePlan = await this.prisma.plan.findUnique({
        where: { name: 'FREE' },
      });
      return {
        plan: freePlan,
        status: 'ACTIVE' as const,
        billingCycle: 'MONTHLY' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
      };
    }

    return sub;
  }

  // ── Subscribe workspace to a plan ────────────────────
  async subscribe(
    workspaceId: string,
    planName: string,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
  ) {
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { name: planName },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    return this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: plan.id,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      create: {
        workspaceId,
        planId: plan.id,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  // ── Cancel subscription ──────────────────────────────
  async cancel(workspaceId: string) {
    return this.prisma.subscription.update({
      where: { workspaceId },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  // ── Check limits ─────────────────────────────────────
  async checkLimit(
    workspaceId: string,
    metric: 'PUBLICATIONS' | 'VIDEOS' | 'RESEARCH_SOURCES' | 'CHANNELS' | 'EDITORS',
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const sub = await this.getSubscription(workspaceId);
    const plan = sub.plan;

    if (!plan) {
      return { allowed: true, current: 0, limit: -1 };
    }

    let limit: number;
    let current: number;

    const periodStart = sub.currentPeriodStart;

    switch (metric) {
      case 'PUBLICATIONS': {
        limit = plan.maxPublications;
        const usage = await this.prisma.usageRecord.findUnique({
          where: {
            workspaceId_metric_periodStart: {
              workspaceId,
              metric: 'PUBLICATIONS',
              periodStart,
            },
          },
        });
        current = usage?.count ?? 0;
        break;
      }
      case 'VIDEOS': {
        limit = plan.maxVideos;
        const usage = await this.prisma.usageRecord.findUnique({
          where: {
            workspaceId_metric_periodStart: {
              workspaceId,
              metric: 'VIDEOS',
              periodStart,
            },
          },
        });
        current = usage?.count ?? 0;
        break;
      }
      case 'RESEARCH_SOURCES': {
        limit = plan.maxSources;
        current = await this.prisma.researchSource.count({ where: { workspaceId } });
        break;
      }
      case 'CHANNELS': {
        limit = plan.maxChannels;
        current = await this.prisma.apiCredential.count({ where: { workspaceId } });
        break;
      }
      case 'EDITORS': {
        limit = plan.maxEditors;
        current = await this.prisma.workspaceUser.count({
          where: { workspaceId, role: { in: ['EDITOR', 'VIEWER'] } },
        });
        break;
      }
    }

    // -1 = unlimited
    const allowed = limit === -1 || current < limit;
    return { allowed, current, limit };
  }

  // ── Increment usage ──────────────────────────────────
  async incrementUsage(
    workspaceId: string,
    metric: 'PUBLICATIONS' | 'VIDEOS',
    amount: number = 1,
  ) {
    const sub = await this.getSubscription(workspaceId);
    const periodStart = sub.currentPeriodStart;

    await this.prisma.usageRecord.upsert({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId,
          metric,
          periodStart,
        },
      },
      update: { count: { increment: amount } },
      create: {
        workspaceId,
        metric,
        periodStart,
        periodEnd: sub.currentPeriodEnd,
        count: amount,
      },
    });
  }
}
