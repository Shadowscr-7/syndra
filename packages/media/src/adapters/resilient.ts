// ============================================================
// Resilient Image Adapter — Fallback chain for image generation
// Primary (free) → Fallback (paid) with automatic switching
// When all paid fallbacks fail with billing errors (402),
// retries primary (Pollinations) as last resort with patience
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

export interface ResilientConfig {
  primary: ImageGeneratorAdapter;
  fallback: ImageGeneratorAdapter;
  /** Label for logging */
  primaryName?: string;
  fallbackName?: string;
}

/**
 * Tries the primary adapter first; on failure, falls back to the secondary.
 * If fallback also fails with a billing/credit error (402), retries primary
 * with extended patience since it's likely free but rate-limited.
 */
export class ResilientImageAdapter implements ImageGeneratorAdapter {
  private readonly primary: ImageGeneratorAdapter;
  private readonly fallback: ImageGeneratorAdapter;
  private readonly primaryName: string;
  private readonly fallbackName: string;

  constructor(config: ResilientConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.primaryName = config.primaryName ?? 'primary';
    this.fallbackName = config.fallbackName ?? 'fallback';
  }

  private isBillingError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('402') || msg.includes('Insufficient credit') ||
           msg.includes('depleted') || msg.includes('insufficient');
  }

  async generate(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    let primaryErr: unknown;
    try {
      return await this.primary.generate(prompt, options);
    } catch (err) {
      primaryErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ResilientImage] ${this.primaryName} failed: ${msg} — switching to ${this.fallbackName}`);
    }

    try {
      return await this.fallback.generate(prompt, options);
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.warn(`[ResilientImage] ${this.fallbackName} also failed: ${msg}`);

      // If fallback failed with a billing error (402), retry primary as last resort
      // Primary (e.g. Pollinations) is free but may need more patience
      if (this.isBillingError(fallbackErr)) {
        console.log(`[ResilientImage] All paid providers have billing errors — retrying ${this.primaryName} as last resort...`);
        try {
          return await this.primary.generate(prompt, options);
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.error(`[ResilientImage] Last resort ${this.primaryName} also failed: ${retryMsg}`);
        }
      }

      // Re-throw the most informative error
      throw fallbackErr;
    }
  }
}
