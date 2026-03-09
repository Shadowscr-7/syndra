// ============================================================
// Admin Service — Gestión administrativa de suscripciones, pagos y usuarios
// ============================================================

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 12;
const RECURRING_THRESHOLD = 20; // Mínimo de referidos activos para comisiones recurrentes
const COMMISSION_PERCENT = 20;  // % de comisión estándar

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Activate subscription manually ────────────────────
  async activateSubscription(
    workspaceId: string,
    planName: string,
    durationDays: number = 30,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
  ) {
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { name: planName },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + durationDays);

    const sub = await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        workspaceId,
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true, workspace: true },
    });

    this.logger.log(
      `✅ Subscription activated: workspace=${workspaceId} plan=${planName} until=${periodEnd.toISOString()}`,
    );

    return sub;
  }

  // ── Extend subscription ──────────────────────────────
  async extendSubscription(workspaceId: string, extraDays: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!sub) {
      throw new NotFoundException('No subscription found for this workspace');
    }

    const newEnd = new Date(sub.currentPeriodEnd);
    newEnd.setDate(newEnd.getDate() + extraDays);

    return this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        currentPeriodEnd: newEnd,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });
  }

  // ── Cancel subscription ──────────────────────────────
  async cancelSubscription(workspaceId: string, immediate: boolean = false) {
    if (immediate) {
      return this.prisma.subscription.update({
        where: { workspaceId },
        data: { status: 'CANCELED' },
        include: { plan: true },
      });
    }

    return this.prisma.subscription.update({
      where: { workspaceId },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  // ── Record a payment ─────────────────────────────────
  async recordPayment(data: {
    workspaceId?: string;
    amount: number;
    currency?: string;
    method: string;
    reference?: string;
    description?: string;
    licenseKeyId?: string;
    recordedBy: string;
  }) {
    return this.prisma.paymentLog.create({
      data: {
        workspaceId: data.workspaceId,
        amount: data.amount,
        currency: data.currency || 'USD',
        method: data.method,
        reference: data.reference,
        description: data.description,
        licenseKeyId: data.licenseKeyId,
        recordedBy: data.recordedBy,
      },
    });
  }

  // ── Dashboard stats ──────────────────────────────────
  async getDashboardStats() {
    const [
      totalWorkspaces,
      activeSubscriptions,
      totalPayments,
      revenueSum,
      totalLicenses,
      activatedLicenses,
      recentPayments,
    ] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.paymentLog.count(),
      this.prisma.paymentLog.aggregate({ _sum: { amount: true } }),
      this.prisma.licenseKey.count(),
      this.prisma.licenseKey.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.paymentLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalWorkspaces,
      activeSubscriptions,
      totalPayments,
      totalRevenue: revenueSum._sum.amount || 0,
      totalLicenses,
      activatedLicenses,
      recentPayments,
    };
  }

  // ── List all workspaces with subscriptions ────────────
  async listWorkspacesAdmin() {
    return this.prisma.workspace.findMany({
      include: {
        subscription: { include: { plan: true } },
        users: true,
        _count: {
          select: {
            editorialRuns: true,
            usageRecords: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── List all payments ────────────────────────────────
  async listPayments(take: number = 50) {
    return this.prisma.paymentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ================================================================
  // USER MANAGEMENT
  // ================================================================

  /** List all users with their workspaces and subscriptions */
  async listUsers(filters?: { role?: string; search?: string; blocked?: boolean }) {
    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.blocked !== undefined) where.isBlocked = filters.blocked;
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        referralCode: true,
        referredByCode: true,
        isBlocked: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        workspaces: {
          select: {
            role: true,
            isDefault: true,
            workspace: {
              select: {
                id: true,
                name: true,
                subscription: {
                  select: {
                    status: true,
                    discountPercent: true,
                    plan: { select: { displayName: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single user */
  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                subscription: { include: { plan: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  /** Block / unblock a user */
  async toggleBlockUser(userId: string, block: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No puedes bloquear a un admin');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: block },
      select: { id: true, email: true, isBlocked: true },
    });

    // If blocking, revoke all refresh tokens
    if (block) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.log(`${block ? '🔒 Blocked' : '🔓 Unblocked'} user: ${updated.email}`);
    return updated;
  }

  /** Change a user's role */
  async changeUserRole(userId: string, role: 'ADMIN' | 'COLLABORATOR' | 'USER') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    this.logger.log(`🔄 Role changed: ${updated.email} → ${role}`);
    return updated;
  }

  /** Delete a user and all associated data */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No puedes eliminar a un admin');

    // Get owned workspaces to clean up
    const ownedWorkspaces = await this.prisma.workspaceUser.findMany({
      where: { userId, role: 'OWNER' },
      select: { workspaceId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({ where: { userId } });
      // Delete workspace memberships
      await tx.workspaceUser.deleteMany({ where: { userId } });

      // For owned workspaces (single-owner), delete the workspace cascade
      for (const ow of ownedWorkspaces) {
        const otherOwners = await tx.workspaceUser.count({
          where: { workspaceId: ow.workspaceId, role: 'OWNER' },
        });
        if (otherOwners === 0) {
          // No other owners — clean up workspace
          await tx.subscription.deleteMany({ where: { workspaceId: ow.workspaceId } });
          await tx.brandProfile.deleteMany({ where: { workspaceId: ow.workspaceId } });
          await tx.workspaceUser.deleteMany({ where: { workspaceId: ow.workspaceId } });
          await tx.workspace.delete({ where: { id: ow.workspaceId } });
        }
      }

      // Delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`🗑️ Deleted user: ${user.email}`);
    return { deleted: true, email: user.email };
  }

  /** Create a collaborator with auto-generated referral code */
  async createCollaborator(data: {
    email: string;
    name: string;
    password: string;
  }) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException('Ya existe un usuario con este email');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const referralCode = await this.generateReferralCode(data.name);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user as COLLABORATOR
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          name: data.name.trim(),
          role: 'COLLABORATOR',
          emailVerified: true,
          referralCode,
        },
      });

      // Create personal workspace
      const workspace = await tx.workspace.create({
        data: {
          name: `${data.name.trim()}'s Workspace`,
          slug: `ws-${user.id}`,
        },
      });

      // Link as OWNER
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          isDefault: true,
        },
      });

      // Create creator subscription (free for collaborators — no expiration)
      const creatorPlan = await tx.plan.findFirst({
        where: { name: 'creator' },
      });
      if (creatorPlan) {
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Permanent for collaborators
        await tx.subscription.create({
          data: {
            workspaceId: workspace.id,
            planId: creatorPlan.id,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            discountPercent: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          },
        });
      }

      // Create default brand profile
      await tx.brandProfile.create({
        data: {
          workspaceId: workspace.id,
          voice: '',
          tone: 'profesional',
        },
      });

      return user;
    });

    this.logger.log(`✅ Collaborator created: ${result.email} | Code: ${referralCode}`);
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      referralCode: result.referralCode,
    };
  }

  /** Assign a referral code to an existing user */
  async generateReferralCodeForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.referralCode) {
      return { id: user.id, email: user.email, referralCode: user.referralCode, alreadyHad: true };
    }

    const code = await this.generateReferralCode(user.name || user.email);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { id: true, email: true, referralCode: true },
    });
    this.logger.log(`🎟️ Referral code generated for ${updated.email}: ${code}`);
    return { ...updated, alreadyHad: false };
  }

  /** Generate unique referral code */
  private async generateReferralCode(name: string): Promise<string> {
    const base = name.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    for (let i = 0; i < 10; i++) {
      const random = randomBytes(2).toString('hex').toUpperCase();
      const code = `${base}${random}`;
      const exists = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!exists) return code;
    }
    return randomBytes(4).toString('hex').toUpperCase();
  }

  // ================================================================
  // COMMISSION & AFFILIATE MANAGEMENT
  // ================================================================

  /** Get global commission stats for admin dashboard */
  async getCommissionStats() {
    const [
      totalReferrals,
      pendingReferrals,
      approvedReferrals,
      paidReferrals,
      cancelledReferrals,
      totalCommissionPending,
      totalCommissionApproved,
      totalCommissionPaid,
      totalCollaborators,
      totalPayouts,
      firstPurchaseCount,
      recurringCount,
      recurringPending,
      recurringApproved,
      recurringPaid,
    ] = await Promise.all([
      this.prisma.affiliateReferral.count(),
      this.prisma.affiliateReferral.count({ where: { status: 'PENDING' } }),
      this.prisma.affiliateReferral.count({ where: { status: 'APPROVED' } }),
      this.prisma.affiliateReferral.count({ where: { status: 'PAID' } }),
      this.prisma.affiliateReferral.count({ where: { status: 'CANCELLED' } }),
      this.prisma.affiliateReferral.aggregate({ where: { status: 'PENDING' }, _sum: { commissionAmount: true } }),
      this.prisma.affiliateReferral.aggregate({ where: { status: 'APPROVED' }, _sum: { commissionAmount: true } }),
      this.prisma.affiliateReferral.aggregate({ where: { status: 'PAID' }, _sum: { commissionAmount: true } }),
      this.prisma.user.count({ where: { role: 'COLLABORATOR' } }),
      this.prisma.commissionPayout.count({ where: { status: 'PAID' } }),
      this.prisma.affiliateReferral.count({ where: { commissionType: 'FIRST_PURCHASE' } }),
      this.prisma.affiliateReferral.count({ where: { commissionType: 'RECURRING' } }),
      this.prisma.affiliateReferral.aggregate({ where: { commissionType: 'RECURRING', status: 'PENDING' }, _sum: { commissionAmount: true } }),
      this.prisma.affiliateReferral.aggregate({ where: { commissionType: 'RECURRING', status: 'APPROVED' }, _sum: { commissionAmount: true } }),
      this.prisma.affiliateReferral.aggregate({ where: { commissionType: 'RECURRING', status: 'PAID' }, _sum: { commissionAmount: true } }),
    ]);

    return {
      totalReferrals,
      pendingReferrals,
      approvedReferrals,
      paidReferrals,
      cancelledReferrals,
      totalCommissionPending: totalCommissionPending._sum.commissionAmount || 0,
      totalCommissionApproved: totalCommissionApproved._sum.commissionAmount || 0,
      totalCommissionPaid: totalCommissionPaid._sum.commissionAmount || 0,
      totalCollaborators,
      totalPayouts,
      // Breakdown by type
      firstPurchaseCount,
      recurringCount,
      recurringPendingAmount: recurringPending._sum.commissionAmount || 0,
      recurringApprovedAmount: recurringApproved._sum.commissionAmount || 0,
      recurringPaidAmount: recurringPaid._sum.commissionAmount || 0,
      recurringThreshold: RECURRING_THRESHOLD,
    };
  }

  /** List all collaborators with their commission stats */
  async listCollaboratorsWithStats() {
    const collaborators = await this.prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      select: {
        id: true,
        email: true,
        name: true,
        referralCode: true,
        isBlocked: true,
        createdAt: true,
        collaboratorReferrals: {
          select: {
            id: true,
            status: true,
            commissionAmount: true,
            commissionType: true,
            amountPaid: true,
            planName: true,
            createdAt: true,
            referredUser: {
              select: {
                id: true,
                workspaces: {
                  where: { isDefault: true },
                  select: {
                    workspace: {
                      select: {
                        subscription: {
                          select: { status: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        collaboratorPayouts: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return collaborators.map((c) => {
      const referrals = c.collaboratorReferrals;
      const firstPurchaseRefs = referrals.filter((r) => r.commissionType === 'FIRST_PURCHASE');
      const recurringRefs = referrals.filter((r) => r.commissionType === 'RECURRING');

      // Count unique active referred users (FIRST_PURCHASE refs with active subscription)
      const activeReferredUsers = firstPurchaseRefs.filter((r) => {
        const sub = r.referredUser?.workspaces?.[0]?.workspace?.subscription;
        return sub?.status === 'ACTIVE' && r.status !== 'CANCELLED';
      }).length;

      const totalReferrals = firstPurchaseRefs.length;
      const pendingCount = referrals.filter((r) => r.status === 'PENDING').length;
      const approvedCount = referrals.filter((r) => r.status === 'APPROVED').length;
      const paidCount = referrals.filter((r) => r.status === 'PAID').length;
      const pendingAmount = referrals.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r.commissionAmount, 0);
      const approvedAmount = referrals.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + r.commissionAmount, 0);
      const paidAmount = referrals.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.commissionAmount, 0);
      const totalRevenue = firstPurchaseRefs.reduce((s, r) => s + r.amountPaid, 0);

      return {
        id: c.id,
        email: c.email,
        name: c.name,
        referralCode: c.referralCode,
        isBlocked: c.isBlocked,
        createdAt: c.createdAt,
        stats: {
          totalReferrals,
          activeReferredUsers,
          recurringEligible: activeReferredUsers >= RECURRING_THRESHOLD,
          recurringThreshold: RECURRING_THRESHOLD,
          recurringEntriesCount: recurringRefs.length,
          pendingCount,
          approvedCount,
          paidCount,
          pendingAmount,
          approvedAmount,
          paidAmount,
          totalRevenue,
        },
        payouts: c.collaboratorPayouts,
      };
    });
  }

  /** Get detailed referral list for a single collaborator */
  async getCollaboratorReferrals(collaboratorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      select: { id: true, name: true, email: true, referralCode: true, role: true },
    });
    if (!user) throw new NotFoundException('Colaborador no encontrado');

    const referrals = await this.prisma.affiliateReferral.findMany({
      where: { collaboratorId },
      include: {
        referredUser: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            workspaces: {
              where: { isDefault: true },
              select: {
                workspace: {
                  select: {
                    subscription: {
                      select: {
                        status: true,
                        plan: { select: { displayName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payout: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: [{ commissionType: 'asc' }, { createdAt: 'desc' }],
    });

    // Count active referred users for threshold display
    const activeReferredUsers = referrals.filter((r) => {
      const sub = r.referredUser?.workspaces?.[0]?.workspace?.subscription;
      return r.commissionType === 'FIRST_PURCHASE' && sub?.status === 'ACTIVE' && r.status !== 'CANCELLED';
    }).length;

    return {
      collaborator: user,
      referrals,
      activeReferredUsers,
      recurringEligible: activeReferredUsers >= RECURRING_THRESHOLD,
      recurringThreshold: RECURRING_THRESHOLD,
    };
  }

  /** Approve pending referrals (batch or single) */
  async approveReferrals(referralIds: string[]) {
    const updated = await this.prisma.affiliateReferral.updateMany({
      where: { id: { in: referralIds }, status: 'PENDING' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    this.logger.log(`✅ Approved ${updated.count} referrals`);
    return { approved: updated.count };
  }

  /** Cancel referrals */
  async cancelReferrals(referralIds: string[]) {
    const updated = await this.prisma.affiliateReferral.updateMany({
      where: { id: { in: referralIds }, status: { in: ['PENDING', 'APPROVED'] } },
      data: { status: 'CANCELLED' },
    });
    this.logger.log(`❌ Cancelled ${updated.count} referrals`);
    return { cancelled: updated.count };
  }

  /** Generate a payout invoice for a collaborator (approved referrals) */
  async generatePayout(collaboratorId: string, generatedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: collaboratorId } });
    if (!user) throw new NotFoundException('Colaborador no encontrado');

    // Get all APPROVED referrals without a payout
    const approved = await this.prisma.affiliateReferral.findMany({
      where: { collaboratorId, status: 'APPROVED', payoutId: null },
    });

    if (approved.length === 0) {
      throw new BadRequestException('No hay comisiones aprobadas pendientes de pago para este colaborador');
    }

    const totalAmount = approved.reduce((s, r) => s + r.commissionAmount, 0);

    // Generate invoice number: INV-YYYY-NNN
    const year = new Date().getFullYear();
    const lastPayout = await this.prisma.commissionPayout.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}` } },
      orderBy: { invoiceNumber: 'desc' },
    });
    const lastNum = lastPayout?.invoiceNumber
      ? parseInt(lastPayout.invoiceNumber.split('-')[2] ?? '0') || 0
      : 0;
    const invoiceNumber = `INV-${year}-${String(lastNum + 1).padStart(3, '0')}`;

    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.commissionPayout.create({
        data: {
          collaboratorId,
          totalAmount,
          referralCount: approved.length,
          invoiceNumber,
          generatedBy,
          status: 'CONFIRMED',
        },
      });

      await tx.affiliateReferral.updateMany({
        where: { id: { in: approved.map((r) => r.id) } },
        data: { payoutId: p.id },
      });

      return p;
    });

    this.logger.log(`📄 Payout generated: ${invoiceNumber} | $${(totalAmount / 100).toFixed(2)} | ${approved.length} referrals | Collaborator: ${user.email}`);
    return payout;
  }

  /** Mark a payout as paid */
  async markPayoutPaid(payoutId: string, method?: string, reference?: string) {
    const payout = await this.prisma.commissionPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout no encontrado');
    if (payout.status === 'PAID') throw new BadRequestException('Este payout ya fue pagado');
    if (payout.status === 'VOIDED') throw new BadRequestException('Este payout está anulado');

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.commissionPayout.update({
        where: { id: payoutId },
        data: {
          status: 'PAID',
          paidAt: now,
          method: method || null,
          reference: reference || null,
        },
      });

      // Update all referrals in this payout to PAID
      await tx.affiliateReferral.updateMany({
        where: { payoutId: payoutId },
        data: { status: 'PAID', paidAt: now },
      });

      return p;
    });

    this.logger.log(`💰 Payout PAID: ${payout.invoiceNumber} | Method: ${method || 'N/A'}`);
    return updated;
  }

  /** Void a payout (return referrals to APPROVED state) */
  async voidPayout(payoutId: string) {
    const payout = await this.prisma.commissionPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout no encontrado');
    if (payout.status === 'PAID') throw new BadRequestException('No se puede anular un payout ya pagado');

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.commissionPayout.update({
        where: { id: payoutId },
        data: { status: 'VOIDED' },
      });

      // Return referrals to APPROVED
      await tx.affiliateReferral.updateMany({
        where: { payoutId },
        data: { payoutId: null, status: 'APPROVED' },
      });

      return p;
    });

    this.logger.log(`🚫 Payout VOIDED: ${payout.invoiceNumber}`);
    return updated;
  }

  /** List all payouts with optional filters */
  async listPayouts(filters?: { collaboratorId?: string; status?: string }) {
    const where: any = {};
    if (filters?.collaboratorId) where.collaboratorId = filters.collaboratorId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.commissionPayout.findMany({
      where,
      include: {
        collaborator: {
          select: { id: true, name: true, email: true, referralCode: true },
        },
        _count: { select: { referrals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single payout with full details */
  async getPayoutDetail(payoutId: string) {
    const payout = await this.prisma.commissionPayout.findUnique({
      where: { id: payoutId },
      include: {
        collaborator: {
          select: { id: true, name: true, email: true, referralCode: true },
        },
        referrals: {
          include: {
            referredUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
    if (!payout) throw new NotFoundException('Payout no encontrado');
    return payout;
  }

  // ================================================================
  // RECURRING COMMISSIONS — Comisiones recurrentes mensuales
  // ================================================================

  /**
   * Generate recurring commissions for the current month.
   * Rules:
   * - Only collaborators with 20+ active referred users qualify
   * - Commission = 20% of each active user's current monthly plan price
   * - Skips users that already have a RECURRING entry for this month
   * - Creates entries as PENDING for admin review
   */
  async generateRecurringCommissions() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const periodLabel = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

    // Get all collaborators
    const collaborators = await this.prisma.user.findMany({
      where: { role: 'COLLABORATOR', isBlocked: false },
      select: { id: true, email: true, name: true, referralCode: true },
    });

    let totalCreated = 0;
    let totalAmount = 0;
    const results: { collaboratorEmail: string; activeUsers: number; entriesCreated: number; amount: number }[] = [];

    for (const collab of collaborators) {
      if (!collab.referralCode) continue;

      // Find all FIRST_PURCHASE referrals (non-cancelled) for this collaborator
      // and check if the referred user's subscription is still ACTIVE
      const firstPurchaseRefs = await this.prisma.affiliateReferral.findMany({
        where: {
          collaboratorId: collab.id,
          commissionType: 'FIRST_PURCHASE',
          status: { not: 'CANCELLED' },
        },
        select: {
          referredUserId: true,
          referralCode: true,
          referredUser: {
            select: {
              id: true,
              workspaces: {
                where: { isDefault: true },
                select: {
                  workspace: {
                    select: {
                      subscription: {
                        select: {
                          id: true,
                          status: true,
                          billingCycle: true,
                          plan: {
                            select: {
                              displayName: true,
                              monthlyPrice: true,
                              yearlyPrice: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Filter to only active users
      const activeUsers = firstPurchaseRefs.filter((r) => {
        const sub = r.referredUser?.workspaces?.[0]?.workspace?.subscription;
        return sub?.status === 'ACTIVE';
      });

      // Check threshold: must have 20+ active referred users
      if (activeUsers.length < RECURRING_THRESHOLD) {
        continue;
      }

      let collabCreated = 0;
      let collabAmount = 0;

      for (const ref of activeUsers) {
        const sub = ref.referredUser.workspaces[0]?.workspace?.subscription;
        if (!sub) continue;

        // Calculate monthly equivalent price
        const monthlyPrice = sub.billingCycle === 'YEARLY'
          ? Math.round(sub.plan.yearlyPrice / 12)
          : sub.plan.monthlyPrice;

        if (monthlyPrice <= 0) continue;

        const commissionAmount = Math.round(monthlyPrice * (COMMISSION_PERCENT / 100));

        // Check if already exists for this month
        const existing = await this.prisma.affiliateReferral.findUnique({
          where: {
            referredUserId_commissionType_periodStart: {
              referredUserId: ref.referredUserId,
              commissionType: 'RECURRING',
              periodStart,
            },
          },
        });
        if (existing) continue;

        // Create the recurring commission entry
        await this.prisma.affiliateReferral.create({
          data: {
            collaboratorId: collab.id,
            referredUserId: ref.referredUserId,
            referralCode: ref.referralCode,
            subscriptionId: sub.id,
            planName: sub.plan.displayName,
            amountPaid: monthlyPrice,
            commissionPercent: COMMISSION_PERCENT,
            commissionAmount,
            commissionType: 'RECURRING',
            periodStart,
            periodEnd,
            status: 'PENDING',
          },
        });

        collabCreated++;
        collabAmount += commissionAmount;
      }

      if (collabCreated > 0) {
        results.push({
          collaboratorEmail: collab.email,
          activeUsers: activeUsers.length,
          entriesCreated: collabCreated,
          amount: collabAmount,
        });
        totalCreated += collabCreated;
        totalAmount += collabAmount;
      }
    }

    this.logger.log(
      `🔄 Recurring commissions generated for ${periodLabel}: ${totalCreated} entries | $${(totalAmount / 100).toFixed(2)} total`,
    );

    return {
      period: periodLabel,
      periodStart,
      periodEnd,
      totalEntriesCreated: totalCreated,
      totalCommissionAmount: totalAmount,
      collaborators: results,
    };
  }

  // ================================================================
  // ENHANCED DASHBOARD — Global Metrics
  // ================================================================

  async getEnhancedDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      // User metrics
      totalUsers,
      totalAdmins,
      totalCollaborators,
      totalRegularUsers,
      blockedUsers,
      usersThisMonth,
      usersPrevMonth,
      // Subscription & plan metrics
      activeSubscriptions,
      planDistribution,
      // Revenue
      revenueThisMonth,
      revenuePrevMonth,
      totalRevenue,
      totalPayments,
      // Content metrics
      totalEditorialRuns,
      runsThisMonth,
      runsByStatus,
      totalPublications,
      publicationsThisMonth,
      // Commission metrics
      totalReferrals,
      pendingCommissions,
      paidCommissions,
      // License metrics
      totalLicenses,
      activatedLicenses,
      availableLicenses,
      // Workspace metrics
      totalWorkspaces,
      // Recent activity
      recentPayments,
      recentAudit,
    ] = await Promise.all([
      // Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'COLLABORATOR' } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      // Subscriptions
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: { id: true },
        where: { status: 'ACTIVE' },
      }),
      // Revenue
      this.prisma.paymentLog.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.paymentLog.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      this.prisma.paymentLog.aggregate({ _sum: { amount: true } }),
      this.prisma.paymentLog.count(),
      // Content
      this.prisma.editorialRun.count(),
      this.prisma.editorialRun.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.editorialRun.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.publication.count(),
      this.prisma.publication.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Commissions
      this.prisma.affiliateReferral.count(),
      this.prisma.affiliateReferral.aggregate({ _sum: { commissionAmount: true }, where: { status: 'PENDING' } }),
      this.prisma.affiliateReferral.aggregate({ _sum: { commissionAmount: true }, where: { status: 'PAID' } }),
      // Licenses
      this.prisma.licenseKey.count(),
      this.prisma.licenseKey.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.licenseKey.count({ where: { status: 'AVAILABLE' } }),
      // Workspaces
      this.prisma.workspace.count(),
      // Recent
      this.prisma.paymentLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { performer: { select: { name: true, email: true } } },
      }),
    ]);

    // Resolve plan names for distribution
    const plans = await this.prisma.plan.findMany({ select: { id: true, displayName: true, name: true } });
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const planDist = planDistribution.map((pd) => ({
      planName: planMap.get(pd.planId)?.displayName || pd.planId,
      planSlug: planMap.get(pd.planId)?.name || pd.planId,
      count: pd._count.id,
    }));

    // User growth %
    const userGrowth = usersPrevMonth > 0
      ? Math.round(((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 100)
      : usersThisMonth > 0 ? 100 : 0;

    // Revenue growth %
    const mrrCurrent = revenueThisMonth._sum.amount || 0;
    const mrrPrev = revenuePrevMonth._sum.amount || 0;
    const revenueGrowth = mrrPrev > 0
      ? Math.round(((mrrCurrent - mrrPrev) / mrrPrev) * 100)
      : mrrCurrent > 0 ? 100 : 0;

    // Conversion rate: users with active sub / total users
    const conversionRate = totalUsers > 0
      ? Math.round((activeSubscriptions / totalUsers) * 100)
      : 0;

    // Run status breakdown
    const runStatusMap: Record<string, number> = {};
    for (const rs of runsByStatus) {
      runStatusMap[rs.status] = rs._count.id;
    }

    return {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        collaborators: totalCollaborators,
        regular: totalRegularUsers,
        blocked: blockedUsers,
        newThisMonth: usersThisMonth,
        newPrevMonth: usersPrevMonth,
        growthPercent: userGrowth,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: mrrCurrent,
        prevMonth: mrrPrev,
        growthPercent: revenueGrowth,
        totalPayments,
      },
      subscriptions: {
        active: activeSubscriptions,
        conversionRate,
        planDistribution: planDist,
      },
      content: {
        totalRuns: totalEditorialRuns,
        runsThisMonth,
        runsByStatus: runStatusMap,
        totalPublications,
        publicationsThisMonth,
      },
      commissions: {
        totalReferrals,
        pendingAmount: pendingCommissions._sum.commissionAmount || 0,
        paidAmount: paidCommissions._sum.commissionAmount || 0,
      },
      licenses: {
        total: totalLicenses,
        activated: activatedLicenses,
        available: availableLicenses,
      },
      workspaces: {
        total: totalWorkspaces,
      },
      recentPayments,
      recentAudit,
    };
  }

  // ================================================================
  // AUDIT LOG
  // ================================================================

  async logAudit(params: {
    action: string;
    category: 'USER_MGMT' | 'COMMISSION' | 'SUBSCRIPTION' | 'LICENSE' | 'SYSTEM';
    performedBy: string;
    targetId?: string;
    targetType?: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: params.action,
        category: params.category,
        performedBy: params.performedBy,
        targetId: params.targetId,
        targetType: params.targetType,
        details: params.details || undefined,
        ipAddress: params.ipAddress,
      },
    });
  }

  async listAuditLogs(filters?: {
    category?: string;
    performedBy?: string;
    action?: string;
    targetId?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.performedBy) where.performedBy = filters.performedBy;
    if (filters?.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters?.targetId) where.targetId = filters.targetId;

    const take = filters?.take || 50;
    const skip = filters?.skip || 0;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          performer: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, take, skip };
  }

  // ── User Activity ───────────────────────────────────────

  async getUserActivity(userId: string) {
    const [
      recentRuns,
      recentPublications,
      recentLogins,
      contentVersions,
    ] = await Promise.all([
      // Recent editorial runs
      this.prisma.editorialRun.findMany({
        where: {
          workspace: { users: { some: { userId } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          origin: true,
          createdAt: true,
          workspace: { select: { name: true } },
        },
      }),
      // Recent publications
      this.prisma.publication.findMany({
        where: {
          editorialRun: {
            workspace: { users: { some: { userId } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          platform: true,
          status: true,
          createdAt: true,
        },
      }),
      // Recent refresh tokens (proxies for logins)
      this.prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      }),
      // Recent content versions
      this.prisma.contentVersion.findMany({
        where: {
          brief: {
            editorialRun: {
              workspace: { users: { some: { userId } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          version: true,
          isMain: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      recentRuns,
      recentPublications,
      recentLogins,
      contentVersions,
    };
  }
}
