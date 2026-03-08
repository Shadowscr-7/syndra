// ============================================================
// Composite Video Adapter — Combines voice, images, and animation
// via ffmpeg into a composed video (T2 self-hosted pipeline)
// ============================================================

import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface CompositeVideoConfig {
  /** Path to ffmpeg binary (default: 'ffmpeg' on PATH) */
  ffmpegPath?: string;
  /** Working directory for temp files */
  workDir?: string;
  /** Output directory */
  outputDir?: string;
}

/**
 * Composes video from voice narration + images + animation layers.
 * Uses ffmpeg to stitch everything together.
 * This is a mock/skeleton implementation — real ffmpeg calls are TODO.
 */
export class CompositeVideoAdapter implements AvatarVideoAdapter {
  private jobs = new Map<string, { status: VideoJobStatus; createdAt: number }>();

  constructor(private readonly config: CompositeVideoConfig = {}) {}

  async generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    const jobId = `composite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalDuration = script.totalDuration ?? script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    this.jobs.set(jobId, {
      status: { status: 'queued', progress: 0 },
      createdAt: Date.now(),
    });

    // Pipeline stages: script → voice → image → animate → compose
    // Stage 1: Voice synthesis (simulated)
    setTimeout(() => {
      const j = this.jobs.get(jobId);
      if (j) j.status = { status: 'rendering', progress: 20 };
    }, 2_000);

    // Stage 2: Image generation (simulated)
    setTimeout(() => {
      const j = this.jobs.get(jobId);
      if (j) j.status = { status: 'rendering', progress: 50 };
    }, 5_000);

    // Stage 3: Animation + composition (simulated)
    setTimeout(() => {
      const j = this.jobs.get(jobId);
      if (j) j.status = { status: 'rendering', progress: 80 };
    }, 8_000);

    // Stage 4: Final output
    setTimeout(() => {
      const j = this.jobs.get(jobId);
      const outDir = this.config.outputDir ?? '/tmp/video-output';
      if (j) j.status = {
        status: 'completed',
        progress: 100,
        url: `file://${outDir}/${jobId}.mp4?d=${totalDuration}`,
      };
    }, 11_000);

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const j = this.jobs.get(jobId);
    if (!j) return { status: 'failed', error: `Composite job ${jobId} not found` };
    return j.status;
  }
}
