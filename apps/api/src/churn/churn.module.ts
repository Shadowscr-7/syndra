import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChurnDetectionService } from './churn-detection.service';
import { ChurnController } from './churn.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChurnController],
  providers: [ChurnDetectionService],
  exports: [ChurnDetectionService],
})
export class ChurnModule {}
