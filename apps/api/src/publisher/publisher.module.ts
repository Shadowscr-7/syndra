// ============================================================
// Publisher Module — Orquesta publicación en IG/FB
// ============================================================

import { Module } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherWorkerService } from './publisher-worker.service';
import { PublisherController } from './publisher.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [TelegramModule, PlansModule],
  controllers: [PublisherController],
  providers: [PublisherService, PublisherWorkerService],
  exports: [PublisherService],
})
export class PublisherModule {}
