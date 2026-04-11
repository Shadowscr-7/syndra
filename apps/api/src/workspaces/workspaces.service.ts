import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        brandProfile: true,
        contentThemes: { where: { isActive: true } },
        campaigns: { where: { isActive: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOperationMode(workspaceId: string, mode: 'FULLY_AUTOMATIC' | 'APPROVAL_REQUIRED' | 'MANUAL') {
    const ws = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { operationMode: mode },
      select: { id: true, name: true, operationMode: true },
    });
    this.logger.log(`Operation mode updated: workspace=${workspaceId} mode=${mode}`);
    return ws;
  }

  async updateVideoPreferences(
    workspaceId: string,
    prefs: { preferVideoFormat?: boolean; defaultAvatarId?: string; enableMusic?: boolean },
  ) {
    // Merge with existing prefs
    const current = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { videoPreferences: true },
    });
    const existing = (current?.videoPreferences ?? {}) as Record<string, unknown>;
    const merged = { ...existing, ...prefs };

    const ws = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { videoPreferences: merged },
      select: { id: true, videoPreferences: true },
    });
    this.logger.log(`Video preferences updated: workspace=${workspaceId}`);
    return ws;
  }
}
