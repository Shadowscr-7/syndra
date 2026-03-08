import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ContentPlaybookService } from './playbook.service';
import { PlaybookController } from './playbook.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PlaybookController],
  providers: [ContentPlaybookService],
  exports: [ContentPlaybookService],
})
export class PlaybookModule {}
