import { Module, forwardRef } from '@nestjs/common';
import { TrendsController } from './trends.controller';
import { TrendDetectionService } from './trend-detection.service';
import { TrendCronService } from './trend-cron.service';
import { CredentialsModule } from '../credentials/credentials.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CredentialsModule, forwardRef(() => TelegramModule), AuthModule],
  controllers: [TrendsController],
  providers: [TrendDetectionService, TrendCronService],
  exports: [TrendDetectionService],
})
export class TrendsModule {}
