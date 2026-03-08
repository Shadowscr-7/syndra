// ============================================================
// AlertService — Alertas proactivas inteligentes
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

type AlertInput = {
  workspaceId: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  suggestedAction?: string;
};

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramBotService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────

  async listAlerts(workspaceId: string, status?: string) {
    return this.prisma.workspaceAlert.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async dismissAlert(alertId: string) {
    return this.prisma.workspaceAlert.update({
      where: { id: alertId },
      data: { status: 'DISMISSED', dismissedAt: new Date() },
    });
  }

  async resolveAlert(alertId: string) {
    return this.prisma.workspaceAlert.update({
      where: { id: alertId },
      data: { status: 'RESOLVED' },
    });
  }

  async countActive(workspaceId: string) {
    return this.prisma.workspaceAlert.count({
      where: { workspaceId, status: 'ACTIVE' },
    });
  }

  // ── Create alert (dedup by type per workspace) ────────

  private async createAlert(input: AlertInput) {
    // Avoid duplicates: don't create if same type already ACTIVE
    const existing = await this.prisma.workspaceAlert.findFirst({
      where: {
        workspaceId: input.workspaceId,
        type: input.type as any,
        status: 'ACTIVE',
      },
    });
    if (existing) return existing;

    const alert = await this.prisma.workspaceAlert.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type as any,
        severity: input.severity,
        title: input.title,
        message: input.message,
        suggestedAction: input.suggestedAction,
      },
    });

    // Send critical alerts via Telegram
    if (input.severity === 'CRITICAL') {
      try {
        const chatId = await this.resolveOwnerChatId(input.workspaceId);
        await this.telegram.sendNotification(
          `🚨 *Alerta Crítica*\n\n*${input.title}*\n${input.message}${input.suggestedAction ? `\n\n💡 ${input.suggestedAction}` : ''}`,
          chatId,
        );
      } catch {
        // ignore telegram errors
      }
    }

    return alert;
  }

  // ── Daily evaluation cron ─────────────────────────────

  @Cron('0 8 * * *', { name: 'daily-alerts-check' })
  async evaluateAllWorkspaces() {
    this.logger.log('🔔 Evaluating alerts for all workspaces...');
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true, name: true },
    });

    let totalAlerts = 0;
    for (const ws of workspaces) {
      const count = await this.evaluateWorkspace(ws.id);
      totalAlerts += count;
    }
    this.logger.log(`🔔 Alert evaluation complete: ${totalAlerts} new alerts`);
  }

  async evaluateWorkspace(workspaceId: string): Promise<number> {
    let count = 0;

    // 1. Low activity — no publications in 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPubs = await this.prisma.publication.count({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: sevenDaysAgo },
        editorialRun: { workspaceId },
      },
    });
    if (recentPubs === 0) {
      await this.createAlert({
        workspaceId,
        type: 'LOW_ACTIVITY',
        severity: 'WARNING',
        title: '7 días sin publicar',
        message: 'No se ha publicado contenido en la última semana. Tu audiencia puede perder interés.',
        suggestedAction: 'Crea un nuevo run editorial o activa una campaña.',
      });
      count++;
    }

    // 2. Engagement drop — compare last 7d vs previous 7d
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [recentEngagement, prevEngagement] = await Promise.all([
      this.prisma.publication.aggregate({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
        _avg: { engagementRate: true },
        _count: true,
      }),
      this.prisma.publication.aggregate({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          editorialRun: { workspaceId },
        },
        _avg: { engagementRate: true },
        _count: true,
      }),
    ]);

    if (
      recentEngagement._count > 0 &&
      prevEngagement._count > 0 &&
      prevEngagement._avg.engagementRate &&
      recentEngagement._avg.engagementRate
    ) {
      const drop =
        ((prevEngagement._avg.engagementRate - recentEngagement._avg.engagementRate) /
          prevEngagement._avg.engagementRate) *
        100;
      if (drop > 20) {
        await this.createAlert({
          workspaceId,
          type: 'ENGAGEMENT_DROP',
          severity: 'WARNING',
          title: `Engagement bajó ${Math.round(drop)}%`,
          message: `El engagement promedio cayó de ${prevEngagement._avg.engagementRate.toFixed(1)}% a ${recentEngagement._avg.engagementRate.toFixed(1)}% en la última semana.`,
          suggestedAction: 'Revisa los analytics y ajusta tu estrategia de contenido.',
        });
        count++;
      }
    }

    // 3. Publish errors — repeated failures
    const recentErrors = await this.prisma.publication.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: sevenDaysAgo },
        editorialRun: { workspaceId },
      },
    });
    if (recentErrors >= 3) {
      await this.createAlert({
        workspaceId,
        type: 'PUBLISH_ERROR',
        severity: 'CRITICAL',
        title: `${recentErrors} errores de publicación recientes`,
        message: 'Se han producido múltiples errores al publicar. Verifica tus credenciales y la conexión con las plataformas.',
        suggestedAction: 'Ve a Credenciales y reconecta tus cuentas.',
      });
      count++;
    }

    // 4. Onboarding stalled — not completed after 48h
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { onboardingCompleted: true, createdAt: true },
    });
    if (ws && !ws.onboardingCompleted && ws.createdAt < twoDaysAgo) {
      await this.createAlert({
        workspaceId,
        type: 'ONBOARDING_STALLED',
        severity: 'INFO',
        title: 'Onboarding incompleto',
        message: 'Tu configuración inicial no se ha completado. Complétala para sacar el máximo provecho de Syndra.',
        suggestedAction: 'Ve a Configuración para completar tu setup.',
      });
      count++;
    }

    // 5. Campaigns without sources
    const campaigns = await this.prisma.campaign.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
    });
    const activeSources = await this.prisma.researchSource.count({
      where: { workspaceId, isActive: true },
    });
    if (campaigns.length > 0 && activeSources === 0) {
      await this.createAlert({
        workspaceId,
        type: 'CAMPAIGN_NO_SOURCES',
        severity: 'WARNING',
        title: 'Campañas sin fuentes de investigación',
        message: 'Tienes campañas activas pero no hay fuentes RSS configuradas. El pipeline no podrá investigar contenido.',
        suggestedAction: 'Agrega fuentes RSS desde el panel de Fuentes.',
      });
      count++;
    }

    // 6. Pipeline failure rate > 20%
    const recentRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, createdAt: { gte: sevenDaysAgo } },
    });
    const failedRuns = await this.prisma.editorialRun.count({
      where: { workspaceId, status: 'FAILED', createdAt: { gte: sevenDaysAgo } },
    });
    if (recentRuns >= 5) {
      const failureRate = (failedRuns / recentRuns) * 100;
      if (failureRate > 20) {
        await this.createAlert({
          workspaceId,
          type: 'PIPELINE_FAILURE_RATE',
          severity: failureRate > 50 ? 'CRITICAL' : 'WARNING',
          title: `Tasa de fallos del pipeline: ${Math.round(failureRate)}%`,
          message: `${failedRuns} de ${recentRuns} runs editoriales han fallado en los últimos 7 días. Esto puede indicar un problema con las credenciales o la configuración del LLM.`,
          suggestedAction: 'Revisa los logs de errores y verifica tus credenciales de API.',
        });
        count++;
      }
    }

    // 7. Auto-resolve old alerts that no longer apply
    await this.autoResolveAlerts(workspaceId, recentPubs, recentErrors, recentRuns > 0 ? (failedRuns / recentRuns) : 0);

    return count;
  }

  private async autoResolveAlerts(
    workspaceId: string,
    recentPubs: number,
    recentErrors: number,
    failureRate: number = 0,
  ) {
    // Resolve LOW_ACTIVITY if they published recently
    if (recentPubs > 0) {
      await this.prisma.workspaceAlert.updateMany({
        where: { workspaceId, type: 'LOW_ACTIVITY', status: 'ACTIVE' },
        data: { status: 'RESOLVED' },
      });
    }
    // Resolve PUBLISH_ERROR if no recent errors
    if (recentErrors === 0) {
      await this.prisma.workspaceAlert.updateMany({
        where: { workspaceId, type: 'PUBLISH_ERROR', status: 'ACTIVE' },
        data: { status: 'RESOLVED' },
      });
    }
    // Resolve PIPELINE_FAILURE_RATE if rate dropped below 15%
    if (failureRate <= 0.15) {
      await this.prisma.workspaceAlert.updateMany({
        where: { workspaceId, type: 'PIPELINE_FAILURE_RATE', status: 'ACTIVE' },
        data: { status: 'RESOLVED' },
      });
    }
  }

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
