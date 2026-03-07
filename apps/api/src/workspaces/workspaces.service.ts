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
}
