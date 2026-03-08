// ============================================================
// Personas Service — AI Persona CRUD per user
// ============================================================

import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonasService {
  private readonly logger = new Logger(PersonasService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── List all personas for a user ──────────────────────
  async listForUser(userId: string) {
    return this.prisma.userPersona.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  // ── Get single persona ────────────────────────────────
  async getById(userId: string, personaId: string) {
    const persona = await this.prisma.userPersona.findUnique({
      where: { id: personaId },
    });
    if (!persona || persona.userId !== userId) {
      throw new NotFoundException('Persona no encontrada');
    }
    return persona;
  }

  // ── Create persona (with plan check) ─────────────────
  async create(
    userId: string,
    workspaceId: string,
    data: {
      brandName: string;
      brandDescription?: string;
      tone?: string[];
      expertise?: string[];
      visualStyle?: string;
      targetAudience?: string;
      avoidTopics?: string[];
      languageStyle?: string;
      examplePhrases?: string[];
    },
  ) {
    // Check plan limit
    await this.checkPlanLimit(userId, workspaceId);

    const persona = await this.prisma.userPersona.create({
      data: {
        userId,
        brandName: data.brandName,
        brandDescription: data.brandDescription ?? '',
        tone: data.tone ?? [],
        expertise: data.expertise ?? [],
        visualStyle: data.visualStyle ?? '',
        targetAudience: data.targetAudience ?? '',
        avoidTopics: data.avoidTopics ?? [],
        languageStyle: data.languageStyle ?? '',
        examplePhrases: data.examplePhrases ?? [],
        isActive: false,
      },
    });

    // Auto-activate if it's the first persona
    const count = await this.prisma.userPersona.count({ where: { userId } });
    if (count === 1) {
      await this.prisma.userPersona.update({
        where: { id: persona.id },
        data: { isActive: true },
      });
      persona.isActive = true;
      await this.syncBrandProfileFromPersona(userId, persona);
    }

    this.logger.log(`Persona created: ${persona.id} for user ${userId}`);
    return persona;
  }

  // ── Update persona ────────────────────────────────────
  async update(
    userId: string,
    personaId: string,
    data: {
      brandName?: string;
      brandDescription?: string;
      tone?: string[];
      expertise?: string[];
      visualStyle?: string;
      targetAudience?: string;
      avoidTopics?: string[];
      languageStyle?: string;
      examplePhrases?: string[];
    },
  ) {
    const existing = await this.getById(userId, personaId);

    const updated = await this.prisma.userPersona.update({
      where: { id: existing.id },
      data: {
        brandName: data.brandName ?? existing.brandName,
        brandDescription: data.brandDescription ?? existing.brandDescription,
        tone: data.tone ?? existing.tone,
        expertise: data.expertise ?? existing.expertise,
        visualStyle: data.visualStyle ?? existing.visualStyle,
        targetAudience: data.targetAudience ?? existing.targetAudience,
        avoidTopics: data.avoidTopics ?? existing.avoidTopics,
        languageStyle: data.languageStyle ?? existing.languageStyle,
        examplePhrases: data.examplePhrases ?? existing.examplePhrases,
      },
    });

    // If this persona is active, auto-sync BrandProfile
    if (updated.isActive) {
      await this.syncBrandProfileFromPersona(userId, updated);
    }

    return updated;
  }

  // ── Activate a persona (deactivate others) ────────────
  async activate(userId: string, personaId: string) {
    const persona = await this.getById(userId, personaId);

    // Deactivate all others
    await this.prisma.userPersona.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Activate the selected one
    const activated = await this.prisma.userPersona.update({
      where: { id: personaId },
      data: { isActive: true },
    });

    // Auto-sync BrandProfile from active persona
    await this.syncBrandProfileFromPersona(userId, activated);

    return activated;
  }

  // ── Deactivate persona ────────────────────────────────
  async deactivate(userId: string, personaId: string) {
    await this.getById(userId, personaId);
    return this.prisma.userPersona.update({
      where: { id: personaId },
      data: { isActive: false },
    });
  }

  // ── Delete persona ────────────────────────────────────
  async delete(userId: string, personaId: string) {
    await this.getById(userId, personaId);
    await this.prisma.userPersona.delete({ where: { id: personaId } });
    return { deleted: true };
  }

  // ── Get active persona for a user ─────────────────────
  async getActiveForUser(userId: string) {
    return this.prisma.userPersona.findFirst({
      where: { userId, isActive: true },
    });
  }

  // ── Auto-sync BrandProfile from active persona ────────
  private async syncBrandProfileFromPersona(userId: string, persona: any) {
    try {
      const wu = await this.prisma.workspaceUser.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      if (!wu) return;

      await this.prisma.brandProfile.upsert({
        where: { workspaceId: wu.workspaceId },
        create: {
          workspaceId: wu.workspaceId,
          voice: persona.languageStyle || persona.brandDescription || '',
          tone: persona.tone?.[0] || 'informativo',
          prohibitedTopics: persona.avoidTopics || [],
          hashtags: [],
        },
        update: {
          voice: persona.languageStyle || persona.brandDescription || '',
          tone: persona.tone?.[0] || 'informativo',
          prohibitedTopics: persona.avoidTopics || [],
        },
      });
      this.logger.log(`BrandProfile auto-synced from persona ${persona.id}`);
    } catch (e) {
      this.logger.warn(`Failed to sync BrandProfile from persona: ${e}`);
    }
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

    const maxPersonas = (sub?.plan as any)?.maxPersonas ?? 0;

    // 0 = feature disabled for this plan
    if (maxPersonas === 0) {
      throw new ForbiddenException(
        'Tu plan actual no incluye AI Personas. Actualiza tu plan para usar esta función.',
      );
    }

    // -1 = unlimited
    if (maxPersonas === -1) return;

    const count = await this.prisma.userPersona.count({ where: { userId } });
    if (count >= maxPersonas) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${maxPersonas} persona(s) de tu plan. Actualiza para crear más.`,
      );
    }
  }
}
