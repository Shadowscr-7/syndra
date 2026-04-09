// ============================================================
// Email Service — Envío de emails transaccionales con Resend
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly appName = 'Syndra';
  private readonly appUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@syndra.dev';
    this.appUrl = process.env.APP_URL || 'http://localhost:3002';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend email service initialized');
    } else {
      this.resend = null;
      this.logger.warn('⚠️  No RESEND_API_KEY — emails will be logged to console only');
    }
  }

  // ── Send raw email ──────────────────────────────────────

  async send(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    if (!this.resend) {
      this.logger.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`📧 Body: ${text || html.substring(0, 200)}...`);
      return true;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.appName} <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error(`❌ Email send failed: ${JSON.stringify(error)}`);
        return false;
      }

      this.logger.log(`✅ Email sent: ${data?.id} → ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`❌ Email send error: ${err}`);
      return false;
    }
  }

  // ── Email verification ──────────────────────────────────

  async sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
    const verifyUrl = `${this.appUrl}/api/auth/verify-email?token=${token}`;

    return this.send({
      to,
      subject: `Verifica tu email — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">¡Hola ${name}! 👋</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Gracias por registrarte en <strong>${this.appName}</strong>. Para completar tu registro, verifica tu email haciendo clic en el botón:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Verificar email
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Si no creaste esta cuenta, ignora este mensaje. El enlace expira en 24 horas.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} ${this.appName}</p>
        </div>
      `,
      text: `Hola ${name}, verifica tu email: ${verifyUrl}`,
    });
  }

  // ── Password reset ──────────────────────────────────────

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    return this.send({
      to,
      subject: `Restablecer contraseña — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Restablecer contraseña</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Hola <strong>${name}</strong>, recibimos una solicitud para restablecer tu contraseña de ${this.appName}.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Si no solicitaste esto, ignora este mensaje. El enlace expira en 1 hora.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} ${this.appName}</p>
        </div>
      `,
      text: `Hola ${name}, restablece tu contraseña: ${resetUrl}`,
    });
  }

  // ── Admin-generated reset link ──────────────────────────

  async sendAdminPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    return this.send({
      to,
      subject: `Enlace para restablecer contraseña — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Restablecer contraseña</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Hola <strong>${name}</strong>, el equipo de soporte de ${this.appName} te ha generado un enlace para restablecer tu contraseña:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Establecer nueva contraseña
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            El enlace expira en 24 horas.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} ${this.appName}</p>
        </div>
      `,
      text: `Hola ${name}, establece tu nueva contraseña: ${resetUrl}`,
    });
  }

  // ── Subscription welcome / change ───────────────────────

  async sendSubscriptionEmail(to: string, name: string, planName: string): Promise<boolean> {
    return this.send({
      to,
      subject: `Tu suscripción ${planName} está activa — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">¡Bienvenido al plan ${planName}! 🎉</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Hola <strong>${name}</strong>, tu suscripción al plan <strong>${planName}</strong> de ${this.appName} está activa.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${this.appUrl}/dashboard" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Ir al dashboard
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} ${this.appName}</p>
        </div>
      `,
      text: `Hola ${name}, tu suscripción ${planName} de ${this.appName} está activa.`,
    });
  }

  // ── Support Tickets ───────────────────────────────────────

  async sendTicketCreatedEmail(to: string, userName: string, ticketSubject: string, ticketId: string): Promise<boolean> {
    const adminUrl = `${this.appUrl}/dashboard/admin/tickets`;

    return this.send({
      to,
      subject: `Nuevo Ticket: ${ticketSubject} — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Nuevo Ticket de Soporte 🎫</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            El usuario <strong>${userName}</strong> ha abierto un nuevo ticket de soporte con el asunto:
          </p>
          <blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding-left: 16px; color: #555; background: #f9f9f9; padding: 12px;">
            ${ticketSubject}
          </blockquote>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${adminUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Atender Ticket (Admin)
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">Ticket ID: ${ticketId}</p>
        </div>
      `,
      text: `Nuevo ticket de ${userName}: ${ticketSubject}. Revisalo en: ${adminUrl}`,
    });
  }

  async sendNewTicketReplyEmail(to: string, userName: string, ticketSubject: string, replyContent: string, isFromAdmin: boolean): Promise<boolean> {
    const url = isFromAdmin ? `${this.appUrl}/dashboard/support` : `${this.appUrl}/dashboard/admin/tickets`;
    const title = isFromAdmin ? "Soporte ha respondido a tu incidencia" : `Nueva respuesta de ${userName}`;
    const truncatedReply = replyContent.length > 200 ? replyContent.substring(0, 200) + "..." : replyContent;

    return this.send({
      to,
      subject: `Re: ${ticketSubject} — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 20px; margin-bottom: 16px;">${title} 📩</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">Sobre el ticket: <strong>${ticketSubject}</strong></p>
          <blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding-left: 16px; color: #555; background: #f9f9f9; padding: 12px; white-space: pre-wrap;">
            ${truncatedReply}
          </blockquote>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver conversación completa
            </a>
          </div>
        </div>
      `,
      text: `${title}\nMensaje: ${truncatedReply}\nVer más: ${url}`,
    });
  }

  async sendTicketResolvedEmail(to: string, userName: string, ticketSubject: string): Promise<boolean> {
    const url = `${this.appUrl}/dashboard/support`;

    return this.send({
      to,
      subject: `✓ Ticket Resuelto: ${ticketSubject} — ${this.appName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #16a34a; font-size: 24px; margin-bottom: 16px;">Ticket Resuelto ✅</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Hola <strong>${userName}</strong>, tu ticket de soporte <strong>"${ticketSubject}"</strong> ha sido marcado como Resuelto por el equipo técnico.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
              Ver Detalles del Ticket
            </a>
          </div>
        </div>
      `,
      text: `Tu ticket "${ticketSubject}" ha sido marcado como Resuelto. Verifica en: ${url}`,
    });
  }
}

