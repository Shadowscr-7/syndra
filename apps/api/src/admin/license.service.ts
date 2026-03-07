// ============================================================
// License Service — Generación y canje de license keys
// ============================================================
// Flujo:
// 1. Admin genera batch de keys para un plan
// 2. Las vende por Gumroad/LemonSqueezy/PayPal/transferencia
// 3. El usuario canjea la key en /activate → se activa su suscripción

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Generate keys ────────────────────────────────────
  private generateKeyString(prefix: string): string {
    const segments = Array.from({ length: 3 }, () =>
      randomBytes(2).toString('hex').toUpperCase(),
    );
    return `${prefix}-${segments.join('-')}`;
  }

  async generateKeys(data: {
    planName: string;
    count: number;
    durationDays: number;
    batchName?: string;
    buyerEmail?: string;
    buyerName?: string;
    notes?: string;
  }) {
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { name: data.planName },
    });

    const prefix = `AUTO-${plan.name.substring(0, 3).toUpperCase()}`;
    const keys: string[] = [];

    for (let i = 0; i < data.count; i++) {
      let key: string;
      let attempts = 0;
      // Ensure uniqueness
      do {
        key = this.generateKeyString(prefix);
        attempts++;
      } while (
        attempts < 10 &&
        (await this.prisma.licenseKey.findUnique({ where: { key } }))
      );

      const created = await this.prisma.licenseKey.create({
        data: {
          key,
          planId: plan.id,
          durationDays: data.durationDays,
          batchName: data.batchName,
          buyerEmail: data.buyerEmail,
          buyerName: data.buyerName,
          notes: data.notes || '',
        },
      });

      keys.push(created.key);
    }

    this.logger.log(
      `✅ Generated ${keys.length} license keys for plan ${data.planName} (batch: ${data.batchName || 'none'})`,
    );

    return { plan: data.planName, count: keys.length, keys };
  }

  // ── Redeem a key ─────────────────────────────────────
  async redeemKey(
    key: string,
    workspaceId: string,
    userId: string,
  ) {
    const license = await this.prisma.licenseKey.findUnique({
      where: { key: key.trim().toUpperCase() },
      include: { plan: true },
    });

    if (!license) {
      throw new NotFoundException('Licencia no encontrada. Verifica el código.');
    }

    if (license.status !== 'AVAILABLE') {
      const statusMessages: Record<string, string> = {
        ACTIVATED: 'Esta licencia ya fue utilizada.',
        EXPIRED: 'Esta licencia ha expirado.',
        REVOKED: 'Esta licencia fue anulada.',
      };
      throw new BadRequestException(
        statusMessages[license.status] || 'Licencia no válida.',
      );
    }

    if (license.activationCount >= license.maxActivations) {
      throw new BadRequestException(
        'Esta licencia ha alcanzado el máximo de activaciones.',
      );
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + license.durationDays);

    const billingCycle = license.durationDays >= 365 ? 'YEARLY' : 'MONTHLY';

    // Transaction: activate license + create/update subscription
    const result = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Check for existing subscription and stack time
      const existing = await tx.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      });

      let finalPeriodEnd = periodEnd;

      // If active subscription exists and hasn't expired, extend it
      if (existing && existing.status === 'ACTIVE' && existing.currentPeriodEnd > now) {
        finalPeriodEnd = new Date(existing.currentPeriodEnd);
        finalPeriodEnd.setDate(
          finalPeriodEnd.getDate() + license.durationDays,
        );
      }

      // 2️⃣ Upsert subscription
      const sub = await tx.subscription.upsert({
        where: { workspaceId },
        update: {
          planId: license.planId,
          status: 'ACTIVE',
          billingCycle,
          currentPeriodStart: existing?.status === 'ACTIVE' ? existing.currentPeriodStart : now,
          currentPeriodEnd: finalPeriodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          workspaceId,
          planId: license.planId,
          status: 'ACTIVE',
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: finalPeriodEnd,
        },
        include: { plan: true },
      });

      // 3️⃣ Mark license as activated
      await tx.licenseKey.update({
        where: { id: license.id },
        data: {
          status: 'ACTIVATED',
          activatedBy: userId,
          activatedAt: now,
          workspaceId,
          expiresAt: finalPeriodEnd,
          activationCount: { increment: 1 },
        },
      });

      // 4️⃣ Log the payment
      await tx.paymentLog.create({
        data: {
          workspaceId,
          amount: billingCycle === 'YEARLY' ? license.plan.yearlyPrice : license.plan.monthlyPrice,
          currency: 'USD',
          method: 'license_key',
          reference: license.key,
          description: `License key redeemed: ${license.plan.displayName} (${license.durationDays} days)`,
          licenseKeyId: license.id,
          recordedBy: userId,
        },
      });

      return {
        subscription: sub,
        license: {
          key: license.key,
          plan: license.plan.displayName,
          durationDays: license.durationDays,
          expiresAt: finalPeriodEnd,
        },
      };
    });

    this.logger.log(
      `✅ License ${key} redeemed by ${userId} for workspace ${workspaceId}`,
    );

    return result;
  }

  // ── List licenses ────────────────────────────────────
  async listLicenses(filters?: {
    status?: string;
    planName?: string;
    batchName?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.planName) {
      where.plan = { name: filters.planName };
    }
    if (filters?.batchName) {
      where.batchName = { contains: filters.batchName };
    }

    return this.prisma.licenseKey.findMany({
      where,
      include: { plan: { select: { name: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Revoke a license ─────────────────────────────────
  async revokeKey(keyId: string) {
    return this.prisma.licenseKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED' },
    });
  }

  // ── Get license stats ────────────────────────────────
  async getStats() {
    const [available, activated, expired, revoked] = await Promise.all([
      this.prisma.licenseKey.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.licenseKey.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.licenseKey.count({ where: { status: 'EXPIRED' } }),
      this.prisma.licenseKey.count({ where: { status: 'REVOKED' } }),
    ]);

    return { available, activated, expired, revoked, total: available + activated + expired + revoked };
  }
}
