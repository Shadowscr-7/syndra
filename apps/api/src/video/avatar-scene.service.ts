// ============================================================
// AvatarSceneService — Orchestrates HeyGen + Kling + FFmpeg
// Generates avatar videos with cinematic AI-generated backgrounds.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HeyGenVideoAdapter, KieVideoAdapter, AvatarSceneRenderer } from '@automatismos/media';
import { KieMusicAdapter } from '@automatismos/media';
import type { AvatarSceneStoryboard } from './ai-director.service';

// ── Types ─────────────────────────────────────────────────────

export interface RenderAvatarSceneInput {
  workspaceId: string;
  userId?: string;
  avatarId: string;
  voiceId?: string;
  storyboard: AvatarSceneStoryboard;
  enableMusic?: boolean;
}

export interface RenderAvatarSceneResult {
  jobId: string;
  videoUrl: string;
  durationSeconds: number;
  segmentCount: number;
}

// ── Service ───────────────────────────────────────────────────

@Injectable()
export class AvatarSceneService {
  private readonly logger = new Logger(AvatarSceneService.name);

  private readonly heygen: HeyGenVideoAdapter;
  private readonly kie: KieVideoAdapter;
  private readonly kieMusic: KieMusicAdapter;
  private readonly renderer: AvatarSceneRenderer;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const heygenKey = this.config.get<string>('HEYGEN_API_KEY', '');
    this.heygen = new HeyGenVideoAdapter({ apiKey: heygenKey });

    const kieKey = this.config.get<string>('KIE_API_KEY', '');
    this.kie = new KieVideoAdapter({ apiKey: kieKey });
    this.kieMusic = new KieMusicAdapter({ apiKey: kieKey });

    this.renderer = new AvatarSceneRenderer();
  }

  // ── Public API ────────────────────────────────────────────

  async render(input: RenderAvatarSceneInput): Promise<RenderAvatarSceneResult> {
    const { storyboard } = input;
    this.logger.log(
      `AvatarScene: rendering ${storyboard.segments.length} segments, mode=${storyboard.compositeMode}`,
    );

    // 1. Build full script text for HeyGen (all segments concatenated)
    const fullScript = storyboard.segments
      .sort((a, b) => a.order - b.order)
      .map((s) => s.text)
      .join(' ');

    const segmentDurations = storyboard.segments
      .sort((a, b) => a.order - b.order)
      .map((s) => s.durationSeconds);

    // 2. Launch HeyGen + all Kling scene clips in parallel
    const [avatarResult, ...sceneResults] = await Promise.all([
      this.generateAvatarVideo(fullScript, input.avatarId, input.voiceId, storyboard),
      ...storyboard.segments.map((seg) =>
        this.generateSceneClip(seg.scenePrompt, seg.durationSeconds, storyboard),
      ),
    ]);

    this.logger.log(`AvatarScene: all generations complete — avatar=${avatarResult}, scenes=${sceneResults.length}`);

    // 3. Optional music
    let musicUrl: string | undefined;
    if (input.enableMusic && storyboard.musicStyle) {
      try {
        const music = await this.kieMusic.generateAndWait(
          { style: storyboard.musicStyle, instrumental: true },
          120_000,
        );
        musicUrl = music.audioUrl;
        this.logger.log(`AvatarScene: music ready — ${musicUrl}`);
      } catch (err: any) {
        this.logger.warn(`AvatarScene: music generation failed (skipping) — ${err.message}`);
      }
    }

    // 4. FFmpeg composite
    this.logger.log('AvatarScene: compositing with FFmpeg...');
    const compositeResult = await this.renderer.compose({
      avatarVideoUrl: avatarResult,
      sceneVideoUrls: sceneResults,
      segmentDurations,
      compositeMode: storyboard.compositeMode,
      aspectRatio: '9:16',
      musicUrl,
      musicVolume: 0.2,
    });

    this.logger.log(`AvatarScene: composite done — ${compositeResult.outputPath}`);

    // 5. Upload to Cloudinary
    const { url: videoUrl } = await this.uploadToCloudinary(
      compositeResult.outputPath,
      input.workspaceId,
    );

    // 6. Save VideoRenderJob (same pattern as VideoCompositorService)
    const job = await this.prisma.videoRenderJob.create({
      data: {
        workspaceId: input.workspaceId,
        tier: 'PREMIUM' as any,
        provider: 'AVATAR_SCENE' as any,
        inputType: 'AVATAR_SCENE' as any,
        inputPayload: {
          avatarId: input.avatarId,
          compositeMode: storyboard.compositeMode,
          segmentCount: storyboard.segments.length,
          overallMood: storyboard.overallMood,
          musicStyle: storyboard.musicStyle,
          enableMusic: input.enableMusic ?? false,
        } as any,
        status: 'COMPLETED',
        outputUrl: videoUrl,
        durationSeconds: Math.round(compositeResult.durationSeconds),
        aspectRatio: '9:16',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    this.logger.log(`AvatarScene: VideoRenderJob created — ${job.id}`);

    return {
      jobId: job.id,
      videoUrl,
      durationSeconds: compositeResult.durationSeconds,
      segmentCount: storyboard.segments.length,
    };
  }

  // ── Private: Cloudinary upload ──────────────────────────────

  private async uploadToCloudinary(localPath: string, workspaceId: string): Promise<{ url: string; publicId: string }> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

      const result = await cloudinary.uploader.upload(localPath, {
        resource_type: 'video',
        folder: `syndra/videos/avatar-scenes/${workspaceId}`,
        format: 'mp4',
      });

      return { url: result.secure_url, publicId: result.public_id };
    }

    // Fallback: local storage
    const { join } = await import('path');
    const { existsSync, mkdirSync, copyFileSync } = await import('fs');
    const uploadDir = process.env['UPLOAD_DIR'] || join(process.cwd(), 'uploads');
    const videoDir = join(uploadDir, 'videos', 'avatar-scenes');
    if (!existsSync(videoDir)) mkdirSync(videoDir, { recursive: true });

    const filename = `avatar_scene_${Date.now()}.mp4`;
    const destPath = join(videoDir, filename);
    copyFileSync(localPath, destPath);

    return { url: `/uploads/videos/avatar-scenes/${filename}`, publicId: filename };
  }

  // ── Private: HeyGen avatar generation ──────────────────────

  private async generateAvatarVideo(
    fullScript: string,
    avatarId: string,
    voiceId: string | undefined,
    storyboard: AvatarSceneStoryboard,
  ): Promise<string> {
    this.logger.log(`AvatarScene: starting HeyGen — avatar=${avatarId}, script=${fullScript.length} chars`);

    const result = await this.heygen.generateWithGreenScreen(
      { blocks: [{ text: fullScript }], totalDuration: storyboard.totalDurationSeconds },
      { avatarId, voiceId, aspectRatio: '9:16' },
    );

    const final = await this.heygen.waitForCompletion(result.jobId, 600_000);

    if (final.status !== 'completed' || !final.url) {
      throw new Error(`HeyGen avatar generation failed: ${final.error ?? 'unknown error'}`);
    }

    this.logger.log(`AvatarScene: HeyGen complete — ${final.url}`);
    return final.url;
  }

  // ── Private: Kling scene generation ────────────────────────

  private async generateSceneClip(
    scenePrompt: string,
    targetDurationSeconds: number,
    storyboard: AvatarSceneStoryboard,
  ): Promise<string> {
    const duration = targetDurationSeconds >= 8 ? '10' : '5';

    this.logger.log(`AvatarScene: starting Kling scene — ${duration}s, prompt="${scenePrompt.slice(0, 60)}..."`);

    const { taskId } = await this.kie.generateTextToVideo(scenePrompt, {
      duration: duration as '5' | '10',
      aspectRatio: '9:16',
    });

    const result = await this.kie.pollUntilDone(taskId, 300_000);

    this.logger.log(`AvatarScene: Kling scene complete — ${result.url}`);
    return result.url;
  }
}
