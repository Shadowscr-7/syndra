// ============================================================
// Telegram Webhook Controller — Recibe updates de Telegram
// ============================================================

import { Controller, Post, Body, Get, HttpCode, Logger } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramApprovalHandler } from './telegram-approval.handler';
import { Public } from '../auth/decorators';
import type { TelegramUpdate } from '@automatismos/telegram';

@Public()
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly bot: TelegramBotService,
    private readonly approvalHandler: TelegramApprovalHandler,
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

      // Mensaje de texto (posible corrección)
      if (update.message?.text) {
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
