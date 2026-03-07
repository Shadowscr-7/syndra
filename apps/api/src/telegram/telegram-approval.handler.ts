// ============================================================
// Telegram Approval Handler — Lógica de callbacks y aprobación
// ============================================================

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from './telegram-bot.service';
import { EditorialOrchestratorService } from '../editorial/editorial-orchestrator.service';
import { ContentService } from '../content/content.service';
import { MediaEngineService } from '../media/media-engine.service';
import { VideoService } from '../video/video.service';
import { CALLBACK_TO_ACTION } from '@automatismos/telegram';
import type { TelegramCallbackQuery, TelegramMessage } from '@automatismos/telegram';

/**
 * Estado temporal de conversación para manejar flujos multi-paso
 * (ej: "corregir texto" → esperar respuesta → aplicar corrección)
 */
interface ConversationState {
  editorialRunId: string;
  contentVersionId: string;
  action: string;
  messageId: number;
  expiresAt: number;
}

@Injectable()
export class TelegramApprovalHandler {
  private readonly logger = new Logger(TelegramApprovalHandler.name);

  /**
   * Estado temporal de conversación en memoria.
   * En producción se podría mover a Redis o a la BD.
   */
  private conversationStates: Map<number, ConversationState> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: TelegramBotService,
    @Inject(forwardRef(() => EditorialOrchestratorService))
    private readonly orchestrator: EditorialOrchestratorService,
    private readonly contentService: ContentService,
    private readonly mediaEngine: MediaEngineService,
    @Inject(forwardRef(() => VideoService))
    private readonly videoService: VideoService,
  ) {}

  /**
   * Punto de entrada: envía la preview de un editorial run a Telegram
   */
  async sendForReview(editorialRunId: string): Promise<void> {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: {
        contentBrief: {
          include: {
            theme: true,
            contentVersions: {
              where: { isMain: true },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        campaign: true,
      },
    });

    const version = run.contentBrief?.contentVersions[0];
    if (!version) {
      this.logger.error(`No main version found for run ${editorialRunId}`);
      return;
    }

    const telegramMsgId = await this.sendPreviewWithMedia(
      editorialRunId,
      version,
      run,
    );

    // Registrar el evento de envío
    await this.prisma.approvalEvent.create({
      data: {
        editorialRunId,
        action: 'APPROVED', // placeholder: será actualizado cuando el usuario responda
        telegramMsgId,
        telegramChatId: String(telegramMsgId),
        versionNumber: version.version,
      },
    });

    this.logger.log(`Sent preview for run ${editorialRunId} to Telegram`);
  }

  /**
   * Maneja un callback_query (cuando el usuario presiona un botón inline)
   */
  async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const callbackData = query.data ?? '';
    const chatId = query.message?.chat.id ?? 0;
    const messageId = query.message?.message_id ?? 0;
    const userId = query.from.id;

    this.logger.log(
      `Callback query: user=${query.from.first_name}, data=${callbackData}`,
    );

    // Responder al callback para quitar el loading
    await this.bot.answerCallbackQuery(query.id);

    // Manejar selección de tono
    if (callbackData.startsWith('tone_')) {
      await this.handleToneSelection(callbackData, userId, chatId);
      return;
    }

    // Mapear callback a action
    const action = CALLBACK_TO_ACTION[callbackData];
    if (!action) {
      this.logger.warn(`Unknown callback data: ${callbackData}`);
      return;
    }

    // Buscar el editorial run asociado al mensaje
    const approvalEvent = await this.prisma.approvalEvent.findFirst({
      where: { telegramMsgId: String(messageId) },
      orderBy: { createdAt: 'desc' },
    });

    if (!approvalEvent) {
      this.logger.warn(`No approval event found for message ${messageId}`);
      return;
    }

    const editorialRunId = approvalEvent.editorialRunId;

    // Obtener la versión actual
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: {
        contentBrief: {
          include: {
            contentVersions: {
              where: { isMain: true },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const currentVersion = run.contentBrief?.contentVersions[0];
    if (!currentVersion) {
      this.logger.error(`No current version for run ${editorialRunId}`);
      return;
    }

    // Registrar el evento de aprobación
    await this.prisma.approvalEvent.create({
      data: {
        editorialRunId,
        action: action.toUpperCase() as any,
        telegramChatId: String(chatId),
        telegramMsgId: String(messageId),
        approvedBy: query.from.username ?? query.from.first_name,
        versionNumber: currentVersion.version,
      },
    });

    // Procesar la acción
    switch (action) {
      case 'approved':
        await this.handleApproval(editorialRunId, messageId);
        break;

      case 'correct_text':
        await this.handleCorrectionRequest(
          editorialRunId,
          currentVersion.id,
          messageId,
          userId,
        );
        break;

      case 'change_tone':
        await this.handleToneChangeRequest(
          editorialRunId,
          currentVersion.id,
          messageId,
          userId,
        );
        break;

      case 'regenerate_image':
        await this.handleRegenerateImage(
          editorialRunId,
          currentVersion.id,
          messageId,
        );
        break;

      case 'convert_to_video':
        await this.handleConvertToVideo(editorialRunId, messageId);
        break;

      case 'postpone':
        await this.handlePostpone(editorialRunId, messageId);
        break;

      case 'rejected':
        await this.handleRejection(editorialRunId, messageId);
        break;
    }
  }

  /**
   * Maneja un mensaje de texto (posible respuesta a corrección)
   */
  async handleTextMessage(message: TelegramMessage): Promise<void> {
    const userId = message.from?.id;
    if (!userId) return;

    const state = this.conversationStates.get(userId);
    if (!state || state.expiresAt < Date.now()) {
      this.conversationStates.delete(userId);
      return;
    }

    if (state.action === 'correct_text') {
      const feedback = message.text ?? '';
      if (!feedback) return;

      await this.bot.sendNotification('⏳ Aplicando corrección...');

      try {
        const run = await this.prisma.editorialRun.findUniqueOrThrow({
          where: { id: state.editorialRunId },
        });

        const result = await this.contentService.applyCorrection(
          state.contentVersionId,
          feedback,
          run.workspaceId,
        );

        // Enviar nueva preview
        await this.sendForReview(state.editorialRunId);

        this.logger.log(
          `Correction applied for run ${state.editorialRunId}, new version: ${result.newVersionId}`,
        );
      } catch (error) {
        this.logger.error('Correction failed:', error);
        await this.bot.sendError('correction', String(error));
      }

      this.conversationStates.delete(userId);
    }
  }

  // ============================================================
  // Private handlers
  // ============================================================

  private async handleApproval(editorialRunId: string, messageId: number): Promise<void> {
    await this.bot.removeKeyboard(messageId);
    await this.bot.sendApprovalConfirmation(editorialRunId);

    // Marcar la versión como aprobada
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: {
        contentBrief: {
          include: {
            contentVersions: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
    });

    const versionId = run.contentBrief?.contentVersions[0]?.id;
    if (versionId) {
      await this.prisma.contentVersion.update({
        where: { id: versionId },
        data: { isApproved: true },
      });
    }

    // Transicionar el pipeline
    await this.orchestrator.onApproved(editorialRunId);
  }

  private async handleCorrectionRequest(
    editorialRunId: string,
    contentVersionId: string,
    messageId: number,
    userId: number,
  ): Promise<void> {
    // Guardar estado de conversación (espera respuesta de texto)
    this.conversationStates.set(userId, {
      editorialRunId,
      contentVersionId,
      action: 'correct_text',
      messageId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
    });

    await this.bot.requestCorrectionText(messageId);
  }

  private async handleToneChangeRequest(
    editorialRunId: string,
    contentVersionId: string,
    messageId: number,
    userId: number,
  ): Promise<void> {
    this.conversationStates.set(userId, {
      editorialRunId,
      contentVersionId,
      action: 'change_tone',
      messageId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await this.bot.sendToneSelector(messageId);
  }

  private async handleToneSelection(
    callbackData: string,
    userId: number,
    chatId: number,
  ): Promise<void> {
    const tone = callbackData.replace('tone_', '');

    if (tone === 'cancel') {
      this.conversationStates.delete(userId);
      await this.bot.sendNotification('↩️ Cambio de tono cancelado.');
      return;
    }

    const state = this.conversationStates.get(userId);
    if (!state || state.action !== 'change_tone') {
      return;
    }

    await this.bot.sendNotification(`⏳ Generando variante con tono *${tone}*...`);

    try {
      const run = await this.prisma.editorialRun.findUniqueOrThrow({
        where: { id: state.editorialRunId },
      });

      await this.contentService.changeTone(
        state.contentVersionId,
        tone,
        run.workspaceId,
      );

      // Enviar nueva preview
      await this.sendForReview(state.editorialRunId);
    } catch (error) {
      this.logger.error('Tone change failed:', error);
      await this.bot.sendError('tone_change', String(error));
    }

    this.conversationStates.delete(userId);
  }

  private async handleConvertToVideo(editorialRunId: string, messageId: number): Promise<void> {
    await this.bot.removeKeyboard(messageId);
    await this.bot.sendNotification('🎬 Generando video con avatar IA...\n\n⏳ Esto puede tardar 2-5 minutos.');

    try {
      const { mediaAssetId, jobId } = await this.videoService.convertToVideo(editorialRunId);

      // Enviar preview del script
      const preview = await this.videoService.previewScript(editorialRunId);
      const scriptPreview = preview.blocks
        .map((b, i) => `${i + 1}. [${b.role}] ${b.text.substring(0, 60)}${b.text.length > 60 ? '...' : ''} (${b.duration}s)`)
        .join('\n');

      await this.bot.sendNotification(
        `🎬 *Video en render*\n\n` +
        `📋 *Template:* ${preview.templateName}\n` +
        `⏱ *Duración:* ${preview.totalDuration}s\n\n` +
        `📝 *Script:*\n${scriptPreview}\n\n` +
        `🔄 Job: \`${jobId}\`\nAsset: \`${mediaAssetId}\`\n\n` +
        `Te notificaré cuando esté listo.`,
      );

      this.logger.log(`Video conversion started for run ${editorialRunId}, asset ${mediaAssetId}`);
    } catch (error) {
      this.logger.error('Video conversion failed:', error);
      await this.bot.sendError('convert_to_video', String(error));
    }
  }

  private async handlePostpone(editorialRunId: string, messageId: number): Promise<void> {
    await this.bot.removeKeyboard(messageId);
    await this.bot.sendNotification('⏰ Contenido pospuesto.');
    await this.orchestrator.onPostponed(editorialRunId);
  }

  private async handleRejection(editorialRunId: string, messageId: number): Promise<void> {
    await this.bot.removeKeyboard(messageId);
    await this.bot.sendNotification('❌ Contenido rechazado.');
    await this.orchestrator.onRejected(editorialRunId, 'Rejected via Telegram');
  }

  /**
   * Regenera la imagen y reenvía preview
   */
  private async handleRegenerateImage(
    editorialRunId: string,
    contentVersionId: string,
    messageId: number,
  ): Promise<void> {
    await this.bot.removeKeyboard(messageId);
    await this.bot.sendNotification('🖼️ Regenerando imagen...');

    try {
      await this.mediaEngine.regenerateImage(contentVersionId);
      await this.sendForReview(editorialRunId);
      this.logger.log(`Image regenerated for run ${editorialRunId}`);
    } catch (error) {
      this.logger.error('Image regeneration failed:', error);
      await this.bot.sendError('regenerate_image', String(error));
    }
  }

  /**
   * Envía preview a Telegram incluyendo media si hay assets disponibles
   */
  private async sendPreviewWithMedia(
    editorialRunId: string,
    version: { version: number; copy: string; caption: string; hook: string; id: string },
    run: {
      targetChannels: string[];
      contentBrief: {
        format: string;
        objective: string;
        cta: string;
        tone: string;
        theme: { name: string } | null;
        contentVersions: Array<{ id: string }>;
      } | null;
    },
  ): Promise<string> {
    // Buscar media assets para esta versión
    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: {
        contentVersionId: version.id,
        status: 'READY',
      },
      orderBy: { createdAt: 'desc' },
    });

    const mediaUrls = mediaAssets
      .map((a) => a.optimizedUrl ?? a.originalUrl)
      .filter((url): url is string => !!url && !url.startsWith('data:'));

    const thumbnailUrl = mediaAssets.find((a) => a.thumbnailUrl)?.thumbnailUrl ?? undefined;

    const preview = {
      editorialRunId,
      version: version.version,
      copy: version.copy,
      caption: version.caption,
      hook: version.hook,
      format: (run.contentBrief?.format ?? 'POST').toLowerCase() as any,
      targetChannels: run.targetChannels as any,
      objective: run.contentBrief?.objective ?? '',
      cta: run.contentBrief?.cta ?? '',
      tone: run.contentBrief?.tone ?? '',
      themeSource: run.contentBrief?.theme?.name ?? 'Sin tema',
      thumbnailUrl,
    };

    if (mediaUrls.length > 0) {
      return this.bot.sendMediaPreview(preview, mediaUrls);
    }

    return this.bot.sendPreview(preview);
  }
}
