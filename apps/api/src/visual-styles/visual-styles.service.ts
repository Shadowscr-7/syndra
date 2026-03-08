// ============================================================
// Visual Styles Service — Visual Style Profile CRUD per user
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisualStylesService {
  private readonly logger = new Logger(VisualStylesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── List all visual style profiles for a user ─────────
  async listForUser(userId: string) {
    return this.prisma.visualStyleProfile.findMany({
      where: { userId },
      include: { contentProfile: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Get single visual style ──────────────────────────
  async getById(userId: string, styleId: string) {
    const style = await this.prisma.visualStyleProfile.findUnique({
      where: { id: styleId },
      include: { contentProfile: { select: { id: true, name: true } } },
    });
    if (!style || style.userId !== userId) {
      throw new NotFoundException('Estilo visual no encontrado');
    }
    return style;
  }

  // ── Create visual style ──────────────────────────────
  async create(
    userId: string,
    data: {
      name: string;
      contentProfileId?: string;
      style?: string;
      colorPalette?: string[];
      primaryFont?: string;
      secondaryFont?: string;
      logoUrl?: string;
      preferredImageProvider?: string;
      customPromptPrefix?: string;
    },
  ) {
    // Validate contentProfileId belongs to user if provided
    if (data.contentProfileId) {
      const profile = await this.prisma.contentProfile.findUnique({
        where: { id: data.contentProfileId },
      });
      if (!profile || profile.userId !== userId) {
        throw new NotFoundException('Perfil de contenido no encontrado');
      }
    }

    const style = await this.prisma.visualStyleProfile.create({
      data: {
        userId,
        name: data.name,
        contentProfileId: data.contentProfileId ?? null,
        style: data.style ?? 'MINIMALIST',
        colorPalette: data.colorPalette ?? [],
        primaryFont: data.primaryFont ?? null,
        secondaryFont: data.secondaryFont ?? null,
        logoUrl: data.logoUrl ?? null,
        preferredImageProvider: data.preferredImageProvider ?? 'huggingface',
        customPromptPrefix: data.customPromptPrefix ?? null,
      },
      include: { contentProfile: { select: { id: true, name: true } } },
    });

    this.logger.log(`VisualStyleProfile created: ${style.id} for user ${userId}`);
    return style;
  }

  // ── Update visual style ──────────────────────────────
  async update(
    userId: string,
    styleId: string,
    data: {
      name?: string;
      contentProfileId?: string | null;
      style?: string;
      colorPalette?: string[];
      primaryFont?: string | null;
      secondaryFont?: string | null;
      logoUrl?: string | null;
      preferredImageProvider?: string;
      customPromptPrefix?: string | null;
    },
  ) {
    const existing = await this.getById(userId, styleId);

    if (data.contentProfileId) {
      const profile = await this.prisma.contentProfile.findUnique({
        where: { id: data.contentProfileId },
      });
      if (!profile || profile.userId !== userId) {
        throw new NotFoundException('Perfil de contenido no encontrado');
      }
    }

    return this.prisma.visualStyleProfile.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        contentProfileId: data.contentProfileId !== undefined ? data.contentProfileId : existing.contentProfileId,
        style: data.style ?? existing.style,
        colorPalette: data.colorPalette ?? existing.colorPalette,
        primaryFont: data.primaryFont !== undefined ? data.primaryFont : existing.primaryFont,
        secondaryFont: data.secondaryFont !== undefined ? data.secondaryFont : existing.secondaryFont,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : existing.logoUrl,
        preferredImageProvider: data.preferredImageProvider ?? existing.preferredImageProvider,
        customPromptPrefix: data.customPromptPrefix !== undefined ? data.customPromptPrefix : existing.customPromptPrefix,
      },
      include: { contentProfile: { select: { id: true, name: true } } },
    });
  }

  // ── Delete visual style ──────────────────────────────
  async delete(userId: string, styleId: string) {
    await this.getById(userId, styleId);
    await this.prisma.visualStyleProfile.delete({ where: { id: styleId } });
    return { deleted: true };
  }

  // ── Get visual styles for a content profile ──────────
  async getForProfile(userId: string, contentProfileId: string) {
    return this.prisma.visualStyleProfile.findMany({
      where: { userId, contentProfileId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
