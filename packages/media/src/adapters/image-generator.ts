// ============================================================
// Image Generator Adapter — Genera imágenes via DALL-E / Stability / etc.
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

/**
 * Implementación de OpenAI DALL-E
 */
export class DallEImageAdapter implements ImageGeneratorAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1/images/generations';

  constructor(opts: { apiKey: string }) {
    this.apiKey = opts.apiKey;
  }

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    const body = {
      model: 'dall-e-3',
      prompt,
      size: this.mapSize(options?.width, options?.height),
      quality: options?.quality ?? 'standard',
      style: options?.style ?? 'vivid',
      n: 1,
    };

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DALL-E error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as {
      data: Array<{ url: string; revised_prompt?: string }>;
    };

    const img = json.data[0];
    if (!img) throw new Error('No image returned from DALL-E');

    return {
      url: img.url,
      prompt: img.revised_prompt ?? prompt,
      provider: 'dall-e-3',
      metadata: { model: 'dall-e-3', quality: options?.quality ?? 'standard' },
    };
  }

  private mapSize(w?: number, h?: number): string {
    if (w === 1024 && h === 1792) return '1024x1792';
    if (w === 1792 && h === 1024) return '1792x1024';
    return '1024x1024';
  }
}

/**
 * Adapter placeholder para Stability AI (Stable Diffusion)
 */
export class StabilityImageAdapter implements ImageGeneratorAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.stability.ai/v1/generation';

  constructor(opts: { apiKey: string }) {
    this.apiKey = opts.apiKey;
  }

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    const engineId = 'stable-diffusion-xl-1024-v1-0';
    const res = await fetch(`${this.baseUrl}/${engineId}/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        width: options?.width ?? 1024,
        height: options?.height ?? 1024,
        steps: 30,
        samples: 1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stability AI error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as {
      artifacts: Array<{ base64: string; seed: number; finishReason: string }>;
    };

    const artifact = json.artifacts[0];
    if (!artifact) throw new Error('No image returned from Stability AI');

    // Returns base64 — caller must upload to storage
    return {
      url: `data:image/png;base64,${artifact.base64}`,
      prompt,
      provider: 'stability-ai',
      metadata: { engine: engineId, seed: artifact.seed },
    };
  }
}

/**
 * Adapter de mock para desarrollo
 */
export class MockImageAdapter implements ImageGeneratorAdapter {
  async generate(prompt: string, _options?: ImageGenOptions): Promise<GeneratedImage> {
    return {
      url: `https://placehold.co/1080x1080/1a1a2e/e94560?text=${encodeURIComponent(prompt.slice(0, 30))}`,
      prompt,
      provider: 'mock',
      metadata: { mock: true },
    };
  }
}
