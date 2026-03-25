// ============================================================
// Replicate Image Adapter — Multi-model image generation
// Models: flux-schnell, flux-dev, ideogram-v3, recraft-v3
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

export interface ReplicateConfig {
  apiToken: string;
  defaultModel?: ReplicateImageModel;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type ReplicateImageModel =
  | 'flux-schnell'      // $0.003/img — fast, good general quality
  | 'flux-dev'          // $0.025/img — higher quality, slower
  | 'ideogram-v3'       // $0.09/img  — BEST for text in images
  | 'recraft-v3'        // $0.04/img  — great for graphic design + text
  | 'sdxl';             // $0.01/img  — Stable Diffusion XL

const MODEL_IDS: Record<ReplicateImageModel, string> = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'ideogram-v3': 'ideogram-ai/ideogram-v3',
  'recraft-v3': 'recraft-ai/recraft-v3',
  sdxl: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
};

export class ReplicateImageAdapter implements ImageGeneratorAdapter {
  private readonly apiToken: string;
  private readonly defaultModel: ReplicateImageModel;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://api.replicate.com/v1';

  constructor(config: ReplicateConfig) {
    if (!config.apiToken) throw new Error('ReplicateImageAdapter requires apiToken');
    this.apiToken = config.apiToken;
    this.defaultModel = config.defaultModel ?? 'flux-schnell';
    this.maxPoll = config.maxPollAttempts ?? 60;
    this.pollInterval = config.pollIntervalMs ?? 2000;
  }

  async generate(
    prompt: string,
    options?: ImageGenOptions & { model?: ReplicateImageModel },
  ): Promise<GeneratedImage> {
    const model = options?.model ?? this.defaultModel;
    const modelId = MODEL_IDS[model];
    if (!modelId) throw new Error(`Unknown Replicate model: ${model}`);

    const input = this.buildInput(model, prompt, options);

    // Create prediction (with rate-limit retry)
    const isVersioned = modelId.includes(':');
    const createUrl = isVersioned
      ? `${this.baseUrl}/predictions`
      : `${this.baseUrl}/models/${modelId}/predictions`;

    const createBody: Record<string, unknown> = { input };
    if (isVersioned) {
      createBody.version = modelId.split(':')[1];
    }

    const maxCreateRetries = 5;
    let createRes: Response | undefined;
    for (let attempt = 0; attempt < maxCreateRetries; attempt++) {
      createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify(createBody),
      });

      if (createRes.status === 429) {
        // Respect retry_after from API, default 12s
        let waitSec = 12;
        try {
          const body = await createRes.json() as { retry_after?: number };
          if (body.retry_after) waitSec = Math.ceil(body.retry_after) + 2;
        } catch { /* use default */ }
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      break;
    }

    if (!createRes || !createRes.ok) {
      const err = createRes ? await createRes.text() : 'No response';
      throw new Error(`Replicate create failed (${createRes?.status}): ${err}`);
    }

    let prediction = (await createRes.json()) as any;

    // Poll if not resolved yet
    if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      prediction = await this.pollPrediction(prediction.id);
    }

    if (prediction.status === 'failed') {
      throw new Error(
        `Replicate prediction failed: ${prediction.error ?? 'Unknown error'}`,
      );
    }

    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!outputUrl) throw new Error('Replicate returned no output');

    return {
      url: outputUrl,
      prompt,
      provider: `replicate/${model}`,
      metadata: {
        model,
        predictionId: prediction.id,
        metrics: prediction.metrics,
        width: options?.width,
        height: options?.height,
      },
    };
  }

  private buildInput(
    model: ReplicateImageModel,
    prompt: string,
    options?: ImageGenOptions,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = { prompt };

    switch (model) {
      case 'flux-schnell':
      case 'flux-dev':
        return {
          ...base,
          num_outputs: 1,
          aspect_ratio: this.getAspectRatio(options),
          output_format: 'webp',
          output_quality: options?.quality === 'hd' ? 95 : 80,
        };

      case 'ideogram-v3':
        return {
          ...base,
          rendering_speed: 'DEFAULT',
          aspect_ratio: this.getAspectRatioIdeogram(options),
          style: options?.style ?? 'AUTO',
          magic_prompt: true,
        };

      case 'recraft-v3':
        return {
          ...base,
          size: this.getSizeRecraft(options),
          style: options?.style ?? 'any',
        };

      case 'sdxl':
        return {
          ...base,
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 25,
        };

      default:
        return base;
    }
  }

  private getAspectRatio(options?: ImageGenOptions): string {
    if (!options?.width || !options?.height) return '1:1';
    const ratio = options.width / options.height;
    if (ratio > 1.5) return '16:9';
    if (ratio > 1.2) return '3:2';
    if (ratio < 0.7) return '9:16';
    if (ratio < 0.85) return '2:3';
    return '1:1';
  }

  private getAspectRatioIdeogram(options?: ImageGenOptions): string {
    if (!options?.width || !options?.height) return 'ASPECT_1_1';
    const ratio = options.width / options.height;
    if (ratio > 1.5) return 'ASPECT_16_9';
    if (ratio < 0.7) return 'ASPECT_9_16';
    if (ratio > 1.2) return 'ASPECT_4_3';
    return 'ASPECT_1_1';
  }

  private getSizeRecraft(options?: ImageGenOptions): string {
    if (!options?.width || !options?.height) return '1024x1024';
    return `${options.width}x${options.height}`;
  }

  private async pollPrediction(predictionId: string): Promise<any> {
    for (let i = 0; i < this.maxPoll; i++) {
      await new Promise((r) => setTimeout(r, this.pollInterval));

      const res = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      });

      if (!res.ok) continue;

      const prediction = (await res.json()) as any;
      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }
    }

    throw new Error(
      `Replicate prediction ${predictionId} timed out after ${this.maxPoll * this.pollInterval}ms`,
    );
  }

  /** Test connection — validates API token */
  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
