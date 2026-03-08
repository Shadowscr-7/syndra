// ============================================================
// Onboarding Controller — Wizard endpoints
// ============================================================

import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { OnboardingService, OnboardingData } from './onboarding.service';
import { Public, CurrentWorkspace, Roles } from '../auth/decorators';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboarding: OnboardingService) {}

  /**
   * GET /api/onboarding/status — Get current onboarding status
   */
  @Get('status')
  async getStatus(@CurrentWorkspace() workspaceId: string) {
    const status = await this.onboarding.getStatus(workspaceId);
    return { data: status };
  }

  /**
   * GET /api/onboarding/industries — List available industries
   */
  @Public()
  @Get('industries')
  async listIndustries() {
    return { data: await this.onboarding.listIndustries() };
  }

  /**
   * GET /api/onboarding/presets/:industry — Get preset for industry
   */
  @Public()
  @Get('presets/:industry')
  async getPresets(@Param('industry') industry: string) {
    return { data: await this.onboarding.getPresets(industry) };
  }

  /**
   * POST /api/onboarding/complete — Complete onboarding wizard
   */
  @Post('complete')
  async complete(
    @CurrentWorkspace() workspaceId: string,
    @Body() data: OnboardingData,
  ) {
    const workspace = await this.onboarding.completeOnboarding(
      workspaceId,
      data,
    );
    this.logger.log(`Onboarding completed for workspace ${workspaceId}`);
    return { data: workspace };
  }

  /**
   * POST /api/onboarding/seed-playbooks — Seed industry playbooks (admin only)
   */
  @Roles('ADMIN')
  @Post('seed-playbooks')
  async seedPlaybooks() {
    const result = await this.onboarding.seedPlaybooks();
    return { data: result };
  }
}
