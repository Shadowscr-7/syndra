// ============================================================
// Onboarding Controller — Wizard endpoints
// ============================================================

import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { OnboardingService, OnboardingData } from './onboarding.service';
import { OnboardingTrackingService } from './onboarding-tracking.service';
import { Public, CurrentWorkspace, Roles } from '../auth/decorators';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboarding: OnboardingService,
    private readonly tracking: OnboardingTrackingService,
  ) {}

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
   * GET /api/onboarding/playbooks — Full playbook list for admin
   */
  @Roles('ADMIN')
  @Get('playbooks')
  async listPlaybooks() {
    return { data: await this.onboarding.listPlaybooksFull() };
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

  /**
   * GET /api/onboarding/progress — Granular onboarding progress tracking
   */
  @Get('progress')
  async getProgress(@CurrentWorkspace() workspaceId: string) {
    return { data: await this.tracking.getProgress(workspaceId) };
  }

  /**
   * GET /api/onboarding/banner — Get in-app onboarding banner data
   */
  @Get('banner')
  async getBanner(@CurrentWorkspace() workspaceId: string) {
    return { data: await this.tracking.getBannerData(workspaceId) };
  }

  /**
   * POST /api/onboarding/track — Track a step completion event
   */
  @Post('track')
  async trackStep(
    @CurrentWorkspace() workspaceId: string,
    @Body('step') step: string,
  ) {
    await this.tracking.trackStep(workspaceId, step);
    return { data: { ok: true } };
  }

  /**
   * POST /api/onboarding/bulk-create — Create a theme or source during onboarding
   */
  @Post('bulk-create')
  async bulkCreate(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { entity: 'theme' | 'source'; data: Record<string, unknown> },
  ) {
    const result = await this.onboarding.bulkCreate(workspaceId, body.entity, body.data);
    return { data: result };
  }

  /**
   * POST /api/onboarding/dismiss-nudge — Dismiss the onboarding banner
   */
  @Post('dismiss-nudge')
  async dismissNudge(@CurrentWorkspace() workspaceId: string) {
    await this.tracking.dismissNudge(workspaceId);
    return { data: { ok: true } };
  }
}
