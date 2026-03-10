// ============================================================
// Business Profile Controller
// ============================================================

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';
import { BusinessProfileService, UpsertBusinessProfileDto } from './business-profile.service';

@Controller('business-profile')
@UseGuards(AuthGuard, PlanLimitsGuard)
@RequireFeature('customBranding')
export class BusinessProfileController {
  constructor(private readonly service: BusinessProfileService) {}

  @Get()
  async get(@Req() req: any) {
    const workspaceId = req.workspaceId;
    const profile = await this.service.get(workspaceId);
    return { data: profile };
  }

  @Put()
  async upsert(@Req() req: any, @Body() body: UpsertBusinessProfileDto) {
    const workspaceId = req.workspaceId;
    const profile = await this.service.upsert(workspaceId, body);
    return { data: profile };
  }

  @Delete()
  async delete(@Req() req: any) {
    const workspaceId = req.workspaceId;
    await this.service.delete(workspaceId);
    return { data: { deleted: true } };
  }

  @Get('prompt-context')
  async getPromptContext(@Req() req: any) {
    const workspaceId = req.workspaceId;
    const context = await this.service.buildPromptContext(workspaceId);
    return { data: context };
  }
}
