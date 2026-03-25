// ============================================================
// Scheduler Service — Cron jobs para el pipeline editorial
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';

// Map DayOfWeek enum to cron day number (0=Sunday)
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
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: EditorialOrchestratorService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // ── On startup: register all active slot cron jobs ─────

  async onModuleInit() {
    await this.syncAllSlotJobs();
  }

  /**
   * Load all active schedule slots from DB and register a CronJob for each.
   * Called on startup and can be called to re-sync after changes.
   */
  async syncAllSlotJobs() {
    // Remove any existing slot jobs
    this.clearSlotJobs();

    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        schedule: { isActive: true },
      },
      include: {
        schedule: {
          select: {
            id: true,
            timezone: true,
            campaignId: true,
            contentProfileId: true,
            userId: true,
            campaign: {
              select: { id: true, targetChannels: true },
            },
          },
        },
      },
    });

    for (const slot of slots) {
      this.registerSlotJob(slot);
    }

    this.logger.log(`📅 Registered ${slots.length} schedule slot jobs`);
  }

  /**
   * Register a single slot as a CronJob.
   * Converts "MONDAY 10:00" + timezone into a real cron expression.
   */
  registerSlotJob(slot: {
    id: string;
    dayOfWeek: string;
    time: string;
    socialAccountIds: string[];
    schedule: {
      id: string;
      timezone: string;
      campaignId: string | null;
      contentProfileId: string | null;
      userId: string;
      campaign: { id: string; targetChannels: string[] } | null;
    };
  }) {
    const jobName = `slot:${slot.id}`;

    // Don't register duplicates
    try {
      this.schedulerRegistry.getCronJob(jobName);
      return; // already registered
    } catch {
      // Not found, proceed to register
    }

    const [hourStr, minuteStr] = slot.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const dayNum = DAY_MAP[slot.dayOfWeek];

    if (isNaN(hour) || isNaN(minute) || dayNum === undefined) {
      this.logger.warn(`Invalid slot config: ${slot.dayOfWeek} ${slot.time}, skipping`);
      return;
    }

    // Cron expression: minute hour * * dayOfWeek
    const cronExpr = `${minute} ${hour} * * ${dayNum}`;
    const tz = slot.schedule.timezone || 'America/Mexico_City';

    const job = new CronJob(
      cronExpr,
      () => this.executeSlot(slot),
      null,
      true,
      tz,
    );

    this.schedulerRegistry.addCronJob(jobName, job);

    this.logger.debug(
      `Registered slot job ${jobName}: "${cronExpr}" tz=${tz} (${slot.dayOfWeek} ${slot.time})`,
    );
  }

  /**
   * Remove a single slot job.
   */
  removeSlotJob(slotId: string) {
    const jobName = `slot:${slotId}`;
    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.debug(`Removed slot job ${jobName}`);
    } catch {
      // Job didn't exist, that's fine
    }
  }

  /**
   * Clear all slot-related cron jobs.
   */
  private clearSlotJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((_job, name) => {
      if (name.startsWith('slot:')) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    });
  }

  /**
   * Execute a slot: create an editorial run for the workspace.
   * Called exactly at the scheduled time by the CronJob.
   */
  private async executeSlot(slot: {
    id: string;
    dayOfWeek: string;
    time: string;
    socialAccountIds: string[];
    schedule: {
      id: string;
      timezone: string;
      campaignId: string | null;
      contentProfileId: string | null;
      userId: string;
      campaign: { id: string; targetChannels: string[] } | null;
    };
  }) {
    this.logger.log(`⏰ Slot triggered: ${slot.dayOfWeek} ${slot.time} (slot ${slot.id})`);

    try {
      // Get workspace for this user
      const wsUser = await this.prisma.workspaceUser.findFirst({
        where: { userId: slot.schedule.userId, isDefault: true },
        include: { workspace: true },
      });

      if (!wsUser?.workspace) {
        this.logger.warn(`No workspace found for user ${slot.schedule.userId}, skipping slot ${slot.id}`);
        return;
      }

      const workspace = wsUser.workspace;

      // Deduplication: check if this slot already ran today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const slotOrigin = `schedule:${slot.id}`;

      const existingRun = await this.prisma.editorialRun.findFirst({
        where: {
          workspaceId: workspace.id,
          origin: slotOrigin,
          createdAt: { gte: todayStart },
        },
      });

      if (existingRun) {
        this.logger.debug(`Slot ${slot.id} already ran today, skipping`);
        return;
      }

      // Resolve channels: slot channels > campaign channels > workspace channels
      const targetChannels = slot.socialAccountIds?.length
        ? slot.socialAccountIds
        : slot.schedule.campaign?.targetChannels?.length
          ? slot.schedule.campaign.targetChannels
          : workspace.activeChannels;

      const { editorialRunId } = await this.orchestrator.createRun({
        workspaceId: workspace.id,
        campaignId: slot.schedule.campaignId || undefined,
        contentProfileId: slot.schedule.contentProfileId || undefined,
        origin: slotOrigin,
        targetChannels,
      });

      this.logger.log(
        `📅 Scheduled run ${editorialRunId} for "${workspace.name}" (slot ${slot.dayOfWeek} ${slot.time})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute slot ${slot.id} (${slot.dayOfWeek} ${slot.time}):`,
        error,
      );
    }
  }

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

}
