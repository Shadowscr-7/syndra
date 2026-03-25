import { Controller, Get, Post, Put, Delete, Param, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PlanLimitsGuard } from '../plans/plan-limits.guard';
import { AuthGuard } from '../auth/auth.guard';

@Controller('campaigns')
@UseGuards(AuthGuard, PlanLimitsGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findByWorkspace(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const wsId = workspaceId || req.workspaceId;
    return this.campaignsService.findByWorkspace(wsId);
  }

  @Get('active')
  findActive(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const wsId = workspaceId || req.workspaceId;
    return this.campaignsService.findActive(wsId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  /** POST /api/campaigns — Crear campaña */
  @Post()
  create(@Body() body: {
    workspaceId: string;
    name: string;
    objective: string;
    offer?: string;
    landingUrl?: string;
    startDate: string;
    endDate?: string;
    kpiTarget?: string;
    contentProfileId?: string;
    userPersonaId?: string;
    targetChannels?: string[];
    operationMode?: string;
    musicEnabled?: boolean;
    musicStyle?: string;
    musicPrompt?: string;
  }) {
    return this.campaignsService.create(body);
  }

  /** PUT /api/campaigns/:id — Editar campaña */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      objective?: string;
      offer?: string;
      landingUrl?: string;
      startDate?: string;
      endDate?: string | null;
      kpiTarget?: string;
      contentProfileId?: string | null;
      userPersonaId?: string | null;
      targetChannels?: string[];
      operationMode?: string | null;
      isActive?: boolean;
      musicEnabled?: boolean;
      musicStyle?: string | null;
      musicPrompt?: string | null;
    },
  ) {
    return this.campaignsService.update(id, body);
  }

  /** DELETE /api/campaigns/:id — Eliminar campaña */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  /** PATCH /api/campaigns/:id/toggle — Activar/desactivar */
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.campaignsService.toggleActive(id);
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
