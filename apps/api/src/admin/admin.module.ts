import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from './admin.service';
import { LicenseService } from './license.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, LicenseService],
  exports: [AdminService, LicenseService],
})
export class AdminModule {}
