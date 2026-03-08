import { Module } from '@nestjs/common';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';
import { CredentialsModule } from '../credentials/credentials.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CredentialsModule, AuthModule],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentsModule {}
