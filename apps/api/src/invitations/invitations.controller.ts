// ============================================================
// Invitations Controller — Team management endpoints
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import {
  Public,
  CurrentUser,
  CurrentWorkspace,
  Roles,
} from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.guard';

@Controller('team')
export class InvitationsController {
  private readonly logger = new Logger(InvitationsController.name);

  constructor(private readonly invitations: InvitationsService) {}

  /**
   * GET /api/team/members — List workspace members
   */
  @Get('members')
  async listMembers(@CurrentWorkspace() workspaceId: string) {
    const members = await this.invitations.listMembers(workspaceId);
    return { data: members };
  }

  /**
   * GET /api/team/invitations — List pending invitations
   */
  @Roles('OWNER', 'EDITOR')
  @Get('invitations')
  async listInvitations(@CurrentWorkspace() workspaceId: string) {
    const list = await this.invitations.listInvitations(workspaceId);
    return { data: list };
  }

  /**
   * POST /api/team/invite — Invite a new member
   */
  @Roles('OWNER')
  @Post('invite')
  async invite(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { email: string; role?: string },
  ) {
    const invitation = await this.invitations.createInvitation(
      workspaceId,
      body.email,
      body.role || 'EDITOR',
      user.sub,
    );
    return { data: invitation };
  }

  /**
   * POST /api/team/accept — Accept an invitation (public — needs token)
   */
  @Public()
  @Post('accept')
  async acceptInvitation(
    @Body() body: { token: string; userId: string },
  ) {
    const membership = await this.invitations.acceptInvitation(
      body.token,
      body.userId,
    );
    return { data: membership };
  }

  /**
   * DELETE /api/team/invitations/:id — Revoke invitation
   */
  @Roles('OWNER')
  @Delete('invitations/:id')
  async revokeInvitation(@Param('id') invitationId: string) {
    const inv = await this.invitations.revokeInvitation(invitationId);
    return { data: inv };
  }

  /**
   * PATCH /api/team/members/:userId/role — Update member role
   */
  @Roles('OWNER')
  @Patch('members/:userId/role')
  async updateRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    const member = await this.invitations.updateMemberRole(
      workspaceId,
      userId,
      body.role,
    );
    return { data: member };
  }

  /**
   * DELETE /api/team/members/:userId — Remove member
   */
  @Roles('OWNER')
  @Delete('members/:userId')
  async removeMember(
    @CurrentWorkspace() workspaceId: string,
    @Param('userId') userId: string,
  ) {
    await this.invitations.removeMember(workspaceId, userId);
    return { data: { success: true } };
  }
}
