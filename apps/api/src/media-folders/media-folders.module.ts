import { Module } from '@nestjs/common';
import { MediaFoldersController } from './media-folders.controller';
import { MediaFoldersService } from './media-folders.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MediaFoldersController],
  providers: [MediaFoldersService],
  exports: [MediaFoldersService],
})
export class MediaFoldersModule {}
