import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES, MAX_RETRIES, RETRY_BACKOFF_BASE_MS } from '@automatismos/shared';

/**
 * QueueService — Consumidor genérico para pgmq
 *
 * Abstrae la interacción con Supabase Queues (pgmq).
 * Soporta:
 * - Envío de mensajes a colas
 * - Lectura con visibility timeout
 * - Reintentos con backoff exponencial
 * - Logging de cada job
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private pgmqUnavailable = false;
  public devQueue: Array<{ queue: string; payload: Record<string, unknown> }> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encola un mensaje en la cola indicada
   */
  async enqueue(queue: string, payload: Record<string, unknown>) {
    this.logger.log(`Enqueueing job to ${queue}: ${JSON.stringify(payload).substring(0, 100)}`);

    // In dev mode without pgmq, store the job in an in-memory queue
    if (this.pgmqUnavailable) {
      this.logger.log(`[DEV] pgmq unavailable — adding to in-memory queue for ${queue}`);
      if (!this.devQueue) this.devQueue = [];
      this.devQueue.push({ queue, payload });
      // Log the job
      await this.prisma.jobQueueLog.create({
        data: {
          jobType: (payload as { type?: string }).type ?? 'unknown',
          queue,
          status: 'QUEUED',
          payload: payload as any,
          editorialRunId: (payload as { editorialRunId?: string }).editorialRunId ?? null,
        },
      });
      return true;
    }

    try {
      await this.prisma.$executeRawUnsafe(
        `SELECT pgmq.send($1, $2::jsonb)`,
        queue,
        JSON.stringify(payload),
      );

      // Log the job
      await this.prisma.jobQueueLog.create({
        data: {
          jobType: (payload as { type?: string }).type ?? 'unknown',
          queue,
          status: 'QUEUED',
          payload: payload as any,
          editorialRunId: (payload as { editorialRunId?: string }).editorialRunId ?? null,
        },
      });

      return true;
    } catch (error) {
      const msg = (error as Error)?.message ?? '';
      if (msg.includes('pgmq') || msg.includes('3F000')) {
        this.logger.warn('pgmq not available — switching to dev in-memory queue');
        this.pgmqUnavailable = true;
        if (!this.devQueue) this.devQueue = [];
        this.devQueue.push({ queue, payload });
        return true;
      }
      this.logger.error(`Failed to enqueue to ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Lee un mensaje de la cola (con visibility timeout de 30s)
   */
  async dequeue(queue: string, visibilityTimeout = 30) {
    // Dev mode: read from in-memory queue when pgmq is unavailable
    if (this.pgmqUnavailable) {
      if (!this.devQueue || this.devQueue.length === 0) return null;
      const idx = this.devQueue.findIndex((j) => j.queue === queue);
      if (idx === -1) return null;
      const job = this.devQueue.splice(idx, 1)[0]!;
      this.logger.log(`[DEV] Dequeued job from in-memory queue: ${queue}`);
      return {
        msgId: BigInt(Date.now()),
        readCount: 1,
        payload: job.payload,
      };
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<
        Array<{ msg_id: bigint; read_ct: number; message: unknown }>
      >(`SELECT * FROM pgmq.read($1, $2, 1)`, queue, visibilityTimeout);

      if (result.length === 0) return null;

      return {
        msgId: result[0]!.msg_id,
        readCount: result[0]!.read_ct,
        payload: result[0]!.message as Record<string, unknown>,
      };
    } catch (error) {
      // Only log once if pgmq is not available (dev without Supabase)
      if (!this.pgmqUnavailable) {
        const msg = (error as Error)?.message ?? '';
        if (msg.includes('pgmq') || msg.includes('3F000')) {
          this.logger.warn('pgmq not available — switching dequeue to in-memory (dev mode)');
          this.pgmqUnavailable = true;
        } else {
          this.logger.error(`Failed to dequeue from ${queue}:`, error);
        }
      }
      return null;
    }
  }

  /**
   * Marca un mensaje como completado (lo elimina de la cola)
   */
  async acknowledge(queue: string, msgId: bigint) {
    // Dev mode: job was already removed from devQueue in dequeue()
    if (this.pgmqUnavailable) return true;

    try {
      await this.prisma.$executeRawUnsafe(`SELECT pgmq.delete($1, $2)`, queue, msgId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to ack message ${msgId} from ${queue}:`, error);
      return false;
    }
  }

  /**
   * Calcula backoff exponencial para reintentos
   */
  calculateBackoff(attempt: number): number {
    return RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
  }

  /**
   * Verifica si debe reintentar o rendirse
   */
  shouldRetry(attempt: number): boolean {
    return attempt < MAX_RETRIES;
  }
}
