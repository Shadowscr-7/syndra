import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { CredentialsModule } from '../credentials/credentials.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [CredentialsModule, PlansModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
