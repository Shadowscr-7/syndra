import { Controller, Post, Get, Param, Body, HttpCode, Query } from '@nestjs/common';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('editorial')
export class EditorialController {
  constructor(
    private readonly orchestrator: EditorialOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/editorial/run
   * Crea un nuevo editorial run y arranca el pipeline
   */
  @Post('run')
  @HttpCode(201)
  async createRun(
    @Body()
    body: {
      workspaceId: string;
      campaignId?: string;
      origin?: string;
      targetChannels?: string[];
    },
  ) {
    const result = await this.orchestrator.createRun(body);
    return { data: result };
  }

  /**
   * GET /api/editorial/runs?workspaceId=xxx
   * Lista los editorial runs de un workspace
   */
  @Get('runs')
  async listRuns(@Query('workspaceId') workspaceId: string) {
    const runs = await this.prisma.editorialRun.findMany({
      where: { workspaceId },
      include: {
        campaign: { select: { name: true, objective: true } },
        contentBrief: {
          select: { angle: true, format: true, tone: true },
        },
        _count: {
          select: {
            researchSnapshots: true,
            approvalEvents: true,
            publications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { data: runs, count: runs.length };
  }

  /**
   * GET /api/editorial/run/:id
   * Detalle completo de un editorial run
   */
  @Get('run/:id')
  async getRunDetail(@Param('id') id: string) {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id },
      include: {
        campaign: true,
        researchSnapshots: { orderBy: { relevanceScore: 'desc' } },
        contentBrief: {
          include: {
            theme: true,
            contentVersions: {
              include: { mediaAssets: true },
              orderBy: { version: 'desc' },
            },
          },
        },
        approvalEvents: { orderBy: { createdAt: 'desc' } },
        publications: true,
        jobQueueLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    return { data: run };
  }

  /**
   * POST /api/editorial/run/:id/approve
   */
  @Post('run/:id/approve')
  @HttpCode(200)
  async approveRun(@Param('id') id: string) {
    await this.orchestrator.onApproved(id);
    return { data: { status: 'approved' } };
  }

  /**
   * POST /api/editorial/run/:id/reject
   */
  @Post('run/:id/reject')
  @HttpCode(200)
  async rejectRun(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await this.orchestrator.onRejected(id, body.reason);
    return { data: { status: 'rejected' } };
  }

  /**
   * POST /api/editorial/run/:id/postpone
   */
  @Post('run/:id/postpone')
  @HttpCode(200)
  async postponeRun(@Param('id') id: string) {
    await this.orchestrator.onPostponed(id);
    return { data: { status: 'postponed' } };
  }

  /**
   * POST /api/editorial/run/:id/restart
   * Reinicia un run fallido o rechazado desde cero.
   */
  @Post('run/:id/restart')
  @HttpCode(200)
  async restartRun(@Param('id') id: string) {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({ where: { id } });
    if (run.status !== 'FAILED' && run.status !== 'REJECTED') {
      return { error: 'Solo se puede reiniciar un run en estado FAILED o REJECTED' };
    }
    // Reset status and clear error
    await this.prisma.editorialRun.update({
      where: { id },
      data: { status: 'PENDING', errorMessage: null },
    });
    // Re-create and start
    const result = await this.orchestrator.restartRun(id, run.workspaceId);
    return { data: result };
  }
}
