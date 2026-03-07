// ============================================================
// Admin Controller â€” Panel de administraciÃ³n y gestiÃ³n de revenue
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { LicenseService } from './license.service';
import { Roles, CurrentUser, CurrentWorkspace, Public } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.guard';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly admin: AdminService,
    private readonly licenses: LicenseService,
  ) {}

  // â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** GET /api/admin/dashboard â€” Admin overview stats */
  @Roles('ADMIN')
  @Get('dashboard')
  async dashboard() {
    const stats = await this.admin.getDashboardStats();
    const licenseStats = await this.licenses.getStats();
    return { data: { ...stats, licenses: licenseStats } };
  }

  /** GET /api/admin/workspaces â€” List all workspaces (admin only) */
  @Roles('ADMIN')
  @Get('workspaces')
  async listWorkspaces() {
    const workspaces = await this.admin.listWorkspacesAdmin();
    return { data: workspaces };
  }

  /** GET /api/admin/payments â€” List all payments */
  @Roles('ADMIN')
  @Get('payments')
  async listPayments(@Query('take') take?: string) {
    const payments = await this.admin.listPayments(
      take ? parseInt(take) : 50,
    );
    return { data: payments };
  }

  // â”€â”€ Subscription management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** POST /api/admin/subscriptions/activate â€” Activate a subscription manually */
  @Roles('ADMIN')
  @Post('subscriptions/activate')
  async activateSubscription(
    @Body()
    body: {
      workspaceId: string;
      planName: string;
      durationDays?: number;
      billingCycle?: 'MONTHLY' | 'YEARLY';
    },
  ) {
    const sub = await this.admin.activateSubscription(
      body.workspaceId,
      body.planName,
      body.durationDays || 30,
      body.billingCycle || 'MONTHLY',
    );
    return { data: sub };
  }

  /** POST /api/admin/subscriptions/extend â€” Extend a subscription */
  @Roles('ADMIN')
  @Post('subscriptions/extend')
  async extendSubscription(
    @Body() body: { workspaceId: string; extraDays: number },
  ) {
    const sub = await this.admin.extendSubscription(
      body.workspaceId,
      body.extraDays,
    );
    return { data: sub };
  }

  /** POST /api/admin/subscriptions/cancel â€” Cancel a subscription */
  @Roles('ADMIN')
  @Post('subscriptions/cancel')
  async cancelSubscription(
    @Body() body: { workspaceId: string; immediate?: boolean },
  ) {
    const sub = await this.admin.cancelSubscription(
      body.workspaceId,
      body.immediate,
    );
    return { data: sub };
  }

  // â”€â”€ Payment logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** POST /api/admin/payments â€” Record a manual payment */
  @Roles('ADMIN')
  @Post('payments')
  async recordPayment(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      workspaceId?: string;
      amount: number;
      currency?: string;
      method: string;
      reference?: string;
      description?: string;
    },
  ) {
    const payment = await this.admin.recordPayment({
      ...body,
      recordedBy: user.sub,
    });
    return { data: payment };
  }

  // â”€â”€ License key management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** POST /api/admin/licenses/generate â€” Generate new license keys */
  @Roles('ADMIN')
  @Post('licenses/generate')
  async generateKeys(
    @Body()
    body: {
      planName: string;
      count: number;
      durationDays: number;
      batchName?: string;
      buyerEmail?: string;
      buyerName?: string;
      notes?: string;
    },
  ) {
    const result = await this.licenses.generateKeys(body);
    this.logger.log(`Generated ${result.count} keys for ${result.plan}`);
    return { data: result };
  }

  /** GET /api/admin/licenses â€” List all licenses */
  @Roles('ADMIN')
  @Get('licenses')
  async listLicenses(
    @Query('status') status?: string,
    @Query('plan') planName?: string,
    @Query('batch') batchName?: string,
  ) {
    const list = await this.licenses.listLicenses({
      status,
      planName,
      batchName,
    });
    return { data: list };
  }

  /** GET /api/admin/licenses/stats â€” License stats */
  @Roles('ADMIN')
  @Get('licenses/stats')
  async licenseStats() {
    const stats = await this.licenses.getStats();
    return { data: stats };
  }

  /** PATCH /api/admin/licenses/:id/revoke â€” Revoke a license */
  @Roles('ADMIN')
  @Patch('licenses/:id/revoke')
  async revokeKey(@Param('id') id: string) {
    const key = await this.licenses.revokeKey(id);
    return { data: key };
  }

  // â”€â”€ Public: Redeem license key â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** POST /api/admin/licenses/redeem â€” Redeem a license key (authenticated users) */
  @Post('licenses/redeem')
  async redeemKey(
    @CurrentUser() user: JwtPayload,
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { key: string },
  ) {
    const result = await this.licenses.redeemKey(
      body.key,
      workspaceId,
      user.sub,
    );
    return { data: result };
  }
}
