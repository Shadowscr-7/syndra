import { Controller, Post, Get, Param, Body, HttpCode, Query, UseGuards, Delete } from '@nestjs/common';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';
import { EditorialCollaborationService } from './editorial-collaboration.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';

@Controller('editorial')
export class EditorialController {
  constructor(
    private readonly orchestrator: EditorialOrchestratorService,
    private readonly collaboration: EditorialCollaborationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/editorial/run
   * Crea un nuevo editorial run y arranca el pipeline
   */
  @Post('run')
  @HttpCode(201)
  @UseGuards(PlanLimitsGuard)
  @PlanCheck('PUBLICATIONS')
  async createRun(
    @Body()
    body: {
      workspaceId: string;
      campaignId?: string;
      origin?: string;
      priority?: number;
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
          select: {
            angle: true,
            format: true,
            tone: true,
            theme: { select: { name: true } },
          },
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
   * Reinicia un run fallido, rechazado o pendiente desde cero.
   */
  @Post('run/:id/restart')
  @HttpCode(200)
  async restartRun(@Param('id') id: string) {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({ where: { id } });
    if (run.status !== 'FAILED' && run.status !== 'REJECTED' && run.status !== 'PENDING') {
      return { error: 'Solo se puede reiniciar un run en estado PENDING, FAILED o REJECTED' };
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

  /**
   * POST /api/editorial/run/:id/cancel
   * Cancela un run en progreso.
   */
  @Post('run/:id/cancel')
  @HttpCode(200)
  async cancelRun(@Param('id') id: string) {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({ where: { id } });
    const cancellable = ['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE'];
    if (!cancellable.includes(run.status)) {
      return { error: `No se puede cancelar un run en estado ${run.status}` };
    }
    await this.prisma.editorialRun.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: 'Cancelado por el usuario' },
    });
    return { data: { status: 'cancelled' } };
  }

  /**
   * DELETE /api/editorial/run/:id
   * Elimina un run y todos sus datos relacionados.
   */
  @Delete('run/:id')
  @HttpCode(200)
  async deleteRun(@Param('id') id: string) {
    const run = await this.prisma.editorialRun.findUnique({ where: { id } });
    if (!run) return { error: 'Run no encontrado' };

    // Nullify non-cascading FK references
    await Promise.all([
      this.prisma.jobQueueLog.updateMany({ where: { editorialRunId: id }, data: { editorialRunId: null } }),
      this.prisma.videoRenderJob.updateMany({ where: { editorialRunId: id }, data: { editorialRunId: null } }),
      this.prisma.learningDecisionLog.updateMany({ where: { editorialRunId: id }, data: { editorialRunId: null } }),
      this.prisma.contentExperiment.updateMany({ where: { editorialRunId: id }, data: { editorialRunId: null } }),
    ]).catch(() => {});

    await this.prisma.editorialRun.delete({ where: { id } });
    return { data: { deleted: true } };
  }

  // ── Collaboration: Comments ──────────────────────────

  @Get('run/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.collaboration.getComments(id);
  }

  @Post('run/:id/comments')
  @HttpCode(201)
  async addComment(@Param('id') id: string, @Body() body: { userId: string; content: string; parentId?: string }) {
    return this.collaboration.addComment(id, body.userId, body.content, body.parentId);
  }

  @Delete('comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string, @Body() body: { userId: string }) {
    return this.collaboration.deleteComment(commentId, body.userId);
  }

  // ── Collaboration: Assignments ────────────────────────

  @Get('run/:id/assignments')
  async getAssignments(@Param('id') id: string) {
    return this.collaboration.getAssignments(id);
  }

  @Post('run/:id/assignments')
  @HttpCode(201)
  async assignUser(@Param('id') id: string, @Body() body: { userId: string; role: string }) {
    return this.collaboration.assignUser(id, body.userId, body.role);
  }

  @Post('run/:id/assignments/:userId/status')
  @HttpCode(200)
  async updateAssignmentStatus(@Param('id') id: string, @Param('userId') userId: string, @Body() body: { status: string }) {
    return this.collaboration.updateAssignmentStatus(id, userId, body.status);
  }

  @Delete('run/:id/assignments/:userId')
  async removeAssignment(@Param('id') id: string, @Param('userId') userId: string) {
    return this.collaboration.removeAssignment(id, userId);
  }

  // ── Collaboration: Multi-step Approval ────────────────

  @Get('run/:id/approval-chain')
  async getApprovalChain(@Param('id') id: string) {
    return this.collaboration.getApprovalChain(id);
  }

  @Post('run/:id/approval-chain')
  @HttpCode(201)
  async setupApprovalChain(@Param('id') id: string, @Body() body: { approverUserIds: string[] }) {
    return this.collaboration.setupApprovalChain(id, body.approverUserIds);
  }

  @Post('run/:id/approval-chain/decide')
  @HttpCode(200)
  async decideApproval(@Param('id') id: string, @Body() body: { userId: string; decision: 'APPROVED' | 'REJECTED'; comment?: string }) {
    return this.collaboration.decideApprovalStep(id, body.userId, body.decision, body.comment);
  }

  @Get('run/:id/collaboration')
  async getCollaborationSummary(@Param('id') id: string) {
    return this.collaboration.getCollaborationSummary(id);
  }
}
