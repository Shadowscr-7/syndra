// ============================================================
// D-ID Avatar Adapter — Talking Head AI video generation
// ============================================================

import type {
  AvatarVideoAdapter,
  VideoScript,
  VideoGenOptions,
  GeneratedVideo,
  VideoJobStatus,
} from '../index';

export interface DIDConfig {
  apiKey: string;            // D-ID API key (Basic auth)
  defaultPresenter?: string; // presenter image URL
  defaultVoice?: DIDVoice;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export interface DIDVoice {
  type: 'microsoft' | 'amazon' | 'elevenlabs';
  voiceId: string;
  language?: string;
}

const DEFAULT_VOICE: DIDVoice = {
  type: 'microsoft',
  voiceId: 'en-US-JennyNeural',
  language: 'en-US',
};

export class DIDVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly defaultPresenter: string;
  private readonly defaultVoice: DIDVoice;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://api.d-id.com';

  constructor(config: DIDConfig) {
    if (!config.apiKey) throw new Error('DIDVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
    this.defaultPresenter =
      config.defaultPresenter ??
      'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/image.jpeg';
    this.defaultVoice = config.defaultVoice ?? DEFAULT_VOICE;
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 5000;
  }

  async generate(
    script: VideoScript,
    options?: VideoGenOptions & {
      presenterUrl?: string;
      voice?: DIDVoice;
      driverUrl?: string;
      expression?: 'neutral' | 'happy' | 'serious';
    },
  ): Promise<GeneratedVideo> {
    const text = script.blocks.map((b) => b.text).join(' ');
    const presenterUrl = options?.presenterUrl ?? this.defaultPresenter;
    const voice = options?.voice ?? this.defaultVoice;

    const body: Record<string, unknown> = {
      source_url: presenterUrl,
      script: {
        type: 'text',
        input: text,
        provider: {
          type: voice.type,
          voice_id: voice.voiceId,
          ...(voice.language ? { language: voice.language } : {}),
        },
      },
      config: {
        stitch: true,
        result_format: 'mp4',
        ...(options?.expression
          ? { expression: { expressions: [{ expression: options.expression, intensity: 0.6 }] } }
          : {}),
      },
      ...(options?.driverUrl ? { driver_url: options.driverUrl } : {}),
    };

    const res = await fetch(`${this.baseUrl}/talks`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`D-ID talks create failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    const talkId = data.id;

    return { jobId: `did_${talkId}`, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const talkId = jobId.replace('did_', '');

    try {
      const res = await fetch(`${this.baseUrl}/talks/${talkId}`, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = (await res.json()) as any;

      switch (data.status) {
        case 'created':
        case 'started':
          return { status: 'queued', progress: 10 };
        case 'done': {
          const url = data.result_url;
          return { status: 'completed', progress: 100, url };
        }
        case 'error':
        case 'rejected':
          return {
            status: 'failed',
            error:
              data.error?.description ??
              data.reject_reason ??
              'D-ID generation failed',
          };
        default:
          return { status: 'rendering', progress: 40 };
      }
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }
}
