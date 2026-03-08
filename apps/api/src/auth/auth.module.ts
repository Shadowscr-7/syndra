import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { PlanThrottleGuard } from './plan-throttle.guard';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 5,
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 60,
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TenantMiddleware,
    PlanThrottleGuard,
    // Global guards — order matters: Auth → Throttle → Roles
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PlanThrottleGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, TenantMiddleware],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Wire PrismaService to PlanThrottleGuard static ref
    PlanThrottleGuard.prismaRef = this.prisma;
  }
}
