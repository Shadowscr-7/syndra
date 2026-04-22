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

/** Input for the tech-style carousel / manual video composer */
export interface CarouselSlideInput {
  text: string;
  imageUrl?: string;
  role?: 'hook' | 'body' | 'cta' | 'slide';
  caption?: string;
  accentColor?: string;
}

export interface CarouselRenderInput {
  slides: CarouselSlideInput[];
  /** 'video' = full MP4, 'stills' = one PNG per slide */
  mode: 'video' | 'stills';
  aspectRatio?: '9:16' | '16:9' | '1:1';
  framesPerSlide?: number;
  accentColor?: string;
  palette?: 'tech-azul' | 'anthropic' | 'openai' | 'google' | 'dark-purple' | 'custom';
  bgPrimary?: string;
  bgSecondary?: string;
  handle?: string;
  logoUrl?: string;
  techGrid?: boolean;
  particles?: boolean;
  ttsAudioUrl?: string;
  musicAudioUrl?: string;
  musicVolume?: number;
}

export interface CarouselRenderResult {
  /** video mode: array with single MP4 path; stills mode: one path per slide */
  outputPaths: string[];
  tempDir: string;
}

// 720p for server-side rendering — much lighter on 2 vCPU than 1080p
// Reels (9:16) and Stories still look great at 720×1280 on mobile
const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 720, h: 1280 },
  '16:9': { w: 1280, h: 720 },
  '1:1': { w: 720, h: 720 },
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

      // disableWebSecurity allows Chromium to load file:// and data: resources.
      // gl:'swiftshader' is the recommended software renderer for headless Linux servers
      // — prevents GPU-related hangs on the last frame.
      const chromiumOptions = {
        enableMultiProcessOnLinux: true,
        disableWebSecurity: true,
        gl: 'swiftshader' as const,
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
          // 'ultrafast' uses more disk/bitrate but frees CPU for Chromium to render —
          // critical on 2 vCPU servers to prevent the encoder from starving frame rendering.
          x264Preset: 'ultrafast',
          outputLocation: outputPath,
          inputProps,
          // concurrency:1 avoids Chromium + FFmpeg competing for the same 2 cores
          concurrency: 1,
          timeoutInMilliseconds: 90_000,   // 90s per-frame timeout
          chromiumOptions,
          browserExecutable: chromiumPath,
          onProgress: ({ renderedFrames, encodedFrames, stitchStage }) => {
            const now = Date.now();
            if (now - lastProgressLog > 10_000) { // log every 10s
              const renderPct = Math.round((renderedFrames / durationInFrames) * 100);
              const encodePct = Math.round((encodedFrames / durationInFrames) * 100);
              if (stitchStage === 'muxing') {
                console.log(`[Remotion] Muxing audio+video... (${encodePct}% encoded)`);
              } else if (renderedFrames >= durationInFrames) {
                console.log(`[Remotion] All frames rendered — encoding ${encodePct}% (${encodedFrames}/${durationInFrames})`);
              } else {
                console.log(`[Remotion] Rendering ${renderPct}% (${renderedFrames}/${durationInFrames} frames) | Encoding ${encodePct}%`);
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

  // ── Carousel / Manual slide renderer ────────────────────────────────────────

  async renderCarousel(input: CarouselRenderInput): Promise<CarouselRenderResult> {
    const framesPerSlide = input.framesPerSlide ?? 90;
    const totalFrames = input.slides.length * framesPerSlide;
    const dim = ASPECT_DIMENSIONS[input.aspectRatio ?? '1:1'] ?? ASPECT_DIMENSIONS['1:1']!;

    const tempDir = join(tmpdir(), `carousel-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      const bundleUrl = await this.ensureBundle();
      const chromiumPath = this.findChromium();
      const chromiumOptions = {
        enableMultiProcessOnLinux: true,
        disableWebSecurity: true,
        gl: 'swiftshader' as const,
      };

      // For stills, use carousel renderMode (skips entrance animations, fully rendered).
      // For video, use default 'video' mode so animations play through.
      const renderMode = input.mode === 'stills' ? 'carousel' : 'video';

      const inputProps = {
        slides: input.slides,
        framesPerSlide,
        accentColor: input.accentColor,
        palette: input.palette ?? 'tech-azul',
        bgPrimary: input.bgPrimary,
        bgSecondary: input.bgSecondary,
        handle: input.handle ?? '@syndra',
        logoUrl: input.logoUrl,
        techGrid: input.techGrid ?? true,
        particles: input.particles ?? true,
        ttsAudioUrl: input.ttsAudioUrl,
        musicAudioUrl: input.musicAudioUrl,
        musicVolume: input.musicVolume ?? 0.22,
        renderMode,
      };

      const { selectComposition } = await import('@remotion/renderer');

      const composition = await this.withTimeout(
        selectComposition({
          serveUrl: bundleUrl,
          id: 'CarouselComposition',
          inputProps,
          browserExecutable: chromiumPath,
          chromiumOptions,
        }),
        60_000,
        'selectComposition (carousel) timed out after 60s',
      );

      if (input.mode === 'stills') {
        // Render one JPEG per slide (JPEG has no alpha channel — always fully opaque)
        const { renderStill } = await import('@remotion/renderer');
        const outputPaths: string[] = [];

        for (let i = 0; i < input.slides.length; i++) {
          const frame = i * framesPerSlide + Math.floor(framesPerSlide / 2); // mid-frame: fully rendered, no animation interruption
          const outputPath = join(tempDir, `slide-${i + 1}.jpg`);

          await this.withTimeout(
            renderStill({
              composition: {
                ...composition,
                width: dim.w,
                height: dim.h,
                durationInFrames: totalFrames || 90,
                fps: FPS,
              },
              serveUrl: bundleUrl,
              output: outputPath,
              frame,
              inputProps,
              imageFormat: 'jpeg',
              jpegQuality: 95,
              chromiumOptions,
              browserExecutable: chromiumPath,
            }),
            120_000,
            `renderStill slide ${i + 1} timed out`,
          );

          outputPaths.push(outputPath);
          console.log(`[Remotion] Carousel still ${i + 1}/${input.slides.length} rendered: ${outputPath}`);
        }

        return { outputPaths, tempDir };
      } else {
        // Render as video
        const { renderMedia } = await import('@remotion/renderer');
        const outputPath = join(tempDir, 'output.mp4');
        let lastProgressLog = Date.now();

        await this.withTimeout(
          renderMedia({
            composition: {
              ...composition,
              width: dim.w,
              height: dim.h,
              durationInFrames: totalFrames || 90,
              fps: FPS,
            },
            serveUrl: bundleUrl,
            codec: 'h264',
            x264Preset: 'ultrafast',
            outputLocation: outputPath,
            inputProps,
            concurrency: 1,
            timeoutInMilliseconds: 90_000,
            chromiumOptions,
            browserExecutable: chromiumPath,
            onProgress: ({ renderedFrames, encodedFrames }) => {
              const now = Date.now();
              if (now - lastProgressLog > 10_000) {
                const pct = Math.round((renderedFrames / totalFrames) * 100);
                console.log(`[Remotion] Carousel render ${pct}% (${renderedFrames}/${totalFrames} frames, encoded: ${encodedFrames})`);
                lastProgressLog = now;
              }
            },
          }),
          RENDER_TIMEOUT_MS,
          `renderMedia (carousel) timed out after ${RENDER_TIMEOUT_MS / 60000} minutes`,
        );

        console.log(`[Remotion] Carousel video complete: ${outputPath}`);
        return { outputPaths: [outputPath], tempDir };
      }
    } catch (error) {
      await this.cleanupDir(tempDir);
      throw error;
    }
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
