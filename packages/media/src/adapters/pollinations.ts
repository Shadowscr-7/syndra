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

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    const width = options?.width ?? 1080;
    const height = options?.height ?? 1080;
    const seed = Math.floor(Math.random() * 1_000_000);

    // Pollinations genera la imagen directamente en la URL
    // Añadir parámetros de calidad y estilo
    const enhancedPrompt = [
      prompt,
      'high quality',
      'professional',
      options?.style === 'natural' ? 'photorealistic' : 'digital art',
    ].join(', ');

    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `${this.baseUrl}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    // Descargar la imagen con reintentos y capturar los bytes
    let imageBase64: string | undefined;
    let finalUrl = imageUrl;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 3000 * Math.pow(2, attempt - 1)));
        }

        const res = await fetch(imageUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(90_000),
          redirect: 'follow',
        });

        if (!res.ok) {
          throw new Error(`Pollinations error ${res.status}`);
        }

        finalUrl = res.url || imageUrl;

        // Capturar los bytes de la imagen como base64
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 1000) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        }

        break; // Éxito
      } catch (err) {
        if (attempt === maxRetries - 1) {
          // Último intento falló → devolver URL sin base64
          console.warn(`Pollinations: all ${maxRetries} attempts failed, returning URL only`);
        }
      }
    }

    return {
      url: finalUrl,
      prompt: enhancedPrompt,
      provider: 'pollinations',
      metadata: {
        model: 'flux',
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
