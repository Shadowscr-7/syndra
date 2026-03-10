import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessProfileController } from './business-profile.controller';
import { BusinessProfileService } from './business-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessProfileController],
  providers: [BusinessProfileService],
  exports: [BusinessProfileService],
})
export class BusinessProfileModule {}
