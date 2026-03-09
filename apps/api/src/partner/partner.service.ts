// ============================================================
// Partner Service — Self-serve affiliate panel for COLLABORATOR users
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RECURRING_THRESHOLD = 20;

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get partner dashboard stats for a COLLABORATOR user
   */
  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, referralCode: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const referrals = await this.prisma.affiliateReferral.findMany({
      where: { collaboratorId: userId },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
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
      orderBy: [{ commissionType: 'asc' }, { createdAt: 'desc' }],
    });

    const payouts = await this.prisma.commissionPayout.findMany({
      where: { collaboratorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const firstPurchaseRefs = referrals.filter((r) => r.commissionType === 'FIRST_PURCHASE');
    const recurringRefs = referrals.filter((r) => r.commissionType === 'RECURRING');

    // Count active referred users (non-cancelled FIRST_PURCHASE refs with active subscription)
    const activeReferredUsers = firstPurchaseRefs.filter((r) => {
      const sub = r.referredUser?.workspaces?.[0]?.workspace?.subscription;
      return sub?.status === 'ACTIVE' && r.status !== 'CANCELLED';
    }).length;

    const totalReferrals = firstPurchaseRefs.length;
    const pendingCount = referrals.filter((r) => r.status === 'PENDING').length;
    const approvedCount = referrals.filter((r) => r.status === 'APPROVED').length;
    const paidCount = referrals.filter((r) => r.status === 'PAID').length;

    const pendingAmount = referrals
      .filter((r) => r.status === 'PENDING')
      .reduce((s, r) => s + r.commissionAmount, 0);
    const approvedAmount = referrals
      .filter((r) => r.status === 'APPROVED')
      .reduce((s, r) => s + r.commissionAmount, 0);
    const paidAmount = referrals
      .filter((r) => r.status === 'PAID')
      .reduce((s, r) => s + r.commissionAmount, 0);
    const totalRevenue = firstPurchaseRefs.reduce((s, r) => s + r.amountPaid, 0);

    const totalPayoutsPaid = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + p.totalAmount, 0);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        memberSince: user.createdAt,
      },
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
        totalPayoutsPaid,
        commissionPercent: 20,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUser: r.referredUser,
        planName: r.planName,
        amountPaid: r.amountPaid,
        commissionAmount: r.commissionAmount,
        commissionType: r.commissionType,
        periodStart: r.periodStart,
        status: r.status,
        createdAt: r.createdAt,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        totalAmount: p.totalAmount,
        referralCount: p.referralCount,
        status: p.status,
        method: p.method,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };
  }
}
