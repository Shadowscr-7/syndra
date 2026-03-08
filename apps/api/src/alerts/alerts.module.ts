import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AlertService } from './alerts.service';
import { AlertController } from './alerts.controller';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertsModule {}
