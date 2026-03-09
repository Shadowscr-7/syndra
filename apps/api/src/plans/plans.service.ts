// ============================================================
// Plans Service — Complete plan management with feature gating
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** All numeric resources that can be limited */
export type PlanMetric =
  | 'PUBLICATIONS'
  | 'VIDEOS'
  | 'RESEARCH_SOURCES'
  | 'CHANNELS'
  | 'EDITORS'
  | 'PERSONAS'
  | 'CONTENT_PROFILES'
  | 'VISUAL_STYLES'
  | 'STORAGE_MB'
  | 'SCHEDULE_SLOTS'
  | 'EXPERIMENTS';

/** All boolean features that can be gated */
export type PlanFeatureKey =
  | 'analytics'
  | 'aiScoring'
  | 'trendDetection'
  | 'aiStrategist'
  | 'video'
  | 'brandMemory'
  | 'team'
  | 'priorityQueue'
  | 'apiAccess'
  | 'prioritySupport'
  | 'customBranding';

/** Plan order for "requiredPlan" responses */
const PLAN_ORDER: Record<string, number> = { starter: 0, creator: 1, pro: 2 };

/** Which plan first enables each feature */
const FEATURE_MIN_PLAN: Record<PlanFeatureKey, string> = {
  analytics: 'starter',
  aiScoring: 'creator',
  trendDetection: 'creator',
  aiStrategist: 'creator',
  video: 'creator',
  brandMemory: 'pro',
  team: 'creator',
  priorityQueue: 'pro',
  apiAccess: 'pro',
  prioritySupport: 'pro',
  customBranding: 'pro',
};

/** Human-readable labels */
const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  analytics: 'Analytics',
  aiScoring: 'Scoring con IA',
  trendDetection: 'Detección de tendencias',
  aiStrategist: 'Estratega IA',
  video: 'Video Pipeline',
  brandMemory: 'Memoria de marca',
  team: 'Equipo y colaboración',
  priorityQueue: 'Cola prioritaria',
  apiAccess: 'Acceso API',
  prioritySupport: 'Soporte prioritario',
  customBranding: 'Branding personalizado',
};

const METRIC_LABELS: Record<PlanMetric, string> = {
  PUBLICATIONS: 'publicaciones',
  VIDEOS: 'vídeos',
  RESEARCH_SOURCES: 'fuentes de investigación',
  CHANNELS: 'canales conectados',
  EDITORS: 'editores',
  PERSONAS: 'personas IA',
  CONTENT_PROFILES: 'perfiles de contenido',
  VISUAL_STYLES: 'estilos visuales',
  STORAGE_MB: 'almacenamiento (MB)',
  SCHEDULE_SLOTS: 'slots de programación',
  EXPERIMENTS: 'experimentos A/B',
};

// In-memory cache for plan lookups
interface CachedPlan {
  plan: any;
  expiresAt: number;
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  private readonly cache = new Map<string, CachedPlan>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  // ── List all active plans ────────────────────────────
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
      // Fallback to Starter plan
      const starterPlan = await this.prisma.plan.findUnique({ where: { name: 'starter' } });
      return {
        plan: starterPlan,
        status: 'ACTIVE' as const,
        billingCycle: 'MONTHLY' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    return sub;
  }

  // ── Get plan for workspace (cached) ──────────────────
  async getPlanForWorkspace(workspaceId: string): Promise<any> {
    const cached = this.cache.get(workspaceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.plan;
    }

    const sub = await this.getSubscription(workspaceId);
    const plan = (sub as any)?.plan;

    if (plan) {
      this.cache.set(workspaceId, { plan, expiresAt: Date.now() + this.CACHE_TTL });
    }

    return plan;
  }

  // Invalidate cache (e.g. after subscription change)
  invalidateCache(workspaceId: string) {
    this.cache.delete(workspaceId);
  }

  // ── Subscribe workspace to a plan ────────────────────
  async subscribe(
    workspaceId: string,
    planName: string,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
  ) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { name: planName } });

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    this.invalidateCache(workspaceId);

    return this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: plan.id,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
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
    this.invalidateCache(workspaceId);
    return this.prisma.subscription.update({
      where: { workspaceId },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  // ── Check numeric limit ──────────────────────────────
  async checkLimit(
    workspaceId: string,
    metric: PlanMetric,
  ): Promise<{ allowed: boolean; current: number; limit: number; requiredPlan?: string }> {
    const plan = await this.getPlanForWorkspace(workspaceId);
    if (!plan) return { allowed: true, current: 0, limit: -1 };

    const sub = await this.getSubscription(workspaceId);
    const periodStart = sub.currentPeriodStart;

    let limit: number;
    let current: number;

    switch (metric) {
      case 'PUBLICATIONS': {
        limit = plan.maxPublications;
        const usage = await this.prisma.usageRecord.findUnique({
          where: { workspaceId_metric_periodStart: { workspaceId, metric: 'PUBLICATIONS', periodStart } },
        });
        current = usage?.count ?? 0;
        break;
      }
      case 'VIDEOS': {
        limit = plan.maxVideos;
        const usage = await this.prisma.usageRecord.findUnique({
          where: { workspaceId_metric_periodStart: { workspaceId, metric: 'VIDEOS', periodStart } },
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
      case 'PERSONAS': {
        limit = plan.maxPersonas;
        current = await this.prisma.userPersona.count({
          where: { user: { workspaces: { some: { workspaceId } } } },
        });
        break;
      }
      case 'CONTENT_PROFILES': {
        limit = plan.maxContentProfiles;
        current = await this.prisma.contentProfile.count({
          where: { user: { workspaces: { some: { workspaceId } } } },
        });
        break;
      }
      case 'VISUAL_STYLES': {
        limit = plan.maxVisualStyles;
        current = await this.prisma.visualStyleProfile.count({
          where: { user: { workspaces: { some: { workspaceId } } } },
        });
        break;
      }
      case 'STORAGE_MB': {
        limit = plan.maxStorageMb;
        const agg = await this.prisma.userMedia.aggregate({
          where: { user: { workspaces: { some: { workspaceId } } } },
          _sum: { sizeBytes: true },
        });
        current = Math.round((agg._sum.sizeBytes ?? 0) / (1024 * 1024));
        break;
      }
      case 'SCHEDULE_SLOTS': {
        limit = plan.maxScheduleSlots;
        current = await this.prisma.publishSchedule.count({
          where: { user: { workspaces: { some: { workspaceId } } } },
        });
        break;
      }
      case 'EXPERIMENTS': {
        limit = plan.maxExperiments;
        // TODO: Enable when Experiment model is added to schema
        current = 0;
        break;
      }
      default:
        return { allowed: true, current: 0, limit: -1 };
    }

    // -1 means unlimited
    const allowed = limit === -1 || current < limit;

    // Determine which plan user needs to upgrade to
    let requiredPlan: string | undefined;
    if (!allowed) {
      const currentPlanOrder = PLAN_ORDER[plan.name] ?? 0;
      if (currentPlanOrder < 2) {
        requiredPlan = currentPlanOrder === 0 ? 'creator' : 'pro';
      }
    }

    return { allowed, current, limit, requiredPlan };
  }

  // ── Check boolean feature ────────────────────────────
  async checkFeature(
    workspaceId: string,
    feature: PlanFeatureKey,
  ): Promise<{ allowed: boolean; requiredPlan?: string }> {
    const plan = await this.getPlanForWorkspace(workspaceId);
    if (!plan) return { allowed: false, requiredPlan: 'starter' };

    const featureMap: Record<PlanFeatureKey, boolean> = {
      analytics: plan.analyticsEnabled,
      aiScoring: plan.aiScoringEnabled,
      trendDetection: plan.trendDetectionEnabled,
      aiStrategist: plan.aiStrategistEnabled,
      video: plan.videoEnabled,
      brandMemory: plan.brandMemoryEnabled,
      team: plan.teamEnabled,
      priorityQueue: plan.priorityQueue,
      apiAccess: plan.apiAccess,
      prioritySupport: plan.prioritySupport,
      customBranding: plan.customBranding,
    };

    const allowed = featureMap[feature] ?? false;

    return {
      allowed,
      requiredPlan: allowed ? undefined : FEATURE_MIN_PLAN[feature],
    };
  }

  // ── Get full plan info + usage for frontend ──────────
  async getPlanInfo(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    const plan = (sub as any)?.plan;

    if (!plan) {
      return { plan: null, subscription: null, usage: {}, features: {} };
    }

    const periodStart = sub.currentPeriodStart;

    // Gather all usage counts in parallel
    const [
      pubUsage,
      vidUsage,
      sourcesCount,
      channelsCount,
      editorsCount,
      personasCount,
      profilesCount,
      stylesCount,
      storageAgg,
      slotsCount,
      experimentsCount,
    ] = await Promise.all([
      this.prisma.usageRecord.findUnique({
        where: { workspaceId_metric_periodStart: { workspaceId, metric: 'PUBLICATIONS', periodStart } },
      }),
      this.prisma.usageRecord.findUnique({
        where: { workspaceId_metric_periodStart: { workspaceId, metric: 'VIDEOS', periodStart } },
      }),
      this.prisma.researchSource.count({ where: { workspaceId } }),
      this.prisma.apiCredential.count({ where: { workspaceId } }),
      this.prisma.workspaceUser.count({ where: { workspaceId, role: { in: ['EDITOR', 'VIEWER'] } } }),
      this.prisma.userPersona.count({ where: { user: { workspaces: { some: { workspaceId } } } } }),
      this.prisma.contentProfile.count({ where: { user: { workspaces: { some: { workspaceId } } } } }),
      this.prisma.visualStyleProfile.count({ where: { user: { workspaces: { some: { workspaceId } } } } }),
      this.prisma.userMedia.aggregate({
        where: { user: { workspaces: { some: { workspaceId } } } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.publishSchedule.count({ where: { user: { workspaces: { some: { workspaceId } } } } }),
      // TODO: Enable when Experiment model is added to schema
      Promise.resolve(0),
    ]);

    const storageMbUsed = Math.round((storageAgg._sum.sizeBytes ?? 0) / (1024 * 1024));

    return {
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
      },
      subscription: {
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      usage: {
        publications: { used: pubUsage?.count ?? 0, limit: plan.maxPublications },
        videos: { used: vidUsage?.count ?? 0, limit: plan.maxVideos },
        channels: { used: channelsCount, limit: plan.maxChannels },
        sources: { used: sourcesCount, limit: plan.maxSources },
        editors: { used: editorsCount, limit: plan.maxEditors },
        personas: { used: personasCount, limit: plan.maxPersonas },
        contentProfiles: { used: profilesCount, limit: plan.maxContentProfiles },
        visualStyles: { used: stylesCount, limit: plan.maxVisualStyles },
        storageMb: { used: storageMbUsed, limit: plan.maxStorageMb },
        scheduleSlots: { used: slotsCount, limit: plan.maxScheduleSlots },
        experiments: { used: experimentsCount, limit: plan.maxExperiments },
      },
      features: {
        analytics: plan.analyticsEnabled,
        aiScoring: plan.aiScoringEnabled,
        trendDetection: plan.trendDetectionEnabled,
        aiStrategist: plan.aiStrategistEnabled,
        video: plan.videoEnabled,
        brandMemory: plan.brandMemoryEnabled,
        team: plan.teamEnabled,
        priorityQueue: plan.priorityQueue,
        apiAccess: plan.apiAccess,
        analyticsLevel: plan.analyticsLevel,
        learningLoopLevel: plan.learningLoopLevel,
        autopilotLevel: plan.autopilotLevel,
      },
    };
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
      where: { workspaceId_metric_periodStart: { workspaceId, metric, periodStart } },
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

  // ── Check usage percentage for notifications ─────────
  async getUsagePercentages(workspaceId: string): Promise<Array<{ resource: string; percent: number; used: number; limit: number }>> {
    const info = await this.getPlanInfo(workspaceId);
    const results: Array<{ resource: string; percent: number; used: number; limit: number }> = [];

    for (const [key, val] of Object.entries(info.usage)) {
      const { used, limit } = val as { used: number; limit: number };
      if (limit > 0) {
        const percent = Math.round((used / limit) * 100);
        results.push({ resource: key, percent, used, limit });
      }
    }

    return results;
  }

  // ── Static helpers for guards ────────────────────────
  static getMetricLabel(metric: PlanMetric): string {
    return METRIC_LABELS[metric] || metric;
  }

  static getFeatureLabel(feature: PlanFeatureKey): string {
    return FEATURE_LABELS[feature] || feature;
  }

  static getFeatureMinPlan(feature: PlanFeatureKey): string {
    return FEATURE_MIN_PLAN[feature] || 'creator';
  }
}
