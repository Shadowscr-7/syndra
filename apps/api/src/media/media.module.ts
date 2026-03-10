import { Module } from '@nestjs/common';
import { MediaEngineService } from './media-engine.service';
import { MediaController } from './media.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CredentialsModule, PlansModule, CreditsModule],
  providers: [MediaEngineService],
  controllers: [MediaController],
  exports: [MediaEngineService],
})
export class MediaModule {}
