import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(workspaceId: string) {
    const now = new Date();
    return this.prisma.campaign.findMany({
      where: {
        workspaceId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });
  }

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        editorialRuns: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async create(data: {
    workspaceId: string;
    name: string;
    objective: string;
    offer?: string;
    landingUrl?: string;
    startDate: string;
    endDate?: string;
    kpiTarget?: string;
    contentProfileId?: string;
    userPersonaId?: string;
    targetChannels?: string[];
    operationMode?: string;
    musicEnabled?: boolean;
    musicStyle?: string;
    musicPrompt?: string;
  }) {
    return this.prisma.campaign.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        objective: data.objective as any,
        offer: data.offer,
        landingUrl: data.landingUrl,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        kpiTarget: data.kpiTarget,
        contentProfileId: data.contentProfileId,
        userPersonaId: data.userPersonaId,
        targetChannels: data.targetChannels ?? ['instagram'],
        operationMode: data.operationMode as any ?? null,
        musicEnabled: data.musicEnabled ?? false,
        musicStyle: data.musicStyle ?? null,
        musicPrompt: data.musicPrompt ?? null,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    objective?: string;
    offer?: string;
    landingUrl?: string;
    startDate?: string;
    endDate?: string | null;
    kpiTarget?: string;
    contentProfileId?: string | null;
    userPersonaId?: string | null;
    targetChannels?: string[];
    operationMode?: string | null;
    isActive?: boolean;
    musicEnabled?: boolean;
    musicStyle?: string | null;
    musicPrompt?: string | null;
  }) {
    await this.findById(id); // throws if not found
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.objective !== undefined && { objective: data.objective as any }),
        ...(data.offer !== undefined && { offer: data.offer }),
        ...(data.landingUrl !== undefined && { landingUrl: data.landingUrl }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.kpiTarget !== undefined && { kpiTarget: data.kpiTarget }),
        ...(data.contentProfileId !== undefined && { contentProfileId: data.contentProfileId }),
        ...(data.userPersonaId !== undefined && { userPersonaId: data.userPersonaId }),
        ...(data.targetChannels !== undefined && { targetChannels: data.targetChannels }),
        ...(data.operationMode !== undefined && { operationMode: data.operationMode as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.musicEnabled !== undefined && { musicEnabled: data.musicEnabled }),
        ...(data.musicStyle !== undefined && { musicStyle: data.musicStyle }),
        ...(data.musicPrompt !== undefined && { musicPrompt: data.musicPrompt }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id); // throws if not found
    return this.prisma.campaign.delete({ where: { id } });
  }

  async toggleActive(id: string) {
    const campaign = await this.findById(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { isActive: !campaign.isActive },
    });
  }

  async updateOperationMode(id: string, operationMode: string | null) {
    const validModes = ['MANUAL', 'SEMI_AUTOMATIC', 'FULLY_AUTOMATIC', null];
    if (!validModes.includes(operationMode as any)) {
      throw new Error('Invalid operation mode');
    }
    return this.prisma.campaign.update({
      where: { id },
      data: { operationMode: operationMode as any },
    });
  }
}
