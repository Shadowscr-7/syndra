// ============================================================
// Admin Controller — Panel de administración y gestión de revenue
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

  // ── Dashboard ────────────────────────────────────────

  /** GET /api/admin/dashboard — Admin overview stats */
  @Roles('OWNER')
  @Get('dashboard')
  async dashboard() {
    const stats = await this.admin.getDashboardStats();
    const licenseStats = await this.licenses.getStats();
    return { data: { ...stats, licenses: licenseStats } };
  }

  /** GET /api/admin/workspaces — List all workspaces (admin only) */
  @Roles('OWNER')
  @Get('workspaces')
  async listWorkspaces() {
    const workspaces = await this.admin.listWorkspacesAdmin();
    return { data: workspaces };
  }

  /** GET /api/admin/payments — List all payments */
  @Roles('OWNER')
  @Get('payments')
  async listPayments(@Query('take') take?: string) {
    const payments = await this.admin.listPayments(
      take ? parseInt(take) : 50,
    );
    return { data: payments };
  }

  // ── Subscription management ──────────────────────────

  /** POST /api/admin/subscriptions/activate — Activate a subscription manually */
  @Roles('OWNER')
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

  /** POST /api/admin/subscriptions/extend — Extend a subscription */
  @Roles('OWNER')
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

  /** POST /api/admin/subscriptions/cancel — Cancel a subscription */
  @Roles('OWNER')
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

  // ── Payment logging ──────────────────────────────────

  /** POST /api/admin/payments — Record a manual payment */
  @Roles('OWNER')
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

  // ── License key management ───────────────────────────

  /** POST /api/admin/licenses/generate — Generate new license keys */
  @Roles('OWNER')
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

  /** GET /api/admin/licenses — List all licenses */
  @Roles('OWNER')
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

  /** GET /api/admin/licenses/stats — License stats */
  @Roles('OWNER')
  @Get('licenses/stats')
  async licenseStats() {
    const stats = await this.licenses.getStats();
    return { data: stats };
  }

  /** PATCH /api/admin/licenses/:id/revoke — Revoke a license */
  @Roles('OWNER')
  @Patch('licenses/:id/revoke')
  async revokeKey(@Param('id') id: string) {
    const key = await this.licenses.revokeKey(id);
    return { data: key };
  }

  // ── Public: Redeem license key ───────────────────────

  /** POST /api/admin/licenses/redeem — Redeem a license key (authenticated users) */
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
