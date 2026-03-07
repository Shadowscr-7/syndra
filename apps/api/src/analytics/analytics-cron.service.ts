// ============================================================
// AnalyticsCronService — Scheduled metric collection & reports
// Runs every 6 hours to collect metrics, weekly to generate insights
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import { ScoringService } from './scoring.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly scoring: ScoringService,
    private readonly telegram: TelegramBotService,
  ) {}

  /**
   * Collect metrics every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleMetricCollection(): Promise<void> {
    this.logger.log('⏰ Starting scheduled metric collection...');
    try {
      const result = await this.analytics.collectAllMetrics();
      this.logger.log(`✅ Metrics collected: ${result.updated} updated, ${result.errors} errors`);
    } catch (err) {
      this.logger.error(`❌ Metric collection failed: ${err}`);
    }
  }

  /**
   * Generate insights every Monday at 8:00 AM
   */
  @Cron('0 8 * * 1') // Monday 08:00
  async handleInsightGeneration(): Promise<void> {
    this.logger.log('🧠 Generating weekly insights...');
    try {
      const count = await this.scoring.generateInsights();
      this.logger.log(`✅ Generated ${count} insights`);
    } catch (err) {
      this.logger.error(`❌ Insight generation failed: ${err}`);
    }
  }

  /**
   * Send weekly Telegram report every Monday at 09:00 AM
   */
  @Cron('0 9 * * 1') // Monday 09:00
  async handleWeeklyReport(): Promise<void> {
    this.logger.log('📊 Sending weekly Telegram report...');
    try {
      const summary = await this.analytics.getWeeklySummary();
      const insights = await this.scoring.getActiveInsights();

      const lines: string[] = [
        '📊 *Informe Semanal de Rendimiento*',
        '',
        `📝 Publicaciones esta semana: *${summary.totalPublished}*`,
        `💫 Engagement promedio: *${summary.avgEngagement}%*`,
        `❤️ Likes promedio: *${summary.avgLikes}*`,
        `👁️ Alcance promedio: *${summary.avgReach}*`,
      ];

      if (summary.bestPost) {
        lines.push(
          '',
          '🏆 *Mejor post:*',
          `  ${summary.bestPost.platform} — ${summary.bestPost.theme ?? 'Sin tema'}`,
          `  Engagement: ${summary.bestPost.engagementRate?.toFixed(1)}% | ❤️ ${summary.bestPost.likes} | 👁️ ${summary.bestPost.reach}`,
        );
        if (summary.bestPost.permalink) {
          lines.push(`  [Ver post](${summary.bestPost.permalink})`);
        }
      }

      if (summary.worstPost) {
        lines.push(
          '',
          '📉 *Post con menor rendimiento:*',
          `  ${summary.worstPost.platform} — ${summary.worstPost.theme ?? 'Sin tema'}`,
          `  Engagement: ${summary.worstPost.engagementRate?.toFixed(1)}%`,
        );
      }

      if (insights.length > 0) {
        lines.push('', '💡 *Recomendaciones:*');
        for (const ins of insights.slice(0, 5)) {
          lines.push(`  • ${ins.title}`);
        }
      }

      lines.push('', '🔗 _Ver dashboard completo en el panel web_');

      await this.telegram.sendNotification(lines.join('\n'));
      this.logger.log('✅ Weekly report sent via Telegram');
    } catch (err) {
      this.logger.error(`❌ Weekly report failed: ${err}`);
    }
  }
}
