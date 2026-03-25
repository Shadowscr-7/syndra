// ============================================================
// Editorial Orchestrator — Coordina el pipeline editorial completo
// ============================================================

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResearchService } from '../research/research.service';
import { StrategyService } from '../strategy/strategy.service';
import { ContentService } from '../content/content.service';
import { MediaEngineService } from '../media/media-engine.service';
import { QueueService } from '../queue/queue.service';
import { TelegramApprovalHandler } from '../telegram/telegram-approval.handler';
import { QUEUES } from '@automatismos/shared';

/**
 * Orquesta las etapas del pipeline editorial:
 * PENDING → RESEARCH → STRATEGY → CONTENT → MEDIA → COMPLIANCE → REVIEW
 *
 * Cada transición se ejecuta como un job en pgmq para
 * resiliencia y reintentos automáticos.
 */
@Injectable()
export class EditorialOrchestratorService {
  private readonly logger = new Logger(EditorialOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly researchService: ResearchService,
    private readonly strategyService: StrategyService,
    private readonly contentService: ContentService,
    private readonly mediaEngine: MediaEngineService,
    private readonly queueService: QueueService,
    @Inject(forwardRef(() => TelegramApprovalHandler))
    private readonly telegramApproval: TelegramApprovalHandler,
  ) {}

  /**
   * Crea un nuevo EditorialRun y arranca el pipeline
   */
  async createRun(params: {
    workspaceId: string;
    campaignId?: string;
    origin?: string;
    priority?: number;
    targetChannels?: string[];
    contentProfileId?: string;
    userPersonaId?: string;
    researchSummary?: string;
  }): Promise<{ editorialRunId: string }> {
    // If campaign provided, inherit settings from it
    let resolvedChannels = params.targetChannels ?? ['instagram'];
    let resolvedProfileId = params.contentProfileId ?? null;
    let resolvedPersonaId = params.userPersonaId ?? null;

    if (params.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: params.campaignId },
        select: {
          targetChannels: true,
          contentProfileId: true,
          userPersonaId: true,
        },
      });
      if (campaign) {
        if (campaign.targetChannels?.length) {
          resolvedChannels = campaign.targetChannels;
        }
        if (campaign.contentProfileId && !resolvedProfileId) {
          resolvedProfileId = campaign.contentProfileId;
        }
        if (campaign.userPersonaId && !resolvedPersonaId) {
          resolvedPersonaId = campaign.userPersonaId;
        }
      }
    }

    // Fallback: default profile + active persona from workspace
    if (!resolvedProfileId || !resolvedPersonaId) {
      const wsUsers = await this.prisma.workspaceUser.findMany({
        where: { workspaceId: params.workspaceId },
        select: { userId: true },
        take: 1,
      });
      const userId = wsUsers[0]?.userId;
      if (userId) {
        if (!resolvedProfileId) {
          const defaultProfile = await this.prisma.contentProfile.findFirst({
            where: { userId, isDefault: true },
            select: { id: true },
          });
          resolvedProfileId = defaultProfile?.id ?? null;
        }
        if (!resolvedPersonaId) {
          const activePersona = await this.prisma.userPersona.findFirst({
            where: { userId, isActive: true },
            select: { id: true },
          });
          resolvedPersonaId = activePersona?.id ?? null;
        }
      }
    }

    const run = await this.prisma.editorialRun.create({
      data: {
        workspaceId: params.workspaceId,
        campaignId: params.campaignId ?? null,
        origin: params.origin ?? 'scheduler',
        priority: params.priority ?? 5,
        targetChannels: resolvedChannels,
        contentProfileId: resolvedProfileId,
        userPersonaId: resolvedPersonaId,
        status: 'PENDING',
        ...(params.researchSummary ? { researchSummary: params.researchSummary } : {}),
      },
    });

    this.logger.log(`Created editorial run ${run.id} for workspace ${params.workspaceId}`);

    // Enviar el primer job a la cola
    await this.queueService.enqueue(QUEUES.EDITORIAL, {
      type: 'editorial_pipeline',
      jobId: `job_${run.id}_research`,
      editorialRunId: run.id,
      workspaceId: params.workspaceId,
      stage: 'research',
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    // In dev mode without pgmq, process inline
    if (this.queueService.devQueue) {
      this.logger.log(`[DEV] Processing pipeline inline for run ${run.id}`);
      // Don't await — run in background so the API responds immediately
      this.processInlineDev(run.id, params.workspaceId).catch((err) => {
        this.logger.error(`[DEV] Inline pipeline failed for ${run.id}:`, err);
      });
    }

    return { editorialRunId: run.id };
  }

  /**
   * Restarts a FAILED/REJECTED run from scratch.
   * Reuses the same editorialRunId but re-runs the pipeline.
   * Cleans up existing child records to avoid unique constraint violations.
   */
  async restartRun(editorialRunId: string, workspaceId: string) {
    this.logger.log(`Restarting pipeline for run ${editorialRunId}`);

    // Clean up existing child records so the pipeline can recreate them
    // DB-level cascades: ContentBrief → ContentVersion → MediaAsset
    const existingBrief = await this.prisma.contentBrief.findUnique({
      where: { editorialRunId },
    });
    if (existingBrief) {
      await this.prisma.contentBrief.delete({
        where: { id: existingBrief.id },
      });
      this.logger.log(`Cleaned up existing ContentBrief ${existingBrief.id}`);
    }
    // Clean up research snapshots
    await this.prisma.researchSnapshot.deleteMany({
      where: { editorialRunId },
    });
    // Clean up approval events
    await this.prisma.approvalEvent.deleteMany({
      where: { editorialRunId },
    });
    // Clean up publications
    await this.prisma.publication.deleteMany({
      where: { editorialRunId },
    });

    // Enqueue research stage
    await this.queueService.enqueue('editorial_jobs', {
      type: 'editorial_pipeline',
      jobId: `job_${editorialRunId}_research_restart_${Date.now()}`,
      editorialRunId,
      workspaceId,
      stage: 'research',
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    // In dev mode, process inline
    if (this.queueService.devQueue) {
      this.logger.log(`[DEV] Processing restart inline for run ${editorialRunId}`);
      this.processInlineDev(editorialRunId, workspaceId).catch((err) => {
        this.logger.error(`[DEV] Inline restart failed for ${editorialRunId}:`, err);
      });
    }

    return { editorialRunId, restarted: true };
  }

  /**
   * Dev-only: processes the entire pipeline inline without pgmq
   */
  private async processInlineDev(editorialRunId: string, workspaceId: string) {
    const stages = ['research', 'strategy', 'content', 'media', 'review'];
    for (const stage of stages) {
      // Drain devQueue before each stage to prevent the worker (pollEditorialQueue)
      // from picking up jobs that processStage enqueues as a side-effect.
      if (this.queueService.devQueue) {
        this.queueService.devQueue = [];
      }
      try {
        this.logger.log(`[DEV] inline stage: ${stage} for run ${editorialRunId}`);
        const result = await this.processStage(editorialRunId, stage, workspaceId);
        if (!result.nextStage) {
          this.logger.log(`[DEV] Pipeline stopped at stage '${stage}' (no next stage)`);
          break;
        }
      } catch (error: any) {
        this.logger.error(`[DEV] Stage '${stage}' failed:`, error);
        // Mark as FAILED and persist error message
        const errMsg = error?.message || String(error);
        await this.prisma.editorialRun.update({
          where: { id: editorialRunId },
          data: { status: 'FAILED', errorMessage: `[${stage}] ${errMsg}` },
        });
        break;
      }
    }
    // Clear dev queue
    if (this.queueService.devQueue) {
      this.queueService.devQueue = [];
    }
    this.logger.log(`[DEV] Pipeline complete for run ${editorialRunId}`);
  }

  /**
   * Procesa una etapa del pipeline editorial (invocado por el worker de cola)
   */
  async processStage(
    editorialRunId: string,
    stage: string,
    workspaceId: string,
  ): Promise<{ nextStage: string | null }> {
    this.logger.log(`Processing stage '${stage}' for run ${editorialRunId}`);

    try {
      switch (stage) {
        case 'research': {
          await this.prisma.editorialRun.update({
            where: { id: editorialRunId },
            data: { status: 'RESEARCH' },
          });

          // Check origin: if researchSummary already populated (e.g. trend origin), skip research
          const run = await this.prisma.editorialRun.findUniqueOrThrow({
            where: { id: editorialRunId },
            select: { origin: true, researchSummary: true },
          });

          if (run.researchSummary) {
            this.logger.log(`Run ${editorialRunId} already has researchSummary (origin: ${run.origin}) → skipping research`);
            await this.prisma.editorialRun.update({
              where: { id: editorialRunId },
              data: { status: 'STRATEGY' },
            });
          } else if (run.origin === 'weekly-planner-business') {
            this.logger.log('Origin is weekly-planner-business → using internal business research');
            await this.researchService.executeInternalResearch(
              editorialRunId,
              workspaceId,
            );
          } else {
            // Detect if the current theme is promotional → use internal research
            const activeTheme = await this.resolveActiveTheme(editorialRunId, workspaceId);
            const themeType = activeTheme?.type ?? null;

            if (themeType && this.researchService.isPromotionalThemeType(themeType)) {
              this.logger.log(
                `Theme type "${themeType}" is promotional → using internal business research`,
              );
              await this.researchService.executeInternalResearch(
                editorialRunId,
                workspaceId,
                themeType,
              );
            } else {
              await this.researchService.executeResearch(editorialRunId, workspaceId);
            }
          }
          // Research service ya actualiza el status a STRATEGY
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'strategy');
        }

        case 'strategy': {
          await this.strategyService.executeStrategy(editorialRunId, workspaceId);
          // Strategy service actualiza a CONTENT
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'content');
        }

        case 'content': {
          const result = await this.contentService.executeContentGeneration(
            editorialRunId,
            workspaceId,
          );
          // Content service determina si va a MEDIA o REVIEW
          const run = await this.prisma.editorialRun.findUniqueOrThrow({
            where: { id: editorialRunId },
          });

          if (run.status === 'MEDIA') {
            // Encolar job de media (se implementará en Fase 2)
            return await this.enqueueNextStage(editorialRunId, workspaceId, 'media');
          }
          // Si fue a REVIEW directamente, encolar para Telegram
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'review');
        }

        case 'media': {
          this.logger.log(`Media stage for ${editorialRunId}`);
          await this.prisma.editorialRun.update({
            where: { id: editorialRunId },
            data: { status: 'MEDIA' },
          });
          try {
            await this.mediaEngine.executeMediaGeneration(editorialRunId, workspaceId);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Media generation FAILED for ${editorialRunId}: ${errMsg}`, err instanceof Error ? err.stack : '');
            await this.prisma.editorialRun.update({
              where: { id: editorialRunId },
              data: {
                status: 'REVIEW',
                errorMessage: `Media: ${errMsg.substring(0, 500)}`,
              },
            });
          }

          // Check if video format — enqueue video stage if needed
          const briefForVideo = await this.prisma.contentBrief.findUnique({
            where: { editorialRunId },
          });
          const format = briefForVideo?.format?.toLowerCase() ?? '';

          // Always route through music stage — it will decide whether to generate music
          // and then route to video or review as appropriate
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'music');
        }

        case 'music': {
          this.logger.log(`Music stage for ${editorialRunId}`);
          const AUDIO_FORMATS = new Set(['reel', 'story', 'avatar_video', 'hybrid_motion']);

          // Weekly planner runs handle music separately via checkBatchCompletion (respects musicEnabled config)
          const runForMusic = await this.prisma.editorialRun.findUniqueOrThrow({
            where: { id: editorialRunId },
            select: { origin: true },
          });
          const isWeeklyPlanner = runForMusic.origin?.startsWith('weekly-planner');

          const briefForMusic = await this.prisma.contentBrief.findUnique({
            where: { editorialRunId },
            include: { contentVersions: { take: 1, select: { id: true } } },
          });
          const musicFormat = briefForMusic?.format?.toLowerCase() ?? '';
          const mainVersionId = briefForMusic?.contentVersions?.[0]?.id;

          if (!isWeeklyPlanner && AUDIO_FORMATS.has(musicFormat) && mainVersionId) {
            // Check if music already exists
            const existingMusic = await this.prisma.mediaAsset.findFirst({
              where: { contentVersionId: mainVersionId, type: 'AUDIO' },
            });
            if (!existingMusic) {
              try {
                await this.mediaEngine.generateBackgroundMusic(mainVersionId);
                this.logger.log(`🎵 Music generated for run ${editorialRunId}`);
              } catch (err) {
                this.logger.warn(`Music generation skipped for ${editorialRunId}: ${err instanceof Error ? err.message : err}`);
              }
            }
          }

          // Route to video stage if format requires it
          if (['avatar_video', 'hybrid_motion', 'reel'].includes(musicFormat)) {
            return await this.enqueueNextStage(editorialRunId, workspaceId, 'video');
          }
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'review');
        }

        case 'video': {
          this.logger.log(`Video stage for ${editorialRunId} — queuing video generation`);
          // Video generation is async (HeyGen render).
          // We transition to REVIEW and let the video worker handle completion.
          // The video will be attached as a MediaAsset when ready.
          try {
            await this.queueService.enqueue(QUEUES.VIDEO, {
              type: 'generate_video',
              jobId: `job_${editorialRunId}_video`,
              editorialRunId,
              workspaceId,
              scriptId: editorialRunId, // VideoWorker will generate from run
              timestamp: new Date().toISOString(),
              attempt: 1,
            });
            this.logger.log(`Video job enqueued for ${editorialRunId}`);
          } catch (err) {
            this.logger.warn(`Video enqueue failed for ${editorialRunId}, skipping`, err);
          }
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'review');
        }

        case 'compliance': {
          // Ya se hace inline en ContentService, pero se deja como punto de extensión
          this.logger.log(`Compliance check passed for ${editorialRunId}`);
          await this.prisma.editorialRun.update({
            where: { id: editorialRunId },
            data: { status: 'REVIEW' },
          });
          return await this.enqueueNextStage(editorialRunId, workspaceId, 'review');
        }

        case 'review': {
          // Resolve effective operation mode: campaign → schedule → workspace (cascade)
          const runForMode = await this.prisma.editorialRun.findUnique({
            where: { id: editorialRunId },
            include: {
              campaign: { select: { operationMode: true } },
              workspace: { select: { operationMode: true } },
            },
          });

          // Check schedule-level operationMode (via workspace owner's schedule)
          const ownerUser = await this.prisma.workspaceUser.findFirst({
            where: { workspaceId, role: 'OWNER' },
            select: { userId: true },
          });
          let scheduleMode: string | null | undefined = null;
          if (ownerUser) {
            const activeSchedule = await this.prisma.publishSchedule.findFirst({
              where: { userId: ownerUser.userId, isActive: true, operationMode: { not: null } },
              select: { operationMode: true },
            });
            scheduleMode = activeSchedule?.operationMode;
          }
          const effectiveMode =
            runForMode?.campaign?.operationMode ??
            scheduleMode ??
            runForMode?.workspace?.operationMode;

          if (effectiveMode === 'FULLY_AUTOMATIC') {
            const source = runForMode?.campaign?.operationMode
              ? 'campaign'
              : scheduleMode
                ? 'schedule'
                : 'workspace';
            this.logger.log(`Run ${editorialRunId} auto-approved (FULLY_AUTOMATIC mode — ${source} level)`);
            await this.onApproved(editorialRunId);
            return { nextStage: null };
          }

          if (effectiveMode === 'MANUAL') {
            // MANUAL mode: do NOT auto-approve or send to Telegram.
            // Content stays in REVIEW until explicit user action via dashboard.
            this.logger.log(`Run ${editorialRunId} requires manual approval (MANUAL mode) — waiting for dashboard action`);
            return { nextStage: null };
          }

          // Check if this run belongs to a weekly planner batch
          const plannedPub = await this.prisma.plannedPublication.findUnique({
            where: { editorialRunId },
            include: { batch: { include: { config: { select: { approvalMode: true } } } } },
          });
          if (plannedPub) {
            // Update item status immediately so frontend progress reflects completion
            await this.prisma.plannedPublication.update({
              where: { id: plannedPub.id },
              data: { status: 'PENDING_REVIEW' },
            });
            this.logger.log(`PlannedPublication ${plannedPub.id} updated to PENDING_REVIEW`);

            // Check if entire batch is now complete
            if (plannedPub.batchId) {
              const remaining = await this.prisma.plannedPublication.count({
                where: { batchId: plannedPub.batchId, status: 'GENERATING' },
              });
              if (remaining === 0) {
                await this.prisma.weeklyPlanBatch.update({
                  where: { id: plannedPub.batchId },
                  data: { status: 'PENDING_REVIEW' },
                });
                this.logger.log(`Batch ${plannedPub.batchId} fully complete — status set to PENDING_REVIEW`);
                // Telegram notification handled by cron checkBatchCompletion
              }
            }

            if (plannedPub.batch?.config?.approvalMode === 'panel') {
              this.logger.log(`Run ${editorialRunId} belongs to weekly planner with panel approval — waiting for dashboard action`);
              return { nextStage: null };
            }
          }

          // Enviar preview a Telegram para aprobación humana
          this.logger.log(`Run ${editorialRunId} ready for review — sending to Telegram`);
          try {
            await this.telegramApproval.sendForReview(editorialRunId);
          } catch (err) {
            this.logger.error(`Failed to send Telegram preview for ${editorialRunId}:`, err);
          }
          // No hay siguiente etapa automática — espera respuesta humana
          return { nextStage: null };
        }

        default:
          this.logger.warn(`Unknown stage: ${stage}`);
          return { nextStage: null };
      }
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.logger.error(`Stage '${stage}' failed for run ${editorialRunId}:`, error);
      await this.prisma.editorialRun.update({
        where: { id: editorialRunId },
        data: { status: 'FAILED', errorMessage: `[${stage}] ${errMsg}` },
      });

      // Update PlannedPublication status immediately on failure
      const failedPub = await this.prisma.plannedPublication.findUnique({
        where: { editorialRunId },
      });
      if (failedPub && failedPub.status === 'GENERATING') {
        await this.prisma.plannedPublication.update({
          where: { id: failedPub.id },
          data: { status: 'FAILED' },
        });
        // Check if batch is now fully done
        if (failedPub.batchId) {
          const remaining = await this.prisma.plannedPublication.count({
            where: { batchId: failedPub.batchId, status: 'GENERATING' },
          });
          if (remaining === 0) {
            await this.prisma.weeklyPlanBatch.update({
              where: { id: failedPub.batchId },
              data: { status: 'PENDING_REVIEW' },
            });
          }
        }
      }

      throw error;
    }
  }

  /**
   * Reanuda el pipeline después de una aprobación.
   * Si hay ventana de publicación configurada, respeta el horario.
   * Crea registros Publication y los encola.
   */
  async onApproved(editorialRunId: string): Promise<void> {
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: 'APPROVED' },
    });

    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
    });

    const channels = (run.targetChannels ?? ['instagram']) as string[];
    // Filter to valid Publication platforms (discord is cross-post via webhook, not an editorial platform)
    const validPlatforms = [
      'instagram', 'facebook', 'threads', 'twitter', 'linkedin',
      'tiktok', 'youtube', 'pinterest', 'meta_ads', 'google_ads',
      'whatsapp', 'mercadolibre',
    ];
    const publishableChannels = channels.filter((ch) => validPlatforms.includes(ch.toLowerCase()));

    for (const channel of publishableChannels) {
      const platform = channel.toUpperCase() as any;

      // Idempotencia: verificar que no exista publicación exitosa
      const existing = await this.prisma.publication.findFirst({
        where: { editorialRunId, platform, status: 'PUBLISHED' },
      });
      if (existing) continue;

      // Crear registro Publication
      const publication = await this.prisma.publication.create({
        data: { editorialRunId, platform, status: 'QUEUED' },
      });

      // Encolar publicación
      await this.queueService.enqueue(QUEUES.PUBLISH, {
        type: 'publish',
        jobId: `job_pub_${publication.id}`,
        editorialRunId,
        workspaceId: run.workspaceId,
        publicationId: publication.id,
        platform: channel,
        timestamp: new Date().toISOString(),
        attempt: 1,
        // Si hay ventana de publicación, el worker la respetará
        publishWindow: run.publishWindow?.toISOString() ?? null,
      });
    }
  }

  /**
   * Maneja el rechazo desde Telegram
   */
  async onRejected(editorialRunId: string, reason?: string): Promise<void> {
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: 'REJECTED' },
    });
    this.logger.log(`Run ${editorialRunId} rejected: ${reason ?? 'no reason'}`);
  }

  /**
   * Maneja la posposición desde Telegram
   */
  async onPostponed(editorialRunId: string): Promise<void> {
    await this.prisma.editorialRun.update({
      where: { id: editorialRunId },
      data: { status: 'POSTPONED' },
    });
    this.logger.log(`Run ${editorialRunId} postponed`);
  }

  // ============================================================
  // Private
  // ============================================================

  /**
   * Resolve the active ContentTheme for a given editorial run.
   * Checks campaign themes first, then picks the workspace's highest-priority active theme.
   */
  private async resolveActiveTheme(
    editorialRunId: string,
    workspaceId: string,
  ): Promise<{ id: string; type: string; name: string } | null> {
    const run = await this.prisma.editorialRun.findUnique({
      where: { id: editorialRunId },
      select: { campaignId: true },
    });

    // If campaign run, get theme from campaign themes
    if (run?.campaignId) {
      const campaignTheme = await this.prisma.campaignTheme.findFirst({
        where: { campaignId: run.campaignId, theme: { isActive: true } },
        include: { theme: { select: { id: true, type: true, name: true } } },
      });
      if (campaignTheme?.theme) {
        return {
          id: campaignTheme.theme.id,
          type: campaignTheme.theme.type ?? 'TRENDING',
          name: campaignTheme.theme.name,
        };
      }
    }

    // Fallback: get highest-priority active theme from workspace
    const theme = await this.prisma.contentTheme.findFirst({
      where: { workspaceId, isActive: true },
      select: { id: true, type: true, name: true },
      orderBy: { priority: 'desc' },
    });

    if (theme) {
      return {
        id: theme.id,
        type: theme.type ?? 'TRENDING',
        name: theme.name,
      };
    }

    return null;
  }

  private async enqueueNextStage(
    editorialRunId: string,
    workspaceId: string,
    nextStage: string,
  ): Promise<{ nextStage: string }> {
    await this.queueService.enqueue(QUEUES.EDITORIAL, {
      type: 'editorial_pipeline',
      jobId: `job_${editorialRunId}_${nextStage}`,
      editorialRunId,
      workspaceId,
      stage: nextStage,
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    return { nextStage };
  }
}
