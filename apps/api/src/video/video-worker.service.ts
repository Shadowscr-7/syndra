// ============================================================
// Video Worker Service — Procesa cola de video_jobs (polling render)
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { VideoService } from './video.service';
import { QUEUES, MAX_RETRIES } from '@automatismos/shared';

const POLL_INTERVAL_MS = 10_000; // Cada 10s (videos tardan minutos)
const VIDEO_CHECK_INTERVAL_MS = 15_000; // Re-check render cada 15s

@Injectable()
export class VideoWorkerService implements OnModuleInit {
  private readonly logger = new Logger(VideoWorkerService.name);
  private polling = false;

  /** Mapa de assets que están siendo renderizados → polling activo */
  private activeRenders: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly videoService: VideoService,
  ) {}

  onModuleInit() {
    this.startPolling();
    this.logger.log('Video worker started — polling video_jobs queue');
  }

  private startPolling() {
    setInterval(async () => {
      if (this.polling) return;
      this.polling = true;

      try {
        await this.processNextJob();
      } catch (error) {
        this.logger.error('Video worker error:', error);
      } finally {
        this.polling = false;
      }
    }, POLL_INTERVAL_MS);
  }

  private async processNextJob(): Promise<void> {
    const job = await this.queueService.dequeue(QUEUES.VIDEO);
    if (!job) return;

    const payload = job.payload as Record<string, unknown>;
    const type = payload['type'] as string;
    const mediaAssetId = payload['scriptId'] as string;
    const editorialRunId = payload['editorialRunId'] as string;
    const attempt = (payload['attempt'] as number) ?? 1;

    this.logger.log(
      `Processing video job: type=${type}, asset=${mediaAssetId}, attempt=${attempt}`,
    );

    try {
      if (type === 'generate_video' || type === 'generate_avatar') {
        // Iniciar polling del render status
        await this.startRenderPolling(mediaAssetId, editorialRunId, String(job.msgId));
      }
    } catch (error) {
      this.logger.error(`Video job failed: ${error}`);

      if (attempt < MAX_RETRIES) {
        // Re-encolar con backoff
        await this.queueService.enqueue(QUEUES.VIDEO, {
          ...payload,
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Acknowledge el job original
    try {
      await this.queueService.acknowledge(QUEUES.VIDEO, job.msgId);
    } catch {
      // Ignorar si falla el ack
    }
  }

  /**
   * Inicia un polling periódico para verificar si el render del video
   * está completo. Cuando termina, limpia el timer.
   */
  private async startRenderPolling(
    mediaAssetId: string,
    editorialRunId: string,
    msgId: string,
  ): Promise<void> {
    // Evitar duplicados
    if (this.activeRenders.has(mediaAssetId)) {
      this.logger.warn(`Already polling render for asset ${mediaAssetId}`);
      return;
    }

    let checks = 0;
    const maxChecks = 60; // 60 × 15s = 15 min max

    const timer = setInterval(async () => {
      checks++;

      try {
        const result = await this.videoService.pollVideoStatus(mediaAssetId);

        if (result.completed) {
          clearInterval(timer);
          this.activeRenders.delete(mediaAssetId);

          if (result.status === 'completed') {
            this.logger.log(`✅ Video ready: asset=${mediaAssetId}, url=${result.videoUrl}`);
          } else {
            this.logger.warn(`❌ Video failed: asset=${mediaAssetId}`);
          }
          return;
        }

        if (checks >= maxChecks) {
          clearInterval(timer);
          this.activeRenders.delete(mediaAssetId);
          this.logger.warn(`Timeout polling render for asset ${mediaAssetId}`);
        }
      } catch (error) {
        this.logger.error(`Render poll error for ${mediaAssetId}:`, error);
        if (checks >= maxChecks) {
          clearInterval(timer);
          this.activeRenders.delete(mediaAssetId);
        }
      }
    }, VIDEO_CHECK_INTERVAL_MS);

    this.activeRenders.set(mediaAssetId, timer);
    this.logger.log(`Started render polling for asset ${mediaAssetId}`);
  }
}
