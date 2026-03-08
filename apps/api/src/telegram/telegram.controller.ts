// ============================================================
// Telegram Webhook Controller — Recibe updates de Telegram
// ============================================================

import { Controller, Post, Body, Get, HttpCode, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramApprovalHandler } from './telegram-approval.handler';
import { CredentialsService } from '../credentials/credentials.service';
import { Public } from '../auth/decorators';
import type { TelegramUpdate } from '@automatismos/telegram';

@Public()
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly bot: TelegramBotService,
    private readonly approvalHandler: TelegramApprovalHandler,
    @Inject(forwardRef(() => CredentialsService))
    private readonly credentialsService: CredentialsService,
  ) {}

  /**
   * POST /api/telegram/webhook
   * Endpoint para recibir updates de Telegram (configurado con setWebhook)
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() update: TelegramUpdate) {
    this.logger.debug(`Received Telegram update: ${update.update_id}`);

    try {
      // Callback query (botón inline presionado)
      if (update.callback_query) {
        await this.approvalHandler.handleCallbackQuery(update.callback_query);
        return { ok: true };
      }

      // Mensaje de texto
      if (update.message?.text) {
        // Intercept /start LINK_xxx for pairing (same as polling service)
        const text = update.message.text;
        const linkMatch = text.match(/^\/start\s+LINK_(\S+)/);
        if (linkMatch && linkMatch[1]) {
          await this.handlePairingStart(update.message, linkMatch[1]);
          return { ok: true };
        }

        await this.approvalHandler.handleTextMessage(update.message);
        return { ok: true };
      }

      return { ok: true };
    } catch (error) {
      this.logger.error('Error handling Telegram update:', error);
      // Siempre devolver 200 para que Telegram no reintente
      return { ok: true, error: 'internal' };
    }
  }

  /**
   * Handle /start LINK_xxx pairing flow via webhook
   */
  private async handlePairingStart(message: any, token: string) {
    const chatId = String(message.chat.id);
    const username = message.from?.username;
    const firstName = message.from?.first_name;

    try {
      const result = await this.credentialsService.completePairing(
        token, chatId, username, firstName,
      );
      const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ *¡Cuenta vinculada exitosamente!*\n\nTu cuenta de Syndra está ahora conectada a este chat de Telegram. Recibirás las previews y aprobaciones de contenido aquí.`,
            parse_mode: 'Markdown',
          }),
        });
      }
      this.logger.log(`Telegram pairing completed (webhook): ${username} → ${result.userId}`);
    } catch (err: any) {
      this.logger.error(`Pairing failed (webhook) for token ${token}:`, err?.message);
      const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
      if (botToken) {
        const errorMsg = err?.message?.includes('expirado')
          ? '⏰ El enlace ha expirado. Generá uno nuevo desde la plataforma.'
          : err?.message?.includes('utilizado')
            ? '⚠️ Este enlace ya fue utilizado.'
            : '❌ No se pudo vincular. Intentá de nuevo desde la plataforma.';
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: errorMsg }),
        });
      }
    }
  }

  /**
   * POST /api/telegram/setup-webhook
   * Configura el webhook de Telegram (llamar una vez al deploy)
   */
  @Post('setup-webhook')
  async setupWebhook(@Body() body: { webhookUrl: string }) {
    const success = await this.bot.setWebhook(body.webhookUrl);
    return { data: { success, webhookUrl: body.webhookUrl } };
  }

  /**
   * POST /api/telegram/send-review
   * Envía manualmente una preview para review
   */
  @Post('send-review')
  @HttpCode(200)
  async sendReview(@Body() body: { editorialRunId: string }) {
    await this.approvalHandler.sendForReview(body.editorialRunId);
    return { data: { sent: true } };
  }

  /**
   * GET /api/telegram/status
   * Verifica la conexión con el bot
   */
  @Get('status')
  async getBotStatus() {
    return {
      data: {
        connected: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
