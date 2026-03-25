// ============================================================
// Plan Throttle Guard — Rate limiting that varies by plan tier
// ============================================================
//
// Usage: Apply globally or per-controller. When a workspace has
// a higher-tier plan, they get more generous rate limits.
//
// FREE:       200 req/min, 5000 req/hour
// PRO:        500 req/min, 15000 req/hour
// ENTERPRISE: 1000 req/min, 50000 req/hour
// ============================================================

import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

interface PlanRateLimit {
  perMinute: number;
  perHour: number;
}

const PLAN_RATE_LIMITS: Record<string, PlanRateLimit> = {
  FREE: { perMinute: 200, perHour: 5000 },
  PRO: { perMinute: 500, perHour: 15000 },
  ENTERPRISE: { perMinute: 1000, perHour: 50000 },
};

const DEFAULT_RATE_LIMIT: PlanRateLimit = { perMinute: 200, perHour: 5000 };

// In-memory rate tracking (per workspace)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class PlanThrottleGuard extends ThrottlerGuard {
  private readonly planLogger = new Logger(PlanThrottleGuard.name);

  /**
   * Override to allow plan-based rate limiting.
   * We use the workspace ID as the tracking key instead of IP.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use workspace ID for authenticated requests, IP for public
    const workspaceId = req.workspaceId;
    if (workspaceId) {
      return `ws:${workspaceId}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.workspaceId;

    // For unauthenticated requests, use default throttler behavior
    if (!workspaceId) {
      return super.canActivate(context);
    }

    // Get plan-based rate limit
    const rateLimit = await this.getPlanRateLimit(workspaceId);
    const key = `ws:${workspaceId}:min`;
    const now = Date.now();

    // Check per-minute limit
    const bucket = rateBuckets.get(key);
    if (bucket && now < bucket.resetAt) {
      bucket.count++;
      if (bucket.count > rateLimit.perMinute) {
        throw new ThrottlerException(
          `Límite de solicitudes alcanzado (${rateLimit.perMinute}/min). Actualiza tu plan para más capacidad.`,
        );
      }
    } else {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    }

    // Check per-hour limit
    const hourKey = `ws:${workspaceId}:hr`;
    const hourBucket = rateBuckets.get(hourKey);
    if (hourBucket && now < hourBucket.resetAt) {
      hourBucket.count++;
      if (hourBucket.count > rateLimit.perHour) {
        throw new ThrottlerException(
          `Límite de solicitudes por hora alcanzado (${rateLimit.perHour}/hr). Actualiza tu plan.`,
        );
      }
    } else {
      rateBuckets.set(hourKey, { count: 1, resetAt: now + 3_600_000 });
    }

    return true;
  }

  // Plan-based rate limit cache (workspace → plan name cache)
  private planCache = new Map<string, { planName: string; expiry: number }>();

  private async getPlanRateLimit(workspaceId: string): Promise<PlanRateLimit> {
    const now = Date.now();
    const cached = this.planCache.get(workspaceId);

    if (cached && now < cached.expiry) {
      return PLAN_RATE_LIMITS[cached.planName] || DEFAULT_RATE_LIMIT;
    }

    try {
      // We need to inject PrismaService — but ThrottlerGuard doesn't
      // easily support extra DI, so we use a module-level ref
      const prisma = PlanThrottleGuard.prismaRef;
      if (!prisma) return DEFAULT_RATE_LIMIT;

      const sub = await prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: { select: { name: true } } },
      });

      const planName = sub?.plan?.name || 'FREE';
      this.planCache.set(workspaceId, {
        planName,
        expiry: now + 5 * 60_000, // Cache 5 minutes
      });

      return PLAN_RATE_LIMITS[planName] || DEFAULT_RATE_LIMIT;
    } catch {
      return DEFAULT_RATE_LIMIT;
    }
  }

  // Static ref to PrismaService — set during module init
  static prismaRef: PrismaService | null = null;
}
