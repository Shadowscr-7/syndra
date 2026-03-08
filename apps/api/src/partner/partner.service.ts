// ============================================================
// Partner Service — Self-serve affiliate panel for COLLABORATOR users
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payouts = await this.prisma.commissionPayout.findMany({
      where: { collaboratorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = referrals.length;
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
    const totalRevenue = referrals.reduce((s, r) => s + r.amountPaid, 0);

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
        pendingCount,
        approvedCount,
        paidCount,
        pendingAmount,
        approvedAmount,
        paidAmount,
        totalRevenue,
        totalPayoutsPaid,
        commissionPercent: 20, // standard rate
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUser: r.referredUser,
        planName: r.planName,
        amountPaid: r.amountPaid,
        commissionAmount: r.commissionAmount,
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
