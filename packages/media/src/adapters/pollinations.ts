// ============================================================
// Pollinations.ai Image Adapter — Generación de imágenes AI gratis
// Usa modelos Flux, sin API key necesaria
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

/**
 * Adapter para Pollinations.ai — servicio gratuito de generación de imágenes AI.
 * No requiere API key. Usa modelos Flux internamente.
 * Docs: https://pollinations.ai
 */
export class PollinationsImageAdapter implements ImageGeneratorAdapter {
  private readonly baseUrl = 'https://image.pollinations.ai/prompt';
  /** Mutex chain to serialize concurrent requests and avoid mass rate-limiting */
  private static requestQueue: Promise<void> = Promise.resolve();
  /** Timestamp of last completed request — used for self-throttling */
  private static lastRequestTime = 0;

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    // Serialize all concurrent requests through a queue/mutex
    // This prevents 5 batch requests from hitting Pollinations at the same time
    return new Promise<GeneratedImage>((resolve, reject) => {
      PollinationsImageAdapter.requestQueue = PollinationsImageAdapter.requestQueue
        .then(() => this._generate(prompt, options))
        .then(resolve)
        .catch(reject);
    });
  }

  private async _generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    const width = options?.width ?? 1080;
    const height = options?.height ?? 1080;
    const seed = Math.floor(Math.random() * 1_000_000);

    // Self-throttle: wait at least 10s between requests to avoid 429
    const now = Date.now();
    const elapsed = now - PollinationsImageAdapter.lastRequestTime;
    const minGap = 10_000;
    if (elapsed < minGap) {
      await new Promise((r) => setTimeout(r, minGap - elapsed));
    }

    const enhancedPrompt = [
      prompt,
      'high quality',
      'professional',
      options?.style === 'natural' ? 'photorealistic' : 'digital art',
    ].join(', ');

    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `${this.baseUrl}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    // Descargar la imagen con reintentos y capturar los bytes
    let imageBase64: string | undefined;
    let finalUrl = imageUrl;
    const maxRetries = 6;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 8s, 15s, 25s, 40s, 60s
          const delays = [8_000, 15_000, 25_000, 40_000, 60_000];
          const delay = delays[Math.min(attempt - 1, delays.length - 1)]!;
          console.log(`Pollinations: retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        }

        console.log(`Pollinations: attempt ${attempt + 1}/${maxRetries}`);

        const res = await fetch(imageUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(60_000),
          redirect: 'follow',
        });

        if (res.status === 429) {
          throw new Error(`Pollinations rate limited (429)`);
        }

        if (!res.ok) {
          throw new Error(`Pollinations error ${res.status}`);
        }

        finalUrl = res.url || imageUrl;
        PollinationsImageAdapter.lastRequestTime = Date.now();

        // Capturar los bytes de la imagen como base64
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 1000) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        }

        break; // Éxito
      } catch (err) {
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Pollinations image generation failed after ${maxRetries} attempts: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return {
      url: imageBase64 || finalUrl,
      prompt: enhancedPrompt,
      provider: 'pollinations',
      metadata: {
        model: 'default',
        width,
        height,
        seed,
        free: true,
        // Incluir base64 para que el pipeline pueda subirlo a Cloudinary sin re-descargar
        ...(imageBase64 ? { imageBase64 } : {}),
      },
    };
  }
}
