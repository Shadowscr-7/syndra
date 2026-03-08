// ============================================================
// AlertController — Endpoints de alertas
// ============================================================

import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { AlertService } from './alerts.service';
import { CurrentWorkspace } from '../auth/decorators';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alerts: AlertService) {}

  @Get()
  async listAlerts(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: string,
  ) {
    const data = await this.alerts.listAlerts(workspaceId, status);
    return { data };
  }

  @Get('count')
  async countActive(@CurrentWorkspace() workspaceId: string) {
    const count = await this.alerts.countActive(workspaceId);
    return { data: { count } };
  }

  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string) {
    const alert = await this.alerts.dismissAlert(id);
    return { data: alert };
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    const alert = await this.alerts.resolveAlert(id);
    return { data: alert };
  }
}
