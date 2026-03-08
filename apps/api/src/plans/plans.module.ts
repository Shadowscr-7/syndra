import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlanLimitsGuard } from './plan-limits.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlansService, PlanLimitsGuard],
  exports: [PlansService, PlanLimitsGuard],
})
export class PlansModule {}
