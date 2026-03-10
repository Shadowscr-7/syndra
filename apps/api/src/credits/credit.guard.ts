// ============================================================
// Credit Guard — Verifies credit balance before premium operations
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreditService, CREDIT_COSTS } from './credits.service';
import { PlansService } from '../plans/plans.service';

export const CREDIT_COST_KEY = 'credit_cost';

/**
 * Decorador: marca un endpoint que consume créditos IA
 * @example @UseCredits('IMAGE_TEXT')
 */
export const UseCredits = (operation: string) =>
  SetMetadata(CREDIT_COST_KEY, operation);

@Injectable()
export class CreditGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly creditService: CreditService,
    private readonly plansService: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operation = this.reflector.getAllAndOverride<string>(
      CREDIT_COST_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!operation) return true;

    const request = context.switchToHttp().getRequest();
    const workspaceId =
      request.headers['x-workspace-id'] ??
      request.user?.workspaceId ??
      request.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required for credit operations');
    }

    const cost = CREDIT_COSTS[operation] ?? 0;
    if (cost === 0) return true;

    // Obtener plan del workspace
    const plan = await this.plansService.getPlanForWorkspace(workspaceId);
    const planSlug: string = plan?.slug ?? plan?.name?.toLowerCase() ?? 'starter';

    // Starter: solo gratis
    if (planSlug === 'starter' || planSlug === 'FREE') {
      throw new ForbiddenException({
        code: 'CREDITS_PLAN_REQUIRED',
        message:
          'Tu plan Starter solo incluye generación gratuita. Upgrade a Creator para usar créditos IA.',
        requiredPlan: 'creator',
        cost,
      });
    }

    // Pro: ilimitado
    if (planSlug === 'pro' || planSlug === 'PRO') {
      request._creditOperation = operation;
      request._creditCost = cost;
      return true;
    }

    // Creator: verificar balance
    const hasEnough = await this.creditService.hasEnoughCredits(workspaceId, cost);
    if (!hasEnough) {
      const balance = await this.creditService.getBalance(workspaceId);
      throw new ForbiddenException({
        code: 'CREDITS_INSUFFICIENT',
        message: `Créditos insuficientes. Necesitas ${cost}, tienes ${balance.currentBalance}.`,
        cost,
        currentBalance: balance.currentBalance,
        purchaseUrl: '/dashboard/credits',
      });
    }

    request._creditOperation = operation;
    request._creditCost = cost;
    return true;
  }
}
