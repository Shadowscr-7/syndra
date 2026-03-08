// ============================================================
// AnalyticsModule — NestJS module para Fase 5
// Recolección de métricas, dashboard analytics, feedback loop
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PlansModule } from '../plans/plans.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCronService } from './analytics-cron.service';
import { ScoringService } from './scoring.service';
import { BenchmarkService } from './benchmark.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule, TelegramModule, PlansModule],
  providers: [AnalyticsService, AnalyticsCronService, ScoringService, BenchmarkService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, ScoringService, AnalyticsCronService, BenchmarkService],
})
export class AnalyticsModule {}
