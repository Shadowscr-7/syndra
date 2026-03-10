// ============================================================
// UserMedia Service — Repositorio de medios del usuario
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
export class UserMediaService {
  private readonly logger = new Logger(UserMediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Listar medios del usuario (paginado + filtros) ─────

  async listForUser(
    userId: string,
    opts?: {
      folderId?: string;
      category?: string;
      tag?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (opts?.folderId) {
      where.folderId = opts.folderId;
    }
    if (opts?.category) {
      where.category = opts.category;
    }
    if (opts?.tag) {
      where.tags = { has: opts.tag };
    }

    const [items, total] = await Promise.all([
      this.prisma.userMedia.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { folder: { select: { id: true, name: true } } },
      }),
      this.prisma.userMedia.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Obtener un medio por ID ────────────────────────────

  async getById(userId: string, id: string) {
    const media = await this.prisma.userMedia.findUnique({
      where: { id },
      include: { folder: { select: { id: true, name: true } } },
    });

    if (!media) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (media.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }

    return media;
  }

  // ── Subir (crear registro) ─────────────────────────────

  async upload(
    userId: string,
    data: {
      filename: string;
      url: string;
      thumbnailUrl?: string;
      mimeType: string;
      sizeBytes: number;
      folderId?: string;
      tags?: string[];
      category?: string;
    },
    workspaceId?: string,
  ) {
    // Verificar límite de almacenamiento
    const { usedBytes, maxBytes } = await this.getStorageUsage(userId, workspaceId);

    if (maxBytes > 0 && usedBytes + data.sizeBytes > maxBytes) {
      const usedMb = Math.round(usedBytes / 1024 / 1024);
      const maxMb = Math.round(maxBytes / 1024 / 1024);
      throw new BadRequestException(
        `Límite de almacenamiento alcanzado (${usedMb}MB / ${maxMb}MB). Actualiza tu plan para más espacio.`,
      );
    }

    // Validar carpeta si se especifica
    if (data.folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: data.folderId },
      });
      if (!folder || folder.userId !== userId) {
        throw new BadRequestException('Carpeta no válida');
      }
    }

    const media = await this.prisma.userMedia.create({
      data: {
        userId,
        filename: data.filename,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        folderId: data.folderId,
        tags: data.tags ?? [],
        category: (data.category as any) ?? 'OTHER',
        metadata: {},
      },
      include: { folder: { select: { id: true, name: true } } },
    });

    this.logger.log(
      `Archivo creado: ${media.id} (${data.filename}) para usuario ${userId}`,
    );

    return media;
  }

  // ── Actualizar metadatos ───────────────────────────────

  async update(
    userId: string,
    id: string,
    data: {
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
    const existing = await this.prisma.userMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }

    if (data.folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: data.folderId },
      });
      if (!folder || folder.userId !== userId) {
        throw new BadRequestException('Carpeta no válida');
      }
    }

    const updateData: any = {};
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.folderId !== undefined) updateData.folderId = data.folderId;
    if (data.productName !== undefined) updateData.productName = data.productName;
    if (data.productSku !== undefined) updateData.productSku = data.productSku;
    if (data.productPrice !== undefined) updateData.productPrice = data.productPrice;
    if (data.productUrl !== undefined) updateData.productUrl = data.productUrl;
    if (data.productDescription !== undefined) updateData.productDescription = data.productDescription;
    if (data.useInPipeline !== undefined) updateData.useInPipeline = data.useInPipeline;
    if (data.isLogo !== undefined) updateData.isLogo = data.isLogo;

    const updated = await this.prisma.userMedia.update({
      where: { id },
      data: updateData,
      include: { folder: { select: { id: true, name: true } } },
    });

    this.logger.log(`Archivo actualizado: ${id}`);

    return updated;
  }

  // ── Eliminar ───────────────────────────────────────────

  async delete(userId: string, id: string) {
    const existing = await this.prisma.userMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }

    await this.prisma.userMedia.delete({ where: { id } });

    this.logger.log(`Archivo eliminado: ${id} (${existing.filename})`);

    return { deleted: true };
  }

  // ── Uso de almacenamiento ──────────────────────────────

  async getStorageUsage(userId: string, workspaceId?: string) {
    // Obtener el plan del usuario
    const maxStorageMb = await this.getUserPlanStorageMb(userId, workspaceId);
    const maxBytes = maxStorageMb * 1024 * 1024;

    const agg = await this.prisma.userMedia.aggregate({
      where: { userId },
      _sum: { sizeBytes: true },
    });

    const usedBytes = agg._sum.sizeBytes ?? 0;

    return {
      usedBytes,
      maxBytes,
      usedMb: Math.round((usedBytes / 1024 / 1024) * 100) / 100,
      maxMb: maxStorageMb,
    };
  }

  // ── Helper: obtener límite de almacenamiento del plan ──

  private async getUserPlanStorageMb(userId: string, workspaceId?: string): Promise<number> {
    // Try direct workspace lookup first (works even in dev-user mode)
    if (workspaceId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      });
      if (subscription?.plan) {
        return subscription.plan.maxStorageMb;
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
        `No se encontró plan para usuario ${userId}, usando límite por defecto (100MB)`,
      );
      return 100; // FREE por defecto
    }

    return wsUser.workspace.subscription.plan.maxStorageMb;
  }
}
