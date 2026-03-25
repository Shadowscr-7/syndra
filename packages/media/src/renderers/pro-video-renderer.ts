// ============================================================
// Pro Video Renderer — FFmpeg compositor profesional
// Genera videos con: imágenes, TTS, subtítulos, música, overlays
// Máximo 60 segundos. Gratis en terms de API externa.
// ============================================================

import { execFile } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// ── Types ──

export interface ProVideoInput {
  /** Image URLs or local paths */
  imageUrls: string[];
  /** Aspect ratio */
  aspectRatio?: '9:16' | '16:9' | '1:1';
  /** Duration per slide in seconds (auto-calculated if audio) */
  slideDuration?: number;
  /** Crossfade transition duration (default: 0.8) */
  transitionDuration?: number;

  // Audio
  /** TTS audio as data URL or file path */
  ttsAudioUrl?: string;
  /** Background music as data URL or file URL */
  musicAudioUrl?: string;
  /** Music volume relative to TTS (0-1, default: 0.25) */
  musicVolume?: number;

  // Subtitles
  /** SRT subtitle content */
  srtContent?: string;
  /** Subtitle font size (default: 24) */
  subtitleFontSize?: number;

  // Product mode overlays
  /** Logo image URL (will be placed in corner) */
  logoUrl?: string;
  /** Product text overlay (name, price, CTA) */
  productOverlay?: {
    name?: string;
    price?: string;
    cta?: string;
  };

  /** Max total duration in seconds (default: 60) */
  maxDuration?: number;
}

export interface ProVideoResult {
  outputPath: string;
  durationSeconds: number;
  tempDir: string;
  hasAudio: boolean;
  hasSubtitles: boolean;
  hasMusic: boolean;
}

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1': { w: 1080, h: 1080 },
};

export class ProVideoRenderer {

  async render(input: ProVideoInput): Promise<ProVideoResult> {
    const {
      imageUrls,
      aspectRatio = '9:16',
      transitionDuration = 0.8,
      ttsAudioUrl,
      musicAudioUrl,
      musicVolume = 0.25,
      srtContent,
      subtitleFontSize = 24,
      logoUrl,
      productOverlay,
      maxDuration = 60,
    } = input;

    if (!imageUrls.length) {
      throw new Error('ProVideoRenderer: at least one image required');
    }

    const dim = ASPECT_DIMENSIONS[aspectRatio] ?? ASPECT_DIMENSIONS['9:16']!;
    const tempDir = join(tmpdir(), `provideo-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 1. Download images
      const imagePaths = await this.downloadFiles(imageUrls, tempDir, 'img');
      if (imagePaths.length === 1) imagePaths.push(imagePaths[0]!);

      // 2. Save TTS audio
      let ttsPath: string | undefined;
      if (ttsAudioUrl) {
        ttsPath = await this.saveFile(ttsAudioUrl, tempDir, 'tts.mp3');
      }

      // 3. Save music audio
      let musicPath: string | undefined;
      if (musicAudioUrl) {
        musicPath = await this.saveFile(musicAudioUrl, tempDir, 'music.mp3');
      }

      // 4. Get TTS duration to calculate slide timing
      let ttsDuration = 0;
      if (ttsPath) {
        ttsDuration = await this.getAudioDuration(ttsPath);
      }

      // 5. Calculate slide durations
      const n = imagePaths.length;
      const totalTransitions = (n - 1) * transitionDuration;
      let slideDuration = input.slideDuration ?? 4;

      if (ttsDuration > 0) {
        // Distribute slides across TTS duration
        const targetDuration = Math.min(ttsDuration + 1, maxDuration);
        slideDuration = Math.max(2, (targetDuration + totalTransitions) / n);
      }

      const rawDuration = n * slideDuration - totalTransitions;
      const totalDuration = Math.min(rawDuration, maxDuration);

      // 6. Save SRT subtitles
      let srtPath: string | undefined;
      if (srtContent) {
        srtPath = join(tempDir, 'subtitles.srt');
        await writeFile(srtPath, srtContent, 'utf-8');
      }

      // 7. Download logo
      let logoPath: string | undefined;
      if (logoUrl) {
        try {
          const paths = await this.downloadFiles([logoUrl], tempDir, 'logo');
          logoPath = paths[0];
        } catch { /* logo is optional */ }
      }

      // 8. Render video
      const outputPath = join(tempDir, 'output.mp4');
      await this.runFFmpeg({
        imagePaths,
        ttsPath,
        musicPath,
        musicVolume,
        srtPath,
        subtitleFontSize,
        logoPath,
        productOverlay,
        outputPath,
        width: dim.w,
        height: dim.h,
        slideDuration,
        transitionDuration,
        totalDuration,
      });

      return {
        outputPath,
        durationSeconds: totalDuration,
        tempDir,
        hasAudio: !!ttsPath,
        hasSubtitles: !!srtPath,
        hasMusic: !!musicPath,
      };
    } catch (error) {
      await this.cleanupDir(tempDir);
      throw error;
    }
  }

  async cleanup(tempDir: string): Promise<void> {
    await this.cleanupDir(tempDir);
  }

  // ── Download helpers ──

  private async downloadFiles(urls: string[], tempDir: string, prefix: string): Promise<string[]> {
    const paths: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]!;
      const ext = url.match(/\.(jpe?g|png|webp|gif)/i)?.[1] ?? 'jpg';
      const filePath = join(tempDir, `${prefix}_${i}.${ext}`);

      if (url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        if (base64) {
          await writeFile(filePath, Buffer.from(base64, 'base64'));
          paths.push(filePath);
        }
      } else if (url.startsWith('http') || url.startsWith('/')) {
        const fetchUrl = url.startsWith('/') ? `http://localhost:3001${url}` : url;
        const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(30_000) });
        if (res.ok) {
          await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
          paths.push(filePath);
        } else {
          console.warn(`[ProVideo] Failed to download ${prefix}_${i}: ${res.status}`);
        }
      } else if (existsSync(url)) {
        paths.push(url);
      }
    }
    if (paths.length === 0) throw new Error('ProVideoRenderer: no files could be downloaded');
    return paths;
  }

  private async saveFile(url: string, tempDir: string, filename: string): Promise<string> {
    const filePath = join(tempDir, filename);
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      if (base64) {
        await writeFile(filePath, Buffer.from(base64, 'base64'));
        return filePath;
      }
    } else if (url.startsWith('http') || url.startsWith('/')) {
      const fetchUrl = url.startsWith('/') ? `http://localhost:3001${url}` : url;
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) {
        await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
        return filePath;
      }
    } else if (existsSync(url)) {
      const data = await readFile(url);
      await writeFile(filePath, data);
      return filePath;
    }
    throw new Error(`ProVideoRenderer: could not save ${filename}`);
  }

  private getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      execFile('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ], { timeout: 10_000 }, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(0);
        } else {
          resolve(parseFloat(stdout.trim()) || 0);
        }
      });
    });
  }

  // ── FFmpeg rendering ──

  private runFFmpeg(opts: {
    imagePaths: string[];
    ttsPath?: string;
    musicPath?: string;
    musicVolume: number;
    srtPath?: string;
    subtitleFontSize: number;
    logoPath?: string;
    productOverlay?: { name?: string; price?: string; cta?: string };
    outputPath: string;
    width: number;
    height: number;
    slideDuration: number;
    transitionDuration: number;
    totalDuration: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const {
        imagePaths, ttsPath, musicPath, musicVolume,
        srtPath, subtitleFontSize,
        logoPath, productOverlay,
        outputPath, width, height,
        slideDuration, transitionDuration, totalDuration,
      } = opts;

      const args: string[] = ['-y'];
      const n = imagePaths.length;
      let inputIndex = 0;

      // --- Inputs ---

      // Images
      for (const imgPath of imagePaths) {
        args.push('-loop', '1', '-t', String(slideDuration), '-i', imgPath);
        inputIndex++;
      }

      // TTS audio
      const ttsInputIdx = ttsPath ? inputIndex++ : -1;
      if (ttsPath) args.push('-i', ttsPath);

      // Music audio
      const musicInputIdx = musicPath ? inputIndex++ : -1;
      if (musicPath) args.push('-i', musicPath);

      // Logo image
      const logoInputIdx = logoPath ? inputIndex++ : -1;
      if (logoPath) args.push('-i', logoPath);

      // --- Filter graph ---
      const filters: string[] = [];

      // 1. Scale + pad each image
      for (let i = 0; i < n; i++) {
        filters.push(
          `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,` +
          `setsar=1,format=yuv420p[v${i}]`,
        );
      }

      // 2. Crossfade transitions
      if (n === 1) {
        filters.push(`[v0]null[vslides]`);
      } else if (n === 2) {
        const offset = slideDuration - transitionDuration;
        filters.push(
          `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[vslides]`,
        );
      } else {
        let offset = slideDuration - transitionDuration;
        filters.push(
          `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[xf0]`,
        );
        for (let i = 2; i < n; i++) {
          offset += slideDuration - transitionDuration;
          const prevLabel = `xf${i - 2}`;
          const outLabel = i === n - 1 ? 'vslides' : `xf${i - 1}`;
          filters.push(
            `[${prevLabel}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outLabel}]`,
          );
        }
      }

      // 3. Logo overlay (top-right corner, semi-transparent)
      let videoLabel = 'vslides';
      if (logoInputIdx >= 0) {
        const logoSize = Math.round(width * 0.12);
        const margin = Math.round(width * 0.03);
        filters.push(
          `[${logoInputIdx}:v]scale=${logoSize}:${logoSize}:force_original_aspect_ratio=decrease,` +
          `format=rgba,colorchannelmixer=aa=0.85[logo_scaled]`,
        );
        filters.push(
          `[${videoLabel}][logo_scaled]overlay=W-w-${margin}:${margin}[vlogo]`,
        );
        videoLabel = 'vlogo';
      }

      // 4. Product text overlay (bottom area)
      if (productOverlay && (productOverlay.name || productOverlay.price || productOverlay.cta)) {
        const fontSize = Math.round(height * 0.028);
        const bigFontSize = Math.round(height * 0.038);
        const drawTexts: string[] = [];
        let yPos = height - Math.round(height * 0.18);

        if (productOverlay.name) {
          drawTexts.push(
            `drawtext=text='${this.escapeFFmpegText(productOverlay.name)}':` +
            `fontsize=${bigFontSize}:fontcolor=white:borderw=2:bordercolor=black@0.6:` +
            `x=(w-text_w)/2:y=${yPos}`,
          );
          yPos += bigFontSize + 10;
        }
        if (productOverlay.price) {
          drawTexts.push(
            `drawtext=text='${this.escapeFFmpegText(productOverlay.price)}':` +
            `fontsize=${bigFontSize + 4}:fontcolor=#FFD700:borderw=2:bordercolor=black@0.6:` +
            `x=(w-text_w)/2:y=${yPos}`,
          );
          yPos += bigFontSize + 14;
        }
        if (productOverlay.cta) {
          drawTexts.push(
            `drawtext=text='${this.escapeFFmpegText(productOverlay.cta)}':` +
            `fontsize=${fontSize}:fontcolor=#00FF88:borderw=2:bordercolor=black@0.7:` +
            `x=(w-text_w)/2:y=${yPos}`,
          );
        }

        if (drawTexts.length > 0) {
          filters.push(`[${videoLabel}]${drawTexts.join(',')}[vtext]`);
          videoLabel = 'vtext';
        }
      }

      // 5. Subtitles (burn-in)
      if (srtPath) {
        const escapedPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        filters.push(
          `[${videoLabel}]subtitles='${escapedPath}':` +
          `force_style='FontSize=${subtitleFontSize},PrimaryColour=&HFFFFFF,` +
          `OutlineColour=&H000000,BorderStyle=3,Outline=2,Shadow=1,` +
          `Alignment=2,MarginV=60'[vsub]`,
        );
        videoLabel = 'vsub';
      }

      // Final video label
      if (videoLabel !== 'vsub' && videoLabel !== 'vtext' && videoLabel !== 'vlogo') {
        // No post-processing, rename
        filters.push(`[${videoLabel}]null[vfinal]`);
        videoLabel = 'vfinal';
      } else {
        // Rename to vfinal
        const lastFilter = filters[filters.length - 1]!;
        const currentLabel = lastFilter.match(/\[(\w+)\]$/)?.[1];
        if (currentLabel && currentLabel !== 'vfinal') {
          filters[filters.length - 1] = lastFilter.replace(
            `[${currentLabel}]`,
            `[vfinal]`,
          );
          videoLabel = 'vfinal';
        }
      }

      // 6. Audio mixing (TTS + Music)
      let audioLabel: string | undefined;
      if (ttsInputIdx >= 0 && musicInputIdx >= 0) {
        // Mix TTS (full volume) + music (reduced)
        filters.push(
          `[${musicInputIdx}:a]volume=${musicVolume}[musiclow]`,
        );
        filters.push(
          `[${ttsInputIdx}:a][musiclow]amix=inputs=2:duration=first:dropout_transition=2[afinal]`,
        );
        audioLabel = 'afinal';
      } else if (ttsInputIdx >= 0) {
        audioLabel = `${ttsInputIdx}:a`;
      } else if (musicInputIdx >= 0) {
        filters.push(`[${musicInputIdx}:a]volume=${musicVolume * 2}[afinal]`);
        audioLabel = 'afinal';
      }

      // --- Build command ---
      if (filters.length > 0) {
        args.push('-filter_complex', filters.join('; '));
      }

      args.push('-map', `[vfinal]`);

      if (audioLabel) {
        if (audioLabel.includes(':')) {
          args.push('-map', audioLabel);
        } else {
          args.push('-map', `[${audioLabel}]`);
        }
        args.push('-c:a', 'aac', '-b:a', '192k');
      }

      args.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-t', String(Math.min(totalDuration, 60)),
        '-movflags', '+faststart',
        outputPath,
      );

      console.log(`[ProVideo] FFmpeg: ${n} images, tts=${!!ttsPath}, music=${!!musicPath}, srt=${!!srtPath}, logo=${!!logoPath}, duration=${totalDuration}s`);

      execFile('ffmpeg', args, { timeout: 180_000 }, (error, _stdout, stderr) => {
        if (error) {
          console.error(`[ProVideo] FFmpeg error:`, error.message);
          console.error(`[ProVideo] FFmpeg stderr:`, stderr?.slice(-800));
          reject(new Error(`FFmpeg render failed: ${error.message}`));
        } else {
          console.log(`[ProVideo] FFmpeg completed`);
          resolve();
        }
      });
    });
  }

  private escapeFFmpegText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\u2019")
      .replace(/:/g, '\\:')
      .replace(/%/g, '%%');
  }

  private async cleanupDir(dirPath: string): Promise<void> {
    try {
      const { rm } = await import('fs/promises');
      await rm(dirPath, { recursive: true, force: true });
    } catch { /* best effort */ }
  }
}
