// ============================================================
// @automatismos/telegram — Bot handlers & review workflows
// ============================================================

import type { TelegramPreview, ApprovalActionType } from '@automatismos/shared';

// --- Re-export types ---
export type { TelegramPreview, ApprovalActionType };

/**
 * Interface para el bot de revisión en Telegram
 */
export interface TelegramReviewBot {
  sendPreview(chatId: string, preview: TelegramPreview): Promise<string>;
  sendNotification(chatId: string, message: string): Promise<void>;
  sendPhoto(chatId: string, photoUrl: string, caption: string): Promise<void>;
  sendPublishConfirmation(chatId: string, platform: string, permalink: string): Promise<void>;
}

/**
 * Inline keyboard buttons para el flujo de aprobación.
 * Usar buildApprovalKeyboard() en lugar de esta constante cuando sea posible.
 */
export const APPROVAL_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '✅ Aprobar', callback_data: 'approve' },
      { text: '✏️ Corregir texto', callback_data: 'correct_text' },
    ],
    [
      { text: '🎭 Cambiar tono', callback_data: 'change_tone' },
      { text: '🖼️ Regenerar imagen', callback_data: 'regenerate_image' },
    ],
    [
      { text: '🎬 Convertir a video', callback_data: 'convert_to_video' },
      { text: '⏰ Posponer', callback_data: 'postpone' },
    ],
    [{ text: '❌ Rechazar', callback_data: 'reject' }],
  ],
};

/**
 * Construye un keyboard dinámico de aprobación.
 * Si preferVideoFormat=true, muestra "🤖 Video Avatar" como primer botón de acción.
 */
export function buildApprovalKeyboard(preferVideoFormat: boolean) {
  const videoRow = preferVideoFormat
    ? [
        { text: '🤖 Video Avatar', callback_data: 'make_avatar_video' },
        { text: '🎬 Convertir a video', callback_data: 'convert_to_video' },
      ]
    : [
        { text: '🎬 Convertir a video', callback_data: 'convert_to_video' },
        { text: '⏰ Posponer', callback_data: 'postpone' },
      ];

  const lastRow = preferVideoFormat
    ? [
        { text: '⏰ Posponer', callback_data: 'postpone' },
        { text: '❌ Rechazar', callback_data: 'reject' },
      ]
    : [{ text: '❌ Rechazar', callback_data: 'reject' }];

  return {
    inline_keyboard: [
      [
        { text: '✅ Aprobar', callback_data: 'approve' },
        { text: '✏️ Corregir texto', callback_data: 'correct_text' },
      ],
      [
        { text: '🎭 Cambiar tono', callback_data: 'change_tone' },
        { text: '🖼️ Regenerar imagen', callback_data: 'regenerate_image' },
      ],
      videoRow,
      lastRow,
    ],
  };
}

/**
 * Keyboard para seleccionar tono
 */
export const TONE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📚 Didáctico', callback_data: 'tone_didáctico' },
      { text: '🔬 Técnico', callback_data: 'tone_técnico' },
    ],
    [
      { text: '🚀 Aspiracional', callback_data: 'tone_aspiracional' },
      { text: '💥 Polémico', callback_data: 'tone_polémico' },
    ],
    [
      { text: '💎 Premium', callback_data: 'tone_premium' },
      { text: '🤝 Cercano', callback_data: 'tone_cercano' },
    ],
    [{ text: '↩️ Cancelar', callback_data: 'tone_cancel' }],
  ],
} as const;

/**
 * Mapeo de callback_data a action type
 */
export const CALLBACK_TO_ACTION: Record<string, ApprovalActionType> = {
  approve: 'approved',
  correct_text: 'correct_text',
  change_tone: 'change_tone',
  regenerate_image: 'regenerate_image',
  convert_to_video: 'convert_to_video',
  make_avatar_video: 'make_avatar_video',
  postpone: 'postpone',
  reject: 'rejected',
};

/**
 * Formatea una preview para envío en Telegram
 */
export function formatPreviewMessage(preview: TelegramPreview): string {
  const lines = [
    `📝 *Nueva propuesta editorial — v${preview.version}*`,
    '',
    `🎯 *Objetivo:* ${preview.objective}`,
    `🎭 *Tono:* ${preview.tone}`,
    `📱 *Canales:* ${preview.targetChannels.join(', ')}`,
    `📐 *Formato:* ${preview.format}`,
    `📡 *Fuente:* ${preview.themeSource}`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    `🪝 *Hook:*`,
    preview.hook,
    '',
    `📄 *Copy:*`,
    preview.copy,
    '',
    `💬 *Caption:*`,
    preview.caption,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    `📢 *CTA:* ${preview.cta}`,
  ];

  return lines.join('\n');
}

/**
 * Formatea un mensaje de confirmación de publicación
 */
export function formatPublishConfirmation(
  platform: string,
  permalink: string,
): string {
  return [
    `✅ *Contenido publicado exitosamente*`,
    '',
    `📱 *Plataforma:* ${platform}`,
    `🔗 [Ver publicación](${permalink})`,
    '',
    `⏰ ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
  ].join('\n');
}

/**
 * Formatea un mensaje de error
 */
export function formatErrorMessage(stage: string, error: string): string {
  return [
    `⚠️ *Error en pipeline editorial*`,
    '',
    `📍 *Etapa:* ${stage}`,
    `❌ *Error:* ${error}`,
    '',
    `Revisa el panel web para más detalles.`,
  ].join('\n');
}

/**
 * Tipos para la API de Telegram Bot
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name: string; username?: string };
  text?: string;
  date: number;
  reply_to_message?: TelegramMessage;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name: string; username?: string };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramSendMessageParams {
  chat_id: string | number;
  text: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  reply_markup?: unknown;
  reply_to_message_id?: number;
}

export interface TelegramSendPhotoParams {
  chat_id: string | number;
  photo: string;
  caption?: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  reply_markup?: unknown;
}
