// ============================================================
// MediaFolders Controller — CRUD de carpetas multimedia
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
} from '@nestjs/common';
import { MediaFoldersService } from './media-folders.service';

@Controller('media-folders')
export class MediaFoldersController {
  constructor(private readonly mediaFoldersService: MediaFoldersService) {}

  /** GET /media-folders — Listar carpetas */
  @Get()
  async list(@Req() req: any, @Query('parentId') parentId?: string) {
    const userId = req.user?.sub;
    const folders = await this.mediaFoldersService.listForUser(userId, parentId);
    return { data: folders };
  }

  /** GET /media-folders/:id — Obtener carpeta por ID */
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const folder = await this.mediaFoldersService.getById(userId, id);
    return { data: folder };
  }

  /** POST /media-folders — Crear carpeta */
  @Post()
  async create(
    @Req() req: any,
    @Body() body: { name: string; parentId?: string },
  ) {
    const userId = req.user?.sub;
    const folder = await this.mediaFoldersService.create(userId, body);
    return { data: folder };
  }

  /** PUT /media-folders/:id — Actualizar carpeta */
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; parentId?: string },
  ) {
    const userId = req.user?.sub;
    const updated = await this.mediaFoldersService.update(userId, id, body);
    return { data: updated };
  }

  /** DELETE /media-folders/:id — Eliminar carpeta */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const result = await this.mediaFoldersService.delete(userId, id);
    return { data: result };
  }
}
