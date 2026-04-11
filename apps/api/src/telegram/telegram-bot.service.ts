// ============================================================
// Telegram Bot Service — Envío de mensajes y gestión de webhook
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  formatPreviewMessage,
  formatPublishConfirmation,
  formatErrorMessage,
  APPROVAL_KEYBOARD,
  TONE_KEYBOARD,
} from '@automatismos/telegram';
import type {
  TelegramPreview,
  TelegramSendMessageParams,
  TelegramSendPhotoParams,
} from '@automatismos/telegram';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;
  private readonly defaultChatId: string;

  constructor(private readonly config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.defaultChatId = this.config.get<string>('TELEGRAM_CHAT_ID', '');
  }

  /** Resuelve el chatId: usa el explícito si se provee, o cae al default del env */
  private resolveChatId(chatId?: string): string {
    return chatId || this.defaultChatId;
  }

  /**
   * Envía la preview de contenido al chat de aprobación con botones inline
   */
  async sendPreview(preview: TelegramPreview, chatId?: string, keyboard?: unknown): Promise<string> {
    const target = this.resolveChatId(chatId);
    const text = formatPreviewMessage(preview);
    const replyMarkup = keyboard ?? APPROVAL_KEYBOARD;

    // Si hay thumbnail, enviar como foto
    if (preview.thumbnailUrl) {
      const photoResult = await this.sendPhoto({
        chat_id: target,
        photo: preview.thumbnailUrl,
        caption: text.substring(0, 1024), // Telegram caption limit
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
      return String(photoResult.message_id ?? '');
    }

    // Si no hay imagen, enviar como mensaje de texto
    const result = await this.sendMessage({
      chat_id: target,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });

    return String(result.message_id ?? '');
  }

  /**
   * Envía la opción de selección de tono
   */
  async sendToneSelector(replyToMessageId: number, chatId?: string): Promise<void> {
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text: '🎭 *Selecciona el nuevo tono:*',
      parse_mode: 'Markdown',
      reply_markup: TONE_KEYBOARD,
      reply_to_message_id: replyToMessageId,
    });
  }

  /**
   * Solicita texto de corrección al usuario
   */
  async requestCorrectionText(replyToMessageId: number, chatId?: string): Promise<void> {
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text: '✏️ *Escribe tu corrección:*\n\nResponde a este mensaje con el texto de tu corrección.',
      parse_mode: 'Markdown',
      reply_to_message_id: replyToMessageId,
    });
  }

  /**
   * Envía notificación de que el contenido fue aprobado
   */
  async sendApprovalConfirmation(editorialRunId: string, chatId?: string): Promise<void> {
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text: `✅ *Contenido aprobado*\n\n🆔 Run: \`${editorialRunId}\`\n\n📤 Enviando a publicación...`,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Envía confirmación de publicación exitosa
   */
  async sendPublishConfirmation(platform: string, permalink: string, chatId?: string): Promise<void> {
    const text = formatPublishConfirmation(platform, permalink);
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Envía notificación de error
   */
  async sendError(stage: string, error: string, chatId?: string): Promise<void> {
    const text = formatErrorMessage(stage, error);
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Envía notificación genérica
   */
  async sendNotification(message: string, chatId?: string): Promise<void> {
    await this.sendMessage({
      chat_id: this.resolveChatId(chatId),
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Envía un grupo de fotos (media album) — para carruseles
   * Telegram muestra hasta 10 fotos agrupadas.
   */
  async sendMediaGroup(
    photoUrls: string[],
    caption?: string,
    chatId?: string,
  ): Promise<string[]> {
    const target = this.resolveChatId(chatId);
    if (!this.botToken || photoUrls.length === 0) return [];

    const media = photoUrls.slice(0, 10).map((url, i) => ({
      type: 'photo' as const,
      media: url,
      ...(i === 0 && caption ? { caption, parse_mode: 'Markdown' as const } : {}),
    }));

    const result = await this.callApi('sendMediaGroup', {
      chat_id: target,
      media,
    });

    // sendMediaGroup returns array of messages
    if (Array.isArray(result)) {
      return result.map((m: { message_id?: number }) => String(m.message_id ?? ''));
    }
    return [];
  }

  /**
   * Envía preview con media (imagen o carrusel) + botones de aprobación
   * Si hay varias imágenes, envía primero el album y después el mensaje con botones
   */
  async sendMediaPreview(
    preview: TelegramPreview,
    mediaUrls: string[],
    chatId?: string,
    keyboard?: unknown,
  ): Promise<string> {
    const target = this.resolveChatId(chatId);
    const text = formatPreviewMessage(preview);
    const replyMarkup = keyboard ?? APPROVAL_KEYBOARD;

    if (mediaUrls.length > 1) {
      // Carrusel: enviar album primero, luego texto con botones
      await this.sendMediaGroup(mediaUrls, `🎠 *Carrusel (${mediaUrls.length} slides)*`, target);

      // Después enviar el texto completo con botones
      const result = await this.sendMessage({
        chat_id: target,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
      return String(result.message_id ?? '');
    }

    // Imagen simple: enviar como foto con caption
    if (mediaUrls.length === 1) {
      const photoResult = await this.sendPhoto({
        chat_id: target,
        photo: mediaUrls[0]!,
        caption: text.substring(0, 1024),
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
      return String(photoResult.message_id ?? '');
    }

    // Sin media: enviar solo texto
    return this.sendPreview(preview, target, keyboard);
  }

  /**
   * Responde a un callback_query (elimina el "reloj" del botón)
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text ?? 'Procesando...',
    });
  }

  /**
   * Edita el reply_markup de un mensaje (para deshabilitar botones después de respuesta)
   */
  async removeKeyboard(messageId: number, chatId?: string): Promise<void> {
    await this.callApi('editMessageReplyMarkup', {
      chat_id: this.resolveChatId(chatId),
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  }

  /**
   * Configura el webhook en Telegram
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    const result = await this.callApi('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    });
    return result.ok === true;
  }

  // ============================================================
  // Private HTTP methods
  // ============================================================

  private async sendMessage(
    params: TelegramSendMessageParams,
  ): Promise<{ message_id: number }> {
    return this.callApi('sendMessage', params);
  }

  private async sendPhoto(
    params: TelegramSendPhotoParams,
  ): Promise<{ message_id: number }> {
    return this.callApi('sendPhoto', params);
  }

  private async callApi(method: string, body: unknown): Promise<any> {
    if (!this.botToken) {
      this.logger.warn(`Telegram API call skipped (no bot token): ${method}`);
      return { ok: true, message_id: 0 };
    }

    try {
      const response = await fetch(`${this.apiUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { ok?: boolean; result?: unknown; description?: string; [key: string]: unknown };

      if (!response.ok || !data.ok) {
        // If Markdown parsing failed, retry without parse_mode
        const desc = String(data.description ?? '');
        if (desc.includes("can't parse entities") && typeof body === 'object' && body !== null && 'parse_mode' in body) {
          this.logger.warn(`Telegram Markdown parse error — retrying without parse_mode`);
          const { parse_mode, ...bodyWithoutParse } = body as Record<string, unknown>;
          const retryResponse = await fetch(`${this.apiUrl}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithoutParse),
          });
          const retryData = (await retryResponse.json()) as { ok?: boolean; result?: unknown; [key: string]: unknown };
          if (retryData.ok) return retryData.result ?? retryData;
        }

        this.logger.error(
          `Telegram API error (${method}): ${JSON.stringify(data)}`,
        );
      }

      return data.result ?? data;
    } catch (error) {
      this.logger.error(`Telegram API call failed (${method}):`, error);
      throw error;
    }
  }
}
