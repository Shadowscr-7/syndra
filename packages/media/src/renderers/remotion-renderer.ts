// ============================================================
// Remotion Video Renderer — React-based video compositor
// Uses Chromium to render React compositions as MP4
// ============================================================

import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { execFile } from 'child_process';

export interface RemotionRenderInput {
  images: string[];               // HTTP URLs or data: URLs
  aspectRatio?: '9:16' | '16:9' | '1:1';
  ttsAudioUrl?: string;           // data: URL or HTTP
  musicAudioUrl?: string;         // HTTP URL
  musicVolume?: number;
  subtitleGroups?: SubtitleGroupInput[];
  logoUrl?: string;
  productOverlay?: { name?: string; price?: string; cta?: string };
  ttsDurationMs?: number;         // Actual TTS duration in ms
}

export interface SubtitleGroupInput {
  startMs: number;
  endMs: number;
  text: string;
}

export interface RemotionRenderResult {
  outputPath: string;
  durationSeconds: number;
  tempDir: string;
}

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1': { w: 1080, h: 1080 },
};

const FPS = 30;

// Cache the bundle URL after first build
let cachedBundleUrl: string | null = null;

export class RemotionVideoRenderer {

  async render(input: RemotionRenderInput): Promise<RemotionRenderResult> {
    const dim = ASPECT_DIMENSIONS[input.aspectRatio ?? '9:16'] ?? ASPECT_DIMENSIONS['9:16']!;
    const tempDir = join(tmpdir(), `remotion-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 1. Calculate duration
      let durationMs = 15000; // default 15s
      if (input.ttsDurationMs && input.ttsDurationMs > 0) {
        durationMs = input.ttsDurationMs + 1500; // TTS + 1.5s breathing room
      } else if (input.images.length > 0) {
        durationMs = input.images.length * 4000; // 4s per image
      }
      const durationInFrames = Math.ceil((durationMs / 1000) * FPS);
      const durationSeconds = durationMs / 1000;

      // 2. Convert subtitle timing from ms to frames
      const subtitleGroups = (input.subtitleGroups ?? []).map((g) => ({
        startFrame: Math.round((g.startMs / 1000) * FPS),
        endFrame: Math.round((g.endMs / 1000) * FPS),
        text: g.text,
      }));

      // 3. Build the Remotion bundle (cached after first call)
      const bundleUrl = await this.ensureBundle();

      // 4. Build input props
      const inputProps = {
        images: input.images,
        ttsAudioSrc: input.ttsAudioUrl,
        musicAudioSrc: input.musicAudioUrl,
        musicVolume: input.musicVolume ?? 0.25,
        subtitleGroups,
        logoUrl: input.logoUrl,
        productOverlay: input.productOverlay,
      };

      // 5. Render video
      const outputPath = join(tempDir, 'output.mp4');

      const { renderMedia, selectComposition } = await import('@remotion/renderer');

      const composition = await selectComposition({
        serveUrl: bundleUrl,
        id: 'VideoCompositor',
        inputProps,
      });

      // Override composition dimensions and duration
      await renderMedia({
        composition: {
          ...composition,
          width: dim.w,
          height: dim.h,
          durationInFrames,
          fps: FPS,
        },
        serveUrl: bundleUrl,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        concurrency: 2,
        chromiumOptions: {
          enableMultiProcessOnLinux: true,
        },
        browserExecutable: this.findChromium(),
      });

      console.log(`[Remotion] Render complete: ${outputPath} (${durationSeconds.toFixed(1)}s, ${durationInFrames} frames)`);

      return {
        outputPath,
        durationSeconds,
        tempDir,
      };
    } catch (error) {
      await this.cleanupDir(tempDir);
      throw error;
    }
  }

  private async ensureBundle(): Promise<string> {
    if (cachedBundleUrl) return cachedBundleUrl;

    const { bundle } = await import('@remotion/bundler');

    // Find the Root.tsx entry point
    // In Docker: /app/packages/media/src/remotion/Root.tsx
    // Locally: relative to this file
    const possiblePaths = [
      '/app/packages/media/src/remotion/Root.tsx',
      join(__dirname, '..', 'remotion', 'Root.tsx'),
      join(process.cwd(), 'packages', 'media', 'src', 'remotion', 'Root.tsx'),
    ];

    let entryPoint = '';
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        entryPoint = p;
        break;
      }
    }

    if (!entryPoint) {
      throw new Error(
        `Remotion Root.tsx not found. Searched: ${possiblePaths.join(', ')}`,
      );
    }

    console.log(`[Remotion] Bundling compositions from ${entryPoint}...`);
    const startTime = Date.now();

    cachedBundleUrl = await bundle({
      entryPoint,
      onProgress: (progress: number) => {
        if (progress % 25 === 0) {
          console.log(`[Remotion] Bundle progress: ${progress}%`);
        }
      },
    });

    console.log(`[Remotion] Bundle ready in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return cachedBundleUrl;
  }

  private findChromium(): string | undefined {
    // Docker Alpine
    if (existsSync('/usr/bin/chromium-browser')) return '/usr/bin/chromium-browser';
    if (existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
    // Let Remotion find it automatically
    return undefined;
  }

  async cleanup(tempDir: string): Promise<void> {
    await this.cleanupDir(tempDir);
  }

  private async cleanupDir(dirPath: string): Promise<void> {
    try {
      const { rm } = await import('fs/promises');
      await rm(dirPath, { recursive: true, force: true });
    } catch { /* best effort */ }
  }
}
