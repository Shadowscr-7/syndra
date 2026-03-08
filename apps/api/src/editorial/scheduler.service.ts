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
   * Cron cada 15 minutos: verifica slots de PublishSchedule próximos.
   * Si un slot coincide en los próximos 30 min con el día/hora actual,
   * lanza un editorial run automático para ese workspace.
   */
  @Cron('*/15 * * * *', { name: 'publish-schedule-check' })
  async checkPublishScheduleSlots() {
    this.logger.log('⏰ Checking publish schedule slots...');

    try {
      // Get current time info
      const now = new Date();
      const currentDay = now.getDay(); // 0=Sunday
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Convert current day to enum name
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const todayEnum = dayNames[currentDay];

      // Find active schedule slots for today
      const slots = await this.prisma.scheduleSlot.findMany({
        where: {
          dayOfWeek: todayEnum as any,
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
                      workspace: {
                        include: {
                          campaigns: {
                            where: {
                              isActive: true,
                              startDate: { lte: now },
                              OR: [{ endDate: null }, { endDate: { gte: now } }],
                            },
                            take: 1,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      let triggered = 0;

      for (const slot of slots) {
        // Parse slot time "HH:MM"
        const parts = slot.time.split(':').map(Number);
        const slotHour = parts[0] ?? 0;
        const slotMinute = parts[1] ?? 0;

        // Check if slot is within the next 15 minutes (matches this cron interval)
        const slotTotalMin = slotHour * 60 + slotMinute;
        const nowTotalMin = currentHour * 60 + currentMinute;
        const diff = slotTotalMin - nowTotalMin;

        // Trigger if slot is 0-15 minutes from now (this cron window)
        if (diff >= 0 && diff < 15) {
          const workspace = slot.schedule?.user?.workspaces?.[0]?.workspace;
          if (!workspace) continue;

          // Check if we already have a run today for this workspace
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const existingRun = await this.prisma.editorialRun.findFirst({
            where: {
              workspaceId: workspace.id,
              origin: 'schedule',
              createdAt: { gte: todayStart },
            },
          });

          if (existingRun) {
            this.logger.debug(
              `Skipping scheduled run for ${workspace.name} — already has run today`,
            );
            continue;
          }

          try {
            const { editorialRunId } = await this.orchestrator.createRun({
              workspaceId: workspace.id,
              campaignId: workspace.campaigns?.[0]?.id,
              origin: 'schedule',
              targetChannels: slot.socialAccountIds?.length
                ? slot.socialAccountIds
                : workspace.activeChannels,
            });

            this.logger.log(
              `📅 Scheduled run ${editorialRunId} for ${workspace.name} (slot ${slot.time})`,
            );
            triggered++;
          } catch (error) {
            this.logger.error(
              `Failed to create scheduled run for ${workspace.name}:`,
              error,
            );
          }
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
