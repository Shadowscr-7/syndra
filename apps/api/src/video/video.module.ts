// ============================================================
// Video Module — NestJS module para generación de video con avatar
// ============================================================

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { TelegramModule } from '../telegram/telegram.module';
import { VideoService } from './video.service';
import { VideoWorkerService } from './video-worker.service';
import { VideoController } from './video.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    forwardRef(() => TelegramModule),
  ],
  providers: [VideoService, VideoWorkerService],
  controllers: [VideoController],
  exports: [VideoService],
})
export class VideoModule {}
