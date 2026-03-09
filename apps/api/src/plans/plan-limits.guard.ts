// ============================================================
// Plan Limits Guard — Enforce plan limits on protected actions
// ============================================================
//
// Usage:
//   @PlanCheck('PUBLICATIONS')  — numeric limit
//   @RequireFeature('video')    — boolean feature gate
//
// Both decorators set metadata; guard reads both and returns
// consistent 403 JSON.
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlansService, PlanMetric, PlanFeatureKey } from './plans.service';

// ── Decorator: numeric limit ───────────────────────────────

export const PLAN_CHECK_KEY = 'plan_check_metric';

/**
 * Decorator to enforce plan limits on a controller method.
 */
export const PlanCheck = (metric: PlanMetric) =>
  SetMetadata(PLAN_CHECK_KEY, metric);

// ── Decorator: feature gate ────────────────────────────────

export const FEATURE_GATE_KEY = 'feature_gate';

/**
 * Decorator to restrict endpoint to plans that have a specific feature.
 */
export const RequireFeature = (feature: PlanFeatureKey) =>
  SetMetadata(FEATURE_GATE_KEY, feature);

// Re-export for backwards compat
export type PlanFeature = PlanFeatureKey;

// ── Guard ──────────────────────────────────────────────────

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly plansService: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<PlanMetric>(PLAN_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const feature = this.reflector.getAllAndOverride<PlanFeatureKey>(FEATURE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No plan check required
    if (!metric && !feature) return true;

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.workspaceId;

    if (!workspaceId) return true; // Let auth guard handle missing workspace

    // ── Metric-based limit check ────────────────────────
    if (metric) {
      const result = await this.plansService.checkLimit(workspaceId, metric);

      if (!result.allowed) {
        this.logger.warn(
          `Plan limit reached: ${workspaceId} → ${metric} (${result.current}/${result.limit})`,
        );

        throw new ForbiddenException({
          statusCode: 403,
          code: 'PLAN_LIMIT',
          message: `Has alcanzado el límite de ${PlansService.getMetricLabel(metric)} en tu plan actual. Actualiza tu plan para continuar.`,
          details: {
            resource: metric,
            limit: result.limit,
            current: result.current,
            requiredPlan: result.requiredPlan ?? 'pro',
            requiredPlanDisplayName: this.planDisplayName(result.requiredPlan ?? 'pro'),
          },
        });
      }
    }

    // ── Feature gate check ──────────────────────────────
    if (feature) {
      const result = await this.plansService.checkFeature(workspaceId, feature);

      if (!result.allowed) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'PLAN_LIMIT',
          message: `La función "${PlansService.getFeatureLabel(feature)}" no está disponible en tu plan actual. Actualiza para desbloquearla.`,
          details: {
            feature,
            requiredPlan: result.requiredPlan ?? 'creator',
            requiredPlanDisplayName: this.planDisplayName(result.requiredPlan ?? 'creator'),
          },
        });
      }
    }

    return true;
  }

  private planDisplayName(name: string): string {
    const map: Record<string, string> = {
      starter: 'Starter',
      creator: 'Creator',
      pro: 'Pro',
    };
    return map[name] || name;
  }
}
