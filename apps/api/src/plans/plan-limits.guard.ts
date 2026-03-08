// ============================================================
// Plan Limits Guard — Enforce plan limits on protected actions
// ============================================================
//
// Usage: @PlanCheck('PUBLICATIONS') or @PlanCheck('VIDEOS') on controller methods
//
// This guard runs after AuthGuard and checks if the workspace has
// reached its plan limits for the specified metric before allowing
// the action.
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
import { PlansService } from './plans.service';

// ── Decorator ──────────────────────────────────────────────

export const PLAN_CHECK_KEY = 'plan_check_metric';

/**
 * Decorator to enforce plan limits on a controller method.
 * @param metric The metric to check: 'PUBLICATIONS' | 'VIDEOS' | 'RESEARCH_SOURCES' | 'CHANNELS' | 'EDITORS'
 */
export const PlanCheck = (
  metric: 'PUBLICATIONS' | 'VIDEOS' | 'RESEARCH_SOURCES' | 'CHANNELS' | 'EDITORS',
) => SetMetadata(PLAN_CHECK_KEY, metric);

// ── Feature Gate Decorator ─────────────────────────────────

export const FEATURE_GATE_KEY = 'feature_gate';

export type PlanFeature =
  | 'analytics'
  | 'aiScoring'
  | 'prioritySupport'
  | 'customBranding'
  | 'personas'
  | 'scheduleSlots';

/**
 * Decorator to restrict endpoint to plans that have a specific feature.
 * @param feature The plan feature required
 */
export const RequireFeature = (feature: PlanFeature) =>
  SetMetadata(FEATURE_GATE_KEY, feature);

// ── Guard ──────────────────────────────────────────────────

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly plansService: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<string>(PLAN_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const feature = this.reflector.getAllAndOverride<PlanFeature>(FEATURE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No plan check required
    if (!metric && !feature) return true;

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.workspaceId;

    if (!workspaceId) return true; // Let auth guard handle missing auth

    // ── Metric-based limit check ────────────────────────
    if (metric) {
      const result = await this.plansService.checkLimit(
        workspaceId,
        metric as any,
      );

      if (!result.allowed) {
        const sub = await this.plansService.getSubscription(workspaceId);
        const planName = (sub as any)?.plan?.displayName || 'tu plan';

        this.logger.warn(
          `Plan limit reached: ${workspaceId} → ${metric} (${result.current}/${result.limit})`,
        );

        throw new ForbiddenException({
          error: 'PLAN_LIMIT_REACHED',
          message: `Has alcanzado el límite de ${this.metricLabel(metric)} en ${planName}. Actualiza tu plan para continuar.`,
          metric,
          current: result.current,
          limit: result.limit,
          upgrade: true,
        });
      }
    }

    // ── Feature gate check ──────────────────────────────
    if (feature) {
      const sub = await this.plansService.getSubscription(workspaceId);
      const plan = (sub as any)?.plan;

      if (!plan) return true;

      const hasFeature = this.checkFeature(plan, feature);
      if (!hasFeature) {
        throw new ForbiddenException({
          error: 'FEATURE_NOT_AVAILABLE',
          message: `La función "${this.featureLabel(feature)}" no está disponible en tu plan actual. Actualiza para desbloquearla.`,
          feature,
          upgrade: true,
        });
      }
    }

    return true;
  }

  private checkFeature(plan: any, feature: PlanFeature): boolean {
    switch (feature) {
      case 'analytics':
        return plan.analyticsEnabled;
      case 'aiScoring':
        return plan.aiScoringEnabled;
      case 'prioritySupport':
        return plan.prioritySupport;
      case 'customBranding':
        return plan.customBranding;
      case 'personas':
        return plan.maxPersonas !== 0;
      case 'scheduleSlots':
        return plan.maxScheduleSlots !== 0;
      default:
        return true;
    }
  }

  private metricLabel(metric: string): string {
    const labels: Record<string, string> = {
      PUBLICATIONS: 'publicaciones',
      VIDEOS: 'vídeos',
      RESEARCH_SOURCES: 'fuentes de investigación',
      CHANNELS: 'canales conectados',
      EDITORS: 'editores/colaboradores',
    };
    return labels[metric] || metric;
  }

  private featureLabel(feature: PlanFeature): string {
    const labels: Record<PlanFeature, string> = {
      analytics: 'Analíticas avanzadas',
      aiScoring: 'Scoring con IA',
      prioritySupport: 'Soporte prioritario',
      customBranding: 'Branding personalizado',
      personas: 'Personas de contenido',
      scheduleSlots: 'Programación de publicaciones',
    };
    return labels[feature] || feature;
  }
}
