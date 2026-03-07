import { Module, forwardRef } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramApprovalHandler } from './telegram-approval.handler';
import { TelegramPollingService } from './telegram-polling.service';
import { TelegramController } from './telegram.controller';
import { EditorialModule } from '../editorial/editorial.module';
import { ContentModule } from '../content/content.module';
import { MediaModule } from '../media/media.module';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [forwardRef(() => EditorialModule), ContentModule, MediaModule, forwardRef(() => VideoModule)],
  controllers: [TelegramController],
  providers: [TelegramBotService, TelegramApprovalHandler, TelegramPollingService],
  exports: [TelegramBotService, TelegramApprovalHandler],
})
export class TelegramModule {}
