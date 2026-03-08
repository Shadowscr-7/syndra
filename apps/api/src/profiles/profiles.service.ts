// ============================================================
// Profiles Service — Content Profile CRUD per user
// ============================================================

import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── List all content profiles for a user ──────────────
  async listForUser(userId: string) {
    return this.prisma.contentProfile.findMany({
      where: { userId },
      include: { visualStyleProfiles: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  // ── Get single profile ────────────────────────────────
  async getById(userId: string, profileId: string) {
    const profile = await this.prisma.contentProfile.findUnique({
      where: { id: profileId },
      include: { visualStyleProfiles: true },
    });
    if (!profile || profile.userId !== userId) {
      throw new NotFoundException('Perfil de contenido no encontrado');
    }
    return profile;
  }

  // ── Create profile (with plan check) ─────────────────
  async create(
    userId: string,
    workspaceId: string,
    data: {
      name: string;
      tone?: string;
      contentLength?: string;
      audience?: string;
      language?: string;
      hashtags?: string[];
      postingGoal?: string;
      linkedSocialAccounts?: string[];
      isDefault?: boolean;
    },
  ) {
    await this.checkPlanLimit(userId, workspaceId);

    // If this is the first or marked as default, unset others
    if (data.isDefault) {
      await this.prisma.contentProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const profile = await this.prisma.contentProfile.create({
      data: {
        userId,
        name: data.name,
        tone: data.tone ?? 'didáctico',
        contentLength: data.contentLength ?? 'MEDIUM',
        audience: data.audience ?? '',
        language: data.language ?? 'es',
        hashtags: data.hashtags ?? [],
        postingGoal: data.postingGoal ?? '',
        linkedSocialAccounts: data.linkedSocialAccounts ?? [],
        isDefault: data.isDefault ?? false,
      },
      include: { visualStyleProfiles: true },
    });

    // Auto-set as default if it's the only one
    const count = await this.prisma.contentProfile.count({ where: { userId } });
    if (count === 1) {
      await this.prisma.contentProfile.update({
        where: { id: profile.id },
        data: { isDefault: true },
      });
      profile.isDefault = true;
    }

    this.logger.log(`ContentProfile created: ${profile.id} for user ${userId}`);
    return profile;
  }

  // ── Update profile ────────────────────────────────────
  async update(
    userId: string,
    profileId: string,
    data: {
      name?: string;
      tone?: string;
      contentLength?: string;
      audience?: string;
      language?: string;
      hashtags?: string[];
      postingGoal?: string;
      linkedSocialAccounts?: string[];
      isDefault?: boolean;
    },
  ) {
    const existing = await this.getById(userId, profileId);

    if (data.isDefault) {
      await this.prisma.contentProfile.updateMany({
        where: { userId, isDefault: true, id: { not: profileId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.contentProfile.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        tone: data.tone ?? existing.tone,
        contentLength: data.contentLength ?? existing.contentLength,
        audience: data.audience ?? existing.audience,
        language: data.language ?? existing.language,
        hashtags: data.hashtags ?? existing.hashtags,
        postingGoal: data.postingGoal ?? existing.postingGoal,
        linkedSocialAccounts: data.linkedSocialAccounts ?? existing.linkedSocialAccounts,
        isDefault: data.isDefault ?? existing.isDefault,
      },
      include: { visualStyleProfiles: true },
    });
  }

  // ── Delete profile ────────────────────────────────────
  async delete(userId: string, profileId: string) {
    await this.getById(userId, profileId);
    await this.prisma.contentProfile.delete({ where: { id: profileId } });
    return { deleted: true };
  }

  // ── Get default profile for a user ────────────────────
  async getDefaultForUser(userId: string) {
    return this.prisma.contentProfile.findFirst({
      where: { userId, isDefault: true },
      include: { visualStyleProfiles: true },
    });
  }

  // ── Plan limit check ──────────────────────────────────
  private async checkPlanLimit(userId: string, workspaceId: string) {
    // Admin users bypass all plan limits
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN') return;

    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    const maxProfiles = (sub?.plan as any)?.maxContentProfiles ?? 1;

    // -1 = unlimited
    if (maxProfiles === -1) return;

    const count = await this.prisma.contentProfile.count({ where: { userId } });
    if (count >= maxProfiles) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${maxProfiles} perfil(es) de contenido de tu plan. Actualiza para crear más.`,
      );
    }
  }
}
