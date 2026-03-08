// ============================================================
// StrategistCronService — Generación automática semanal de planes
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyPlanService } from './strategist-plan.service';

@Injectable()
export class StrategistCronService {
  private readonly logger = new Logger(StrategistCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: StrategyPlanService,
  ) {}

  /**
   * Every Monday at 7:00 AM — generate weekly plans for all active workspaces
   */
  @Cron('0 7 * * 1') // Monday 07:00
  async generateWeeklyPlans() {
    this.logger.log('⏰ Weekly strategy plan generation started');

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        onboardingCompleted: true,
        operationMode: { not: 'MANUAL' },
      },
      select: { id: true, name: true },
    });

    let success = 0;
    let failed = 0;

    for (const ws of workspaces) {
      try {
        // Check if workspace has at least some publications to base plan on
        const pubCount = await this.prisma.publication.count({
          where: { editorialRun: { workspaceId: ws.id } },
        });

        if (pubCount === 0) {
          this.logger.debug(`Skipping workspace ${ws.name}: no publications yet`);
          continue;
        }

        await this.planService.generatePlan(ws.id, 'WEEKLY', 'SYSTEM');
        success++;
        this.logger.log(`✅ Weekly plan generated for ${ws.name}`);
      } catch (error) {
        failed++;
        this.logger.error(`❌ Failed to generate plan for ${ws.name}: ${error}`);
      }
    }

    this.logger.log(`Weekly plan generation complete: ${success} success, ${failed} failed`);
  }
}
