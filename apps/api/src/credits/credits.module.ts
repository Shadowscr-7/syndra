// ============================================================
// Credits Module — AI credit system
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansModule } from '../plans/plans.module';
import { CreditService } from './credits.service';
import { CreditController } from './credits.controller';
import { CreditGuard } from './credit.guard';
import { CreditInterceptor } from './credit.interceptor';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [CreditController],
  providers: [CreditService, CreditGuard, CreditInterceptor],
  exports: [CreditService, CreditGuard, CreditInterceptor],
})
export class CreditsModule {}
