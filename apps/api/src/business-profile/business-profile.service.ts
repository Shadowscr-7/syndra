// ============================================================
// Business Profile Service — Contexto del negocio por workspace
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertBusinessProfileDto {
  businessName?: string;
  businessType?: string;
  description?: string;
  slogan?: string;
  usp?: string;
  targetMarket?: string;
  products?: string[];
  priceRange?: string;
  websiteUrl?: string;
  physicalAddress?: string;
  phoneNumber?: string;
  socialLinks?: Record<string, string>;
  brandColors?: string[];
  logoMediaId?: string;
  promotionStyle?: string;
  contentGoals?: string[];
}

@Injectable()
export class BusinessProfileService {
  private readonly logger = new Logger(BusinessProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(workspaceId: string) {
    return this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
  }

  async upsert(workspaceId: string, data: UpsertBusinessProfileDto) {
    const profile = await this.prisma.businessProfile.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...data,
        socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined,
      },
      update: {
        ...data,
        socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined,
      },
    });

    this.logger.log(`Business profile upserted for workspace ${workspaceId}`);
    return profile;
  }

  async delete(workspaceId: string) {
    const existing = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
    if (!existing) throw new NotFoundException('Business profile not found');

    return this.prisma.businessProfile.delete({
      where: { workspaceId },
    });
  }

  /**
   * Build a context string suitable for injection into AI prompts.
   * Returns industry context + business description for dynamic prompt roles.
   */
  async buildPromptContext(workspaceId: string): Promise<{
    industryContext: string;
    businessContext: string;
    logoUrl?: string;
  }> {
    const [profile, workspace] = await Promise.all([
      this.prisma.businessProfile.findUnique({ where: { workspaceId } }),
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { industry: true, name: true },
      }),
    ]);

    const industry = profile?.businessType || workspace?.industry || 'contenido digital';
    const businessName = profile?.businessName || workspace?.name || '';

    let businessContext = '';
    if (profile) {
      const parts: string[] = [];
      if (profile.businessName) parts.push(`Negocio: ${profile.businessName}`);
      if (profile.description) parts.push(`Descripción: ${profile.description}`);
      if (profile.slogan) parts.push(`Slogan: ${profile.slogan}`);
      if (profile.usp) parts.push(`Propuesta de valor: ${profile.usp}`);
      if (profile.targetMarket) parts.push(`Mercado objetivo: ${profile.targetMarket}`);
      if (profile.products.length > 0) parts.push(`Productos/servicios: ${profile.products.join(', ')}`);
      if (profile.priceRange) parts.push(`Rango de precios: ${profile.priceRange}`);
      businessContext = parts.join('\n');
    }

    // Try to find logo URL
    let logoUrl: string | undefined;
    if (profile?.logoMediaId) {
      const media = await this.prisma.userMedia.findUnique({
        where: { id: profile.logoMediaId },
        select: { url: true },
      });
      logoUrl = media?.url;
    }

    return {
      industryContext: industry,
      businessContext,
      logoUrl,
    };
  }
}
