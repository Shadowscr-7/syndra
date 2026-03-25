// ============================================================
// Scheduler Service — Cron jobs para el pipeline editorial
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';

// Map DayOfWeek enum to JS day index (0=Sunday)
const DAY_MAP: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: EditorialOrchestratorService,
  ) {}

  /**
   * Cron diario: 7:00 AM (timezone del workspace)
   * Crea un EditorialRun para cada workspace activo con campaña vigente
   */
  @Cron('0 7 * * *', { name: 'daily-editorial-run', timeZone: 'America/Mexico_City' })
  async dailyEditorialRun() {
    this.logger.log('⏰ Daily editorial run triggered');

    try {
      // Obtener todos los workspaces con al menos una fuente activa
      const workspaces = await this.prisma.workspace.findMany({
        where: {
          operationMode: { not: 'MANUAL' }, // Skip MANUAL workspaces
        },
        include: {
          campaigns: {
            where: {
              isActive: true,
              startDate: { lte: new Date() },
              OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            },
            take: 1,
          },
          researchSources: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      const eligibleWorkspaces = workspaces.filter(
        (ws) => ws.researchSources.length > 0,
      );

      this.logger.log(
        `Found ${eligibleWorkspaces.length} eligible workspaces for daily run`,
      );

      for (const ws of eligibleWorkspaces) {
        try {
          const { editorialRunId } = await this.orchestrator.createRun({
            workspaceId: ws.id,
            campaignId: ws.campaigns[0]?.id,
            origin: 'scheduler',
            targetChannels: ws.activeChannels,
          });

          this.logger.log(
            `Created daily run ${editorialRunId} for workspace ${ws.name}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create daily run for workspace ${ws.name}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Daily editorial run failed:', error);
    }
  }

  /**
   * Cron cada 6 horas: verificar runs estancados
   */
  @Cron('0 */6 * * *', { name: 'check-stale-runs' })
  async checkStaleRuns() {
    const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 horas

    const staleRuns = await this.prisma.editorialRun.findMany({
      where: {
        status: {
          in: ['RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE'],
        },
        updatedAt: { lt: staleThreshold },
      },
    });

    if (staleRuns.length > 0) {
      this.logger.warn(`Found ${staleRuns.length} stale editorial runs`);
      for (const run of staleRuns) {
        await this.prisma.editorialRun.update({
          where: { id: run.id },
          data: { status: 'FAILED' },
        });
        this.logger.warn(`Marked stale run ${run.id} as FAILED`);
      }
    }
  }

  /**
   * Cron cada 5 minutos: verifica slots de PublishSchedule próximos.
   * Para cada slot que coincide con el día/hora actual (en la timezone del schedule),
   * lanza un editorial run automático con el perfil y campaña configurados.
   */
  @Cron('*/5 * * * *', { name: 'publish-schedule-check' })
  async checkPublishScheduleSlots() {
    this.logger.log('⏰ Checking publish schedule slots...');

    try {
      const now = new Date();

      // Get all days of the week (some timezones might be in a different day)
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

      // Find all active schedule slots
      const slots = await this.prisma.scheduleSlot.findMany({
        where: {
          schedule: {
            isActive: true,
          },
        },
        include: {
          schedule: {
            include: {
              user: {
                include: {
                  workspaces: {
                    where: { isDefault: true },
                    include: {
                      workspace: true,
                    },
                  },
                },
              },
              campaign: {
                select: { id: true, name: true, targetChannels: true },
              },
            },
          },
        },
      });

      let triggered = 0;

      for (const slot of slots) {
        const workspace = slot.schedule?.user?.workspaces?.[0]?.workspace;
        if (!workspace) continue;

        // Use the schedule's timezone (or default to America/Mexico_City)
        const tz = slot.schedule.timezone || 'America/Mexico_City';

        // Get current time in the user's timezone
        let userNow: Date;
        try {
          const nowStr = now.toLocaleString('en-US', { timeZone: tz });
          userNow = new Date(nowStr);
        } catch {
          userNow = now; // fallback if timezone is invalid
        }

        const currentDay = dayNames[userNow.getDay()];
        const currentHour = userNow.getHours();
        const currentMinute = userNow.getMinutes();

        // Check if slot is for today (in user's timezone)
        if (slot.dayOfWeek !== currentDay) continue;

        // Parse slot time "HH:MM"
        const parts = slot.time.split(':').map(Number);
        const slotHour = parts[0] ?? 0;
        const slotMinute = parts[1] ?? 0;

        // Check if slot is within the current 5-minute window
        const slotTotalMin = slotHour * 60 + slotMinute;
        const nowTotalMin = currentHour * 60 + currentMinute;
        const diff = slotTotalMin - nowTotalMin;

        if (diff < 0 || diff >= 5) continue;

        // Check if we already triggered THIS specific slot today
        // Use origin format "schedule:slotId" to allow multiple runs per day per workspace
        const slotOrigin = `schedule:${slot.id}`;

        const todayStartUTC = new Date(now);
        todayStartUTC.setUTCHours(0, 0, 0, 0);

        const existingRun = await this.prisma.editorialRun.findFirst({
          where: {
            workspaceId: workspace.id,
            origin: slotOrigin,
            createdAt: { gte: todayStartUTC },
          },
        });

        if (existingRun) {
          this.logger.debug(
            `Skipping slot ${slot.id} (${slot.time}) — already triggered today`,
          );
          continue;
        }

        try {
          // Use the schedule's campaign, or fall back to channels from slot
          const campaignId = slot.schedule.campaignId || undefined;
          const targetChannels = slot.socialAccountIds?.length
            ? slot.socialAccountIds
            : slot.schedule.campaign?.targetChannels?.length
              ? slot.schedule.campaign.targetChannels
              : workspace.activeChannels;

          const { editorialRunId } = await this.orchestrator.createRun({
            workspaceId: workspace.id,
            campaignId,
            contentProfileId: slot.schedule.contentProfileId || undefined,
            origin: slotOrigin,
            targetChannels,
          });

          this.logger.log(
            `📅 Scheduled run ${editorialRunId} for ${workspace.name} (slot ${slot.dayOfWeek} ${slot.time}, tz: ${tz})`,
          );
          triggered++;
        } catch (error) {
          this.logger.error(
            `Failed to create scheduled run for ${workspace.name} (slot ${slot.time}):`,
            error,
          );
        }
      }

      if (triggered > 0) {
        this.logger.log(`📅 Triggered ${triggered} scheduled editorial runs`);
      }
    } catch (error) {
      this.logger.error('Publish schedule check failed:', error);
    }
  }
}
