// ============================================================
// HuggingFace Inference API — Free AI image generation
// Models: FLUX.1-schnell, Stable Diffusion XL, etc.
// Free tier: no payment needed, just a free token from huggingface.co
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

export interface HuggingFaceImageConfig {
  /** Free API token from https://huggingface.co/settings/tokens */
  apiToken: string;
  /** Model ID — default: black-forest-labs/FLUX.1-schnell */
  model?: string;
}

/**
 * Adapter for HuggingFace Inference API — free AI image generation.
 * Uses FLUX.1-schnell by default (fast, high quality, free).
 *
 * To get a free token:
 * 1. Go to https://huggingface.co/join
 * 2. Settings > Access Tokens > Create new token (Read)
 */
export class HuggingFaceImageAdapter implements ImageGeneratorAdapter {
  private readonly apiToken: string;
  private readonly model: string;
  private readonly baseUrl = 'https://router.huggingface.co/hf-inference/models';

  constructor(config: HuggingFaceImageConfig) {
    this.apiToken = config.apiToken;
    this.model = config.model ?? 'black-forest-labs/FLUX.1-schnell';
  }

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    const width = options?.width ?? 1024;
    const height = options?.height ?? 1024;

    // Enhance prompt for social media quality
    const enhancedPrompt = [
      prompt,
      'high quality',
      'professional',
      options?.style === 'natural' ? 'photorealistic' : 'digital art',
    ].join(', ');

    const url = `${this.baseUrl}/${this.model}`;
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = attempt === 1 ? 5000 : 15000;
          console.log(`HuggingFace: retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        }

        console.log(`HuggingFace: attempt ${attempt + 1}/${maxRetries} → ${this.model}`);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'image/png',
          },
          body: JSON.stringify({
            inputs: enhancedPrompt,
            parameters: {
              width: Math.min(width, 1024),
              height: Math.min(height, 1024),
              num_inference_steps: 4,
            },
          }),
          signal: AbortSignal.timeout(60_000),
        });

        console.log(`HuggingFace: response ${res.status} (${res.headers.get('content-type') ?? 'no-ct'})`);

        // Model loading — has estimated_time
        if (res.status === 503) {
          const body = await res.json().catch(() => ({})) as Record<string, unknown>;
          const waitTime = Number(body['estimated_time'] ?? 20);
          console.log(`HuggingFace: model loading, ETA ${waitTime}s`);
          await new Promise((r) => setTimeout(r, Math.min(waitTime * 1000, 60_000)));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`HuggingFace API error ${res.status}: ${errText}`);
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          // Got JSON error instead of image
          const text = await res.text();
          throw new Error(`Expected image, got: ${text.substring(0, 200)}`);
        }

        // Success — capture image bytes as base64
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 1000) {
          throw new Error(`Image too small (${buffer.length} bytes)`);
        }

        const mimeType = contentType.split(';')[0] || 'image/jpeg';
        const imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;

        return {
          url: imageBase64, // Base64 data URI — will be uploaded to Cloudinary
          prompt: enhancedPrompt,
          provider: 'huggingface',
          metadata: {
            model: this.model,
            width,
            height,
            free: true,
            sizeBytes: buffer.length,
            // Include base64 for the pipeline to use directly
            imageBase64,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new Error(
      `HuggingFace image generation failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }
}
