import { Module } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';
import { BusinessProfileModule } from '../business-profile/business-profile.module';
import { BusinessBriefsModule } from '../business-briefs/business-briefs.module';

@Module({
  imports: [CredentialsModule, PlansModule, BusinessProfileModule, BusinessBriefsModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
