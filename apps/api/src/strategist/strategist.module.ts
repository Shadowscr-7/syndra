import { Module } from '@nestjs/common';
import { StrategistController } from './strategist.controller';
import { StrategyPlanService } from './strategist-plan.service';
import { StrategistCronService } from './strategist-cron.service';
import { CredentialsModule } from '../credentials/credentials.module';
import { AuthModule } from '../auth/auth.module';
import { EditorialModule } from '../editorial/editorial.module';

@Module({
  imports: [CredentialsModule, AuthModule, EditorialModule],
  controllers: [StrategistController],
  providers: [StrategyPlanService, StrategistCronService],
  exports: [StrategyPlanService],
})
export class StrategistModule {}
