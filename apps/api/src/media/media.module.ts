import { Module } from '@nestjs/common';
import { MediaEngineService } from './media-engine.service';
import { MediaController } from './media.controller';

@Module({
  providers: [MediaEngineService],
  controllers: [MediaController],
  exports: [MediaEngineService],
})
export class MediaModule {}
