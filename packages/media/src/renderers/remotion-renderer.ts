// ============================================================
// Remotion Video Renderer — React-based video compositor
// Uses Chromium to render React compositions as MP4
// ============================================================

import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export interface ImageSlideInput {
  url: string;
  role?: 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
  order?: number;
  durationMs?: number;
  animation?: 'ken-burns-in' | 'ken-burns-out' | 'pan-left' | 'pan-right' | 'zoom-pulse' | 'none' | 'auto';
  caption?: string;
}

export interface RemotionRenderInput {
  images?: string[];               // Simple mode — flat list of URLs (backwards compat)
  slides?: ImageSlideInput[];      // Storyboard mode — slides with roles/order/duration
  aspectRatio?: '9:16' | '16:9' | '1:1';
  ttsAudioUrl?: string;           // data: URL or HTTP
  musicAudioUrl?: string;         // HTTP URL
  musicVolume?: number;
  subtitleGroups?: SubtitleGroupInput[];
  subtitleStyle?: 'pill' | 'word-by-word' | 'karaoke' | 'minimal' | 'neon' | 'kinetic';
  overlayTheme?: 'none' | 'minimal' | 'modern' | 'neon' | 'elegant';
  logoUrl?: string;
  productOverlay?: { name?: string; price?: string; cta?: string };
  ttsDurationMs?: number;         // Actual TTS duration in ms

  // NEW: Style prompt — free text describing desired aesthetic
  // e.g. "dark cinematic with orange accents, energetic"
  stylePrompt?: string;

  // NEW: Accent color for kinetic subtitles, badges, progress bar
  accentColor?: string;           // e.g. '#FF3366'

  // NEW: Talking-head video (a person speaking on camera)
  // When provided, plays as full-screen base layer with slides as scene inserts
  talkingHeadVideoUrl?: string;

  // NEW: Whisper-extracted per-word timecodes (precise subtitle sync)
  timedWords?: TimedWordInput[];

  // Reel template overlay (Phase 5)
  reelTemplate?: 'product' | 'negocio' | 'testimonial' | 'default';
  productName?: string;
  productPrice?: string;
  productCta?: string;
  brandName?: string;
  tagline?: string;
  quote?: string;
  quoteAuthor?: string;
}

export interface SubtitleGroupInput {
  startMs: number;
  endMs: number;
  text: string;
}

export interface TimedWordInput {
  text: string;
  startMs: number;
  endMs: number;
  emphasis?: boolean;
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
const BUNDLE_TIMEOUT_MS = 3 * 60 * 1000;   // 3 min — bundle can be slow on first run
const RENDER_TIMEOUT_MS = 20 * 60 * 1000;  // 20 min — 2-core server needs extra time for stitching

// Cache the bundle URL after first successful build
let cachedBundleUrl: string | null = null;
let bundleInProgress: Promise<string> | null = null;

export class RemotionVideoRenderer {

  async render(input: RemotionRenderInput): Promise<RemotionRenderResult> {
    const dim = ASPECT_DIMENSIONS[input.aspectRatio ?? '9:16'] ?? ASPECT_DIMENSIONS['9:16']!;
    const tempDir = join(tmpdir(), `remotion-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 0. Normalize slides
      const slides = this.normalizeSlides(input);
      const contentSlides = slides.filter(s => s.role !== 'logo' && s.role !== 'background');

      // 1. Calculate duration
      const totalSlideDurationMs = contentSlides.reduce((sum, s) => sum + (s.durationMs ?? 4000), 0);
      let durationMs = 15000;
      if (input.ttsDurationMs && input.ttsDurationMs > 0) {
        durationMs = input.ttsDurationMs + 1500; // 1.5s buffer after TTS
      } else if (input.talkingHeadVideoUrl) {
        durationMs = 0; // will be determined by the video itself in composition
      } else if (contentSlides.length > 0) {
        durationMs = totalSlideDurationMs;
      }
      const durationInFrames = durationMs > 0
        ? Math.ceil((durationMs / 1000) * FPS)
        : 300; // 10s placeholder — composition uses OffthreadVideo duration
      const durationSeconds = durationMs / 1000 || 10;

      // 2. Convert subtitle timing from ms to frames
      const subtitleGroups = (input.subtitleGroups ?? []).map((g) => ({
        startFrame: Math.round((g.startMs / 1000) * FPS),
        endFrame: Math.round((g.endMs / 1000) * FPS),
        text: g.text,
      }));

      // 3. Convert timed words from ms to frames (for kinetic subtitles)
      const timedWords = (input.timedWords ?? []).map((w) => ({
        text: w.text,
        startFrame: Math.round((w.startMs / 1000) * FPS),
        endFrame: Math.round((w.endMs / 1000) * FPS),
        emphasis: w.emphasis ?? false,
      }));

      // 4. Build the bundle (cached, with timeout protection)
      const bundleUrl = await this.ensureBundle();

      // 5. Extract logo
      const logoSlide = slides.find(s => s.role === 'logo');
      const logoUrl = logoSlide?.url ?? input.logoUrl;

      // 6. Build input props
      const inputProps = {
        slides: slides.map(s => ({
          src: s.url,
          role: s.role ?? 'slide',
          order: s.order ?? 0,
          durationMs: s.durationMs,
          animation: s.animation ?? 'auto',
          caption: s.caption,
        })),
        ttsAudioSrc: input.ttsAudioUrl,
        musicAudioSrc: input.musicAudioUrl,
        musicVolume: input.musicVolume ?? 0.25,
        subtitleGroups,
        timedWords,
        subtitleStyle: input.subtitleStyle ?? 'pill',
        overlayTheme: input.overlayTheme ?? 'modern',
        logoUrl,
        productOverlay: input.productOverlay,
        stylePrompt: input.stylePrompt ?? '',
        accentColor: input.accentColor ?? '#FFD700',
        talkingHeadVideoUrl: input.talkingHeadVideoUrl ?? null,
        reelTemplate: input.reelTemplate ?? 'default',
        productName: input.productName,
        productPrice: input.productPrice,
        productCta: input.productCta,
        brandName: input.brandName,
        tagline: input.tagline,
        quote: input.quote,
        quoteAuthor: input.quoteAuthor,
      };

      // 7. Render video — with TOTAL TIMEOUT protection
      const outputPath = join(tempDir, 'output.mp4');
      const { renderMedia, selectComposition } = await import('@remotion/renderer');
      const chromiumPath = this.findChromium();

      // disableWebSecurity allows Chromium (http://localhost:3000) to load
      // file:// resources — safe here since this is a server-side headless renderer
      const chromiumOptions = {
        enableMultiProcessOnLinux: true,
        disableWebSecurity: true,
      };

      const composition = await this.withTimeout(
        selectComposition({
          serveUrl: bundleUrl,
          id: 'VideoCompositor',
          inputProps,
          browserExecutable: chromiumPath,
          chromiumOptions,
        }),
        60_000,
        'selectComposition timed out after 60s',
      );

      let lastProgressLog = Date.now();

      await this.withTimeout(
        renderMedia({
          composition: {
            ...composition,
            width: dim.w,
            height: dim.h,
            durationInFrames,
            fps: FPS,
          },
          serveUrl: bundleUrl,
          codec: 'h264',
          x264Preset: 'fast',              // faster encoding with minimal quality loss
          outputLocation: outputPath,
          inputProps,
          concurrency: 2,
          timeoutInMilliseconds: 60_000,   // per-frame timeout (Remotion native)
          chromiumOptions,
          browserExecutable: chromiumPath,
          onProgress: ({ renderedFrames, encodedFrames }) => {
            const now = Date.now();
            if (now - lastProgressLog > 15_000) { // log every 15s
              const renderPct = Math.round((renderedFrames / durationInFrames) * 100);
              const encodePct = Math.round((encodedFrames / durationInFrames) * 100);
              if (renderedFrames >= durationInFrames) {
                console.log(`[Remotion] Encoding ${encodePct}% (${encodedFrames}/${durationInFrames} frames encoded, stitching...)`);
              } else {
                console.log(`[Remotion] Rendering ${renderPct}% (${renderedFrames}/${durationInFrames} frames rendered, encoded: ${encodePct}%)`);
              }
              lastProgressLog = now;
            }
          },
        }),
        RENDER_TIMEOUT_MS,
        `renderMedia timed out after ${RENDER_TIMEOUT_MS / 60000} minutes`,
      );

      console.log(`[Remotion] Render complete: ${outputPath} (${durationSeconds.toFixed(1)}s, ${durationInFrames} frames)`);

      return { outputPath, durationSeconds, tempDir };

    } catch (error) {
      await this.cleanupDir(tempDir);
      throw error;
    }
  }

  private async ensureBundle(): Promise<string> {
    // Return cached bundle if available
    if (cachedBundleUrl) return cachedBundleUrl;

    // If a bundle is already in progress, wait for it (don't double-bundle)
    if (bundleInProgress) {
      return bundleInProgress;
    }

    const { bundle } = await import('@remotion/bundler');

    const possiblePaths = [
      '/app/packages/media/src/remotion/Root.tsx',
      join(__dirname, '..', 'remotion', 'Root.tsx'),
      join(process.cwd(), 'packages', 'media', 'src', 'remotion', 'Root.tsx'),
    ];

    let entryPoint = '';
    for (const p of possiblePaths) {
      if (existsSync(p)) { entryPoint = p; break; }
    }
    if (!entryPoint) {
      throw new Error(`Remotion Root.tsx not found. Searched: ${possiblePaths.join(', ')}`);
    }

    console.log(`[Remotion] Bundling from ${entryPoint}...`);
    const startTime = Date.now();

    bundleInProgress = this.withTimeout(
      bundle({
        entryPoint,
        onProgress: (progress: number) => {
          if (progress % 25 === 0) console.log(`[Remotion] Bundle ${progress}%`);
        },
      }),
      BUNDLE_TIMEOUT_MS,
      `bundle() timed out after ${BUNDLE_TIMEOUT_MS / 60000} minutes`,
    ).then(url => {
      cachedBundleUrl = url;
      bundleInProgress = null;
      console.log(`[Remotion] Bundle ready in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      return url;
    }).catch(err => {
      // Clear everything so next attempt retries fresh
      cachedBundleUrl = null;
      bundleInProgress = null;
      throw err;
    });

    return bundleInProgress;
  }

  /** Race a promise against a timeout. Rejects with clear message if exceeded. */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`[Remotion] ${label}`)), ms);
      promise
        .then(v => { clearTimeout(timer); resolve(v); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  private findChromium(): string | undefined {
    if (existsSync('/usr/bin/chromium-browser')) return '/usr/bin/chromium-browser';
    if (existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
    return undefined;
  }

  async cleanup(tempDir: string): Promise<void> {
    await this.cleanupDir(tempDir);
  }

  private normalizeSlides(input: RemotionRenderInput): ImageSlideInput[] {
    if (input.slides && input.slides.length > 0) {
      return [...input.slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    const images = input.images ?? [];
    return images.map((url, i) => ({
      url, role: 'slide' as const, order: i, animation: 'auto' as const,
    }));
  }

  private async cleanupDir(dirPath: string): Promise<void> {
    try {
      const { rm } = await import('fs/promises');
      await rm(dirPath, { recursive: true, force: true });
    } catch { /* best effort */ }
  }
}
