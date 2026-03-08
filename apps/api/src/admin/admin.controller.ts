// ============================================================
// Admin Controller â€” Panel de administraciÃ³n y gestiÃ³n de revenue
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
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { LicenseService } from './license.service';
import { AuthService } from '../auth/auth.service';
import { PlansService } from '../plans/plans.service';
import { Roles, CurrentUser, CurrentWorkspace, Public } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.guard';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly admin: AdminService,
    private readonly licenses: LicenseService,
    private readonly authService: AuthService,
    private readonly plansService: PlansService,
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
    @CurrentUser() user: JwtPayload,
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
    this.admin.logAudit({ action: 'subscription.activate', category: 'SUBSCRIPTION', performedBy: user.sub, targetId: body.workspaceId, targetType: 'Workspace', details: { planName: body.planName, durationDays: body.durationDays } }).catch(() => {});
    return { data: sub };
  }

  /** POST /api/admin/subscriptions/extend â€” Extend a subscription */
  @Roles('ADMIN')
  @Post('subscriptions/extend')
  async extendSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() body: { workspaceId: string; extraDays: number },
  ) {
    const sub = await this.admin.extendSubscription(
      body.workspaceId,
      body.extraDays,
    );
    this.admin.logAudit({ action: 'subscription.extend', category: 'SUBSCRIPTION', performedBy: user.sub, targetId: body.workspaceId, targetType: 'Workspace', details: { extraDays: body.extraDays } }).catch(() => {});
    return { data: sub };
  }

  /** POST /api/admin/subscriptions/cancel â€” Cancel a subscription */
  @Roles('ADMIN')
  @Post('subscriptions/cancel')
  async cancelSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() body: { workspaceId: string; immediate?: boolean },
  ) {
    const sub = await this.admin.cancelSubscription(
      body.workspaceId,
      body.immediate,
    );
    this.admin.logAudit({ action: 'subscription.cancel', category: 'SUBSCRIPTION', performedBy: user.sub, targetId: body.workspaceId, targetType: 'Workspace', details: { immediate: body.immediate } }).catch(() => {});
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
    this.admin.logAudit({ action: 'payment.record', category: 'SUBSCRIPTION', performedBy: user.sub, targetId: payment.id, targetType: 'PaymentLog', details: { amount: body.amount, method: body.method } }).catch(() => {});
    return { data: payment };
  }

  // â”€â”€ License key management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** POST /api/admin/licenses/generate â€” Generate new license keys */
  @Roles('ADMIN')
  @Post('licenses/generate')
  async generateKeys(
    @CurrentUser() user: JwtPayload,
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
    this.admin.logAudit({ action: 'license.generate', category: 'LICENSE', performedBy: user.sub, details: { count: body.count, planName: body.planName, batchName: body.batchName } }).catch(() => {});
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
  async revokeKey(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const key = await this.licenses.revokeKey(id);
    this.admin.logAudit({ action: 'license.revoke', category: 'LICENSE', performedBy: user.sub, targetId: id, targetType: 'LicenseKey' }).catch(() => {});
    return { data: key };
  }

  // ── User management ──────────────────────────────────────

  /** GET /api/admin/users — List all users */
  @Roles('ADMIN')
  @Get('users')
  async listUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('blocked') blocked?: string,
  ) {
    const users = await this.admin.listUsers({
      role: role || undefined,
      search: search || undefined,
      blocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
    });
    return { data: users };
  }

  /** GET /api/admin/users/:id — Get a single user */
  @Roles('ADMIN')
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.admin.getUser(id);
    return { data: user };
  }

  /** PATCH /api/admin/users/:id/block — Block a user */
  @Roles('ADMIN')
  @Patch('users/:id/block')
  async blockUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.toggleBlockUser(id, true);
    this.admin.logAudit({ action: 'user.block', category: 'USER_MGMT', performedBy: user.sub, targetId: id, targetType: 'User' }).catch(() => {});
    return { data: result };
  }

  /** PATCH /api/admin/users/:id/unblock — Unblock a user */
  @Roles('ADMIN')
  @Patch('users/:id/unblock')
  async unblockUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.toggleBlockUser(id, false);
    this.admin.logAudit({ action: 'user.unblock', category: 'USER_MGMT', performedBy: user.sub, targetId: id, targetType: 'User' }).catch(() => {});
    return { data: result };
  }

  /** PATCH /api/admin/users/:id/role — Change user role */
  @Roles('ADMIN')
  @Patch('users/:id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() body: { role: 'ADMIN' | 'COLLABORATOR' | 'USER' },
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.admin.changeUserRole(id, body.role);
    this.admin.logAudit({ action: 'user.role_change', category: 'USER_MGMT', performedBy: user.sub, targetId: id, targetType: 'User', details: { newRole: body.role } }).catch(() => {});
    return { data: result };
  }

  /** PATCH /api/admin/users/:id/referral-code — Generate referral code */
  @Roles('ADMIN')
  @Patch('users/:id/referral-code')
  async generateReferralCode(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.generateReferralCodeForUser(id);
    this.admin.logAudit({ action: 'user.referral_code', category: 'USER_MGMT', performedBy: user.sub, targetId: id, targetType: 'User' }).catch(() => {});
    return { data: result };
  }

  /** DELETE /api/admin/users/:id — Delete a user and all data */
  @Roles('ADMIN')
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.deleteUser(id);
    this.admin.logAudit({ action: 'user.delete', category: 'USER_MGMT', performedBy: user.sub, targetId: id, targetType: 'User' }).catch(() => {});
    return { data: result };
  }

  /** POST /api/admin/collaborators — Create a new collaborator */
  @Roles('ADMIN')
  @Post('collaborators')
  async createCollaborator(
    @Body() body: { email: string; name: string; password: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.email || !body.name || !body.password) {
      return { error: 'Email, nombre y contraseña son requeridos' };
    }
    if (body.password.length < 8) {
      return { error: 'La contraseña debe tener al menos 8 caracteres' };
    }
    const collaborator = await this.admin.createCollaborator(body);
    this.admin.logAudit({ action: 'collaborator.create', category: 'USER_MGMT', performedBy: user.sub, targetId: collaborator.id, targetType: 'User', details: { email: body.email } }).catch(() => {});
    return { data: collaborator };
  }

  // ── Commission & Affiliate management ──────────────────────

  /** GET /api/admin/commissions/stats — Global commission stats */
  @Roles('ADMIN')
  @Get('commissions/stats')
  async commissionStats() {
    const stats = await this.admin.getCommissionStats();
    return { data: stats };
  }

  /** GET /api/admin/commissions/collaborators — List collaborators with stats */
  @Roles('ADMIN')
  @Get('commissions/collaborators')
  async listCollaboratorsWithStats() {
    const list = await this.admin.listCollaboratorsWithStats();
    return { data: list };
  }

  /** GET /api/admin/commissions/collaborators/:id — Get referrals for a collaborator */
  @Roles('ADMIN')
  @Get('commissions/collaborators/:id')
  async getCollaboratorReferrals(@Param('id') id: string) {
    const detail = await this.admin.getCollaboratorReferrals(id);
    return { data: detail };
  }

  /** PATCH /api/admin/commissions/referrals/approve — Approve referrals */
  @Roles('ADMIN')
  @Patch('commissions/referrals/approve')
  async approveReferrals(@Body() body: { referralIds: string[] }, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.approveReferrals(body.referralIds);
    this.admin.logAudit({ action: 'referral.approve', category: 'COMMISSION', performedBy: user.sub, details: { count: body.referralIds.length, ids: body.referralIds } }).catch(() => {});
    return { data: result };
  }

  /** PATCH /api/admin/commissions/referrals/cancel — Cancel referrals */
  @Roles('ADMIN')
  @Patch('commissions/referrals/cancel')
  async cancelReferrals(@Body() body: { referralIds: string[] }, @CurrentUser() user: JwtPayload) {
    const result = await this.admin.cancelReferrals(body.referralIds);
    this.admin.logAudit({ action: 'referral.cancel', category: 'COMMISSION', performedBy: user.sub, details: { count: body.referralIds.length, ids: body.referralIds } }).catch(() => {});
    return { data: result };
  }

  /** POST /api/admin/commissions/payouts — Generate payout for a collaborator */
  @Roles('ADMIN')
  @Post('commissions/payouts')
  async generatePayout(
    @CurrentUser() user: JwtPayload,
    @Body() body: { collaboratorId: string },
  ) {
    const payout = await this.admin.generatePayout(body.collaboratorId, user.sub);
    this.admin.logAudit({ action: 'payout.generate', category: 'COMMISSION', performedBy: user.sub, targetId: payout.id, targetType: 'CommissionPayout', details: { collaboratorId: body.collaboratorId } }).catch(() => {});
    return { data: payout };
  }

  /** GET /api/admin/commissions/payouts — List all payouts */
  @Roles('ADMIN')
  @Get('commissions/payouts')
  async listPayouts(
    @Query('collaboratorId') collaboratorId?: string,
    @Query('status') status?: string,
  ) {
    const list = await this.admin.listPayouts({
      collaboratorId: collaboratorId || undefined,
      status: status || undefined,
    });
    return { data: list };
  }

  /** GET /api/admin/commissions/payouts/:id — Get payout detail */
  @Roles('ADMIN')
  @Get('commissions/payouts/:id')
  async getPayoutDetail(@Param('id') id: string) {
    const payout = await this.admin.getPayoutDetail(id);
    return { data: payout };
  }

  /** PATCH /api/admin/commissions/payouts/:id/pay — Mark payout as paid */
  @Roles('ADMIN')
  @Patch('commissions/payouts/:id/pay')
  async markPayoutPaid(
    @Param('id') id: string,
    @Body() body: { method?: string; reference?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const payout = await this.admin.markPayoutPaid(id, body.method, body.reference);
    this.admin.logAudit({ action: 'payout.pay', category: 'COMMISSION', performedBy: user.sub, targetId: id, targetType: 'CommissionPayout', details: { method: body.method } }).catch(() => {});
    return { data: payout };
  }

  /** PATCH /api/admin/commissions/payouts/:id/void — Void a payout */
  @Roles('ADMIN')
  @Patch('commissions/payouts/:id/void')
  async voidPayout(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const payout = await this.admin.voidPayout(id);
    this.admin.logAudit({ action: 'payout.void', category: 'COMMISSION', performedBy: user.sub, targetId: id, targetType: 'CommissionPayout' }).catch(() => {});
    return { data: payout };
  }
  // ── Enhanced dashboard ──────────────────────────────────

  /** GET /api/admin/dashboard/enhanced — Full admin metrics */
  @Roles('ADMIN')
  @Get('dashboard/enhanced')
  async enhancedDashboard() {
    const data = await this.admin.getEnhancedDashboard();
    return { data };
  }

  // ── Audit log ─────────────────────────────────────────────

  /** POST /api/admin/users/:id/reset-password-link — Generate a password reset link for user */
  @Roles('ADMIN')
  @Post('users/:id/reset-password-link')
  async generatePasswordResetLink(@Param('id') userId: string) {
    const result = await this.authService.generatePasswordResetLink(userId);
    return { data: result };
  }

  /** POST /api/admin/users/:id/change-plan — Change a user's plan */
  @Roles('ADMIN')
  @Post('users/:id/change-plan')
  async changeUserPlan(
    @Param('id') userId: string,
    @Body() body: { planName: string; billingCycle?: 'MONTHLY' | 'YEARLY' },
  ) {
    // Find user's default workspace
    const user = await this.admin.getUser(userId);
    const defaultWs = user.workspaces?.find((w: any) => w.isDefault);
    if (!defaultWs) {
      return { error: 'User has no default workspace' };
    }

    const subscription = await this.plansService.subscribe(
      defaultWs.workspaceId,
      body.planName,
      body.billingCycle || 'MONTHLY',
    );

    return { data: subscription };
  }

  /** GET /api/admin/users/:id/activity — Get user's recent activity */
  @Roles('ADMIN')
  @Get('users/:id/activity')
  async getUserActivity(@Param('id') userId: string) {
    const data = await this.admin.getUserActivity(userId);
    return { data };
  }

  /** GET /api/admin/audit-logs — List audit logs */
  @Roles('ADMIN')
  @Get('audit-logs')
  async listAuditLogs(
    @Query('category') category?: string,
    @Query('performedBy') performedBy?: string,
    @Query('action') action?: string,
    @Query('targetId') targetId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const data = await this.admin.listAuditLogs({
      category: category || undefined,
      performedBy: performedBy || undefined,
      action: action || undefined,
      targetId: targetId || undefined,
      take: take ? parseInt(take) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
    return { data };
  }
  // ── Public: Redeem license key ──────────────────────────

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
