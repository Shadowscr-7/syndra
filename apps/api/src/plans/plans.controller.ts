// ============================================================
// Plans Controller — Endpoints de planes y suscripciones
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { Public, CurrentWorkspace, Roles } from '../auth/decorators';

@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  /**
   * GET /api/plans — List all available plans (public)
   */
  @Public()
  @Get()
  async listPlans() {
    const plans = await this.plansService.listPlans();
    return { data: plans };
  }

  /**
   * POST /api/plans/seed — Seed default plans (admin)
   */
  @Public()
  @Post('seed')
  async seedPlans() {
    await this.plansService.seedPlans();
    return { data: { success: true } };
  }

  /**
   * GET /api/plans/subscription — Get current workspace subscription
   */
  @Get('subscription')
  async getSubscription(@CurrentWorkspace() workspaceId: string) {
    const sub = await this.plansService.getSubscription(workspaceId);
    return { data: sub };
  }

  /**
   * POST /api/plans/subscribe — Subscribe workspace to a plan
   */
  @Roles('OWNER')
  @Post('subscribe')
  async subscribe(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { planName: string; billingCycle?: 'MONTHLY' | 'YEARLY' },
  ) {
    const sub = await this.plansService.subscribe(
      workspaceId,
      body.planName,
      body.billingCycle,
    );
    this.logger.log(
      `Workspace ${workspaceId} subscribed to ${body.planName}`,
    );
    return { data: sub };
  }

  /**
   * POST /api/plans/cancel — Cancel current subscription
   */
  @Roles('OWNER')
  @Post('cancel')
  async cancelSubscription(@CurrentWorkspace() workspaceId: string) {
    const sub = await this.plansService.cancel(workspaceId);
    return { data: sub };
  }

  /**
   * GET /api/plans/usage/:metric — Check usage limit
   */
  @Get('usage/:metric')
  async checkUsage(
    @CurrentWorkspace() workspaceId: string,
    @Param('metric') metric: string,
  ) {
    const result = await this.plansService.checkLimit(
      workspaceId,
      metric.toUpperCase() as any,
    );
    return { data: result };
  }
}
