// ============================================================
// Replicate Video Adapter — Wan 2.1 Image-to-Video / Text-to-Video
// ============================================================

import type {
  AvatarVideoAdapter,
  VideoScript,
  VideoGenOptions,
  GeneratedVideo,
  VideoJobStatus,
} from '../index';

export interface ReplicateVideoConfig {
  apiToken: string;
  defaultModel?: ReplicateVideoModel;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type ReplicateVideoModel =
  | 'wan-2.1-i2v-480p' // Image-to-Video 480p — $0.09/s
  | 'wan-2.1-i2v-720p' // Image-to-Video 720p — $0.25/s
  | 'wan-2.1-t2v-480p' // Text-to-Video 480p  — $0.09/s
  | 'wan-2.1-t2v-720p'; // Text-to-Video 720p  — $0.25/s

const VIDEO_MODEL_IDS: Record<ReplicateVideoModel, string> = {
  'wan-2.1-i2v-480p': 'wavespeedai/wan-2.1-i2v-480p',
  'wan-2.1-i2v-720p': 'wavespeedai/wan-2.1-i2v-720p',
  'wan-2.1-t2v-480p': 'wavespeedai/wan-2.1-t2v-480p',
  'wan-2.1-t2v-720p': 'wavespeedai/wan-2.1-t2v-720p',
};

export class ReplicateVideoAdapter implements AvatarVideoAdapter {
  private readonly apiToken: string;
  private readonly defaultModel: ReplicateVideoModel;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly jobMap = new Map<string, string>(); // jobId → predictionId

  constructor(config: ReplicateVideoConfig) {
    if (!config.apiToken) throw new Error('ReplicateVideoAdapter requires apiToken');
    this.apiToken = config.apiToken;
    this.defaultModel = config.defaultModel ?? 'wan-2.1-t2v-480p';
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 3000;
  }

  async generate(
    script: VideoScript,
    options?: VideoGenOptions & {
      model?: ReplicateVideoModel;
      imageUrl?: string;
      motionPrompt?: string;
    },
  ): Promise<GeneratedVideo> {
    const model = options?.model ?? this.defaultModel;
    const modelId = VIDEO_MODEL_IDS[model];
    const isI2V = model.includes('i2v');

    const prompt = script.blocks.map((b) => b.text).join(' ');
    const totalDuration =
      script.totalDuration ??
      script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    const input: Record<string, unknown> = {
      prompt: options?.motionPrompt ?? prompt,
      num_frames: Math.min(Math.round(totalDuration * 16), 81),
      ...(isI2V && options?.imageUrl ? { image: options.imageUrl } : {}),
      ...(options?.aspectRatio === '9:16' ? { aspect_ratio: '9:16' } : {}),
    };

    const res = await fetch(`${this.baseUrl}/models/${modelId}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Replicate video create failed (${res.status}): ${err}`);
    }

    const prediction = (await res.json()) as any;
    const jobId = `replicate_${prediction.id}`;
    this.jobMap.set(jobId, prediction.id);

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const predictionId =
      this.jobMap.get(jobId) ?? jobId.replace('replicate_', '');

    try {
      const res = await fetch(
        `${this.baseUrl}/predictions/${predictionId}`,
        { headers: { Authorization: `Bearer ${this.apiToken}` } },
      );

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const prediction = (await res.json()) as any;

      switch (prediction.status) {
        case 'starting':
        case 'processing':
          return {
            status: 'rendering',
            progress: prediction.logs
              ? this.parseProgress(prediction.logs)
              : 30,
          };
        case 'succeeded': {
          const url = Array.isArray(prediction.output)
            ? prediction.output[0]
            : prediction.output;
          return { status: 'completed', progress: 100, url };
        }
        case 'failed':
          return {
            status: 'failed',
            error: prediction.error ?? 'Replicate prediction failed',
          };
        case 'canceled':
          return { status: 'failed', error: 'Prediction was canceled' };
        default:
          return { status: 'queued', progress: 0 };
      }
    } catch (err: any) {
      // Transient network errors should not permanently fail the job
      console.warn(`[ReplicateVideoAdapter] getStatus transient error: ${err.message}`);
      return { status: 'rendering', progress: 0 };
    }
  }

  private parseProgress(logs: string): number {
    const match = logs.match(/(\d+)%/);
    return match ? parseInt(match[1]!) : 30;
  }
}
