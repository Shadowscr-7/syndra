import { Module } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [CredentialsModule, PlansModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
