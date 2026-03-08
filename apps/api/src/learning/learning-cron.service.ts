// ============================================================
// LearningCronService — Recalculación periódica de perfiles
// Ejecuta cada 6 horas para mantener los patrones actualizados
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LearningService } from './learning.service';

@Injectable()
export class LearningCronService {
  private readonly logger = new Logger(LearningCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly learningService: LearningService,
  ) {}

  /**
   * Recalculate learning profiles every 6 hours.
   * Runs for all active workspaces that have ≥3 publications.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async recalculateAllProfiles() {
    this.logger.log('Starting periodic learning profile recalculation…');

    try {
      // Find workspaces with at least 3 published publications
      const workspaces = await this.prisma.workspace.findMany({
        where: {
          editorialRuns: {
            some: {
              publications: {
                some: { status: 'PUBLISHED' },
              },
            },
          },
        },
        select: { id: true, name: true },
      });

      let totalPatterns = 0;
      for (const ws of workspaces) {
        try {
          const result = await this.learningService.recalculateProfiles(ws.id);
          totalPatterns += result.patternsUpdated;
          this.logger.debug(`Workspace "${ws.name}": ${result.patternsUpdated} patterns, confidence=${result.confidence.toFixed(2)}`);
        } catch (err) {
          this.logger.error(`Error recalculating workspace ${ws.id}: ${err}`);
        }
      }

      this.logger.log(`Recalculation complete: ${workspaces.length} workspaces, ${totalPatterns} total patterns updated`);
    } catch (err) {
      this.logger.error('Periodic recalculation failed:', err);
    }
  }
}
