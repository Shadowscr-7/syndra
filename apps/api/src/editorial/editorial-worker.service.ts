// ============================================================
// Editorial Worker — Consume jobs de la cola editorial
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { QueueService } from '../queue/queue.service';
import { EditorialOrchestratorService } from './editorial-orchestrator.service';
import { QUEUES } from '@automatismos/shared';

/**
 * Worker que consume jobs de editorial_jobs cada 10 segundos.
 * Lee un mensaje, lo procesa y lo confirma (ACK) si éxito,
 * o lo reintenta en caso de fallo.
 */
@Injectable()
export class EditorialWorkerService implements OnModuleInit {
  private readonly logger = new Logger(EditorialWorkerService.name);
  private isProcessing = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly orchestrator: EditorialOrchestratorService,
  ) {}

  onModuleInit() {
    this.logger.log('Editorial worker initialized — polling every 10s');
  }

  @Interval(10_000)
  async pollEditorialQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const message = await this.queueService.dequeue(QUEUES.EDITORIAL, 60);
      if (!message) return;

      const payload = message.payload as {
        editorialRunId?: string;
        workspaceId?: string;
        stage?: string;
      };

      if (!payload.editorialRunId || !payload.stage || !payload.workspaceId) {
        this.logger.warn('Invalid editorial job payload, acknowledging to discard');
        await this.queueService.acknowledge(QUEUES.EDITORIAL, message.msgId);
        return;
      }

      this.logger.log(
        `Processing editorial job: run=${payload.editorialRunId}, stage=${payload.stage}`,
      );

      try {
        await this.orchestrator.processStage(
          payload.editorialRunId,
          payload.stage,
          payload.workspaceId,
        );

        // ACK
        await this.queueService.acknowledge(QUEUES.EDITORIAL, message.msgId);

        this.logger.log(
          `Editorial job completed: run=${payload.editorialRunId}, stage=${payload.stage}`,
        );
      } catch (error) {
        this.logger.error(
          `Editorial job failed: run=${payload.editorialRunId}, stage=${payload.stage}`,
          error,
        );

        // Si ya fue leído muchas veces, el mensaje se moverá a DLQ automáticamente
        // con pgmq. Aquí podremos re-encolar con backoff si es necesario.
        if (message.readCount < 3) {
          this.logger.log('Job will be retried by pgmq visibility timeout');
        } else {
          this.logger.error('Job exceeded max retries, acknowledging as failed');
          await this.queueService.acknowledge(QUEUES.EDITORIAL, message.msgId);
        }
      }
    } catch (error) {
      this.logger.error('Error polling editorial queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
