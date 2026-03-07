// ============================================================
// Admin Service — Gestión administrativa de suscripciones y pagos
// ============================================================
// Un admin puede:
// 1. Activar/extender/cancelar suscripciones manualmente
// 2. Registrar pagos recibidos externamente
// 3. Ver overview de revenue y workspaces

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
