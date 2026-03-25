// ============================================================
// Schedules Service — Horarios de publicación del usuario
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerService } from '../editorial/scheduler.service';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerService: SchedulerService,
  ) {}

  // ── Listar horarios del usuario ────────────────────────

  async listForUser(userId: string) {
    const schedules = await this.prisma.publishSchedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] },
        contentProfile: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, targetChannels: true } },
      },
    });

    return schedules;
  }

  // ── Obtener horario por ID ─────────────────────────────

  async getById(userId: string, id: string) {
    const schedule = await this.prisma.publishSchedule.findUnique({
      where: { id },
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] },
        contentProfile: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, targetChannels: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }
    if (schedule.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este horario');
    }

    return schedule;
  }

  // ── Crear horario (con slots opcionales) ───────────────

  async create(
    userId: string,
    data: {
      name?: string;
      timezone?: string;
      contentProfileId?: string;
      campaignId?: string;
      isActive?: boolean;
      slots?: Array<{
        dayOfWeek: string;
        time: string;
        socialAccountIds?: string[];
        priority?: number;
      }>;
    },
    workspaceId?: string,
  ) {
    const slotsToCreate = data.slots ?? [];

    // Verificar límite de slots del plan
    await this.checkSlotLimit(userId, slotsToCreate.length, workspaceId);

    const schedule = await this.prisma.publishSchedule.create({
      data: {
        userId,
        name: data.name ?? 'Mi horario',
        timezone: data.timezone ?? 'America/Mexico_City',
        contentProfileId: data.contentProfileId,
        campaignId: data.campaignId || null,
        isActive: data.isActive ?? true,
        slots: {
          create: slotsToCreate.map((s) => ({
            dayOfWeek: s.dayOfWeek as any,
            time: s.time,
            socialAccountIds: s.socialAccountIds ?? [],
            priority: s.priority ?? 0,
          })),
        },
      },
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] },
        contentProfile: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, targetChannels: true } },
      },
    });

    this.logger.log(
      `Horario creado: ${schedule.id} ("${schedule.name}") con ${slotsToCreate.length} slots para usuario ${userId}`,
    );

    // Re-sync dynamic cron jobs
    await this.schedulerService.syncAllSlotJobs();

    return schedule;
  }

  // ── Actualizar metadatos del horario ───────────────────

  async update(
    userId: string,
    id: string,
    data: {
      name?: string;
      timezone?: string;
      contentProfileId?: string;
      campaignId?: string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.publishSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Horario no encontrado');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este horario');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.contentProfileId !== undefined)
      updateData.contentProfileId = data.contentProfileId;
    if (data.campaignId !== undefined)
      updateData.campaignId = data.campaignId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.publishSchedule.update({
      where: { id },
      data: updateData,
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] },
        contentProfile: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, targetChannels: true } },
      },
    });

    this.logger.log(`Horario actualizado: ${id}`);

    // Re-sync dynamic cron jobs (timezone, campaign, profile may have changed)
    await this.schedulerService.syncAllSlotJobs();

    return updated;
  }

  // ── Eliminar horario ───────────────────────────────────

  async delete(userId: string, id: string) {
    const existing = await this.prisma.publishSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Horario no encontrado');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este horario');
    }

    await this.prisma.publishSchedule.delete({ where: { id } });

    this.logger.log(`Horario eliminado: ${id} ("${existing.name}")`);

    // Re-sync dynamic cron jobs (removed slots)
    await this.schedulerService.syncAllSlotJobs();

    return { deleted: true };
  }

  // ── Agregar slot a un horario ──────────────────────────

  async addSlot(
    userId: string,
    scheduleId: string,
    data: {
      dayOfWeek: string;
      time: string;
      socialAccountIds?: string[];
      priority?: number;
    },
    workspaceId?: string,
  ) {
    // Verificar propiedad del horario
    const schedule = await this.prisma.publishSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }
    if (schedule.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este horario');
    }

    // Verificar límite de slots
    await this.checkSlotLimit(userId, 1, workspaceId);

    const slot = await this.prisma.scheduleSlot.create({
      data: {
        scheduleId,
        dayOfWeek: data.dayOfWeek as any,
        time: data.time,
        socialAccountIds: data.socialAccountIds ?? [],
        priority: data.priority ?? 0,
      },
    });

    this.logger.log(
      `Slot creado: ${slot.id} (${data.dayOfWeek} ${data.time}) en horario ${scheduleId}`,
    );

    // Re-sync dynamic cron jobs
    await this.schedulerService.syncAllSlotJobs();

    return slot;
  }

  // ── Actualizar slot ────────────────────────────────────

  async updateSlot(
    userId: string,
    slotId: string,
    data: {
      dayOfWeek?: string;
      time?: string;
      socialAccountIds?: string[];
      priority?: number;
    },
  ) {
    // Verificar propiedad a través del horario
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { schedule: { select: { userId: true } } },
    });

    if (!slot) {
      throw new NotFoundException('Slot no encontrado');
    }
    if (slot.schedule.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este slot');
    }

    const updateData: any = {};
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.socialAccountIds !== undefined)
      updateData.socialAccountIds = data.socialAccountIds;
    if (data.priority !== undefined) updateData.priority = data.priority;

    const updated = await this.prisma.scheduleSlot.update({
      where: { id: slotId },
      data: updateData,
    });

    this.logger.log(`Slot actualizado: ${slotId}`);

    // Re-sync dynamic cron jobs (day/time may have changed)
    await this.schedulerService.syncAllSlotJobs();

    return updated;
  }

  // ── Eliminar slot ──────────────────────────────────────

  async removeSlot(userId: string, slotId: string) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { schedule: { select: { userId: true } } },
    });

    if (!slot) {
      throw new NotFoundException('Slot no encontrado');
    }
    if (slot.schedule.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este slot');
    }

    await this.prisma.scheduleSlot.delete({ where: { id: slotId } });

    this.logger.log(`Slot eliminado: ${slotId}`);

    // Remove the cron job for this slot
    this.schedulerService.removeSlotJob(slotId);

    return { deleted: true };
  }

  // ── Toggle activo/inactivo ─────────────────────────────

  async toggleActive(userId: string, id: string) {
    const existing = await this.prisma.publishSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Horario no encontrado');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este horario');
    }

    const updated = await this.prisma.publishSchedule.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] },
        contentProfile: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, targetChannels: true } },
      },
    });

    this.logger.log(
      `Horario ${id} ${updated.isActive ? 'activado' : 'desactivado'}`,
    );

    // Re-sync dynamic cron jobs (activation state changed)
    await this.schedulerService.syncAllSlotJobs();

    return updated;
  }

  // ── Helper: verificar límite de slots del plan ─────────

  private async checkSlotLimit(
    userId: string,
    additionalSlots: number,
    workspaceId?: string,
  ): Promise<void> {
    const maxSlots = await this.getUserPlanMaxSlots(userId, workspaceId);

    // 0 = funcionalidad deshabilitada
    if (maxSlots === 0) {
      throw new BadRequestException(
        'Los horarios de publicación no están disponibles en tu plan actual. Actualiza a PRO para habilitarlos.',
      );
    }

    // -1 = ilimitado
    if (maxSlots === -1) {
      return;
    }

    // Contar slots existentes del usuario
    const currentCount = await this.prisma.scheduleSlot.count({
      where: {
        schedule: { userId },
      },
    });

    if (currentCount + additionalSlots > maxSlots) {
      throw new BadRequestException(
        `Límite de slots alcanzado (${currentCount}/${maxSlots}). Actualiza tu plan para más slots de publicación.`,
      );
    }
  }

  // ── Helper: obtener límite de slots del plan ───────────

  private async getUserPlanMaxSlots(userId: string, workspaceId?: string): Promise<number> {
    // Try direct workspace lookup first (works even in dev-user mode)
    if (workspaceId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      });
      if (subscription?.plan) {
        return subscription.plan.maxScheduleSlots;
      }
    }

    // Fallback: lookup via WorkspaceUser
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { userId },
      include: {
        workspace: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!wsUser?.workspace?.subscription?.plan) {
      this.logger.warn(
        `No se encontró plan para usuario ${userId}, usando límite por defecto (0 = deshabilitado)`,
      );
      return 0; // FREE por defecto
    }

    return wsUser.workspace.subscription.plan.maxScheduleSlots;
  }
}
