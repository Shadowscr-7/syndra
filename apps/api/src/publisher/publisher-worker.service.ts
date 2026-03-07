// ============================================================
// Publisher Worker — Consume publish_jobs de la cola
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PublisherService } from './publisher.service';
import { QUEUES } from '@automatismos/shared';

@Injectable()
export class PublisherWorkerService implements OnModuleInit {
  private readonly logger = new Logger(PublisherWorkerService.name);
  private polling = false;
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly queueService: QueueService,
    private readonly publisherService: PublisherService,
  ) {}

  onModuleInit() {
    // Start polling for publish jobs
    this.startPolling();
  }

  private startPolling(): void {
    if (this.polling) return;
    this.polling = true;

    this.intervalRef = setInterval(async () => {
      try {
        await this.processNextJob();
      } catch (error) {
        this.logger.error('Publish worker error:', error);
      }
    }, 5_000); // Poll every 5 seconds

    this.logger.log('Publisher worker started — polling publish_jobs every 5s');
  }

  private async processNextJob(): Promise<void> {
    const job = await this.queueService.dequeue(QUEUES.PUBLISH);
    if (!job) return;

    const { publicationId, editorialRunId, workspaceId, platform, publishWindow } =
      job.payload as {
        publicationId?: string;
        editorialRunId: string;
        workspaceId: string;
        platform: string;
        publishWindow?: string | null;
      };

    // Respetar ventana de publicación
    if (publishWindow) {
      const windowDate = new Date(publishWindow);
      if (windowDate.getTime() > Date.now()) {
        this.logger.log(
          `Publication ${publicationId} scheduled for ${publishWindow}, skipping for now`,
        );
        // Don't acknowledge — it will be re-read after visibility timeout
        return;
      }
    }

    this.logger.log(
      `Processing publish job: run=${editorialRunId}, platform=${platform}`,
    );

    try {
      if (publicationId) {
        // Publication already created by orchestrator
        await this.publisherService.executePublication(publicationId);
      } else {
        // Legacy: enqueue creates publication records and executes them
        await this.publisherService.enqueuePublication(editorialRunId, workspaceId);
      }

      // Acknowledge the job
      await this.queueService.acknowledge(QUEUES.PUBLISH, job.msgId);
    } catch (error) {
      this.logger.error(
        `Publish job failed for run ${editorialRunId}:`,
        error,
      );
    }
  }
}
