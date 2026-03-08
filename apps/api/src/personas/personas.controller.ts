// ============================================================
// Personas Controller — AI Persona CRUD endpoints
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
import { PersonasService } from './personas.service';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  /** GET /personas — List all user personas */
  @Get()
  async list(@Req() req: any) {
    const userId = req.user?.sub;
    const items = await this.personasService.listForUser(userId);
    return { data: items };
  }

  /** GET /personas/active — Get active persona */
  @Get('active')
  async getActive(@Req() req: any) {
    const userId = req.user?.sub;
    const persona = await this.personasService.getActiveForUser(userId);
    return persona ?? { data: null };
  }

  /** GET /personas/:id — Get single persona */
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.personasService.getById(userId, id);
  }

  /** POST /personas — Create persona */
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId ?? 'ws_default';
    return this.personasService.create(userId, workspaceId, body);
  }

  /** PUT /personas/:id — Update persona */
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.sub;
    return this.personasService.update(userId, id, body);
  }

  /** PUT /personas/:id/activate — Set as active persona */
  @Put(':id/activate')
  async activate(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.personasService.activate(userId, id);
  }

  /** PUT /personas/:id/deactivate — Deactivate persona */
  @Put(':id/deactivate')
  async deactivate(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.personasService.deactivate(userId, id);
  }

  /** DELETE /personas/:id — Delete persona */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.personasService.delete(userId, id);
  }
}
