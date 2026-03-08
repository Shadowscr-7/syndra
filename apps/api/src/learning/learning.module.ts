// ============================================================
// LearningModule — Aprendizaje adaptativo
// ============================================================

import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningCronService } from './learning-cron.service';
import { LearningController } from './learning.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LearningController],
  providers: [LearningService, LearningCronService],
  exports: [LearningService],
})
export class LearningModule {}
