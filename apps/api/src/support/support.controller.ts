import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { SupportService, CreateTicketDto } from './support.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators';
import { TicketStatus } from '@prisma/client';

@Controller('support')
@UseGuards(AuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ── USER ROUTES ──────────────────────────────────────────

  @Get('tickets')
  async getUserTickets(@Req() req: any) {
    // req.workspaceId asume que el user mandó x-workspace-id o tienes un middleware
    const workspaceId = req.workspaceId; 
    const result = await this.supportService.getTicketsForWorkspace(workspaceId);
    return { data: result };
  }

  @Post('tickets')
  async createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
    const workspaceId = req.workspaceId;
    const userId = req.user.sub;
    const ticket = await this.supportService.createTicket(workspaceId, userId, dto);
    return { data: ticket };
  }

  @Get('tickets/:id')
  async getTicketDetails(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.workspaceId;
    const ticket = await this.supportService.getTicketDetails(id, workspaceId);
    return { data: ticket };
  }

  @Post('tickets/:id/messages')
  async replyToTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { content: string; attachmentUrl?: string }
  ) {
    const workspaceId = req.workspaceId;
    const userId = req.user.sub;
    const message = await this.supportService.replyToTicketUser(id, workspaceId, userId, body.content, body.attachmentUrl);
    return { data: message };
  }
}

@Controller('admin/tickets')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async getAllTickets() {
    const tickets = await this.supportService.getAllTicketsForAdmin();
    return { data: tickets };
  }

  @Get(':id')
  async getAdminTicketDetails(@Param('id') id: string) {
    const ticket = await this.supportService.adminGetTicketDetails(id);
    return { data: ticket };
  }

  @Post(':id/messages')
  async adminReply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { content: string; attachmentUrl?: string }
  ) {
    const adminId = req.user.sub;
    const message = await this.supportService.adminReply(id, adminId, body.content, body.attachmentUrl);
    return { data: message };
  }

  @Patch(':id/status')
  async adminUpdateStatus(
    @Param('id') id: string,
    @Body() body: { status: TicketStatus }
  ) {
    const ticket = await this.supportService.adminUpdateStatus(id, body.status);
    return { data: ticket };
  }
}
