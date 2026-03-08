// ============================================================
// Telegram Polling Service — Long-polling para desarrollo local
// En producción se usa webhook en su lugar.
// ============================================================

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramApprovalHandler } from './telegram-approval.handler';
import { CredentialsService } from '../credentials/credentials.service';
import type { TelegramUpdate } from '@automatismos/telegram';

@Injectable()
export class TelegramPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollingService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;
  private polling = false;
  private offset = 0;
  private abortController: AbortController | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly approvalHandler: TelegramApprovalHandler,
    @Inject(forwardRef(() => CredentialsService))
    private readonly credentialsService: CredentialsService,
  ) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — polling disabled');
      return;
    }

    // Delete any existing webhook so polling works
    try {
      await fetch(`${this.apiUrl}/deleteWebhook`, { method: 'POST' });
    } catch {
      // ignore
    }

    this.polling = true;
    this.logger.log('Starting Telegram long-polling...');
    this.pollLoop();
  }

  onModuleDestroy() {
    this.polling = false;
    this.abortController?.abort();
    this.logger.log('Telegram polling stopped');
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        this.abortController = new AbortController();
        const res = await fetch(
          `${this.apiUrl}/getUpdates?offset=${this.offset}&timeout=30`,
          { signal: this.abortController.signal },
        );
        const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };

        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        this.logger.error('Polling error:', err?.message ?? err);
        // Wait before retrying on error
        await this.sleep(5000);
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    try {
      if (update.callback_query) {
        await this.approvalHandler.handleCallbackQuery(update.callback_query);
      } else if (update.message?.text) {
        // Intercept /start LINK_xxx for pairing
        const text = update.message.text;
        const linkMatch = text.match(/^\/start\s+LINK_(\S+)/);
        if (linkMatch && linkMatch[1]) {
          await this.handlePairingStart(update.message, linkMatch[1]);
          return;
        }
        await this.approvalHandler.handleTextMessage(update.message);
      }
    } catch (err) {
      this.logger.error(`Error handling update ${update.update_id}:`, err);
    }
  }

  private async handlePairingStart(message: any, token: string) {
    const chatId = String(message.chat.id);
    const username = message.from?.username;
    const firstName = message.from?.first_name;

    try {
      const result = await this.credentialsService.completePairing(
        token, chatId, username, firstName,
      );
      // Send confirmation to the user
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
      this.logger.log(`Telegram pairing completed: ${username} → ${result.userId}`);
    } catch (err: any) {
      this.logger.error(`Pairing failed for token ${token}:`, err?.message);
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
