import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PlanLimitsGuard } from '../plans/plan-limits.guard';

@Controller('campaigns')
@UseGuards(PlanLimitsGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findByWorkspace(@Query('workspaceId') workspaceId: string) {
    return this.campaignsService.findByWorkspace(workspaceId);
  }

  @Get('active')
  findActive(@Query('workspaceId') workspaceId: string) {
    return this.campaignsService.findActive(workspaceId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  /** PATCH /api/campaigns/:id/operation-mode */
  @Patch(':id/operation-mode')
  async updateOperationMode(
    @Param('id') id: string,
    @Body('operationMode') operationMode: string | null,
  ) {
    return this.campaignsService.updateOperationMode(id, operationMode);
  }
}
