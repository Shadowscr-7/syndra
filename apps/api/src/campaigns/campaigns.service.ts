import { Injectable, Logger } from '@nestjs/common';
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
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        editorialRuns: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
  }
}
