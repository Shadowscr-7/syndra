import { Module } from '@nestjs/common';
import { BrandMemoryController } from './brand-memory.controller';
import { BrandMemoryService } from './brand-memory.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BrandMemoryController],
  providers: [BrandMemoryService],
  exports: [BrandMemoryService],
})
export class BrandMemoryModule {}
