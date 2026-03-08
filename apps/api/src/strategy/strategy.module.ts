import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [CredentialsModule, LearningModule],
  controllers: [StrategyController],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
