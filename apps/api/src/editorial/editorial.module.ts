import { Module, forwardRef } from '@nestjs/common';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';
import { EditorialWorkerService } from './editorial-worker.service';
import { SchedulerService } from './scheduler.service';
import { EditorialController } from './editorial.controller';
import { ResearchModule } from '../research/research.module';
import { StrategyModule } from '../strategy/strategy.module';
import { ContentModule } from '../content/content.module';
import { MediaModule } from '../media/media.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [ResearchModule, StrategyModule, ContentModule, MediaModule, forwardRef(() => TelegramModule)],
  controllers: [EditorialController],
  providers: [
    EditorialOrchestratorService,
    EditorialWorkerService,
    SchedulerService,
  ],
  exports: [EditorialOrchestratorService],
})
export class EditorialModule {}
