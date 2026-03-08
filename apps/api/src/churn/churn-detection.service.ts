// ============================================================
// ChurnDetectionService — Detección de riesgo de abandono
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

interface RiskReason {
  reason: string;
  weight: number;
  detail: string;
}

@Injectable()
export class ChurnDetectionService {
  private readonly logger = new Logger(ChurnDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramBotService,
  ) {}

  // ── Weekly cron ───────────────────────────────────────

  @Cron('0 6 * * 0', { name: 'weekly-churn-evaluation' }) // Sunday 6 AM
  async evaluateAll() {
    this.logger.log('🔍 Evaluating churn risk for all workspaces...');
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true, name: true },
    });

    let atRisk = 0;
    for (const ws of workspaces) {
      const signal = await this.evaluateWorkspace(ws.id);
      if (signal.status === 'AT_RISK') atRisk++;
    }
    this.logger.log(`🔍 Churn evaluation complete: ${atRisk}/${workspaces.length} at risk`);
  }

  // ── Evaluate single workspace ─────────────────────────

  async evaluateWorkspace(workspaceId: string) {
    const reasons: RiskReason[] = [];
    const now = new Date();

    // 1. No publications in 14+ days (weight: 30)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentPubs = await this.prisma.publication.count({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: fourteenDaysAgo },
        editorialRun: { workspaceId },
      },
    });
    if (recentPubs === 0) {
      const lastPub = await this.prisma.publication.findFirst({
        where: { status: 'PUBLISHED', editorialRun: { workspaceId } },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      });
      const daysSince = lastPub?.publishedAt
        ? Math.floor((now.getTime() - lastPub.publishedAt.getTime()) / 86400000)
        : 999;
      reasons.push({
        reason: 'Sin publicaciones recientes',
        weight: 30,
        detail: daysSince < 999 ? `Última publicación hace ${daysSince} días` : 'Nunca ha publicado',
      });
    }

    // 2. Onboarding not completed (weight: 25)
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { onboardingCompleted: true, createdAt: true },
    });
    if (ws && !ws.onboardingCompleted) {
      const daysOld = Math.floor((now.getTime() - ws.createdAt.getTime()) / 86400000);
      if (daysOld > 3) {
        reasons.push({
          reason: 'Onboarding no completado',
          weight: 25,
          detail: `Workspace creado hace ${daysOld} días sin completar configuración`,
        });
      }
    }

    // 3. No approved content (weight: 20)
    const approvedRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, status: { in: ['APPROVED', 'PUBLISHED'] } },
    });
    const totalRuns = await this.prisma.editorialRun.count({
      where: { workspaceId },
    });
    if (totalRuns > 0 && approvedRuns === 0) {
      reasons.push({
        reason: 'Contenido generado pero nunca aprobado',
        weight: 20,
        detail: `${totalRuns} runs creados, 0 aprobados`,
      });
    }

    // 4. Sustained low engagement (weight: 15)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const engagementAvg = await this.prisma.publication.aggregate({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
        editorialRun: { workspaceId },
      },
      _avg: { engagementRate: true },
      _count: true,
    });
    if (engagementAvg._count > 3 && (engagementAvg._avg.engagementRate ?? 0) < 1) {
      reasons.push({
        reason: 'Engagement muy bajo sostenido',
        weight: 15,
        detail: `Promedio de ${(engagementAvg._avg.engagementRate ?? 0).toFixed(1)}% en últimos 30 días`,
      });
    }

    // 5. High failure rate (weight: 15)
    const failedRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, status: 'FAILED', createdAt: { gte: thirtyDaysAgo } },
    });
    const recentRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
    });
    if (recentRuns > 3 && failedRuns / recentRuns > 0.5) {
      reasons.push({
        reason: 'Alta tasa de fallos',
        weight: 15,
        detail: `${failedRuns}/${recentRuns} runs fallidos en últimos 30 días`,
      });
    }

    // 6. Multiple regenerations without approval (weight: 10)
    const rejectedRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, status: 'REJECTED', createdAt: { gte: thirtyDaysAgo } },
    });
    if (rejectedRuns > 5) {
      reasons.push({
        reason: 'Muchas regeneraciones sin aprobar',
        weight: 10,
        detail: `${rejectedRuns} runs rechazados en últimos 30 días`,
      });
    }

    // Calculate total score (capped at 100)
    const riskScore = Math.min(
      reasons.reduce((sum, r) => sum + r.weight, 0),
      100,
    );

    const status = riskScore >= 50 ? 'AT_RISK' : riskScore >= 20 ? 'MONITORING' : 'HEALTHY';

    // Upsert signal
    const signal = await this.prisma.churnRiskSignal.upsert({
      where: { workspaceId },
      update: {
        riskScore,
        reasons: reasons as any,
        status: status as any,
        lastCalculatedAt: now,
      },
      create: {
        workspaceId,
        riskScore,
        reasons: reasons as any,
        status: status as any,
        lastCalculatedAt: now,
      },
    });

    // Create admin alert and notify via Telegram for AT_RISK workspaces
    if (status === 'AT_RISK') {
      const wsInfo = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, slug: true },
      });

      const reasonSummary = reasons.map(r => `• ${r.reason} (${r.detail})`).join('\n');

      // Create CHURN_AT_RISK alert (dedup: don't create if already active)
      const existingAlert = await this.prisma.workspaceAlert.findFirst({
        where: { workspaceId, type: 'CHURN_AT_RISK', status: 'ACTIVE' },
      });

      if (!existingAlert) {
        await this.prisma.workspaceAlert.create({
          data: {
            workspaceId,
            type: 'CHURN_AT_RISK' as any,
            severity: 'CRITICAL',
            title: `Riesgo de abandono detectado (score: ${riskScore})`,
            message: `El workspace "${wsInfo?.name ?? workspaceId}" está en riesgo de abandono.\n\nFactores:\n${reasonSummary}`,
            suggestedAction: 'Contacta al usuario para ofrecer asistencia o incentivos de retención.',
          },
        });

        // Notify admin via Telegram (owner of the workspace)
        try {
          const ownerLink = await this.resolveOwnerChatId(workspaceId);
          if (ownerLink) {
            await this.telegram.sendNotification(
              `🚨 *Alerta de Churn*\n\n*Workspace:* ${wsInfo?.name ?? workspaceId}\n*Score:* ${riskScore}/100\n*Status:* AT_RISK\n\n${reasonSummary}`,
              ownerLink,
            );
          }
        } catch {
          // ignore telegram errors
        }
      }
    }

    return signal;
  }

  // ── API queries ───────────────────────────────────────

  async getAllSignals() {
    return this.prisma.churnRiskSignal.findMany({
      orderBy: { riskScore: 'desc' },
      include: {
        workspace: { select: { id: true, name: true, slug: true, createdAt: true, onboardingCompleted: true } },
      },
    });
  }

  async getSignal(workspaceId: string) {
    return this.prisma.churnRiskSignal.findUnique({
      where: { workspaceId },
    });
  }

  async getAtRiskCount() {
    return this.prisma.churnRiskSignal.count({
      where: { status: 'AT_RISK' },
    });
  }

  // ── Private helpers ───────────────────────────────────

  private async resolveOwnerChatId(workspaceId: string): Promise<string | undefined> {
    try {
      const owner = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, role: 'OWNER' },
        select: { userId: true },
      });
      if (!owner) return undefined;
      const link = await this.prisma.telegramLink.findUnique({
        where: { userId: owner.userId },
      });
      return link?.chatId ?? undefined;
    } catch {
      return undefined;
    }
  }
}
