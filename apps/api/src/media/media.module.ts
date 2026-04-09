import { Module } from '@nestjs/common';
import { MediaEngineService } from './media-engine.service';
import { MediaController } from './media.controller';
import { BackgroundTasksService } from './background-tasks.service';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';
import { CreditsModule } from '../credits/credits.module';
import { MediaBalanceService } from './media-balance.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [CredentialsModule, PlansModule, CreditsModule, EmailModule],
  providers: [MediaEngineService, BackgroundTasksService, MediaBalanceService],
  controllers: [MediaController],
  exports: [MediaEngineService, BackgroundTasksService, MediaBalanceService],
})
export class MediaModule {}
