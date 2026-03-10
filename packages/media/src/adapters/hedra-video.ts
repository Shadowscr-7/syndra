// ============================================================
// Hedra Adapter — Audio-driven face animation (Character API)
// ============================================================

import type {
  AvatarVideoAdapter,
  VideoScript,
  VideoGenOptions,
  GeneratedVideo,
  VideoJobStatus,
} from '../index';

export interface HedraConfig {
  apiKey: string;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export class HedraVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://mercury.dev.dream-ai.com/api';

  constructor(config: HedraConfig) {
    if (!config.apiKey) throw new Error('HedraVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 5000;
  }

  /**
   * Generate a talking-head video from text + character image.
   *
   * Flow:
   *  1. Upload audio / generate TTS (if needed, via Hedra)
   *  2. POST /v1/characters/generate → returns jobId
   *  3. Poll /v1/projects/{jobId} until completed
   */
  async generate(
    script: VideoScript,
    options?: VideoGenOptions & {
      characterImageUrl?: string;
      audioUrl?: string;
      voiceId?: string;
      aspectRatio?: '1:1' | '16:9' | '9:16';
    },
  ): Promise<GeneratedVideo> {
    const text = script.blocks.map((b) => b.text).join(' ');

    // Step 1: If we have an audio URL, use it; otherwise use text for TTS
    const audioUrl = options?.audioUrl;

    // Step 2: Generate character video
    const body: Record<string, unknown> = {
      text,
      ...(audioUrl ? { audio_source: audioUrl } : {}),
      ...(options?.voiceId ? { voice_id: options.voiceId } : {}),
      ...(options?.characterImageUrl
        ? { avatar_image: options.characterImageUrl }
        : {}),
      aspect_ratio: options?.aspectRatio ?? '1:1',
    };

    const res = await fetch(`${this.baseUrl}/v1/characters`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Hedra generate failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    const projectId = data.jobId ?? data.project_id ?? data.id;

    if (!projectId) {
      throw new Error('Hedra: no job/project ID in response');
    }

    return { jobId: `hedra_${projectId}`, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const projectId = jobId.replace('hedra_', '');

    try {
      const res = await fetch(
        `${this.baseUrl}/v1/projects/${projectId}`,
        {
          headers: { 'X-API-Key': this.apiKey },
        },
      );

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = (await res.json()) as any;

      switch (data.status) {
        case 'pending':
        case 'queued':
          return { status: 'queued', progress: 5 };
        case 'processing':
        case 'rendering':
          return {
            status: 'rendering',
            progress: data.progress ?? 50,
          };
        case 'completed':
        case 'complete': {
          const url = data.video_url ?? data.result_url ?? data.url;
          return { status: 'completed', progress: 100, url };
        }
        case 'failed':
        case 'error':
          return {
            status: 'failed',
            error: data.error ?? 'Hedra generation failed',
          };
        default:
          return { status: 'rendering', progress: 30 };
      }
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }
}
