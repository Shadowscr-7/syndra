// ============================================================
// AnalyticsCronService — Scheduled metric collection & reports
// Runs every 6 hours to collect metrics, weekly to generate insights
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import { ScoringService } from './scoring.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly scoring: ScoringService,
    private readonly telegram: TelegramBotService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
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

  // ──────────────────────────────────────────────────────
  // Monthly Executive Summary (Email + Telegram)
  // ──────────────────────────────────────────────────────

  @Cron('0 10 1 * *') // 1st of each month at 10:00 AM
  async handleMonthlySummary(): Promise<void> {
    this.logger.log('📧 Generating monthly executive summaries...');
    try {
      const workspaces = await this.prisma.workspace.findMany({
        include: {
          users: {
            where: { role: 'OWNER' },
            include: { user: true },
          },
        },
      });

      let sent = 0;

      for (const ws of workspaces) {
        try {
          const summary = await this.analytics.getExecutiveSummary(ws.id);
          const d = summary.data;
          const owner = ws.users[0]?.user;

          // ── Telegram message ─────────────────────────
          const tgLines = [
            `📊 *Resumen mensual — ${d.period}*`,
            `🏢 *${ws.name}*`,
            '',
            `📝 Publicaciones este mes: *${d.publications.thisMonth}*`,
            `📈 Crecimiento vs mes anterior: *${d.publications.growth > 0 ? '+' : ''}${d.publications.growth}%*`,
            `💫 Engagement promedio: *${d.engagement.avg.toFixed(1)}%*`,
            `⚡ Tasa de éxito pipeline: *${d.pipeline.successRate}%*`,
          ];

          if (d.engagement.best) {
            tgLines.push(`🏆 Mejor canal: *${d.engagement.best.platform}* (${d.engagement.best.rate.toFixed(1)}%)`);
          }

          if (d.channels.length > 0) {
            tgLines.push('', '📱 *Por canal:*');
            for (const ch of d.channels) {
              tgLines.push(`  ${ch.icon} ${ch.name}: ${ch.count} publicaciones`);
            }
          }

          tgLines.push('', '🔗 _Ver más en el dashboard_');

          // Find owner Telegram chatId
          const ownerChatId = owner
            ? await this.prisma.telegramLink.findFirst({
                where: { userId: owner.id },
                select: { chatId: true },
              }).then((l) => l?.chatId ?? null)
            : null;

          if (ownerChatId) {
            await this.telegram.sendNotification(tgLines.join('\n'), ownerChatId);
          } else {
            await this.telegram.sendNotification(tgLines.join('\n'));
          }

          // ── Email ────────────────────────────────────
          if (owner?.email) {
            const growthColor = d.publications.growth >= 0 ? '#22c55e' : '#ef4444';
            const growthArrow = d.publications.growth >= 0 ? '↑' : '↓';

            await this.email.send({
              to: owner.email,
              subject: `📊 Resumen mensual de ${ws.name} — ${d.period}`,
              html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0d0d1a; color: #e2e2e2;">
  <h1 style="color: #a78bfa; font-size: 22px; margin-bottom: 8px;">📊 Resumen Mensual</h1>
  <p style="color: #9ca3af; margin-bottom: 24px;">${d.period} — ${ws.name}</p>

  <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
    <div style="flex: 1; min-width: 120px; background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #2d2d44;">
      <div style="color: #9ca3af; font-size: 12px;">Publicaciones</div>
      <div style="color: #fff; font-size: 24px; font-weight: 700;">${d.publications.thisMonth}</div>
      <div style="color: ${growthColor}; font-size: 12px;">${growthArrow} ${Math.abs(d.publications.growth)}% vs anterior</div>
    </div>
    <div style="flex: 1; min-width: 120px; background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #2d2d44;">
      <div style="color: #9ca3af; font-size: 12px;">Engagement</div>
      <div style="color: #fff; font-size: 24px; font-weight: 700;">${d.engagement.avg.toFixed(1)}%</div>
      ${d.engagement.best ? `<div style="color: #22d3ee; font-size: 12px;">Mejor: ${d.engagement.best.platform}</div>` : ''}
    </div>
    <div style="flex: 1; min-width: 120px; background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #2d2d44;">
      <div style="color: #9ca3af; font-size: 12px;">Pipeline</div>
      <div style="color: #fff; font-size: 24px; font-weight: 700;">${d.pipeline.successRate}%</div>
      <div style="color: #9ca3af; font-size: 12px;">${d.pipeline.totalRuns} runs</div>
    </div>
  </div>

  ${d.channels.length > 0 ? `
  <h2 style="color: #a78bfa; font-size: 16px; margin-bottom: 12px;">Por Canal</h2>
  <table style="width: 100%; border-collapse: collapse;">
    ${d.channels.map((ch) => `
    <tr style="border-bottom: 1px solid #2d2d44;">
      <td style="padding: 8px 0; color: #e2e2e2;">${ch.icon} ${ch.name}</td>
      <td style="padding: 8px 0; color: #fff; text-align: right; font-weight: 600;">${ch.count}</td>
    </tr>`).join('')}
  </table>` : ''}

  <div style="margin-top: 32px; text-align: center;">
    <a href="${process.env.APP_URL || 'http://localhost:3002'}/dashboard/analytics"
       style="background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Ver Dashboard Completo
    </a>
  </div>

  <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 32px;">
    Syndra — Tu asistente de marketing con IA
  </p>
</div>`,
              text: `Resumen ${d.period} — ${ws.name}\nPublicaciones: ${d.publications.thisMonth} (${d.publications.growth > 0 ? '+' : ''}${d.publications.growth}%)\nEngagement: ${d.engagement.avg.toFixed(1)}%\nPipeline: ${d.pipeline.successRate}%`,
            });
          }

          sent++;
        } catch (wsErr) {
          this.logger.error(`❌ Monthly summary failed for workspace ${ws.id}: ${wsErr}`);
        }
      }

      this.logger.log(`✅ Monthly summaries sent: ${sent}/${workspaces.length} workspaces`);
    } catch (err) {
      this.logger.error(`❌ Monthly summary job failed: ${err}`);
    }
  }
}
