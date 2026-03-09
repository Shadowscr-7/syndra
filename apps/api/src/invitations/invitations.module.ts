import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
