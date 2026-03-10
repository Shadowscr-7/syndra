// ============================================================
// Business Briefs Service — Productos, ofertas y anuncios del negocio
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBusinessBriefDto {
  type: string;
  title: string;
  content: string;
  productName?: string;
  productPrice?: string;
  productUrl?: string;
  discountText?: string;
  validFrom?: string;
  validUntil?: string;
  mediaIds?: string[];
  priority?: number;
}

export interface UpdateBusinessBriefDto extends Partial<CreateBusinessBriefDto> {
  isActive?: boolean;
}

@Injectable()
export class BusinessBriefsService {
  private readonly logger = new Logger(BusinessBriefsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, filters?: { type?: string; isActive?: boolean }) {
    return this.prisma.businessBrief.findMany({
      where: {
        workspaceId,
        ...(filters?.type ? { type: filters.type as any } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string, workspaceId: string) {
    const brief = await this.prisma.businessBrief.findFirst({
      where: { id, workspaceId },
    });
    if (!brief) throw new NotFoundException('Business brief not found');
    return brief;
  }

  async create(workspaceId: string, data: CreateBusinessBriefDto) {
    const brief = await this.prisma.businessBrief.create({
      data: {
        workspaceId,
        type: data.type as any,
        title: data.title,
        content: data.content,
        productName: data.productName,
        productPrice: data.productPrice,
        productUrl: data.productUrl,
        discountText: data.discountText,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        mediaIds: data.mediaIds ?? [],
        priority: data.priority ?? 5,
      },
    });

    this.logger.log(`Business brief created: ${brief.id} (${brief.type}) for workspace ${workspaceId}`);
    return brief;
  }

  async update(id: string, workspaceId: string, data: UpdateBusinessBriefDto) {
    const existing = await this.prisma.businessBrief.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Business brief not found');

    return this.prisma.businessBrief.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type as any } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.productName !== undefined ? { productName: data.productName } : {}),
        ...(data.productPrice !== undefined ? { productPrice: data.productPrice } : {}),
        ...(data.productUrl !== undefined ? { productUrl: data.productUrl } : {}),
        ...(data.discountText !== undefined ? { discountText: data.discountText } : {}),
        ...(data.validFrom !== undefined ? { validFrom: data.validFrom ? new Date(data.validFrom) : null } : {}),
        ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
        ...(data.mediaIds !== undefined ? { mediaIds: data.mediaIds } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async delete(id: string, workspaceId: string) {
    const existing = await this.prisma.businessBrief.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Business brief not found');

    return this.prisma.businessBrief.delete({ where: { id } });
  }

  async toggle(id: string, workspaceId: string) {
    const existing = await this.prisma.businessBrief.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Business brief not found');

    return this.prisma.businessBrief.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async incrementUsage(id: string) {
    return this.prisma.businessBrief.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * Get active briefs for a specific theme type mapping.
   * Used by the research pipeline to fetch internal business data.
   */
  async getActiveBriefsForResearch(
    workspaceId: string,
    themeType?: string,
  ) {
    // Map ThemeType to BriefType for filtering
    const typeMap: Record<string, string[]> = {
      PRODUCT: ['PRODUCT'],
      SERVICE: ['SERVICE'],
      OFFER: ['OFFER', 'SEASONAL'],
      SEASONAL: ['SEASONAL', 'OFFER'],
      TESTIMONIAL: ['TESTIMONIAL'],
      BEHIND_SCENES: ['BRAND_STORY'],
      EDUCATIONAL: ['FAQ', 'PRODUCT', 'SERVICE'],
      ANNOUNCEMENT: ['ANNOUNCEMENT'],
    };

    const briefTypes = themeType ? typeMap[themeType] : undefined;

    return this.prisma.businessBrief.findMany({
      where: {
        workspaceId,
        isActive: true,
        ...(briefTypes ? { type: { in: briefTypes as any[] } } : {}),
        // Only return non-expired briefs
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });
  }
}
