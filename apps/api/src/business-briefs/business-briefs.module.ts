import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessBriefsController } from './business-briefs.controller';
import { BusinessBriefsService } from './business-briefs.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessBriefsController],
  providers: [BusinessBriefsService],
  exports: [BusinessBriefsService],
})
export class BusinessBriefsModule {}
