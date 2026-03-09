import { Controller, Get, Param, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';

@Controller('strategy')
@UseGuards(PlanLimitsGuard)
@RequireFeature('aiStrategist')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  /**
   * GET /api/strategy/:editorialRunId/brief
   */
  @Get(':editorialRunId/brief')
  async getBrief(@Param('editorialRunId') editorialRunId: string) {
    const brief = await this.strategyService.getBrief(editorialRunId);
    return { data: brief };
  }

  /**
   * POST /api/strategy/execute
   */
  @Post('execute')
  @HttpCode(200)
  async executeStrategy(
    @Body() body: { editorialRunId: string; workspaceId: string },
  ) {
    const result = await this.strategyService.executeStrategy(
      body.editorialRunId,
      body.workspaceId,
    );
    return { data: result };
  }
}
