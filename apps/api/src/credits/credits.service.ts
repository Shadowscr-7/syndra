// ============================================================
// Credits Service — AI credit management for premium operations
// ============================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Tabla de costos por operación
export const CREDIT_COSTS: Record<string, number> = {
  // Imágenes
  IMAGE_STANDARD: 1,
  IMAGE_TEXT: 5,
  IMAGE_HD: 3,
  // Animaciones
  ANIMATION_5S: 10,
  ANIMATION_10S: 15,
  // Video
  VIDEO_REEL_10S: 20,
  VIDEO_REEL_15S: 25,
  // Avatares
  AVATAR_BASIC_30S: 30,
  AVATAR_PREMIUM_30S: 50,
  // Audio/Voz
  VOICE_PREMIUM: 2,
  // IA (contenido, research, estrategia)
  AI_CONTENT: 3,
  AI_RESEARCH: 2,
  AI_STRATEGY: 5,
};

// Paquetes de compra via PayPal
export const CREDIT_PACKAGES = {
  basic: { credits: 100, priceUsd: '5.00', label: 'Básico (100 créditos)' },
  popular: { credits: 350, priceUsd: '15.00', label: 'Popular (350 créditos)' },
  mega: { credits: 1000, priceUsd: '35.00', label: 'Mega (1000 créditos)' },
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Obtener balance actual del workspace */
  async getBalance(workspaceId: string): Promise<{
    currentBalance: number;
    totalPurchased: number;
    totalConsumed: number;
    totalRefunded: number;
    isUnlimited: boolean;
  }> {
    let balance = await this.prisma.creditBalance.findUnique({
      where: { workspaceId },
    });

    if (!balance) {
      balance = await this.prisma.creditBalance.create({
        data: { workspaceId, currentBalance: 0, isUnlimited: false },
      });
    }

    return {
      currentBalance: balance.currentBalance,
      totalPurchased: balance.totalPurchased,
      totalConsumed: balance.totalConsumed,
      totalRefunded: balance.totalRefunded,
      isUnlimited: balance.isUnlimited,
    };
  }

  /** Verificar si tiene suficientes créditos para una operación */
  async hasEnoughCredits(workspaceId: string, operationCost: number): Promise<boolean> {
    const balance = await this.getBalance(workspaceId);
    if (balance.isUnlimited) return true;
    return balance.currentBalance >= operationCost;
  }

  /** Consumir créditos — llamar DESPUÉS de generar exitosamente */
  async consumeCredits(
    workspaceId: string,
    operation: string,
    description?: string,
    referenceId?: string,
  ): Promise<{ newBalance: number; creditsUsed: number }> {
    const cost = CREDIT_COSTS[operation] ?? 0;
    if (cost === 0) return { newBalance: 0, creditsUsed: 0 };

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({
        where: { workspaceId },
      });

      if (!balance) {
        throw new BadRequestException('No credit balance found for workspace');
      }

      if (balance.isUnlimited) {
        // Pro: registrar consumo sin decrementar
        await tx.aICredit.create({
          data: {
            workspaceId,
            amount: -cost,
            balance: balance.currentBalance,
            source: 'PLAN',
            operation: operation as any,
            description: description ?? `${operation} (unlimited plan)`,
            referenceId,
          },
        });
        return { newBalance: balance.currentBalance, creditsUsed: cost };
      }

      if (balance.currentBalance < cost) {
        throw new ForbiddenException(
          `Créditos insuficientes. Necesitas ${cost} créditos, tienes ${balance.currentBalance}`,
        );
      }

      const newBalance = balance.currentBalance - cost;

      await tx.creditBalance.update({
        where: { workspaceId },
        data: {
          currentBalance: { decrement: cost },
          totalConsumed: { increment: cost },
        },
      });

      await tx.aICredit.create({
        data: {
          workspaceId,
          amount: -cost,
          balance: newBalance,
          source: 'PLAN',
          operation: operation as any,
          description,
          referenceId,
        },
      });

      // Alertas de bajo saldo
      if (newBalance <= 10 && newBalance > 0) {
        this.logger.warn(`[Credits] Workspace ${workspaceId} low balance: ${newBalance} credits`);
      }
      if (newBalance === 0) {
        this.logger.warn(`[Credits] Workspace ${workspaceId} has 0 credits remaining`);
      }

      return { newBalance, creditsUsed: cost };
    });
  }

  /** Agregar créditos (compra, plan, promoción, refund) */
  async addCredits(
    workspaceId: string,
    amount: number,
    source: 'PLAN' | 'PURCHASE' | 'ADDON' | 'PROMO' | 'REFUND',
    description?: string,
    paypalOrderId?: string,
  ): Promise<{ newBalance: number }> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          currentBalance: amount,
          totalPurchased: amount,
        },
        update: {
          currentBalance: { increment: amount },
          totalPurchased: { increment: amount },
        },
      });

      await tx.aICredit.create({
        data: {
          workspaceId,
          amount,
          balance: balance.currentBalance,
          source,
          description,
          paypalOrderId,
        },
      });

      this.logger.log(`[Credits] +${amount} to workspace ${workspaceId} (${source})`);
      return { newBalance: balance.currentBalance };
    });
  }

  /** Refund de créditos por error de generación */
  async refundCredits(
    workspaceId: string,
    amount: number,
    referenceId: string,
    reason: string,
  ): Promise<{ newBalance: number }> {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.update({
        where: { workspaceId },
        data: {
          currentBalance: { increment: amount },
          totalRefunded: { increment: amount },
        },
      });

      await tx.aICredit.create({
        data: {
          workspaceId,
          amount,
          balance: balance.currentBalance,
          source: 'REFUND',
          description: `Refund: ${reason}`,
          referenceId,
        },
      });

      return { newBalance: balance.currentBalance };
    });
  }

  /** Marcar workspace como ilimitado (Pro plan) */
  async setUnlimited(workspaceId: string, unlimited: boolean): Promise<void> {
    await this.prisma.creditBalance.upsert({
      where: { workspaceId },
      create: { workspaceId, isUnlimited: unlimited },
      update: { isUnlimited: unlimited },
    });
  }

  /** Asignar créditos gratis de plan (onboarding) */
  async assignPlanCredits(workspaceId: string, planSlug: string): Promise<void> {
    const FREE_CREDITS: Record<string, number> = {
      starter: 0,
      creator: 100,
      pro: 0,
    };

    if (planSlug === 'pro') {
      await this.setUnlimited(workspaceId, true);
    } else {
      await this.setUnlimited(workspaceId, false);
    }

    const credits = FREE_CREDITS[planSlug] ?? 0;
    if (credits > 0) {
      await this.addCredits(
        workspaceId,
        credits,
        'PLAN',
        `${credits} créditos gratis del plan ${planSlug}`,
      );
    }
  }

  /** Historial de transacciones */
  async getHistory(
    workspaceId: string,
    opts?: { limit?: number; offset?: number; source?: string },
  ) {
    return this.prisma.aICredit.findMany({
      where: {
        workspaceId,
        ...(opts?.source ? { source: opts.source as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    });
  }

  /** Buscar si ya se creditó un pedido PayPal (deduplicación) */
  async findByPaypalOrderId(paypalOrderId: string) {
    return this.prisma.aICredit.findFirst({
      where: { paypalOrderId },
    });
  }
}
