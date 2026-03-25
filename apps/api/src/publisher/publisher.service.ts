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
  TwitterPublisher,
  LinkedInPublisher,
  TikTokPublisher,
  YouTubePublisher,
  PinterestPublisher,
  MetaAdsPublisher,
  GoogleAdsPublisher,
  WhatsAppPublisher,
  MercadoLibrePublisher,
  MockPublisher,
  buildCaption,
} from '@automatismos/publishers';
import type {
  PublisherAdapter,
  MetaCredentials,
  PublishResult,
} from '@automatismos/publishers';
import { QUEUES, MAX_RETRIES, RETRY_BACKOFF_BASE_MS, decryptJson } from '@automatismos/shared';

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
    twitter: PublisherAdapter | null;
    linkedin: PublisherAdapter | null;
    tiktok: PublisherAdapter | null;
    youtube: PublisherAdapter | null;
    pinterest: PublisherAdapter | null;
    meta_ads: PublisherAdapter | null;
    google_ads: PublisherAdapter | null;
    whatsapp: PublisherAdapter | null;
    mercadolibre: PublisherAdapter | null;
  }> {
    let ig: PublisherAdapter | null = null;
    let fb: PublisherAdapter | null = null;
    let threads: PublisherAdapter | null = null;
    let discord: PublisherAdapter | null = null;
    let twitter: PublisherAdapter | null = null;
    let linkedin: PublisherAdapter | null = null;
    let tiktok: PublisherAdapter | null = null;
    let youtube: PublisherAdapter | null = null;
    let pinterest: PublisherAdapter | null = null;
    let meta_ads: PublisherAdapter | null = null;
    let google_ads: PublisherAdapter | null = null;
    let whatsapp: PublisherAdapter | null = null;
    let mercadolibre: PublisherAdapter | null = null;

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

        // Meta Ads — uses the same META credential (userToken + adAccountId)
        if (payload.adAccountId) {
          meta_ads = new MetaAdsPublisher({
            accessToken: payload.userToken || payload.accessToken,
            adAccountId: payload.adAccountId,
            pageId: payload.fbPageId,
          });
          this.logger.log(`Meta Ads adapter configured for workspace ${workspaceId} (account: ${payload.adAccountId})`);
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

    // --- New platforms via UserCredential (per-user, AES-256-GCM encrypted) ---
    const ownerId = await this.resolveOwnerId(workspaceId);
    if (ownerId) {
      // Twitter/X
      try {
        const twitterCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'TWITTER' } },
        });
        if (twitterCred?.isActive && twitterCred.encryptedPayload) {
          const p = decryptJson(twitterCred.encryptedPayload);
          if (p.accessToken) {
            twitter = new TwitterPublisher({ accessToken: p.accessToken, refreshToken: p.refreshToken, userId: p.userId, username: p.username });
            this.logger.log(`Twitter adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load Twitter credential:', e); }

      // LinkedIn
      try {
        const linkedinCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'LINKEDIN' } },
        });
        if (linkedinCred?.isActive && linkedinCred.encryptedPayload) {
          const p = decryptJson(linkedinCred.encryptedPayload);
          if (p.accessToken && p.authorUrn) {
            linkedin = new LinkedInPublisher({ accessToken: p.accessToken, authorUrn: p.authorUrn, name: p.name });
            this.logger.log(`LinkedIn adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load LinkedIn credential:', e); }

      // TikTok
      try {
        const tiktokCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'TIKTOK' } },
        });
        if (tiktokCred?.isActive && tiktokCred.encryptedPayload) {
          const p = decryptJson(tiktokCred.encryptedPayload);
          if (p.accessToken) {
            tiktok = new TikTokPublisher({ accessToken: p.accessToken, refreshToken: p.refreshToken, openId: p.openId, username: p.username });
            this.logger.log(`TikTok adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load TikTok credential:', e); }

      // YouTube — check GOOGLE credential first, then legacy YOUTUBE
      try {
        let ytCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'GOOGLE' } },
        });
        if (!ytCred?.isActive) {
          ytCred = await this.prisma.userCredential.findUnique({
            where: { userId_provider: { userId: ownerId, provider: 'YOUTUBE' } },
          });
        }
        if (ytCred?.isActive && ytCred.encryptedPayload) {
          const p = decryptJson(ytCred.encryptedPayload);
          if (p.accessToken && p.channelId) {
            youtube = new YouTubePublisher({ accessToken: p.accessToken, refreshToken: p.refreshToken, channelId: p.channelId, channelTitle: p.channelTitle });
            this.logger.log(`YouTube adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load YouTube credential:', e); }

      // Pinterest
      try {
        const pinterestCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'PINTEREST' } },
        });
        if (pinterestCred?.isActive && pinterestCred.encryptedPayload) {
          const p = decryptJson(pinterestCred.encryptedPayload);
          if (p.accessToken && p.boardId) {
            pinterest = new PinterestPublisher({ accessToken: p.accessToken, refreshToken: p.refreshToken, boardId: p.boardId, boardName: p.boardName, username: p.username });
            this.logger.log(`Pinterest adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load Pinterest credential:', e); }

      // Google Ads — from GOOGLE credential (same as YouTube)
      try {
        const googleCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'GOOGLE' } },
        });
        if (googleCred?.isActive && googleCred.encryptedPayload) {
          const p = decryptJson(googleCred.encryptedPayload);
          if (p.accessToken && p.adsCustomerId) {
            const developerToken = this.config.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN', '');
            if (developerToken) {
              google_ads = new GoogleAdsPublisher({
                accessToken: p.accessToken,
                refreshToken: p.refreshToken,
                customerId: p.adsCustomerId,
                developerToken,
              });
              this.logger.log(`Google Ads adapter configured for workspace ${workspaceId}`);
            }
          }
        }
      } catch (e) { this.logger.warn('Failed to load Google Ads credential:', e); }

      // WhatsApp — via Evolution API
      try {
        const waCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'WHATSAPP' } },
        });
        if (waCred?.isActive && waCred.encryptedPayload) {
          const p = decryptJson(waCred.encryptedPayload);
          if (p.instanceUrl && p.apiKey && p.instanceName) {
            whatsapp = new WhatsAppPublisher({ instanceUrl: p.instanceUrl, apiKey: p.apiKey, instanceName: p.instanceName });
            this.logger.log(`WhatsApp adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load WhatsApp credential:', e); }

      // Mercado Libre
      try {
        const mlCred = await this.prisma.userCredential.findUnique({
          where: { userId_provider: { userId: ownerId, provider: 'MERCADOLIBRE' } },
        });
        if (mlCred?.isActive && mlCred.encryptedPayload) {
          const p = decryptJson(mlCred.encryptedPayload);
          if (p.accessToken && p.userId) {
            mercadolibre = new MercadoLibrePublisher({ accessToken: p.accessToken, refreshToken: p.refreshToken, userId: p.userId, nickname: p.nickname, siteId: p.siteId });
            this.logger.log(`MercadoLibre adapter configured for workspace ${workspaceId}`);
          }
        }
      } catch (e) { this.logger.warn('Failed to load MercadoLibre credential:', e); }
    }

    return { ig, fb, threads, discord, twitter, linkedin, tiktok, youtube, pinterest, meta_ads, google_ads, whatsapp, mercadolibre };
  }

  /**
   * Resolve the owner userId for a workspace.
   */
  private async resolveOwnerId(workspaceId: string): Promise<string | null> {
    try {
      const owner = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, role: 'OWNER' },
        select: { userId: true },
      });
      return owner?.userId ?? null;
    } catch {
      return null;
    }
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
      const platform = channel.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'THREADS' | 'TWITTER' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'PINTEREST' | 'META_ADS' | 'GOOGLE_ADS' | 'WHATSAPP' | 'MERCADOLIBRE' | 'DISCORD' | 'TELEGRAM';

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

    const platform = publication.platform.toLowerCase() as PublishResult['platform'];

    // Get workspace ID for credential lookup
    const workspaceId = publication.editorialRun?.workspaceId;
    if (!workspaceId) {
      const error = 'No workspace ID found for publication';
      await this.markFailed(publicationId, error);
      return { success: false, platform, error };
    }

    const adapters = await this.getAdaptersForWorkspace(workspaceId);
    const adapterMap: Record<string, PublisherAdapter | null> = {
      instagram: adapters.ig,
      facebook: adapters.fb,
      threads: adapters.threads,
      discord: adapters.discord,
      twitter: adapters.twitter,
      linkedin: adapters.linkedin,
      tiktok: adapters.tiktok,
      youtube: adapters.youtube,
      pinterest: adapters.pinterest,
      meta_ads: adapters.meta_ads,
      google_ads: adapters.google_ads,
      whatsapp: adapters.whatsapp,
      mercadolibre: adapters.mercadolibre,
    };
    const adapter = adapterMap[platform] ?? null;

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

    // Check for video assets
    const videoAsset = mediaAssets.find((a) => a.type === 'VIDEO' || a.type === 'AVATAR_VIDEO');
    const videoUrl = videoAsset?.optimizedUrl ?? videoAsset?.originalUrl ?? null;
    const thumbnailUrl = videoAsset?.thumbnailUrl ?? null;
    const format = (publication.editorialRun?.contentBrief?.format ?? '').toLowerCase();
    const isVideo = !!videoUrl || ['reel', 'video', 'short', 'reels'].includes(format);

    let result: PublishResult;

    // Build payload for audit
    const payload = { caption, hashtags, imageUrls, videoUrl, format: publication.editorialRun?.contentBrief?.format };

    try {
      if (isVideo && videoUrl) {
        // Video / Reel / Short
        result = await adapter.publishVideo({
          videoUrl,
          caption,
          hashtags,
          thumbnailUrl: thumbnailUrl ?? undefined,
        });
      } else if (imageUrls.length > 1) {
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
      const platformLabels: Record<string, string> = {
        instagram: '📷 Instagram',
        facebook: '📘 Facebook',
        threads: '🧵 Threads',
        twitter: '🐦 Twitter/X',
        linkedin: '💼 LinkedIn',
        tiktok: '🎵 TikTok',
        youtube: '▶️ YouTube',
        pinterest: '📌 Pinterest',
        discord: '🎮 Discord',
        meta_ads: '📢 Meta Ads',
        google_ads: '📊 Google Ads',
        whatsapp: '📡 WhatsApp',
        mercadolibre: '🛒 Mercado Libre',
      };
      const platformLabel = platformLabels[platform] ?? `📣 ${platform}`;
      await this.telegram.sendPublishConfirmation(
        platformLabel,
        result.permalink ?? `Post ID: ${result.externalPostId}`,
        ownerChatId,
      );

      // Cross-post to Discord (fire-and-forget)
      try {
        if (adapters.discord) {
          const emojiMap: Record<string, string> = { instagram: '📷', facebook: '📘', threads: '🧵', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '▶️', pinterest: '📌', meta_ads: '📢', google_ads: '📊', whatsapp: '📡', mercadolibre: '🛒' };
          const nameMap: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', threads: 'Threads', twitter: 'Twitter/X', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest', meta_ads: 'Meta Ads', google_ads: 'Google Ads', whatsapp: 'WhatsApp', mercadolibre: 'Mercado Libre' };
          const platformEmoji = emojiMap[platform] ?? '📣';
          const platformName = nameMap[platform] ?? platform;
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
      const platform = channel.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'THREADS' | 'TWITTER' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'PINTEREST' | 'META_ADS' | 'GOOGLE_ADS' | 'WHATSAPP' | 'MERCADOLIBRE' | 'DISCORD' | 'TELEGRAM';

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
