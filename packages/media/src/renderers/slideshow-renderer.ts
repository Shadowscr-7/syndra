// ============================================================
// Slideshow Renderer — Genera video slideshow con FFmpeg
// Toma imágenes existentes + audio opcional → MP4
// Gratis: sin API externa, renderiza localmente
// ============================================================

import { execFile } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface SlideshowInput {
  /** URLs or local paths of images to include */
  imageUrls: string[];
  /** Audio data URL (data:audio/mp3;base64,...) or file path */
  audioDataUrl?: string;
  /** Duration per slide in seconds (default: 3) */
  slideDuration?: number;
  /** Crossfade transition duration in seconds (default: 0.5) */
  transitionDuration?: number;
  /** Output aspect ratio (default: 9:16 → 1080x1920) */
  aspectRatio?: '9:16' | '16:9' | '1:1';
  /** Text overlay on each slide */
  textOverlays?: Array<{ text: string; position: 'top' | 'center' | 'bottom' }>;
}

export interface SlideshowResult {
  /** Path to the output MP4 file */
  outputPath: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Temp directory (caller should clean up) */
  tempDir: string;
}

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1': { w: 1080, h: 1080 },
};

export class SlideshowRenderer {
  /**
   * Render a slideshow video from images + optional audio.
   * Requires ffmpeg to be installed on the system.
   */
  async render(input: SlideshowInput): Promise<SlideshowResult> {
    const {
      imageUrls,
      audioDataUrl,
      slideDuration = 3,
      transitionDuration = 0.5,
      aspectRatio = '9:16',
    } = input;

    if (!imageUrls.length) {
      throw new Error('SlideshowRenderer: at least one image is required');
    }

    const dim = ASPECT_DIMENSIONS[aspectRatio] ?? ASPECT_DIMENSIONS['9:16']!;
    const tempDir = join(tmpdir(), `slideshow-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 1. Download images to temp
      const imagePaths = await this.downloadImages(imageUrls, tempDir);

      // If only 1 image, duplicate it for a ken-burns effect
      if (imagePaths.length === 1) {
        imagePaths.push(imagePaths[0]!);
      }

      // 2. Save audio to temp file if provided
      let audioPath: string | undefined;
      if (audioDataUrl) {
        audioPath = await this.saveAudioToFile(audioDataUrl, tempDir);
      }

      // 3. Build and run FFmpeg command
      const outputPath = join(tempDir, 'output.mp4');
      const totalDuration = imagePaths.length * slideDuration - (imagePaths.length - 1) * transitionDuration;

      await this.runFFmpeg(imagePaths, audioPath, outputPath, {
        slideDuration,
        transitionDuration,
        width: dim.w,
        height: dim.h,
        totalDuration,
      });

      return { outputPath, durationSeconds: totalDuration, tempDir };
    } catch (error) {
      // Clean up on error
      await this.cleanupDir(tempDir);
      throw error;
    }
  }

  /** Clean up temp files after upload */
  async cleanup(tempDir: string): Promise<void> {
    await this.cleanupDir(tempDir);
  }

  private async downloadImages(urls: string[], tempDir: string): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]!;
      const ext = url.match(/\.(jpe?g|png|webp)/i)?.[1] ?? 'jpg';
      const filePath = join(tempDir, `img_${i}.${ext}`);

      if (url.startsWith('data:')) {
        // Decode base64 data URL
        const base64 = url.split(',')[1];
        if (base64) {
          await writeFile(filePath, Buffer.from(base64, 'base64'));
          paths.push(filePath);
        }
      } else if (url.startsWith('http')) {
        // Download from URL
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          await writeFile(filePath, buffer);
          paths.push(filePath);
        } else {
          console.warn(`[Slideshow] Failed to download image ${i}: ${res.status}`);
        }
      }
    }

    if (paths.length === 0) {
      throw new Error('SlideshowRenderer: no images could be downloaded');
    }

    return paths;
  }

  private async saveAudioToFile(audioDataUrl: string, tempDir: string): Promise<string> {
    const audioPath = join(tempDir, 'audio.mp3');

    if (audioDataUrl.startsWith('data:')) {
      const base64 = audioDataUrl.split(',')[1];
      if (base64) {
        await writeFile(audioPath, Buffer.from(base64, 'base64'));
        return audioPath;
      }
    } else if (audioDataUrl.startsWith('http')) {
      const res = await fetch(audioDataUrl, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) {
        await writeFile(audioPath, Buffer.from(await res.arrayBuffer()));
        return audioPath;
      }
    }

    throw new Error('SlideshowRenderer: could not process audio');
  }

  private runFFmpeg(
    imagePaths: string[],
    audioPath: string | undefined,
    outputPath: string,
    opts: {
      slideDuration: number;
      transitionDuration: number;
      width: number;
      height: number;
      totalDuration: number;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { slideDuration, transitionDuration, width, height, totalDuration } = opts;

      // Build FFmpeg arguments
      const args: string[] = ['-y']; // Overwrite output

      // Input images (each looped for slideDuration)
      for (const imgPath of imagePaths) {
        args.push('-loop', '1', '-t', String(slideDuration), '-i', imgPath);
      }

      // Input audio (if available)
      if (audioPath) {
        args.push('-i', audioPath);
      }

      // Build filter graph
      const n = imagePaths.length;
      const filterParts: string[] = [];

      // Scale each image to target size with padding (letterbox)
      for (let i = 0; i < n; i++) {
        filterParts.push(
          `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,` +
          `setsar=1,format=yuv420p[v${i}]`,
        );
      }

      // Apply crossfade transitions between consecutive images
      if (n === 1) {
        // Single image — just use it (already duplicated above, so n>=2)
        filterParts.push(`[v0]null[vout]`);
      } else if (n === 2) {
        const offset = slideDuration - transitionDuration;
        filterParts.push(
          `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[vout]`,
        );
      } else {
        // Chain xfade for n>2 images
        let offset = slideDuration - transitionDuration;
        filterParts.push(
          `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[xf0]`,
        );
        for (let i = 2; i < n; i++) {
          offset += slideDuration - transitionDuration;
          const prevLabel = i === 2 ? 'xf0' : `xf${i - 2}`;
          const outLabel = i === n - 1 ? 'vout' : `xf${i - 1}`;
          filterParts.push(
            `[${prevLabel}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outLabel}]`,
          );
        }
      }

      const filterComplex = filterParts.join('; ');
      args.push('-filter_complex', filterComplex);

      // Map video output
      args.push('-map', '[vout]');

      // Map audio if present
      if (audioPath) {
        const audioIndex = n; // audio is the last input
        args.push('-map', `${audioIndex}:a`);
        args.push('-c:a', 'aac', '-b:a', '128k');
      }

      // Video encoding
      args.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-t', String(totalDuration),
        '-movflags', '+faststart',
        outputPath,
      );

      console.log(`[Slideshow] Running FFmpeg with ${n} images, audio=${!!audioPath}, duration=${totalDuration}s`);

      execFile('ffmpeg', args, { timeout: 120_000 }, (error, _stdout, stderr) => {
        if (error) {
          console.error(`[Slideshow] FFmpeg error:`, error.message);
          console.error(`[Slideshow] FFmpeg stderr:`, stderr?.slice(-500));
          reject(new Error(`FFmpeg slideshow failed: ${error.message}`));
        } else {
          console.log(`[Slideshow] FFmpeg completed successfully`);
          resolve();
        }
      });
    });
  }

  private async cleanupDir(dirPath: string): Promise<void> {
    try {
      const { rm } = await import('fs/promises');
      await rm(dirPath, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  }
}
