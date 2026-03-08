// ============================================================
// Editorial Collaboration Service — Comments, Assignments, Multi-step Approval
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EditorialCollaborationService {
  private readonly logger = new Logger(EditorialCollaborationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Comments ──────────────────────────────────────────

  async addComment(editorialRunId: string, userId: string, content: string, parentId?: string) {
    if (parentId) {
      const parent = await this.prisma.editorialComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.editorialRunId !== editorialRunId) {
        throw new BadRequestException('Parent comment not found in this run');
      }
    }

    return this.prisma.editorialComment.create({
      data: { editorialRunId, userId, content, parentId: parentId || null },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async getComments(editorialRunId: string) {
    const comments = await this.prisma.editorialComment.findMany({
      where: { editorialRunId, parentId: null },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return comments;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.editorialComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new BadRequestException('Not your comment');
    await this.prisma.editorialComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  // ── Assignments ───────────────────────────────────────

  async assignUser(editorialRunId: string, assignedUserId: string, role: string) {
    return this.prisma.editorialAssignment.upsert({
      where: { editorialRunId_assignedUserId: { editorialRunId, assignedUserId } },
      create: { editorialRunId, assignedUserId, role, status: 'PENDING' },
      update: { role, status: 'PENDING' },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getAssignments(editorialRunId: string) {
    return this.prisma.editorialAssignment.findMany({
      where: { editorialRunId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAssignmentStatus(editorialRunId: string, assignedUserId: string, status: string) {
    return this.prisma.editorialAssignment.update({
      where: { editorialRunId_assignedUserId: { editorialRunId, assignedUserId } },
      data: { status },
    });
  }

  async removeAssignment(editorialRunId: string, assignedUserId: string) {
    await this.prisma.editorialAssignment.delete({
      where: { editorialRunId_assignedUserId: { editorialRunId, assignedUserId } },
    });
    return { deleted: true };
  }

  // ── Multi-step Approval ───────────────────────────────

  async setupApprovalChain(editorialRunId: string, approverUserIds: string[]) {
    // Delete existing steps
    await this.prisma.approvalStep.deleteMany({ where: { editorialRunId } });

    const steps = approverUserIds.map((userId, index) => ({
      editorialRunId,
      approverUserId: userId,
      stepOrder: index + 1,
      status: 'PENDING',
    }));

    await this.prisma.approvalStep.createMany({ data: steps });

    return this.getApprovalChain(editorialRunId);
  }

  async getApprovalChain(editorialRunId: string) {
    return this.prisma.approvalStep.findMany({
      where: { editorialRunId },
      include: {
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { stepOrder: 'asc' },
    });
  }

  async decideApprovalStep(editorialRunId: string, approverUserId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    const steps = await this.prisma.approvalStep.findMany({
      where: { editorialRunId },
      orderBy: { stepOrder: 'asc' },
    });

    const myStep = steps.find((s) => s.approverUserId === approverUserId && s.status === 'PENDING');
    if (!myStep) throw new BadRequestException('No pending approval step for this user');

    // Check previous steps are all approved
    const previousSteps = steps.filter((s) => s.stepOrder < myStep.stepOrder);
    const allPreviousApproved = previousSteps.every((s) => s.status === 'APPROVED');
    if (!allPreviousApproved) {
      throw new BadRequestException('Previous approval steps must be completed first');
    }

    await this.prisma.approvalStep.update({
      where: { editorialRunId_stepOrder: { editorialRunId, stepOrder: myStep.stepOrder } },
      data: { status: decision, comment, decidedAt: new Date() },
    });

    // If rejected, mark run as REJECTED
    if (decision === 'REJECTED') {
      await this.prisma.editorialRun.update({
        where: { id: editorialRunId },
        data: { status: 'REJECTED' },
      });
      return { status: 'REJECTED', allApproved: false };
    }

    // If all steps approved → mark run as APPROVED
    const remainingPending = steps.filter(
      (s) => s.id !== myStep.id && s.status === 'PENDING',
    );
    if (remainingPending.length === 0) {
      await this.prisma.editorialRun.update({
        where: { id: editorialRunId },
        data: { status: 'APPROVED' },
      });
      return { status: 'APPROVED', allApproved: true };
    }

    return { status: 'STEP_APPROVED', allApproved: false, nextStep: myStep.stepOrder + 1 };
  }

  // ── Summary ───────────────────────────────────────────

  async getCollaborationSummary(editorialRunId: string) {
    const [comments, assignments, approvalSteps] = await Promise.all([
      this.prisma.editorialComment.count({ where: { editorialRunId } }),
      this.getAssignments(editorialRunId),
      this.getApprovalChain(editorialRunId),
    ]);

    return {
      commentCount: comments,
      assignments,
      approvalSteps,
      approvalStatus: approvalSteps.length > 0
        ? approvalSteps.every((s) => s.status === 'APPROVED') ? 'ALL_APPROVED'
          : approvalSteps.some((s) => s.status === 'REJECTED') ? 'REJECTED'
          : 'PENDING'
        : 'NO_CHAIN',
    };
  }
}
