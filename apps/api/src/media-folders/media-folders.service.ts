// ============================================================
// MediaFolders Service — Carpetas para organizar medios
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaFoldersService {
  private readonly logger = new Logger(MediaFoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Listar carpetas del usuario ────────────────────────

  async listForUser(userId: string, parentId?: string) {
    const where: any = { userId };

    if (parentId) {
      where.parentId = parentId;
    } else if (parentId === undefined) {
      // Sin filtro — devolver todas
    }

    const folders = await this.prisma.mediaFolder.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            children: true,
            files: true,
          },
        },
      },
    });

    return folders;
  }

  // ── Obtener carpeta por ID ─────────────────────────────

  async getById(userId: string, id: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            files: true,
          },
        },
        parent: { select: { id: true, name: true } },
      },
    });

    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta carpeta');
    }

    return folder;
  }

  // ── Crear carpeta ──────────────────────────────────────

  async create(userId: string, data: { name: string; parentId?: string }) {
    if (!data.name?.trim()) {
      throw new BadRequestException('El nombre de la carpeta es obligatorio');
    }

    // Validar carpeta madre si se especifica
    if (data.parentId) {
      const parent = await this.prisma.mediaFolder.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.userId !== userId) {
        throw new BadRequestException('Carpeta madre no válida');
      }
    }

    const folder = await this.prisma.mediaFolder.create({
      data: {
        userId,
        name: data.name.trim(),
        parentId: data.parentId,
      },
    });

    this.logger.log(
      `Carpeta creada: ${folder.id} ("${folder.name}") para usuario ${userId}`,
    );

    return folder;
  }

  // ── Actualizar carpeta ─────────────────────────────────

  async update(
    userId: string,
    id: string,
    data: { name?: string; parentId?: string },
  ) {
    const existing = await this.prisma.mediaFolder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta carpeta');
    }

    // No permitir mover una carpeta dentro de sí misma
    if (data.parentId && data.parentId === id) {
      throw new BadRequestException(
        'No se puede mover una carpeta dentro de sí misma',
      );
    }

    if (data.parentId) {
      const parent = await this.prisma.mediaFolder.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.userId !== userId) {
        throw new BadRequestException('Carpeta madre no válida');
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    const updated = await this.prisma.mediaFolder.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Carpeta actualizada: ${id}`);

    return updated;
  }

  // ── Eliminar carpeta ───────────────────────────────────

  async delete(userId: string, id: string) {
    const existing = await this.prisma.mediaFolder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta carpeta');
    }

    await this.prisma.mediaFolder.delete({ where: { id } });

    this.logger.log(`Carpeta eliminada: ${id} ("${existing.name}")`);

    return { deleted: true };
  }
}
