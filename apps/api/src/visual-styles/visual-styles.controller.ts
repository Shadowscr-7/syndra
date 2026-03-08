// ============================================================
// Visual Styles Controller — Visual Style Profile CRUD
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  Query,
} from '@nestjs/common';
import { VisualStylesService } from './visual-styles.service';

@Controller('visual-styles')
export class VisualStylesController {
  constructor(private readonly visualStylesService: VisualStylesService) {}

  /** GET /visual-styles — List all visual styles (optionally filter by profileId) */
  @Get()
  async list(@Req() req: any, @Query('profileId') profileId?: string) {
    const userId = req.user?.sub;
    if (profileId) {
      const items = await this.visualStylesService.getForProfile(userId, profileId);
      return { data: items };
    }
    const items = await this.visualStylesService.listForUser(userId);
    return { data: items };
  }

  /** GET /visual-styles/:id — Get single visual style */
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.visualStylesService.getById(userId, id);
  }

  /** POST /visual-styles — Create visual style */
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub;
    return this.visualStylesService.create(userId, body);
  }

  /** PUT /visual-styles/:id — Update visual style */
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.sub;
    return this.visualStylesService.update(userId, id, body);
  }

  /** DELETE /visual-styles/:id — Delete visual style */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.visualStylesService.delete(userId, id);
  }
}
