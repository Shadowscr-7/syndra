// ============================================================
// Scheduler Service — Cron jobs para el pipeline editorial
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';

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
