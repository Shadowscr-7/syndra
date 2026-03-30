import { Module } from '@nestjs/common';
import { ReferenceCopyController } from './reference-copy.controller';
import { ReferenceCopyService } from './reference-copy.service';
import { AuthModule } from '../auth/auth.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [AuthModule, CredentialsModule],
  controllers: [ReferenceCopyController],
  providers: [ReferenceCopyService],
  exports: [ReferenceCopyService],
})
export class ReferenceCopyModule {}
