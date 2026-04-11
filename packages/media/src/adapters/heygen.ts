// ============================================================
// HeyGen Avatar Video Adapter — Genera videos con avatar IA hablante
// ============================================================

import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

const HEYGEN_API_BASE = 'https://api.heygen.com/v2';

export interface HeyGenConfig {
  apiKey: string;
  defaultAvatarId?: string;
  defaultVoiceId?: string;
}

/**
 * Adapter para HeyGen API v2.
 *
 * Flujo:
 * 1. POST /video/generate — envía script, avatar, voz → recibe video_id
 * 2. GET /video_status.get?video_id=xxx — polling hasta status=completed
 * 3. Retorna URL del video
 *
 * @see https://docs.heygen.com/reference/create-an-avatar-video
 */
export class HeyGenVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly defaultAvatarId: string;
  private readonly defaultVoiceId: string;

  constructor(config: HeyGenConfig) {
    if (!config.apiKey) {
      throw new Error('HeyGenVideoAdapter requires apiKey');
    }
    this.apiKey = config.apiKey;
    this.defaultAvatarId = config.defaultAvatarId ?? 'Anna_public_3_20240108';
    this.defaultVoiceId = config.defaultVoiceId ?? '1bd001e7e50f421d891986aad5c1e6ea'; // Spanish female
  }

  async generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    return this.generateInternal(script, options, false);
  }

  /**
   * Same as generate() but uses a green screen background (#00FF00)
   * so the avatar can be chroma-keyed over cinematic scenes.
   */
  async generateWithGreenScreen(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    return this.generateInternal(script, options, true);
  }

  private async generateInternal(script: VideoScript, options?: VideoGenOptions, greenScreen = false): Promise<GeneratedVideo> {
    const fullText = script.blocks.map((b) => b.text).join(' ');

    const body = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: options?.avatarId ?? this.defaultAvatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: fullText,
            voice_id: options?.voiceId ?? this.defaultVoiceId,
            speed: 1.0,
          },
          background: greenScreen
            ? { type: 'color', value: '#00FF00' }
            : { type: 'color', value: '#FFFFFF' },
        },
      ],
      dimension: this.getDimension(options?.aspectRatio ?? '9:16'),
      test: false,
    };

    const res = await fetch(`${HEYGEN_API_BASE}/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HeyGen generate failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { data?: { video_id?: string } };
    const videoId = data.data?.video_id;

    if (!videoId) {
      throw new Error('HeyGen did not return video_id');
    }

    return {
      jobId: videoId,
      status: 'queued',
    };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const res = await fetch(
      `${HEYGEN_API_BASE}/video_status.get?video_id=${encodeURIComponent(jobId)}`,
      {
        headers: { 'X-Api-Key': this.apiKey },
      },
    );

    if (!res.ok) {
      const err = await res.text();
      return { status: 'failed', error: `Status check failed (${res.status}): ${err}` };
    }

    const data = (await res.json()) as {
      data?: {
        status?: string;
        video_url?: string;
        error?: { message?: string };
      };
    };

    const status = data.data?.status;

    switch (status) {
      case 'completed':
        return {
          status: 'completed',
          progress: 100,
          url: data.data?.video_url,
        };
      case 'processing':
        return { status: 'rendering', progress: 50 };
      case 'pending':
        return { status: 'queued', progress: 0 };
      case 'failed':
        return {
          status: 'failed',
          error: data.data?.error?.message ?? 'HeyGen render failed',
        };
      default:
        return { status: 'queued', progress: 0 };
    }
  }

  /**
   * Espera hasta que el video esté listo (polling con backoff)
   */
  async waitForCompletion(jobId: string, timeoutMs = 600_000): Promise<VideoJobStatus> {
    const start = Date.now();
    let delay = 5_000;

    while (Date.now() - start < timeoutMs) {
      const status = await this.getStatus(jobId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 30_000);
    }

    return { status: 'failed', error: 'Timeout waiting for HeyGen video' };
  }

  // --- Private ---

  private getDimension(ratio: string): { width: number; height: number } {
    switch (ratio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '16:9':
        return { width: 1920, height: 1080 };
      case '1:1':
        return { width: 1080, height: 1080 };
      default:
        return { width: 1080, height: 1920 };
    }
  }
}
