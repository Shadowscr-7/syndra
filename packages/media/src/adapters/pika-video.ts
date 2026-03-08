// ============================================================
// Pika Video Adapter — API-based short video generation
// ============================================================

import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface PikaConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Pika Labs adapter for short-form video generation.
 * Currently a mock implementation that simulates the Pika API.
 * Replace with real API calls once Pika opens their REST API.
 */
export class PikaVideoAdapter implements AvatarVideoAdapter {
  private jobs = new Map<string, { status: VideoJobStatus; createdAt: number }>();

  constructor(private readonly config: PikaConfig) {}

  async generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    const jobId = `pika_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalDuration = script.totalDuration ?? script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    this.jobs.set(jobId, {
      status: { status: 'queued', progress: 0 },
      createdAt: Date.now(),
    });

    // Simulate progressive rendering
    setTimeout(() => {
      const j = this.jobs.get(jobId);
      if (j) j.status = { status: 'rendering', progress: 40 };
    }, 3_000);

    setTimeout(() => {
      const j = this.jobs.get(jobId);
      if (j) j.status = {
        status: 'completed',
        progress: 100,
        url: `https://pika.art/render/${jobId}.mp4?d=${totalDuration}&ar=${options?.aspectRatio ?? '9:16'}`,
      };
    }, 8_000);

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const j = this.jobs.get(jobId);
    if (!j) return { status: 'failed', error: `Pika job ${jobId} not found` };
    return j.status;
  }
}
