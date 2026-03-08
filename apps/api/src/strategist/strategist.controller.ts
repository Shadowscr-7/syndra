// ============================================================
// StrategistController — API REST para planes estratégicos IA
// ============================================================

import { Controller, Get, Post, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { StrategyPlanService } from './strategist-plan.service';

@Controller('strategist')
@UseGuards(AuthGuard)
export class StrategistController {
  constructor(private readonly planService: StrategyPlanService) {}

  /**
   * POST /strategist/generate — Generate a new strategy plan
   */
  @Post('generate')
  async generatePlan(
    @Query('workspaceId') workspaceId: string,
    @Body() body: { periodType?: 'WEEKLY' | 'MONTHLY' },
  ) {
    const plan = await this.planService.generatePlan(
      workspaceId,
      body.periodType ?? 'WEEKLY',
    );
    return { data: plan };
  }

  /**
   * GET /strategist/active — Get the active plan for the workspace
   */
  @Get('active')
  async getActivePlan(@Query('workspaceId') workspaceId: string) {
    const plan = await this.planService.getActivePlan(workspaceId);
    return { data: plan };
  }

  /**
   * GET /strategist/plans — List all plans for the workspace
   */
  @Get('plans')
  async listPlans(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    const plans = await this.planService.listPlans(workspaceId, limit ? parseInt(limit) : 10);
    return { data: plans };
  }

  /**
   * GET /strategist/plan/:id — Get a specific plan by ID
   */
  @Get('plan/:id')
  async getPlan(@Param('id') id: string) {
    const plan = await this.planService.getPlanById(id);
    return { data: plan };
  }

  /**
   * PATCH /strategist/plan/:id/archive — Archive a plan
   */
  @Patch('plan/:id/archive')
  async archivePlan(@Param('id') id: string) {
    const plan = await this.planService.archivePlan(id);
    return { data: plan };
  }

  /**
   * POST /strategist/plan/:id/create-campaign — Create campaign from plan
   */
  @Post('plan/:id/create-campaign')
  async createCampaignFromPlan(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    const campaign = await this.planService.createCampaignFromPlan(id, workspaceId);
    return { data: campaign };
  }

  /**
   * POST /strategist/plan/:id/generate-runs — Generate editorial runs from plan
   */
  @Post('plan/:id/generate-runs')
  async generateRunsFromPlan(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    const result = await this.planService.generateRunsFromPlan(id, workspaceId);
    return { data: result };
  }
}
