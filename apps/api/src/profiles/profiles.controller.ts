// ============================================================
// Profiles Controller — Content Profile CRUD endpoints
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
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /** GET /profiles — List all user content profiles */
  @Get()
  async list(@Req() req: any) {
    const userId = req.user?.sub;
    const items = await this.profilesService.listForUser(userId);
    return { data: items };
  }

  /** GET /profiles/default — Get default profile */
  @Get('default')
  async getDefault(@Req() req: any) {
    const userId = req.user?.sub;
    const profile = await this.profilesService.getDefaultForUser(userId);
    return profile ?? { data: null };
  }

  /** GET /profiles/:id — Get single profile */
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.profilesService.getById(userId, id);
  }

  /** POST /profiles — Create profile */
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId ?? 'ws_default';
    return this.profilesService.create(userId, workspaceId, body);
  }

  /** PUT /profiles/:id — Update profile */
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.sub;
    return this.profilesService.update(userId, id, body);
  }

  /** DELETE /profiles/:id — Delete profile */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.profilesService.delete(userId, id);
  }
}
