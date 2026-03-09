// ============================================================
// Schedules Controller — Horarios y slots de publicación
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
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';

@Controller('schedules')
@UseGuards(PlanLimitsGuard)
@PlanCheck('SCHEDULE_SLOTS')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /** GET /schedules — Listar horarios del usuario */
  @Get()
  async list(@Req() req: any) {
    const userId = req.user?.sub;
    const schedules = await this.schedulesService.listForUser(userId);
    return { data: schedules };
  }

  /** GET /schedules/:id — Obtener horario por ID */
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const schedule = await this.schedulesService.getById(userId, id);
    return { data: schedule };
  }

  /** POST /schedules — Crear horario (con slots opcionales) */
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      timezone?: string;
      contentProfileId?: string;
      isActive?: boolean;
      slots?: Array<{
        dayOfWeek: string;
        time: string;
        socialAccountIds?: string[];
        priority?: number;
      }>;
    },
  ) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;
    const schedule = await this.schedulesService.create(userId, body, workspaceId);
    return { data: schedule };
  }

  /** PUT /schedules/:id — Actualizar metadatos del horario */
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      timezone?: string;
      contentProfileId?: string;
      isActive?: boolean;
    },
  ) {
    const userId = req.user?.sub;
    const updated = await this.schedulesService.update(userId, id, body);
    return { data: updated };
  }

  /** DELETE /schedules/:id — Eliminar horario */
  @Delete(':id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const result = await this.schedulesService.delete(userId, id);
    return { data: result };
  }

  /** POST /schedules/:id/slots — Agregar slot al horario */
  @Post(':id/slots')
  async addSlot(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      dayOfWeek: string;
      time: string;
      socialAccountIds?: string[];
      priority?: number;
    },
  ) {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;
    const slot = await this.schedulesService.addSlot(userId, id, body, workspaceId);
    return { data: slot };
  }

  /** PUT /schedules/slots/:slotId — Actualizar slot */
  @Put('slots/:slotId')
  async updateSlot(
    @Req() req: any,
    @Param('slotId') slotId: string,
    @Body()
    body: {
      dayOfWeek?: string;
      time?: string;
      socialAccountIds?: string[];
      priority?: number;
    },
  ) {
    const userId = req.user?.sub;
    const updated = await this.schedulesService.updateSlot(
      userId,
      slotId,
      body,
    );
    return { data: updated };
  }

  /** DELETE /schedules/slots/:slotId — Eliminar slot */
  @Delete('slots/:slotId')
  @HttpCode(200)
  async removeSlot(@Req() req: any, @Param('slotId') slotId: string) {
    const userId = req.user?.sub;
    const result = await this.schedulesService.removeSlot(userId, slotId);
    return { data: result };
  }

  /** PUT /schedules/:id/toggle — Activar/desactivar horario */
  @Put(':id/toggle')
  async toggleActive(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    const schedule = await this.schedulesService.toggleActive(userId, id);
    return { data: schedule };
  }
}
