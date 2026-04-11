// ============================================================
// AvatarSceneRenderer — FFmpeg compositor: avatar (chroma key) + cinematic scenes
// Combines a HeyGen green-screen avatar video with Kling-generated scene clips.
// ============================================================

import { execFile } from 'child_process';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ── Types ─────────────────────────────────────────────────────

export type AvatarCompositeMode = 'overlay' | 'split' | 'full';

export interface AvatarSceneCompositeInput {
  /** URL of the HeyGen avatar video (green background #00FF00) */
  avatarVideoUrl: string;
  /** Kling scene clip URLs, one per segment (5s or 10s each) */
  sceneVideoUrls: string[];
  /** Duration of each scene segment in seconds — used to loop/trim scenes */
  segmentDurations: number[];
  /** How to composite avatar over scenes */
  compositeMode: AvatarCompositeMode;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  /** Optional background music URL */
  musicUrl?: string;
  /** Music volume relative to speech (0-1, default 0.2) */
  musicVolume?: number;
}

export interface AvatarSceneCompositeResult {
  outputPath: string;
  durationSeconds: number;
  tempDir: string;
}

// ── Dimensions ────────────────────────────────────────────────

const DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1': { w: 1080, h: 1080 },
};

// ── Renderer ─────────────────────────────────────────────────

export class AvatarSceneRenderer {

  /**
   * Main entry: download videos, composite, return output path.
   */
  async compose(input: AvatarSceneCompositeInput): Promise<AvatarSceneCompositeResult> {
    const tempDir = join(tmpdir(), `avatar-scene-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 1. Download all videos in parallel
      const [avatarPath, ...scenePaths] = await Promise.all([
        this.downloadVideo(input.avatarVideoUrl, join(tempDir, 'avatar.mp4')),
        ...input.sceneVideoUrls.map((url, i) =>
          this.downloadVideo(url, join(tempDir, `scene_${i}.mp4`)),
        ),
      ]);

      // 2. Build scene montage (concat + loop scenes to match avatar duration)
      const totalDuration = input.segmentDurations.reduce((a, b) => a + b, 0);
      const sceneMontage = await this.buildSceneMontage(
        scenePaths,
        input.segmentDurations,
        totalDuration,
        tempDir,
        input.aspectRatio ?? '9:16',
      );

      // 3. Composite avatar over scenes
      const dims = DIMENSIONS[input.aspectRatio ?? '9:16'] ?? DIMENSIONS['9:16']!;
      const { w, h } = dims;
      const outputPath = join(tempDir, 'output.mp4');

      await this.compositeAvatarOnScene({
        avatarPath,
        scenePath: sceneMontage,
        outputPath,
        mode: input.compositeMode,
        width: w,
        height: h,
        musicUrl: input.musicUrl,
        musicVolume: input.musicVolume ?? 0.2,
      });

      return { outputPath, durationSeconds: totalDuration, tempDir };
    } catch (err) {
      // Cleanup on failure
      await this.cleanupDir(tempDir).catch(() => {});
      throw err;
    }
  }

  // ── Private: scene montage ──────────────────────────────────

  /**
   * Concatenate scene clips with xfade transitions.
   * Each clip is looped/trimmed to match the segment's target duration.
   */
  private async buildSceneMontage(
    scenePaths: string[],
    segmentDurations: number[],
    totalDuration: number,
    tempDir: string,
    aspectRatio: string,
  ): Promise<string> {
    const { w, h } = DIMENSIONS[aspectRatio] ?? DIMENSIONS['9:16']!;
    const outputPath = join(tempDir, 'scenes_montage.mp4');

    if (scenePaths.length === 0) {
      throw new Error('AvatarSceneRenderer: no scene clips provided');
    }

    if (scenePaths.length === 1) {
      // Single scene: loop it to fill the full duration
      const loopedPath = join(tempDir, 'scene_looped.mp4');
      await execFileAsync('ffmpeg', [
        '-stream_loop', '-1',
        '-i', scenePaths[0]!,
        '-t', String(totalDuration),
        '-vf', `scale=${w}:${h}:force_original_aspect_ratio=cover,crop=${w}:${h}`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-an', '-y', loopedPath,
      ]);
      return loopedPath;
    }

    // Multiple scenes: normalize each to target duration, then concat with xfade
    const normalizedPaths: string[] = [];

    for (let i = 0; i < scenePaths.length; i++) {
      const targetDur = segmentDurations[i] ?? 5;
      const normPath = join(tempDir, `scene_norm_${i}.mp4`);

      await execFileAsync('ffmpeg', [
        '-stream_loop', '-1',
        '-i', scenePaths[i]!,
        '-t', String(targetDur),
        '-vf', `scale=${w}:${h}:force_original_aspect_ratio=cover,crop=${w}:${h},fps=30`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-an', '-y', normPath,
      ]);
      normalizedPaths.push(normPath);
    }

    // Build concat filter with dissolve transitions (0.5s each)
    const transitionDur = 0.5;
    const filterParts: string[] = [];
    const inputFlags: string[] = [];

    normalizedPaths.forEach((p, i) => {
      inputFlags.push('-i', p);
    });

    if (normalizedPaths.length === 2) {
      // Simple two-clip xfade
      const dur0 = (segmentDurations[0] ?? 5) - transitionDur;
      filterParts.push(
        `[0:v][1:v]xfade=transition=dissolve:duration=${transitionDur}:offset=${dur0}[out]`,
      );
    } else {
      // Chain xfades for N clips
      let lastLabel = '[0:v]';
      let offset = 0;

      for (let i = 0; i < normalizedPaths.length - 1; i++) {
        offset += (segmentDurations[i] ?? 5) - transitionDur;
        const nextLabel = i === normalizedPaths.length - 2 ? '[out]' : `[v${i + 1}]`;
        filterParts.push(
          `${lastLabel}[${i + 1}:v]xfade=transition=dissolve:duration=${transitionDur}:offset=${offset}${nextLabel}`,
        );
        lastLabel = `[v${i + 1}]`;
        offset += transitionDur;
      }
    }

    await execFileAsync('ffmpeg', [
      ...inputFlags,
      '-filter_complex', filterParts.join(';'),
      '-map', '[out]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
      '-an', '-y', outputPath,
    ]);

    return outputPath;
  }

  // ── Private: composite avatar ───────────────────────────────

  private async compositeAvatarOnScene(params: {
    avatarPath: string;
    scenePath: string;
    outputPath: string;
    mode: AvatarCompositeMode;
    width: number;
    height: number;
    musicUrl?: string;
    musicVolume: number;
  }): Promise<void> {
    const { avatarPath, scenePath, outputPath, mode, width, height } = params;

    // Chroma key params: remove #00FF00 green background from HeyGen video
    const chromaKey = 'chromakey=color=0x00FF00:similarity=0.35:blend=0.05';

    let filterComplex: string;
    let mapArgs: string[];

    switch (mode) {
      case 'full': {
        // Avatar full-size over scene (scale avatar to match output size, chroma key bg)
        filterComplex = [
          `[1:v]scale=${width}:${height}:force_original_aspect_ratio=cover,crop=${width}:${height}[bg]`,
          `[0:v]scale=${width}:${height},${chromaKey}[avatar_ck]`,
          `[bg][avatar_ck]overlay=0:0[out]`,
        ].join(';');
        mapArgs = ['-map', '[out]', '-map', '0:a'];
        break;
      }

      case 'split': {
        // Left half = avatar, right half = scene
        const halfW = Math.floor(width / 2);
        filterComplex = [
          `[0:v]scale=${halfW}:${height}:force_original_aspect_ratio=cover,crop=${halfW}:${height}[av_left]`,
          `[1:v]scale=${halfW}:${height}:force_original_aspect_ratio=cover,crop=${halfW}:${height}[sc_right]`,
          `[av_left][sc_right]hstack=inputs=2[out]`,
        ].join(';');
        mapArgs = ['-map', '[out]', '-map', '0:a'];
        break;
      }

      case 'overlay':
      default: {
        // Avatar in bottom-right corner, 28% of width, scene full background
        const avatarW = Math.floor(width * 0.28);
        const padX = Math.floor(width * 0.03);
        const padY = Math.floor(height * 0.04);
        filterComplex = [
          `[1:v]scale=${width}:${height}:force_original_aspect_ratio=cover,crop=${width}:${height}[bg]`,
          `[0:v]scale=${avatarW}:-1,${chromaKey}[avatar_ck]`,
          `[bg][avatar_ck]overlay=W-w-${padX}:H-h-${padY}[out]`,
        ].join(';');
        mapArgs = ['-map', '[out]', '-map', '0:a'];
        break;
      }
    }

    // Base ffmpeg args: avatar input, scene input
    const ffmpegArgs: string[] = [
      '-i', avatarPath,    // [0] avatar (with audio)
      '-i', scenePath,     // [1] scene montage (no audio)
    ];

    // Optional music
    if (params.musicUrl) {
      const musicPath = join(params.outputPath, '..', 'music.mp3');
      await this.downloadVideo(params.musicUrl, musicPath);
      ffmpegArgs.push('-i', musicPath);  // [2] music

      // Mix avatar audio + music
      filterComplex += `;[0:a]volume=1.0[speech];[2:a]volume=${params.musicVolume},afade=t=in:d=1,afade=t=out:st=${-2}:d=2[music_f];[speech][music_f]amix=inputs=2:duration=first[audio_out]`;
      mapArgs = ['-map', '[out]', '-map', '[audio_out]'];
    }

    await execFileAsync('ffmpeg', [
      ...ffmpegArgs,
      '-filter_complex', filterComplex,
      ...mapArgs,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      '-y', outputPath,
    ]);
  }

  // ── Private: utilities ──────────────────────────────────────

  private async downloadVideo(url: string, destPath: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AvatarSceneRenderer: failed to download ${url} — HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
    return destPath;
  }

  private async cleanupDir(dir: string): Promise<void> {
    const { rm } = await import('fs/promises');
    await rm(dir, { recursive: true, force: true });
  }
}
