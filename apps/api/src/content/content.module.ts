import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';
import { BusinessProfileModule } from '../business-profile/business-profile.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CredentialsModule, PlansModule, BusinessProfileModule, CreditsModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
