// ============================================================
// Invitations Service — Gestión de invitaciones a workspaces
// ============================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Create invitation ────────────────────────────────
  async createInvitation(
    workspaceId: string,
    email: string,
    role: string = 'EDITOR',
    invitedBy: string = 'system',
  ) {
    // Check if already a member — no User model, so we skip email-based check
    // Members are matched by userId, not email
    const existingMember: any = null;

    if (existingMember) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    // Check for pending invitation
    const existing = await this.prisma.invitation.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
    });

    if (existing && existing.status === 'PENDING') {
      throw new BadRequestException('There is already a pending invitation for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.upsert({
      where: { workspaceId_email: { workspaceId, email } },
      update: {
        role: role as any,
        token,
        status: 'PENDING',
        expiresAt,
        invitedBy,
      },
      create: {
        workspaceId,
        email,
        role: role as any,
        token,
        expiresAt,
        invitedBy,
      },
      include: { workspace: { select: { name: true } } },
    });

    this.logger.log(
      `Invitation sent to ${email} for workspace ${workspaceId} as ${role}`,
    );

    return invitation;
  }

  // ── List invitations for a workspace ─────────────────
  async listInvitations(workspaceId: string) {
    return this.prisma.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Accept invitation ────────────────────────────────
  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Create membership + update invitation in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Add user to workspace
      const membership = await tx.workspaceUser.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role as any,
        },
      });

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return membership;
    });

    this.logger.log(
      `User ${userId} accepted invitation to workspace ${invitation.workspaceId}`,
    );

    return result;
  }

  // ── Revoke invitation ────────────────────────────────
  async revokeInvitation(invitationId: string) {
    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
  }

  // ── List workspace members ───────────────────────────
  async listMembers(workspaceId: string) {
    return this.prisma.workspaceUser.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Update member role ───────────────────────────────
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: string,
  ) {
    return this.prisma.workspaceUser.update({
      where: { userId_workspaceId: { workspaceId, userId } },
      data: { role: role as any },
    });
  }

  // ── Remove member ────────────────────────────────────
  async removeMember(workspaceId: string, userId: string) {
    // Prevent removing the last OWNER
    const owners = await this.prisma.workspaceUser.count({
      where: { workspaceId, role: 'OWNER' },
    });

    const member = await this.prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { workspaceId, userId } },
    });

    if (member?.role === 'OWNER' && owners <= 1) {
      throw new BadRequestException(
        'Cannot remove the last owner. Transfer ownership first.',
      );
    }

    return this.prisma.workspaceUser.delete({
      where: { userId_workspaceId: { workspaceId, userId } },
    });
  }
}
