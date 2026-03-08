import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { OnboardingService } from './onboarding.service';
import { OnboardingTrackingService } from './onboarding-tracking.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingTrackingService],
  exports: [OnboardingService, OnboardingTrackingService],
})
export class OnboardingModule {}
