// ============================================================
// TrendCronService — Detección automática de tendencias
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TrendDetectionService } from './trend-detection.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class TrendCronService {
  private readonly logger = new Logger(TrendCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendService: TrendDetectionService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  /**
   * Every 4 hours — scan for new trends across all active workspaces
   */
  @Cron('0 */4 * * *') // every 4 hours
  async detectTrends() {
    this.logger.log('⏰ Trend detection cron started');

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        onboardingCompleted: true,
        operationMode: { not: 'MANUAL' },
        researchSources: { some: { isActive: true } },
      },
      select: { id: true, name: true },
    });

    for (const ws of workspaces) {
      try {
        // 1. Expire old trends
        await this.trendService.expireOldTrends(ws.id);

        // 2. Detect new trends
        const result = await this.trendService.detectTrends(ws.id);

        if (result.trendsFound > 0) {
          this.logger.log(`📈 ${result.trendsFound} new trends for ${ws.name}`);

          // 3. Send Telegram alert for high-scoring trends
          await this.sendTrendAlerts(ws.id, result.trends);
        }
      } catch (error) {
        this.logger.error(`Trend detection failed for ${ws.name}: ${error}`);
      }
    }

    this.logger.log('Trend detection cron complete');
  }

  private async sendTrendAlerts(
    workspaceId: string,
    trends: Array<{ id: string; themeLabel: string; finalScore: number }>,
  ) {
    // Only alert for trends with score >= 0.6
    const highScoreTrends = trends.filter(t => t.finalScore >= 0.6);
    if (highScoreTrends.length === 0) return;

    try {
      // Find workspace owner's Telegram chat
      const owner = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, role: 'OWNER' },
        select: { userId: true },
      });

      if (!owner) return;

      const telegramLink = await this.prisma.telegramLink.findFirst({
        where: { userId: owner.userId, isActive: true },
      });

      if (!telegramLink) return;

      const message = `📈 *Tendencias detectadas*\n\n${highScoreTrends.map(t =>
        `• *${t.themeLabel}* (score: ${(t.finalScore * 100).toFixed(0)}%)`
      ).join('\n')}\n\n🔗 Revisa los detalles en el dashboard para tomar acción.`;

      await this.telegramBot.sendNotification(message, telegramLink.chatId);
    } catch (error) {
      this.logger.warn(`Telegram alert failed for workspace ${workspaceId}: ${error}`);
    }
  }
}
