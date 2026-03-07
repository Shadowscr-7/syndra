// ============================================================
// Telegram Polling Service — Long-polling para desarrollo local
// En producción se usa webhook en su lugar.
// ============================================================

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramApprovalHandler } from './telegram-approval.handler';
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
        await this.approvalHandler.handleTextMessage(update.message);
      }
    } catch (err) {
      this.logger.error(`Error handling update ${update.update_id}:`, err);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
