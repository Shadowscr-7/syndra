// ============================================================
// Publisher Service — Lógica de publicación con reintentos e idempotencia
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import {
  InstagramPublisher,
  FacebookPublisher,
  ThreadsPublisher,
  DiscordPublisher,
  MockPublisher,
  buildCaption,
} from '@automatismos/publishers';
import type {
  PublisherAdapter,
  MetaCredentials,
  PublishResult,
} from '@automatismos/publishers';
import { QUEUES, MAX_RETRIES, RETRY_BACKOFF_BASE_MS } from '@automatismos/shared';

@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);
  private readonly useMock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
    private readonly telegram: TelegramBotService,
  ) {
    this.useMock = false; // Will check DB credentials at runtime
  }

  /**
   * Resolve the Telegram chatId for the workspace owner via TelegramLink.
   * Returns undefined if no link exists (falls back to env TELEGRAM_CHAT_ID).
   */
  private async resolveOwnerChatId(workspaceId: string): Promise<string | undefined> {
    try {
      const ownerMembership = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, role: 'OWNER' },
        select: { userId: true },
      });
      if (!ownerMembership) return undefined;
      const link = await this.prisma.telegramLink.findUnique({
        where: { userId: ownerMembership.userId },
      });
      return link?.chatId ?? undefined;
    } catch {
      return undefined;
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Load Meta credentials from DB (OAuth) or fallback to env vars.
   * Returns adapters dynamically per workspace.
   */
  private async getAdaptersForWorkspace(workspaceId: string): Promise<{
    ig: PublisherAdapter | null;
    fb: PublisherAdapter | null;
    threads: PublisherAdapter | null;
    discord: PublisherAdapter | null;
  }> {
    let ig: PublisherAdapter | null = null;
    let fb: PublisherAdapter | null = null;
    let threads: PublisherAdapter | null = null;
    let discord: PublisherAdapter | null = null;

    // --- Meta (Instagram + Facebook + Threads) ---
    const metaCred = await this.prisma.apiCredential.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: 'META' },
      },
    });

    if (metaCred?.encryptedKey && metaCred.isActive) {
      try {
        const payload = JSON.parse(
          Buffer.from(metaCred.encryptedKey, 'base64').toString('utf-8'),
        );
        const creds: MetaCredentials = {
          accessToken: payload.accessToken,
          instagramAccountId: payload.igUserId || undefined,
          facebookPageId: payload.fbPageId || undefined,
        };
        this.logger.log(`Using OAuth credentials for workspace ${workspaceId} (page: ${payload.fbPageName})`);
        ig = creds.instagramAccountId ? new InstagramPublisher(creds) : null;
        fb = creds.facebookPageId ? new FacebookPublisher(creds) : null;

        // Threads uses user-level token (not page token) with the Threads user ID
        const threadsUserId = payload.threadsUserId || payload.igUserId;
        const threadsToken = payload.userToken || payload.accessToken; // Threads API needs user token
        if (threadsUserId) {
          threads = new ThreadsPublisher({
            accessToken: threadsToken,
            threadsUserId,
          });
          this.logger.log(`Threads adapter configured for workspace ${workspaceId} (user: ${threadsUserId})`);
        }
      } catch (err) {
        this.logger.error('Failed to parse DB credentials:', err);
      }
    } else {
      // Fallback to env vars for Meta
      const envToken = this.config.get('META_ACCESS_TOKEN');
      if (envToken) {
        const creds: MetaCredentials = {
          accessToken: envToken,
          instagramAccountId: this.config.get('META_INSTAGRAM_ACCOUNT_ID'),
          facebookPageId: this.config.get('META_FACEBOOK_PAGE_ID'),
        };
        ig = creds.instagramAccountId ? new InstagramPublisher(creds) : null;
        fb = creds.facebookPageId ? new FacebookPublisher(creds) : null;
      }
    }

    // --- Discord ---
    const discordCred = await this.prisma.apiCredential.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: 'DISCORD' },
      },
    });

    if (discordCred?.encryptedKey && discordCred.isActive) {
      try {
        const payload = JSON.parse(
          Buffer.from(discordCred.encryptedKey, 'base64').toString('utf-8'),
        );
        if (payload.webhookUrl) {
          discord = new DiscordPublisher({
            webhookUrl: payload.webhookUrl,
            username: payload.username || 'Syndra',
          });
          this.logger.log(`Discord webhook configured for workspace ${workspaceId}`);
        }
      } catch (err) {
        this.logger.error('Failed to parse Discord credentials:', err);
      }
    } else {
      // Fallback to env var
      const webhookUrl = this.config.get('DISCORD_WEBHOOK_URL');
      if (webhookUrl) {
        discord = new DiscordPublisher({ webhookUrl });
      }
    }

    return { ig, fb, threads, discord };
  }

  /**
   * Encola publicación para un editorial run aprobado.
   * Crea un registro Publication por cada canal target.
   */
  async enqueuePublication(
    editorialRunId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
      include: {
        contentBrief: {
          include: {
            contentVersions: {
              where: { isMain: true, isApproved: true },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const channels = (run.targetChannels ?? ['instagram']) as string[];
    const publicationIds: string[] = [];

    for (const channel of channels) {
      const platform = channel.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'THREADS';

      // Idempotencia: verificar que no exista ya una publicación exitosa
      const existing = await this.prisma.publication.findFirst({
        where: {
          editorialRunId,
          platform,
          status: 'PUBLISHED',
        },
      });

      if (existing) {
        this.logger.warn(
          `Publication already exists for run ${editorialRunId} on ${platform}: ${existing.id}`,
        );
        publicationIds.push(existing.id);
        continue;
      }

      // Crear registro de publicación
      const publication = await this.prisma.publication.create({
        data: {
          editorialRunId,
          platform,
          status: 'QUEUED',
        },
      });

      publicationIds.push(publication.id);

      // Encolar job
      try {
        await this.queueService.enqueue(QUEUES.PUBLISH, {
          type: 'publish',
          jobId: `job_pub_${publication.id}`,
          editorialRunId,
          workspaceId,
          publicationId: publication.id,
          platform: channel,
          contentVersionId: run.contentBrief?.contentVersions[0]?.id ?? '',
          timestamp: new Date().toISOString(),
          attempt: 1,
        });
      } catch {
        // Si la cola no está disponible, procesamos directamente
        this.logger.warn('Queue unavailable, processing publication directly');
        await this.executePublication(publication.id);
      }
    }

    return publicationIds;
  }

  /**
   * Ejecuta la publicación real de un registro Publication.
   * Maneja reintentos con backoff exponencial.
   */
  async executePublication(publicationId: string): Promise<PublishResult> {
    const publication = await this.prisma.publication.findUniqueOrThrow({
      where: { id: publicationId },
      include: {
        editorialRun: {
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
        },
      },
    });

    // Idempotencia: ya publicado
    if (publication.status === 'PUBLISHED' && publication.externalPostId) {
      this.logger.log(`Publication ${publicationId} already published`);
      return {
        success: true,
        platform: publication.platform.toLowerCase() as 'instagram' | 'facebook',
        externalPostId: publication.externalPostId,
        permalink: publication.permalink ?? undefined,
      };
    }

    // Marcar como PUBLISHING
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: 'PUBLISHING' },
    });

    const version = publication.editorialRun?.contentBrief?.contentVersions[0];
    if (!version) {
      const error = 'No approved content version found';
      await this.markFailed(publicationId, error);
      return { success: false, platform: publication.platform.toLowerCase() as any, error };
    }

    // Obtener media assets
    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: { contentVersionId: version.id, status: 'READY' },
      orderBy: { createdAt: 'asc' },
    });

    const platform = publication.platform.toLowerCase() as 'instagram' | 'facebook' | 'threads';

    // Get workspace ID for credential lookup
    const workspaceId = publication.editorialRun?.workspaceId;
    if (!workspaceId) {
      const error = 'No workspace ID found for publication';
      await this.markFailed(publicationId, error);
      return { success: false, platform, error };
    }

    const adapters = await this.getAdaptersForWorkspace(workspaceId);
    const adapter = platform === 'instagram'
      ? adapters.ig
      : platform === 'threads'
        ? adapters.threads
        : adapters.fb;

    if (!adapter) {
      const error = `No adapter available for ${platform}`;
      await this.markFailed(publicationId, error);
      return { success: false, platform, error };
    }

    // Determinar tipo de publicación
    const caption = version.caption ?? version.copy ?? '';
    const hashtags = (version as { hashtags?: string[] }).hashtags ?? [];
    const imageUrls = mediaAssets
      .map((a) => a.optimizedUrl ?? a.originalUrl)
      .filter((url): url is string => !!url && !url.startsWith('data:'));

    let result: PublishResult;

    // Build payload for audit
    const payload = { caption, hashtags, imageUrls, format: publication.editorialRun?.contentBrief?.format };

    try {
      if (imageUrls.length > 1) {
        // Carousel
        result = await adapter.publishCarousel({
          imageUrls,
          caption,
          hashtags,
        });
      } else if (imageUrls.length === 1) {
        // Single image
        result = await adapter.publishImage({
          imageUrl: imageUrls[0]!,
          caption,
          hashtags,
        });
      } else {
        // Text-only (no media) — publish image with placeholder
        result = {
          success: false,
          platform,
          error: 'No media assets available for publication',
        };
      }
    } catch (error) {
      result = {
        success: false,
        platform,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Guardar resultado
    if (result.success) {
      await this.prisma.publication.update({
        where: { id: publicationId },
        data: {
          status: 'PUBLISHED',
          externalPostId: result.externalPostId ?? null,
          permalink: result.permalink ?? null,
          payloadSent: payload as any,
          apiResponse: (result.rawResponse ?? { success: true }) as any,
          publishedAt: new Date(),
        },
      });

      // Actualizar editorial run status
      await this.prisma.editorialRun.update({
        where: { id: publication.editorialRunId },
        data: { status: 'PUBLISHED' },
      });

      // Notificar por Telegram (resolver chatId del owner del workspace)
      const ownerChatId = await this.resolveOwnerChatId(workspaceId);
      const platformLabel = platform === 'instagram' ? '📷 Instagram'
        : platform === 'threads' ? '🧵 Threads'
        : '📘 Facebook';
      await this.telegram.sendPublishConfirmation(
        platformLabel,
        result.permalink ?? `Post ID: ${result.externalPostId}`,
        ownerChatId,
      );

      // Cross-post to Discord (fire-and-forget)
      try {
        if (adapters.discord) {
          const platformEmoji = platform === 'instagram' ? '📷' : platform === 'threads' ? '🧵' : '📘';
          const platformName = platform === 'instagram' ? 'Instagram' : platform === 'threads' ? 'Threads' : 'Facebook';
          const discordCaption = `${platformEmoji} Nuevo post en ${platformName}!\n\n${caption}${result.permalink ? `\n\n🔗 ${result.permalink}` : ''}`;
          if (imageUrls.length > 1) {
            await adapters.discord.publishCarousel({ imageUrls, caption: discordCaption, hashtags });
          } else if (imageUrls.length === 1) {
            await adapters.discord.publishImage({ imageUrl: imageUrls[0]!, caption: discordCaption, hashtags });
          }
          this.logger.log(`Cross-posted to Discord for publication ${publicationId}`);
        }
      } catch (discordErr) {
        this.logger.warn(`Discord cross-post failed (non-blocking): ${discordErr}`);
      }

      this.logger.log(
        `Published ${publicationId} to ${platform}: ${result.externalPostId}`,
      );
    } else {
      await this.handlePublishFailure(publicationId, result, payload);
    }

    return result;
  }

  /**
   * Reintenta manualmente una publicación fallida
   */
  async retryPublication(publicationId: string): Promise<PublishResult> {
    // Reset status
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: 'RETRYING' },
    });

    return this.executePublication(publicationId);
  }

  /**
   * Publica manualmente un editorial run aprobado (sin cola).
   * Creates Publications and executes them directly, skipping the queue.
   */
  async publishManually(editorialRunId: string): Promise<PublishResult[]> {
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

    const channels = (run.targetChannels ?? ['instagram']) as string[];
    const results: PublishResult[] = [];

    for (const channel of channels) {
      const platform = channel.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'THREADS';

      // Idempotencia: verificar que no exista ya una publicación exitosa
      const existing = await this.prisma.publication.findFirst({
        where: { editorialRunId, platform, status: 'PUBLISHED' },
      });
      if (existing) {
        this.logger.log(`Already published on ${platform}: ${existing.id}`);
        results.push({
          success: true,
          platform: platform.toLowerCase() as any,
          externalPostId: existing.externalPostId ?? undefined,
          permalink: existing.permalink ?? undefined,
        });
        continue;
      }

      // Create publication record
      const publication = await this.prisma.publication.create({
        data: { editorialRunId, platform, status: 'QUEUED' },
      });

      // Execute directly (no queue)
      const result = await this.executePublication(publication.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Lista publicaciones con filtros
   */
  async listPublications(filters?: {
    platform?: string;
    status?: string;
    editorialRunId?: string;
    take?: number;
  }) {
    return this.prisma.publication.findMany({
      where: {
        ...(filters?.platform ? { platform: filters.platform as any } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.editorialRunId
          ? { editorialRunId: filters.editorialRunId }
          : {}),
      },
      include: {
        editorialRun: {
          select: {
            id: true,
            targetChannels: true,
            contentBrief: {
              select: { angle: true, format: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.take ?? 50,
    });
  }

  /**
   * Obtiene detalle de una publicación
   */
  async getPublication(publicationId: string) {
    return this.prisma.publication.findUniqueOrThrow({
      where: { id: publicationId },
      include: {
        editorialRun: {
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
        },
      },
    });
  }

  // ============================================================
  // Private
  // ============================================================

  // (Adapters are now loaded dynamically per-workspace via getAdaptersForWorkspace)

  private async handlePublishFailure(
    publicationId: string,
    result: PublishResult,
    payload: unknown,
  ): Promise<void> {
    const publication = await this.prisma.publication.findUniqueOrThrow({
      where: { id: publicationId },
      include: { editorialRun: { select: { workspaceId: true } } },
    });

    const newRetryCount = publication.retryCount + 1;

    if (newRetryCount < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, newRetryCount - 1);

      await this.prisma.publication.update({
        where: { id: publicationId },
        data: {
          status: 'RETRYING',
          retryCount: newRetryCount,
          errorMessage: result.error ?? 'Unknown error',
          payloadSent: payload as any,
          apiResponse: (result.rawResponse ?? { error: result.error }) as any,
        },
      });

      this.logger.warn(
        `Publication ${publicationId} failed (attempt ${newRetryCount}/${MAX_RETRIES}), retrying in ${backoffMs}ms`,
      );

      // Simple delayed retry
      setTimeout(() => {
        this.executePublication(publicationId).catch((err) =>
          this.logger.error(`Retry failed for ${publicationId}:`, err),
        );
      }, backoffMs);
    } else {
      // Max retries reached
      await this.markFailed(publicationId, result.error ?? 'Max retries exceeded');

      // Alert via Telegram (resolve owner chatId)
      const wsId = publication.editorialRun?.workspaceId;
      const chatId = wsId ? await this.resolveOwnerChatId(wsId) : undefined;
      await this.telegram.sendError(
        'publish',
        `Publicación fallida tras ${MAX_RETRIES} intentos.\n\nPlataforma: ${result.platform}\nError: ${result.error}\nID: ${publicationId}`,
        chatId,
      );
    }
  }

  private async markFailed(publicationId: string, error: string): Promise<void> {
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: 'NEEDS_MANUAL_ATTENTION',
        errorMessage: error,
      },
    });
  }
}
