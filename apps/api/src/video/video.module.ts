// ============================================================
// Video Module — NestJS module para generación de video con avatar
// ============================================================

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PlansModule } from '../plans/plans.module';
import { CreditsModule } from '../credits/credits.module';
import { VideoService } from './video.service';
import { VideoWorkerService } from './video-worker.service';
import { VideoTierRouterService } from './video-tier-router.service';
import { VideoCreditService } from './video-credit.service';
import { VideoCompositorService } from './video-compositor.service';
import { AiDirectorService } from './ai-director.service';
import { AvatarSceneService } from './avatar-scene.service';
import { ReelComposerService } from './reel-composer.service';
import { VideoController } from './video.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    PlansModule,
    CreditsModule,
    forwardRef(() => TelegramModule),
  ],
  providers: [
    VideoService,
    VideoWorkerService,
    VideoTierRouterService,
    VideoCreditService,
    VideoCompositorService,
    AiDirectorService,
    AvatarSceneService,
    ReelComposerService,
  ],
  controllers: [VideoController],
  exports: [VideoService, VideoTierRouterService, VideoCreditService, VideoCompositorService, AiDirectorService, AvatarSceneService, ReelComposerService],
})
export class VideoModule {}
