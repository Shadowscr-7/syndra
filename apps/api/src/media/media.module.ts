import { Module } from '@nestjs/common';
import { MediaEngineService } from './media-engine.service';
import { MediaController } from './media.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [CredentialsModule, PlansModule],
  providers: [MediaEngineService],
  controllers: [MediaController],
  exports: [MediaEngineService],
})
export class MediaModule {}
