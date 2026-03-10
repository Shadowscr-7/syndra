// ============================================================
// fal.ai Video Adapter — Wan 2.5 Text-to-Video / Image-to-Video
// ============================================================

import type {
  AvatarVideoAdapter,
  VideoScript,
  VideoGenOptions,
  GeneratedVideo,
  VideoJobStatus,
} from '../index';

export interface FalVideoConfig {
  apiKey: string;
  defaultEndpoint?: FalVideoEndpoint;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type FalVideoEndpoint =
  | 'wan-t2v'     // Text-to-Video — $0.05/s cheaper than Replicate
  | 'wan-i2v'     // Image-to-Video
  | 'wan-t2v-1.3b'; // Lightweight 1.3B model — cheapest

const FAL_ENDPOINT_IDS: Record<FalVideoEndpoint, string> = {
  'wan-t2v': 'fal-ai/wan/v2.1/t2v',
  'wan-i2v': 'fal-ai/wan/v2.1/i2v',
  'wan-t2v-1.3b': 'fal-ai/wan/v2.1/1.3b/t2v',
};

export class FalVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly defaultEndpoint: FalVideoEndpoint;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://queue.fal.run';

  constructor(config: FalVideoConfig) {
    if (!config.apiKey) throw new Error('FalVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
    this.defaultEndpoint = config.defaultEndpoint ?? 'wan-t2v';
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 3000;
  }

  async generate(
    script: VideoScript,
    options?: VideoGenOptions & {
      endpoint?: FalVideoEndpoint;
      imageUrl?: string;
    },
  ): Promise<GeneratedVideo> {
    const endpoint = options?.endpoint ?? this.defaultEndpoint;
    const endpointId = FAL_ENDPOINT_IDS[endpoint];
    const isI2V = endpoint.includes('i2v');

    const prompt = script.blocks.map((b) => b.text).join(' ');
    const totalDuration =
      script.totalDuration ??
      script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    const numFrames = Math.min(Math.round(totalDuration * 16), 81);
    const resolution = options?.aspectRatio === '9:16' ? '480x832' : '832x480';

    const input: Record<string, unknown> = {
      prompt,
      num_frames: numFrames,
      resolution,
      enable_safety_checker: true,
      ...(isI2V && options?.imageUrl ? { image_url: options.imageUrl } : {}),
    };

    // Submit to queue
    const res = await fetch(`${this.baseUrl}/${endpointId}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`fal.ai submit failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    const requestId = data.request_id;

    if (!requestId) {
      // Synchronous response — video returned immediately
      const url = data?.video?.url ?? data?.output?.video?.url;
      if (url) {
        return { jobId: `fal_sync_${Date.now()}`, status: 'completed', url };
      }
      throw new Error('fal.ai: no request_id or video in response');
    }

    // Store the fal.ai-provided URLs for status/result (they use a shorter base path).
    // Format: fal::{statusUrl}::{responseUrl}
    const statusUrl = data.status_url as string;
    const responseUrl = data.response_url as string;

    return {
      jobId: `fal::${statusUrl}::${responseUrl}`,
      status: 'queued',
    };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    if (jobId.startsWith('fal_sync_')) {
      return { status: 'completed', progress: 100 };
    }

    // Parse jobId — new format stores URLs directly: fal::{statusUrl}::{responseUrl}
    let statusUrl: string;
    let responseUrl: string;

    if (jobId.startsWith('fal::http')) {
      // New format: full URLs from fal.ai response
      const parts = jobId.split('::');
      statusUrl = parts[1]!;
      responseUrl = parts[2]!;
    } else if (jobId.includes('::')) {
      // Mid format: fal::{endpointId}::{requestId}
      const parts = jobId.split('::');
      const endpointId = parts[1]!;
      const requestId = parts[2]!;
      statusUrl = `https://queue.fal.run/${endpointId}/requests/${requestId}/status`;
      responseUrl = `https://queue.fal.run/${endpointId}/requests/${requestId}`;
    } else {
      // Legacy format: fal_{endpointId}_{requestId}
      const raw = jobId.replace(/^fal_/, '');
      const lastUnderscore = raw.lastIndexOf('_');
      const requestId = raw.slice(lastUnderscore + 1);
      const endpointId = raw.slice(0, lastUnderscore);
      statusUrl = `https://queue.fal.run/${endpointId}/requests/${requestId}/status`;
      responseUrl = `https://queue.fal.run/${endpointId}/requests/${requestId}`;
    }

    try {
      const res = await fetch(statusUrl, {
        headers: { Authorization: `Key ${this.apiKey}` },
      });

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = (await res.json()) as any;

      switch (data.status) {
        case 'IN_QUEUE':
          return { status: 'queued', progress: 5 };
        case 'IN_PROGRESS':
          return { status: 'rendering', progress: 50 };
        case 'COMPLETED': {
          // Fetch result using the response URL
          const resultRes = await fetch(responseUrl, {
            headers: { Authorization: `Key ${this.apiKey}` },
          });
          if (!resultRes.ok)
            return { status: 'failed', error: 'Failed to fetch result' };

          const result = (await resultRes.json()) as any;
          const url = result?.video?.url ?? result?.output?.video?.url;
          return { status: 'completed', progress: 100, url };
        }
        case 'FAILED':
          return {
            status: 'failed',
            error: data.error ?? 'fal.ai generation failed',
          };
        default:
          return { status: 'queued', progress: 0 };
      }
    } catch (err: any) {
      // Transient network errors should NOT permanently fail the job.
      console.warn(`[FalVideoAdapter] getStatus transient error for ${statusUrl}: ${err.message}`);
      return { status: 'rendering', progress: 0 };
    }
  }
}
