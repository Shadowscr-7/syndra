import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { ObservabilityService } from './observability.service';

@Controller('admin/operations')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class ObservabilityController {
  constructor(private readonly svc: ObservabilityService) {}

  /** GET /api/admin/operations — dashboard overview */
  @Get()
  async getDashboard() {
    const [realtime, trends] = await Promise.all([
      this.svc.getRealTimeMetrics(),
      this.svc.getAllTrends(14),
    ]);
    return { realtime, trends };
  }

  /** GET /api/admin/operations/trend?metric=runs_created&days=14 */
  @Get('trend')
  async getTrend(
    @Query('metric') metric: string,
    @Query('days') days?: string,
  ) {
    return this.svc.getMetricTrend(metric, days ? parseInt(days, 10) : 14);
  }
}
