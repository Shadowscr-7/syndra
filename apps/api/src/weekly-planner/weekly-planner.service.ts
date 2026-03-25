// ============================================================
// Weekly Planner Service — Planificación semanal de contenido
// ============================================================

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialOrchestratorService } from '../editorial/editorial-orchestrator.service';
import { PlansService } from '../plans/plans.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import { ContentService } from '../content/content.service';
import { MediaEngineService } from '../media/media-engine.service';
import { VideoService } from '../video/video.service';
import { CreditService, CREDIT_COSTS } from '../credits/credits.service';
import { BackgroundTasksService } from '../media/background-tasks.service';

// Map DayOfWeek enum to JS day index (0=Sunday)
const DAY_INDEX: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

interface CreateConfigDto {
  name?: string;
  plannerRunDays: string[];
  plannerRunTime: string;
  publishDays: string[];
  publishTime: string;
  targetChannels?: string[];
  timezone?: string;
  contentMode?: string; // 'editorial' | 'business'
  approvalMode?: string; // 'telegram' | 'panel'
  musicEnabled?: boolean;
  musicStyle?: string;  // upbeat | calm | corporate | energetic | cinematic
  musicPrompt?: string; // Custom description for music generation
}

interface UpdateConfigDto extends Partial<CreateConfigDto> {
  isActive?: boolean;
}

@Injectable()
export class WeeklyPlannerService {
  private readonly logger = new Logger(WeeklyPlannerService.name);
  private readonly skipMusicBatches = new Set<string>();
  /** Tracks items that already had auto-music triggered (prevents double-trigger) */
  private readonly musicTriggeredItems = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: EditorialOrchestratorService,
    private readonly plansService: PlansService,
    private readonly telegramBot: TelegramBotService,
    private readonly contentService: ContentService,
    private readonly mediaEngine: MediaEngineService,
    private readonly videoService: VideoService,
    private readonly creditService: CreditService,
    private readonly backgroundTasks: BackgroundTasksService,
  ) {}

  // ── Config CRUD ──────────────────────────────────────

  async createConfig(workspaceId: string, dto: CreateConfigDto) {
    await this.ensureProPlan(workspaceId);

    return this.prisma.weeklyPlanConfig.create({
      data: {
        workspaceId,
        name: dto.name ?? 'Planificador semanal',
        plannerRunDays: dto.plannerRunDays as any[],
        plannerRunTime: dto.plannerRunTime,
        publishDays: dto.publishDays as any[],
        publishTime: dto.publishTime,
        targetChannels: dto.targetChannels ?? ['instagram'],
        timezone: dto.timezone ?? 'America/Mexico_City',
        contentMode: dto.contentMode ?? 'editorial',
        approvalMode: dto.approvalMode ?? 'telegram',
        musicEnabled: dto.musicEnabled ?? false,
        musicStyle: dto.musicStyle ?? null,
        musicPrompt: dto.musicPrompt ?? null,
      },
    });
  }

  async updateConfig(configId: string, workspaceId: string, dto: UpdateConfigDto) {
    const config = await this.prisma.weeklyPlanConfig.findFirst({
      where: { id: configId, workspaceId },
    });
    if (!config) throw new ForbiddenException('Configuración no encontrada');

    return this.prisma.weeklyPlanConfig.update({
      where: { id: configId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.plannerRunDays && { plannerRunDays: dto.plannerRunDays as any[] }),
        ...(dto.plannerRunTime && { plannerRunTime: dto.plannerRunTime }),
        ...(dto.publishDays && { publishDays: dto.publishDays as any[] }),
        ...(dto.publishTime && { publishTime: dto.publishTime }),
        ...(dto.targetChannels && { targetChannels: dto.targetChannels }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.contentMode && { contentMode: dto.contentMode }),
        ...(dto.approvalMode && { approvalMode: dto.approvalMode }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.musicEnabled !== undefined && { musicEnabled: dto.musicEnabled }),
        ...(dto.musicStyle !== undefined && { musicStyle: dto.musicStyle || null }),
        ...(dto.musicPrompt !== undefined && { musicPrompt: dto.musicPrompt || null }),
      },
    });
  }

  async deleteConfig(configId: string, workspaceId: string) {
    const config = await this.prisma.weeklyPlanConfig.findFirst({
      where: { id: configId, workspaceId },
    });
    if (!config) throw new ForbiddenException('Configuración no encontrada');

    return this.prisma.weeklyPlanConfig.delete({ where: { id: configId } });
  }

  async getConfigs(workspaceId: string) {
    return this.prisma.weeklyPlanConfig.findMany({
      where: { workspaceId },
      include: {
        batches: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { _count: { select: { items: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Batch & Items ────────────────────────────────────

  /** Get planned publications for the approvals panel */
  async getApprovals(workspaceId: string, status?: string) {
    const where: any = {
      batch: { workspaceId },
    };
    if (status === 'pending') {
      where.status = { in: ['PENDING_REVIEW', 'MODIFIED'] };
    }

    return this.prisma.plannedPublication.findMany({
      where,
      include: {
        batch: {
          include: {
            config: { select: { name: true, approvalMode: true, targetChannels: true } },
          },
        },
        editorialRun: {
          include: {
            contentBrief: {
              select: {
                format: true,
                angle: true,
                contentVersions: {
                  where: { isMain: true },
                  orderBy: { version: 'desc' },
                  take: 1,
                  include: { mediaAssets: true },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async getBatches(workspaceId: string, limit = 10) {
    return this.prisma.weeklyPlanBatch.findMany({
      where: { workspaceId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            editorialRun: {
              include: {
                contentBrief: {
                  select: {
                    format: true,
                    angle: true,
                    contentVersions: {
                      where: { isMain: true },
                      orderBy: { version: 'desc' },
                      take: 1,
                      include: { mediaAssets: true },
                    },
                  },
                },
              },
            },
          },
        },
        config: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getBatch(batchId: string, workspaceId: string) {
    return this.prisma.weeklyPlanBatch.findFirst({
      where: { id: batchId, workspaceId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            editorialRun: {
              include: {
                contentBrief: {
                  select: {
                    format: true,
                    angle: true,
                    contentVersions: {
                      where: { isMain: true },
                      orderBy: { version: 'desc' },
                      take: 1,
                      include: { mediaAssets: true },
                    },
                  },
                },
              },
            },
          },
        },
        config: true,
      },
    });
  }

  // ── Approve / Reject items ───────────────────────────

  async approveItem(itemId: string, workspaceId: string) {
    const item = await this.prisma.plannedPublication.findFirst({
      where: { id: itemId, batch: { workspaceId } },
    });
    if (!item) throw new ForbiddenException('Publicación no encontrada');

    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'APPROVED' },
    });

    // If there's an editorial run, approve it too
    if (item.editorialRunId) {
      await this.prisma.editorialRun.update({
        where: { id: item.editorialRunId },
        data: { status: 'APPROVED' },
      });
    }

    await this.updateBatchStatus(item.batchId);
  }

  async rejectItem(itemId: string, workspaceId: string) {
    const item = await this.prisma.plannedPublication.findFirst({
      where: { id: itemId, batch: { workspaceId } },
    });
    if (!item) throw new ForbiddenException('Publicación no encontrada');

    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'REJECTED' },
    });

    if (item.editorialRunId) {
      await this.prisma.editorialRun.update({
        where: { id: item.editorialRunId },
        data: { status: 'REJECTED' },
      });
    }

    await this.updateBatchStatus(item.batchId);
  }

  async approveAll(batchId: string, workspaceId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findFirst({
      where: { id: batchId, workspaceId },
      include: { items: true },
    });
    if (!batch) throw new ForbiddenException('Lote no encontrado');

    const pendingItems = batch.items.filter(
      (i) => i.status === 'PENDING_REVIEW' || i.status === 'MODIFIED',
    );

    for (const item of pendingItems) {
      await this.prisma.plannedPublication.update({
        where: { id: item.id },
        data: { status: 'APPROVED' },
      });
      if (item.editorialRunId) {
        await this.prisma.editorialRun.update({
          where: { id: item.editorialRunId },
          data: { status: 'APPROVED' },
        });
      }
    }

    await this.updateBatchStatus(batchId);
  }

  // ── Item Actions (approval panel) ────────────────────

  /** Get the main content version ID for a planned publication */
  private async getMainVersionId(itemId: string, workspaceId: string) {
    const item = await this.prisma.plannedPublication.findFirst({
      where: { id: itemId, batch: { workspaceId } },
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
    if (!item) throw new ForbiddenException('Publicación no encontrada');
    if (!item.editorialRunId) throw new ForbiddenException('Sin run editorial asociado');
    const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
    if (!version) throw new ForbiddenException('Sin contenido generado');
    return { item, versionId: version.id, editorialRunId: item.editorialRunId };
  }

  /** Edit text: apply manual correction via AI */
  async editText(itemId: string, workspaceId: string, feedback: string) {
    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);
    const result = await this.contentService.applyCorrection(versionId, feedback, workspaceId);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  /** Rewrite: regenerate text content */
  async rewriteText(itemId: string, workspaceId: string) {
    const { editorialRunId, item } = await this.getMainVersionId(itemId, workspaceId);
    await this.orchestrator.processStage(editorialRunId, 'CONTENT', workspaceId);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return { regenerated: true };
  }

  /** Change tone of the text */
  async changeTone(itemId: string, workspaceId: string, tone: string) {
    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);
    const result = await this.contentService.changeTone(versionId, tone, workspaceId);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  /** Change content format (POST, CAROUSEL, REEL, STORY, THREAD) */
  async changeFormat(itemId: string, workspaceId: string, format: string) {
    const { item } = await this.getMainVersionId(itemId, workspaceId);
    const briefId = item.editorialRun?.contentBrief?.id;
    if (!briefId) throw new ForbiddenException('Sin brief asociado');
    await this.prisma.contentBrief.update({
      where: { id: briefId },
      data: { format: format.toUpperCase() as any },
    });
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return { format: format.toUpperCase() };
  }

  /** Regenerate image with optional custom prompt */
  async regenerateImage(itemId: string, workspaceId: string, customPrompt?: string) {
    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);
    const result = await this.mediaEngine.regenerateImage(versionId, customPrompt);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  async regenerateImagePro(itemId: string, workspaceId: string, customPrompt?: string, modelId?: string) {
    const creditOp = modelId ? `IMAGE_PRO:${modelId}` : 'IMAGE_PRO_TEXT';
    const creditCost = CREDIT_COSTS[creditOp] ?? CREDIT_COSTS['IMAGE_PRO_TEXT'] ?? 4;
    const modelLabel = modelId
      ? (modelId.includes('/') ? modelId.split('/').pop() : modelId)
      : 'Ideogram V3';

    if (creditCost > 0) {
      await this.creditService.consumeCredits(
        workspaceId,
        creditOp,
        `Regeneración Pro (${modelLabel})`,
        itemId,
      );
    }
    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);
    const result = await this.mediaEngine.regenerateImagePro(versionId, customPrompt, modelId as any);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  async generateMusic(itemId: string, workspaceId: string, style?: string, prompt?: string) {
    // Deduct credits before starting generation
    await this.creditService.consumeCredits(
      workspaceId,
      'MUSIC_BACKGROUND',
      `Música de fondo: ${style ?? 'upbeat'}`,
      itemId,
    );

    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);
    const result = await this.mediaEngine.generateBackgroundMusic(versionId, style, prompt);

    // If item was GENERATING_MUSIC (auto-batch), move to PENDING_REVIEW (now ready for approval)
    // If it was already reviewed/modified (manual music gen), keep as MODIFIED
    const currentItem = await this.prisma.plannedPublication.findUnique({ where: { id: itemId } });
    const newStatus = currentItem?.status === 'GENERATING_MUSIC' ? 'PENDING_REVIEW' : 'MODIFIED';

    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: newStatus },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  /** Replace media asset with an uploaded image URL */
  async replaceImage(itemId: string, workspaceId: string, imageUrl: string) {
    const { versionId, item } = await this.getMainVersionId(itemId, workspaceId);

    // Find current main asset
    const currentAsset = await this.prisma.mediaAsset.findFirst({
      where: { contentVersionId: versionId, type: 'IMAGE' },
      orderBy: { createdAt: 'desc' },
    });

    // Create new asset with the uploaded URL
    const newAsset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId: versionId,
        type: 'IMAGE',
        originalUrl: imageUrl,
        provider: 'upload',
        status: 'READY',
      },
    });

    // Mark the old asset as replaced
    if (currentAsset) {
      await this.prisma.mediaAsset.update({
        where: { id: currentAsset.id },
        data: { metadata: { replaced: true, replacedBy: newAsset.id } },
      });
    }

    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return { mediaAssetId: newAsset.id };
  }

  /** Convert publication to video */
  async convertToVideo(itemId: string, workspaceId: string, videoType?: 'slides' | 'video' | 'avatar', slideCount?: number) {
    const { editorialRunId, versionId, item } = await this.getMainVersionId(itemId, workspaceId);

    // Charge credits based on video type (slides=0, video=15, avatar=25)
    if (videoType) {
      await this.creditService.consumeCredits(
        workspaceId,
        `VIDEO_KIE_${videoType.toUpperCase()}`,
        `Video ${videoType === 'slides' ? 'slideshow (gratis)' : `KIE (${videoType})`}`,
        editorialRunId,
      );
    }

    // For slides: generate additional images if needed to reach slideCount
    if (videoType === 'slides' && slideCount && slideCount > 1) {
      const existingImages = await this.prisma.mediaAsset.findMany({
        where: { contentVersionId: versionId, status: 'READY', type: { in: ['IMAGE', 'CAROUSEL_SLIDE'] } },
      });
      const needed = slideCount - existingImages.length;
      if (needed > 0) {
        this.logger.log(`Generating ${needed} additional images for slideshow (have ${existingImages.length}, need ${slideCount})`);
        for (let i = 0; i < needed; i++) {
          try {
            await this.mediaEngine.generateAdditionalImage(versionId, existingImages.length + i);
          } catch (err) {
            this.logger.warn(`Failed to generate extra image ${i + 1}/${needed}: ${err}`);
          }
        }
      }
    }

    const result = await this.videoService.convertToVideo(editorialRunId, {
      videoType: videoType as any,
    });
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'MODIFIED' },
    });
    await this.updateBatchStatus(item.batchId);
    return result;
  }

  /** Redo: restart the entire editorial run from scratch */
  async redoItem(itemId: string, workspaceId: string) {
    const { editorialRunId, item } = await this.getMainVersionId(itemId, workspaceId);
    await this.orchestrator.restartRun(editorialRunId, workspaceId);
    await this.prisma.plannedPublication.update({
      where: { id: itemId },
      data: { status: 'GENERATING' },
    });
    await this.updateBatchStatus(item.batchId);
    return { restarted: true };
  }

  // ── Core: Generate weekly batch ──────────────────────

  /** Estimate the credit cost of generating a batch for a config */
  async estimateBatchCost(configId: string) {
    const config = await this.prisma.weeklyPlanConfig.findUniqueOrThrow({
      where: { id: configId },
      include: { workspace: true },
    });

    const publishDates = this.getNextPublishDates(config.publishDays as string[], new Date());
    const totalItems = publishDates.length;

    const musicCostPerItem = config.musicEnabled ? (CREDIT_COSTS['MUSIC_BACKGROUND'] ?? 3) : 0;
    // Music is only generated for audio-supporting formats (Reels, Stories, etc.)
    // Since formats aren't determined until strategy runs, we estimate the max cost
    const musicCost = musicCostPerItem * totalItems;
    const totalCost = musicCost; // Only music costs credits in batch generation

    const balance = await this.creditService.getBalance(config.workspaceId);

    return {
      totalItems,
      musicEnabled: config.musicEnabled,
      musicStyle: config.musicStyle,
      musicCostPerItem,
      musicCost,
      totalCost,
      currentBalance: balance.currentBalance,
      isUnlimited: balance.isUnlimited,
      canAfford: balance.isUnlimited || balance.currentBalance >= totalCost,
      canAffordPartial: balance.isUnlimited || balance.currentBalance >= musicCostPerItem,
      affordableItems: balance.isUnlimited
        ? totalItems
        : musicCostPerItem > 0
          ? Math.floor(balance.currentBalance / musicCostPerItem)
          : totalItems,
    };
  }

  async generateBatch(configId: string, skipMusic?: boolean): Promise<string> {
    const config = await this.prisma.weeklyPlanConfig.findUniqueOrThrow({
      where: { id: configId },
      include: { workspace: true },
    });

    // Determine week label (ISO week)
    const now = new Date();
    const weekLabel = this.getISOWeekLabel(now);

    // Check if batch already exists for this week
    const existing = await this.prisma.weeklyPlanBatch.findUnique({
      where: {
        workspaceId_configId_weekLabel: {
          workspaceId: config.workspaceId,
          configId: config.id,
          weekLabel,
        },
      },
    });
    if (existing) {
      // If all items were rejected (CANCELLED), delete the old batch and allow re-creation
      if (existing.status === 'CANCELLED') {
        this.logger.log(`Previous batch for ${weekLabel} was cancelled/rejected — deleting to allow re-generation`);
        await this.prisma.weeklyPlanBatch.delete({ where: { id: existing.id } });
      } else {
        this.logger.warn(`Batch already exists for ${weekLabel}, config ${configId}`);
        return existing.id;
      }
    }

    // Calculate dates for each publish day
    const publishDates = this.getNextPublishDates(config.publishDays as string[], now);

    // Create batch
    const batch = await this.prisma.weeklyPlanBatch.create({
      data: {
        workspaceId: config.workspaceId,
        configId: config.id,
        weekLabel,
        totalItems: publishDates.length,
        status: 'GENERATING',
      },
    });

    this.logger.log(
      `📅 Generating weekly batch ${batch.id} (${weekLabel}) — ${publishDates.length} publications${skipMusic ? ' (music skipped)' : ''}`,
    );

    if (skipMusic) {
      this.skipMusicBatches.add(batch.id);
    }

    // Create planned publications and trigger editorial runs
    for (let i = 0; i < publishDates.length; i++) {
      const { date, dayOfWeek } = publishDates[i]!;

      try {
        // Create editorial run
        const origin = config.contentMode === 'business'
          ? 'weekly-planner-business'
          : 'weekly-planner';
        const { editorialRunId } = await this.orchestrator.createRun({
          workspaceId: config.workspaceId,
          origin,
          targetChannels: config.targetChannels,
        });

        // Create planned publication
        await this.prisma.plannedPublication.create({
          data: {
            batchId: batch.id,
            editorialRunId,
            scheduledDate: date,
            scheduledTime: config.publishTime,
            dayOfWeek: dayOfWeek as any,
            status: 'GENERATING',
            sortOrder: i,
          },
        });

        this.logger.log(
          `  → ${DAY_LABELS[dayOfWeek]} ${date.toISOString().split('T')[0]} → run ${editorialRunId}`,
        );
      } catch (error) {
        this.logger.error(`Failed to create run for ${dayOfWeek}:`, error);

        // Still create the planned publication so the user sees it failed
        await this.prisma.plannedPublication.create({
          data: {
            batchId: batch.id,
            scheduledDate: date,
            scheduledTime: config.publishTime,
            dayOfWeek: dayOfWeek as any,
            status: 'FAILED',
            sortOrder: i,
          },
        });
      }
    }

    return batch.id;
  }

  // ── Check completed runs & send to Telegram ─────────

  async checkBatchCompletion(batchId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        items: {
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
          orderBy: { sortOrder: 'asc' },
        },
        config: true,
      },
    });

    // Update individual items that have completed content generation (incremental progress)
    for (const item of batch.items) {
      if (item.status === 'GENERATING' && item.editorialRun?.status === 'REVIEW') {
        await this.prisma.plannedPublication.update({
          where: { id: item.id },
          data: { status: 'PENDING_REVIEW' },
        });
      } else if (item.status === 'GENERATING' && item.editorialRun?.status === 'FAILED') {
        await this.prisma.plannedPublication.update({
          where: { id: item.id },
          data: { status: 'FAILED' },
        });
      }
    }

    // Formats that support background audio (Reels, Stories, video-based)
    const AUDIO_FORMATS = new Set(['REEL', 'STORY', 'AVATAR_VIDEO', 'HYBRID_MOTION']);

    // Auto-generate music for items that are ready (PENDING_REVIEW) and haven't had music triggered yet
    // Only for formats that actually support audio playback
    if (batch.config?.musicEnabled && !this.skipMusicBatches.has(batchId)) {
      const readyItems = batch.items.filter(
        (i) => (i.status === 'PENDING_REVIEW' || (i.status === 'GENERATING' && i.editorialRun?.status === 'REVIEW'))
               && !this.musicTriggeredItems.has(i.id)
               && AUDIO_FORMATS.has(i.editorialRun?.contentBrief?.format ?? ''),
      );

      if (readyItems.length > 0) {
        const style = batch.config.musicStyle ?? 'upbeat';
        const prompt = batch.config.musicPrompt ?? undefined;
        const musicCost = CREDIT_COSTS['MUSIC_BACKGROUND'] ?? 3;

        for (const item of readyItems) {
          // Check credits for each item individually (balance decreases)
          const hasCredits = await this.creditService.hasEnoughCredits(batch.workspaceId, musicCost);
          if (!hasCredits) {
            this.logger.warn(`Skipping auto-music for item ${item.id}: insufficient credits (need ${musicCost})`);
            break; // No point checking more items
          }

          // Check if item already has a music asset (e.g. manually generated)
          const mainVersion = item.editorialRun?.contentBrief?.contentVersions?.[0];
          if (mainVersion) {
            const existingMusic = await this.prisma.mediaAsset.findFirst({
              where: { contentVersionId: mainVersion.id, type: 'AUDIO' },
            });
            if (existingMusic) {
              this.musicTriggeredItems.add(item.id);
              continue; // Already has music
            }
          }

          this.musicTriggeredItems.add(item.id);
          this.logger.log(`🎵 Auto-music for item ${item.id} (${style}) — format: ${item.editorialRun?.contentBrief?.format}`);

          // Mark item as generating music so it can't be approved yet
          await this.prisma.plannedPublication.update({
            where: { id: item.id },
            data: { status: 'GENERATING_MUSIC' },
          });

          const taskId = this.backgroundTasks.createTask({
            type: 'music',
            label: `Música auto: ${style}`,
            workspaceId: batch.workspaceId,
          });
          this.generateMusic(item.id, batch.workspaceId, style, prompt)
            .then((r) => this.backgroundTasks.completeTask(taskId, r))
            .catch(async (e) => {
              this.logger.error(`Auto-music failed for item ${item.id}: ${e.message}`);
              this.backgroundTasks.failTask(taskId, e.message);
              // On failure, move item to PENDING_REVIEW so it can still be approved (without music)
              await this.prisma.plannedPublication.update({
                where: { id: item.id },
                data: { status: 'PENDING_REVIEW' },
              });
              await this.updateBatchStatus(item.batchId);
            });
        }
      }
    }

    // Check if all items have completed content generation AND music generation
    const allDone = batch.items.every(
      (i) => (i.status !== 'GENERATING' && i.status !== 'GENERATING_MUSIC') ||
             i.editorialRun?.status === 'REVIEW' ||
             i.editorialRun?.status === 'FAILED',
    );

    if (!allDone) return;

    // Clean up skipMusic flag for this batch
    this.skipMusicBatches.delete(batchId);

    await this.prisma.weeklyPlanBatch.update({
      where: { id: batchId },
      data: { status: 'PENDING_REVIEW' },
    });

    // Check approval mode from config
    const config = batch.config;
    if (config?.approvalMode === 'telegram') {
      // Send batch summary to Telegram for approval
      await this.sendBatchToTelegram(batchId);
    }
    // If approvalMode === 'panel', just leave as PENDING_REVIEW for panel approval
  }

  // ── Telegram batch notification ──────────────────────

  async sendBatchToTelegram(batchId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        items: {
          where: { status: { not: 'FAILED' } },
          orderBy: { sortOrder: 'asc' },
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
        },
        config: true,
      },
    });

    // Find owner's Telegram chat
    const ownerMembership = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId: batch.workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    if (!ownerMembership) return;

    const link = await this.prisma.telegramLink.findUnique({
      where: { userId: ownerMembership.userId },
    });

    const chatId = link?.chatId ?? process.env.TELEGRAM_DEFAULT_CHAT_ID;
    if (!chatId) return;

    // Build summary message
    let message = `📋 *Planificación semanal lista* (${batch.weekLabel})\n\n`;
    message += `Se generaron *${batch.items.length}* publicaciones:\n\n`;

    for (const item of batch.items) {
      const dayLabel = DAY_LABELS[item.dayOfWeek] ?? item.dayOfWeek;
      const dateStr = item.scheduledDate.toISOString().split('T')[0];
      const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
      const hook = version?.hook ?? '(sin contenido)';
      const preview = hook.length > 60 ? hook.substring(0, 60) + '…' : hook;

      message += `📌 *${dayLabel}* (${dateStr}) a las ${item.scheduledTime}\n`;
      message += `   ${preview}\n\n`;
    }

    message += `\n_Revisa y aprueba cada publicación desde el panel de Syndra._\n`;
    message += `_O responde "aprobar todo" para aprobar todas de una vez._`;

    try {
      await this.telegramBot.sendNotification(message, chatId);
    } catch (error) {
      this.logger.error(`Failed to send batch summary to Telegram:`, error);
    }
  }

  // ── Publish approved items ───────────────────────────

  async publishDueItems() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const today = now.toISOString().split('T')[0];

    // Find approved items scheduled for today within publishTime window
    const dueItems = await this.prisma.plannedPublication.findMany({
      where: {
        status: 'APPROVED',
        scheduledDate: {
          gte: new Date(`${today}T00:00:00`),
          lt: new Date(`${today}T23:59:59`),
        },
      },
      include: {
        editorialRun: true,
        batch: { include: { config: true } },
      },
    });

    for (const item of dueItems) {
      // Parse scheduled time
      const parts = item.scheduledTime.split(':').map(Number);
      const schedHour = parts[0] ?? 0;
      const schedMin = parts[1] ?? 0;
      const schedTotal = schedHour * 60 + schedMin;
      const nowTotal = currentHour * 60 + currentMinute;

      // Within 15 min window
      if (nowTotal >= schedTotal && nowTotal < schedTotal + 15) {
        if (!item.editorialRunId) continue;

        try {
          // Trigger publishing via orchestrator
          await this.prisma.editorialRun.update({
            where: { id: item.editorialRunId },
            data: { status: 'PUBLISHING' },
          });

          await this.orchestrator.processStage(item.editorialRunId, 'PUBLISHING', item.batch.workspaceId);

          await this.prisma.plannedPublication.update({
            where: { id: item.id },
            data: { status: 'PUBLISHING' },
          });

          this.logger.log(`📤 Publishing planned item ${item.id}`);
        } catch (error) {
          this.logger.error(`Failed to publish item ${item.id}:`, error);
          await this.prisma.plannedPublication.update({
            where: { id: item.id },
            data: { status: 'FAILED' },
          });
        }
      }
    }
  }

  // ── Cron: trigger batch generation ────────────────────

  @Cron('*/15 * * * *', { name: 'weekly-planner-generate' })
  async cronGenerateBatches() {
    const now = new Date();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayEnum = dayNames[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const configs = await this.prisma.weeklyPlanConfig.findMany({
      where: {
        isActive: true,
        plannerRunDays: { has: todayEnum as any },
      },
    });

    for (const config of configs) {
      const parts = config.plannerRunTime.split(':').map(Number);
      const schedTotal = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      const nowTotal = currentHour * 60 + currentMinute;
      if (nowTotal < schedTotal || nowTotal >= schedTotal + 15) continue;

      try {
        await this.generateBatch(config.id);
      } catch (error) {
        this.logger.error(`Cron: Failed to generate batch for config ${config.id}:`, error);
      }
    }
  }

  @Cron('*/1 * * * *', { name: 'weekly-planner-completion-check' })
  async cronCheckBatchCompletion() {
    // Check GENERATING batches for completion + auto-music
    const generatingBatches = await this.prisma.weeklyPlanBatch.findMany({
      where: { status: 'GENERATING' },
    });

    for (const batch of generatingBatches) {
      try {
        await this.recoverOrphanedRuns(batch.id);
        await this.checkBatchCompletion(batch.id);
      } catch (error) {
        this.logger.error(`Cron: Failed to check batch completion ${batch.id}:`, error);
      }
    }

    // Also check recently-completed batches that may need auto-music
    // (orchestrator sets batch to PENDING_REVIEW before cron runs)
    const recentThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    const recentBatches = await this.prisma.weeklyPlanBatch.findMany({
      where: {
        status: 'PENDING_REVIEW',
        updatedAt: { gte: recentThreshold },
      },
      include: { config: true },
    });

    for (const batch of recentBatches) {
      if (!batch.config?.musicEnabled || this.skipMusicBatches.has(batch.id)) continue;
      try {
        await this.checkBatchCompletion(batch.id);
      } catch (error) {
        this.logger.error(`Cron: Failed to check auto-music for batch ${batch.id}:`, error);
      }
    }
  }

  /**
   * Detects editorial runs that are stuck in intermediate stages
   * (CONTENT, MEDIA, RESEARCH, STRATEGY) for more than 10 minutes
   * and restarts them. This handles server restarts that lose the
   * in-memory queue.
   */
  private async recoverOrphanedRuns(batchId: string) {
    const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    const items = await this.prisma.plannedPublication.findMany({
      where: {
        batchId,
        status: 'GENERATING',
        editorialRunId: { not: null },
      },
      include: {
        editorialRun: true,
      },
    });

    for (const item of items) {
      const run = item.editorialRun;
      if (!run) continue;

      const isStuck =
        ['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA'].includes(run.status) &&
        run.updatedAt < stuckThreshold;

      if (isStuck) {
        this.logger.warn(
          `Recovering orphaned run ${run.id} (stuck in ${run.status} since ${run.updatedAt.toISOString()})`,
        );
        try {
          await this.orchestrator.restartRun(run.id, run.workspaceId);
        } catch (error) {
          this.logger.error(`Failed to recover orphaned run ${run.id}:`, error);
        }
      }
    }
  }

  /**
   * Manually retry all stuck items in a batch.
   * Used when items get stuck due to server restarts.
   */
  async retryBatch(batchId: string, workspaceId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        items: { include: { editorialRun: true } },
      },
    });

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenException('No tienes acceso a este batch');
    }

    let restarted = 0;
    for (const item of batch.items) {
      if (
        item.status === 'GENERATING' &&
        item.editorialRun &&
        ['PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA'].includes(item.editorialRun.status)
      ) {
        await this.orchestrator.restartRun(item.editorialRun.id, workspaceId);
        restarted++;
      }
    }

    this.logger.log(`Retried ${restarted} stuck items in batch ${batchId}`);
    return { restarted };
  }

  /**
   * Cancel a generating batch: reject all GENERATING items and mark batch CANCELLED.
   */
  async cancelBatch(batchId: string, workspaceId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: { items: true },
    });

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenException('No tienes acceso a este batch');
    }

    if (batch.status !== 'GENERATING') {
      throw new ForbiddenException('Solo se pueden detener batches en generación');
    }

    let cancelled = 0;
    for (const item of batch.items) {
      if (item.status === 'GENERATING') {
        await this.prisma.plannedPublication.update({
          where: { id: item.id },
          data: { status: 'REJECTED' },
        });
        cancelled++;
      }
    }

    await this.prisma.weeklyPlanBatch.update({
      where: { id: batchId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Cancelled batch ${batchId}: ${cancelled} items rejected`);
    return { cancelled };
  }

  /**
   * Delete a batch and all its planned publications.
   * Only allowed for GENERATING or CANCELLED batches.
   */
  async deleteBatch(batchId: string, workspaceId: string) {
    const batch = await this.prisma.weeklyPlanBatch.findUniqueOrThrow({
      where: { id: batchId },
    });

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenException('No tienes acceso a este batch');
    }

    if (!['GENERATING', 'CANCELLED'].includes(batch.status)) {
      throw new ForbiddenException('Solo se pueden eliminar batches en estado GENERATING o CANCELLED');
    }

    // Delete planned publications first (no cascade in schema)
    await this.prisma.plannedPublication.deleteMany({
      where: { batchId },
    });

    await this.prisma.weeklyPlanBatch.delete({
      where: { id: batchId },
    });

    this.logger.log(`Deleted batch ${batchId}`);
    return { deleted: true };
  }

  @Cron('*/15 * * * *', { name: 'weekly-planner-publish' })
  async cronPublishDueItems() {
    try {
      await this.publishDueItems();
    } catch (error) {
      this.logger.error('Cron: Failed to publish due items:', error);
    }
  }

  // ── Helpers ──────────────────────────────────────────

  private async updateBatchStatus(batchId: string) {
    const items = await this.prisma.plannedPublication.findMany({
      where: { batchId },
    });

    const approved = items.filter((i) => i.status === 'APPROVED' || i.status === 'PUBLISHED').length;
    const rejected = items.filter((i) => i.status === 'REJECTED').length;
    const total = items.filter((i) => i.status !== 'FAILED').length;

    let status: any = 'PENDING_REVIEW';
    if (rejected === total && total > 0) status = 'CANCELLED';
    else if (approved === total && total > 0) status = 'FULLY_APPROVED';
    else if (approved > 0) status = 'PARTIALLY_APPROVED';

    await this.prisma.weeklyPlanBatch.update({
      where: { id: batchId },
      data: { status, approvedItems: approved },
    });
  }

  private async ensureProPlan(workspaceId: string) {
    const result = await this.plansService.checkFeature(workspaceId, 'weeklyPlanner');
    if (!result.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PLAN_LIMIT',
        message: 'El planificador semanal es una función exclusiva del plan Pro.',
        details: { feature: 'weeklyPlanner', requiredPlan: 'pro' },
      });
    }
  }

  private getISOWeekLabel(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  private getNextPublishDates(publishDays: string[], fromDate: Date): Array<{ date: Date; dayOfWeek: string }> {
    const results: Array<{ date: Date; dayOfWeek: string }> = [];
    const today = new Date(fromDate);
    today.setHours(0, 0, 0, 0);

    // Look at the next 7 days and match publishDays
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const dayIndex = date.getDay();
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = dayNames[dayIndex]!;

      if (publishDays.includes(dayName)) {
        results.push({ date, dayOfWeek: dayName });
      }
    }

    return results;
  }
}
