import { Module } from '@nestjs/common';
import { SourceTrustService } from './source-trust.service';
import { SourceTrustController } from './source-trust.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SourceTrustController],
  providers: [SourceTrustService],
  exports: [SourceTrustService],
})
export class SourceTrustModule {}
