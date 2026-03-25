import { Module, forwardRef } from '@nestjs/common';
import { WeeklyPlannerService } from './weekly-planner.service';
import { WeeklyPlannerController } from './weekly-planner.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EditorialModule } from '../editorial/editorial.module';
import { PlansModule } from '../plans/plans.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ContentModule } from '../content/content.module';
import { MediaModule } from '../media/media.module';
import { VideoModule } from '../video/video.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EditorialModule),
    PlansModule,
    forwardRef(() => TelegramModule),
    ContentModule,
    MediaModule,
    VideoModule,
    CreditsModule,
  ],
  controllers: [WeeklyPlannerController],
  providers: [WeeklyPlannerService],
  exports: [WeeklyPlannerService],
})
export class WeeklyPlannerModule {}
