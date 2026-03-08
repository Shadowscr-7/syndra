import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { AdminService } from './admin.service';
import { LicenseService } from './license.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [PrismaModule, AuthModule, PlansModule],
  controllers: [AdminController],
  providers: [AdminService, LicenseService],
  exports: [AdminService, LicenseService],
})
export class AdminModule {}
