import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaypalService } from './paypal.service';
import { PaypalController } from './paypal.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaypalController],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
