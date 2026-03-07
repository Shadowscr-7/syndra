// ============================================================
// Mock Video Adapter — Desarrollo sin HeyGen API key
// ============================================================

import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

/**
 * Simula la generación de video con avatar para desarrollo local.
 * Retorna URLs fake y simula tiempos de render.
 */
export class MockVideoAdapter implements AvatarVideoAdapter {
  private jobs: Map<string, { status: VideoJobStatus; createdAt: number }> = new Map();

  async generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    const jobId = `mock_video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const totalDuration = script.totalDuration
      ?? script.blocks.reduce((sum, b) => sum + (b.duration ?? 5), 0);

    this.jobs.set(jobId, {
      status: {
        status: 'queued',
        progress: 0,
      },
      createdAt: Date.now(),
    });

    // Simular render progresivo
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = { status: 'rendering', progress: 30 };
      }
    }, 2_000);

    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = { status: 'rendering', progress: 70 };
      }
    }, 4_000);

    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = {
          status: 'completed',
          progress: 100,
          url: `https://mock-video.dev/avatar/${jobId}.mp4?duration=${totalDuration}&ratio=${options?.aspectRatio ?? '9:16'}`,
        };
      }
    }, 6_000);

    return {
      jobId,
      status: 'queued',
    };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { status: 'failed', error: `Job ${jobId} not found` };
    }
    return job.status;
  }
}
