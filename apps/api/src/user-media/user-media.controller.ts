// ============================================================
// UserMedia Controller — CRUD de archivos multimedia + file upload
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Body,
  Param,
  Query,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { UserMediaService } from './user-media.service';
import { FileUploadService, getUploadDir } from './file-upload.service';

// Multer storage configuration
const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `tmp_${Date.now()}_${base}${ext}`);
  },
});

@Controller('user-media')
export class UserMediaController {
  constructor(
    private readonly userMediaService: UserMediaService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /** GET /user-media — Listar archivos multimedia (paginado) */
  @Get()
  async list(
    @Req() req: any,
    @Query('folderId') folderId?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.sub;
    const result = await this.userMediaService.listForUser(userId, {
      folderId,
      category,
      tag,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result.items, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } };
  }

  /** GET /user-media/storage — Uso de almacenamiento */
  @Get('storage')
  async storageUsage(@Req() req: any) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;
    const usage = await this.userMediaService.getStorageUsage(userId, workspaceId);
    return { data: usage };
  }

  /** GET /user-media/:id — Obtener archivo por ID */
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const media = await this.userMediaService.getById(userId, id);
    return { data: media };
  }

  /** POST /user-media — Registrar un archivo subido */
  @Post()
  async upload(
    @Req() req: any,
    @Body()
    body: {
      filename: string;
      url: string;
      thumbnailUrl?: string;
      mimeType: string;
      sizeBytes: number;
      folderId?: string;
      tags?: string[];
      category?: string;
    },
  ) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;
    const media = await this.userMediaService.upload(userId, body, workspaceId);
    return { data: media };
  }

  /** POST /user-media/file — Upload a real file via multipart/form-data */
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async uploadFile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folderId?: string; tags?: string; category?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;

    const tags = body.tags ? body.tags.split(',').map((t: string) => t.trim()) : [];

    const media = await this.fileUploadService.processUpload(file, userId, workspaceId, {
      folderId: body.folderId,
      tags,
      category: body.category,
    });

    return { data: media };
  }

  /** PUT /user-media/:id — Actualizar metadatos */
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      filename?: string;
      tags?: string[];
      category?: string;
      folderId?: string;
      productName?: string;
      productSku?: string;
      productPrice?: string;
      productUrl?: string;
      productDescription?: string;
      useInPipeline?: boolean;
      isLogo?: boolean;
    },
  ) {
    const userId = req.user?.sub;
    const updated = await this.userMediaService.update(userId, id, body);
    return { data: updated };
  }

  /** DELETE /user-media/:id — Eliminar archivo */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const result = await this.userMediaService.delete(userId, id);
    return { data: result };
  }
}
