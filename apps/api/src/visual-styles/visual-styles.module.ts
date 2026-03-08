import { Module } from '@nestjs/common';
import { VisualStylesController } from './visual-styles.controller';
import { VisualStylesService } from './visual-styles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisualStylesController],
  providers: [VisualStylesService],
  exports: [VisualStylesService],
})
export class VisualStylesModule {}
