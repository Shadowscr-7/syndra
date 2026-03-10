// ============================================================
// Business Briefs Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';
import {
  BusinessBriefsService,
  CreateBusinessBriefDto,
  UpdateBusinessBriefDto,
} from './business-briefs.service';

@Controller('business-briefs')
@UseGuards(AuthGuard, PlanLimitsGuard)
@RequireFeature('customBranding')
export class BusinessBriefsController {
  constructor(private readonly service: BusinessBriefsService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    const workspaceId = req.workspaceId;
    const briefs = await this.service.list(workspaceId, {
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { data: briefs };
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const brief = await this.service.getById(id, req.workspaceId);
    return { data: brief };
  }

  @Post()
  async create(@Req() req: any, @Body() body: CreateBusinessBriefDto) {
    const brief = await this.service.create(req.workspaceId, body);
    return { data: brief };
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateBusinessBriefDto,
  ) {
    const brief = await this.service.update(id, req.workspaceId, body);
    return { data: brief };
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.service.delete(id, req.workspaceId);
    return { data: { deleted: true } };
  }

  @Patch(':id/toggle')
  async toggle(@Req() req: any, @Param('id') id: string) {
    const brief = await this.service.toggle(id, req.workspaceId);
    return { data: brief };
  }
}
