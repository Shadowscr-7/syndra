import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { LearningModule } from '../learning/learning.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [CredentialsModule, LearningModule, PlansModule],
  controllers: [StrategyController],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
