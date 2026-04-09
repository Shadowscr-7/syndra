import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export interface CreateTicketDto {
  subject: string;
  content: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  attachmentUrl?: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================================
  // USER METHODS
  // ============================================================

  async getTicketsForWorkspace(workspaceId: string) {
    return this.prisma.supportTicket.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { name: true, email: true, id: true } },
      },
    });
  }

  async getTicketDetails(ticketId: string, workspaceId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { name: true, email: true, role: true } } },
        },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async createTicket(workspaceId: string, userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        workspaceId,
        createdById: userId,
        subject: dto.subject,
        category: dto.category || TicketCategory.OTHER,
        priority: dto.priority || TicketPriority.NORMAL,
        messages: {
          create: {
            senderId: userId,
            content: dto.content,
            attachmentUrl: dto.attachmentUrl,
            isAdminReply: false,
          },
        },
      },
      include: {
        createdBy: true,
      },
    });

    // Notify SaaS Admin
    const admin = await this.getGlobalAdmin();
    if (admin) {
      await this.emailService.sendTicketCreatedEmail(
        admin.email,
        ticket.createdBy.name || ticket.createdBy.email || 'Usuario',
        ticket.subject,
        ticket.id
      );
    }

    return ticket;
  }

  async replyToTicketUser(ticketId: string, workspaceId: string, userId: string, content: string, attachmentUrl?: string) {
    const ticket = await this.getTicketDetails(ticketId, workspaceId);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        content,
        attachmentUrl,
        isAdminReply: false,
      },
    });

    // Update ticket status automatically to OPEN or WAITING_ON_USER
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.OPEN },
    });

    // Notify SaaS Admin about the user re-opening/replying
    const admin = await this.getGlobalAdmin();
    if (admin) {
      await this.emailService.sendNewTicketReplyEmail(
        admin.email,
        ticket.createdBy?.name || 'El usuario',
        ticket.subject,
        content,
        false
      );
    }

    return message;
  }

  // ============================================================
  // ADMIN METHODS
  // ============================================================

  async getAllTicketsForAdmin() {
    return this.prisma.supportTicket.findMany({
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        createdBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
  }

  async adminGetTicketDetails(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { name: true, email: true, role: true } } },
        },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async adminReply(ticketId: string, adminId: string, content: string, attachmentUrl?: string) {
    const ticket = await this.adminGetTicketDetails(ticketId);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: adminId,
        content,
        attachmentUrl,
        isAdminReply: true,
      },
    });

    // Move to WAITING_ON_USER since admin replied
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.WAITING_ON_USER },
    });

    if (ticket.createdBy?.email) {
      // Notify the user
      await this.emailService.sendNewTicketReplyEmail(
        ticket.createdBy.email,
        'Soporte',
        ticket.subject,
        content,
        true
      );
    }

    return message;
  }

  async adminUpdateStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: { createdBy: true },
    });

    if (status === TicketStatus.RESOLVED && ticket.createdBy?.email) {
      await this.emailService.sendTicketResolvedEmail(
        ticket.createdBy.email,
        ticket.createdBy.name || ticket.createdBy.email || 'Usuario',
        ticket.subject
      );
    }

    return ticket;
  }

  // Helper Utils
  private async getGlobalAdmin() {
    return this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
  }
}
