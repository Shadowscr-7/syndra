import { Module } from '@nestjs/common';
import { UserMediaController } from './user-media.controller';
import { UserMediaService } from './user-media.service';
import { FileUploadService } from './file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserMediaController],
  providers: [UserMediaService, FileUploadService],
  exports: [UserMediaService, FileUploadService],
})
export class UserMediaModule {}
