// ============================================================
// ReelComposerService — Remotion Reel from Editorial Run
// ── Phase 2: Async queue-based rendering ──
//
// Flow: enqueueReel() → PENDING MediaAsset + queue job → return fast
//       worker calls processReel() → renders in background → READY
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { QUEUES } from '@automatismos/shared';
import {
  RemotionVideoRenderer,
  type RemotionRenderInput,
} from '@automatismos/media';

export type ReelVoiceGender = 'female' | 'male';

export interface RenderReelOptions {
  editorialRunId: string;
  workspaceId: string;
  voiceGender?: ReelVoiceGender;
  subtitleStyle?: 'pill' | 'word-by-word' | 'karaoke' | 'minimal' | 'neon' | 'kinetic';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

// Argentine Microsoft Edge TTS voices
const TTS_VOICES: Record<ReelVoiceGender, string> = {
  female: 'es-AR-ElenaNeural',
  male: 'es-AR-TomasNeural',
};

// Rotate subtitle styles per render (deterministic, no repeats)
const SUBTITLE_STYLES = ['pill', 'word-by-word', 'karaoke', 'minimal', 'neon', 'kinetic'] as const;

// Try python3 first, fall back to python (Windows compatibility)
const PYTHON_CANDIDATES = ['python3', 'python'];

@Injectable()
export class ReelComposerService {
  private readonly logger = new Logger(ReelComposerService.name);
  private readonly renderer = new RemotionVideoRenderer();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Enqueue a reel render job (non-blocking — returns fast)
  // ─────────────────────────────────────────────────────────────────────────

  async enqueueReel(opts: RenderReelOptions): Promise<{ mediaAssetId: string }> {
    const { editorialRunId, workspaceId, voiceGender = 'female', aspectRatio = '9:16', subtitleStyle } = opts;

    // Resolve the main ContentVersion to attach the MediaAsset
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: { where: { isMain: true }, take: 1 },
      },
    });

    const version = brief.contentVersions[0];
    if (!version) throw new Error(`No main content version for run ${editorialRunId}`);

    // Create PENDING asset immediately so the UI can show progress
    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId: version.id,
        type: 'VIDEO',
        provider: 'remotion',
        status: 'PENDING',
        metadata: {
          videoType: 'remotion-reel',
          voiceGender,
          aspectRatio,
          subtitleStyle: subtitleStyle ?? null,
          queuedAt: new Date().toISOString(),
        } as any,
      },
    });

    // Enqueue the background job
    await this.queueService.enqueue(QUEUES.VIDEO, {
      type: 'render_remotion_reel',
      jobId: `reel_${asset.id}`,
      mediaAssetId: asset.id,
      editorialRunId,
      workspaceId,
      voiceGender,
      subtitleStyle: subtitleStyle ?? null,
      aspectRatio,
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    this.logger.log(`[ReelComposer] Enqueued reel job: asset=${asset.id}, run=${editorialRunId}`);
    return { mediaAssetId: asset.id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL: Process reel (called by VideoWorkerService)
  // ─────────────────────────────────────────────────────────────────────────

  async processReel(opts: RenderReelOptions & { mediaAssetId: string }): Promise<void> {
    const { editorialRunId, workspaceId, voiceGender = 'female', aspectRatio = '9:16', mediaAssetId } = opts;

    this.logger.log(`[ReelComposer] Processing reel: asset=${mediaAssetId}, run=${editorialRunId}`);

    try {
      const videoUrl = await this.renderAndUpload(opts);

      // Determine subtitle style used
      const styleIndex = this.hashStringToIndex(editorialRunId, SUBTITLE_STYLES.length);
      const usedStyle = opts.subtitleStyle ?? SUBTITLE_STYLES[styleIndex]!;

      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'READY',
          originalUrl: videoUrl,
          optimizedUrl: videoUrl,
          metadata: {
            videoType: 'remotion-reel',
            voiceGender,
            voiceName: TTS_VOICES[voiceGender],
            subtitleStyle: usedStyle,
            aspectRatio,
            completedAt: new Date().toISOString(),
          } as any,
        },
      });

      this.logger.log(`[ReelComposer] Reel READY: asset=${mediaAssetId}, url=${videoUrl}`);
    } catch (err) {
      this.logger.error(`[ReelComposer] Reel FAILED: asset=${mediaAssetId}`, err);

      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'FAILED',
          metadata: {
            videoType: 'remotion-reel',
            error: String(err),
            failedAt: new Date().toISOString(),
          } as any,
        },
      });

      throw err; // re-throw so worker can retry
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core render pipeline
  // ─────────────────────────────────────────────────────────────────────────

  private async renderAndUpload(opts: RenderReelOptions): Promise<string> {
    const { editorialRunId, workspaceId, voiceGender = 'female', aspectRatio = '9:16' } = opts;

    // 1. Fetch content
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: {
          where: { isMain: true },
          take: 1,
          include: {
            mediaAssets: {
              where: { status: 'READY', type: { in: ['IMAGE', 'CAROUSEL_SLIDE'] } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    const version = brief.contentVersions[0];
    if (!version) throw new Error(`No main content version for run ${editorialRunId}`);

    // 2. Fetch workspace owner
    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId },
      orderBy: { role: 'asc' },
      select: { userId: true },
    });
    const userId = workspaceUser?.userId;

    // 3. VisualStyleProfile + UserPersona + UserMedia
    const [visualStyle, persona, userMediaAssets] = await Promise.all([
      userId
        ? this.prisma.visualStyleProfile.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } })
        : null,
      userId
        ? this.prisma.userPersona.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } })
        : null,
      userId
        ? this.prisma.userMedia.findMany({
            where: { userId, category: { in: ['PRODUCT', 'LOGO'] }, mimeType: { startsWith: 'image/' } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : [],
    ]);

    const logoMedia = userMediaAssets.find((m) => m.category === 'LOGO');
    const productMedia = userMediaAssets.filter((m) => m.category === 'PRODUCT');

    // 4. Build slide URLs
    const contentUrls = version.mediaAssets
      .map((a: any) => (a.optimizedUrl ?? a.originalUrl) as string)
      .filter(Boolean);
    const productUrls = productMedia.map((m) => (m.thumbnailUrl ?? m.url) as string).filter(Boolean);
    const allImageUrls = [...new Set([...contentUrls, ...productUrls])].slice(0, 8);

    if (allImageUrls.length === 0) throw new Error('Se necesita al menos una imagen para el reel');

    // 5. TTS narration
    const narrationText = [version.hook, version.copy, brief.cta].filter(Boolean).join('. ').slice(0, 600);
    const voiceName = TTS_VOICES[voiceGender];
    const ttsResult = await this.generateArgentineTTS(narrationText, voiceName);

    // 6. Branding
    const accentColor = visualStyle?.colorPalette?.[0] ?? '#7C3AED';
    const logoUrl = visualStyle?.logoUrl ?? logoMedia?.url;
    const stylePrompt = this.buildStylePrompt(visualStyle);
    const styleIndex = this.hashStringToIndex(editorialRunId, SUBTITLE_STYLES.length);
    const subtitleStyle = opts.subtitleStyle ?? SUBTITLE_STYLES[styleIndex]!;

    // 6b. Detect reel template from brief format/angle
    const reelTemplate = this.detectReelTemplate(brief);
    const templateData = this.buildTemplateData(brief, version, persona);

    // 7. Build Remotion input
    const slideDuration = ttsResult.durationMs
      ? Math.round(ttsResult.durationMs / allImageUrls.length)
      : 4000;

    const renderInput: RemotionRenderInput = {
      slides: allImageUrls.map((url, i) => ({
        url,
        role: 'slide' as const,
        order: i,
        durationMs: slideDuration,
        animation: 'auto' as const,
      })),
      aspectRatio,
      ttsAudioUrl: ttsResult.audioDataUrl,
      ttsDurationMs: ttsResult.durationMs,
      subtitleGroups: ttsResult.subtitleGroups,
      subtitleStyle,
      overlayTheme: 'modern',
      logoUrl,
      accentColor,
      stylePrompt,
      musicVolume: 0,
      reelTemplate,
      ...templateData,
    };

    // 8. Render + upload
    this.logger.log(`[ReelComposer] Rendering: ${allImageUrls.length} slides, style=${subtitleStyle}, voice=${voiceName}`);
    const renderResult = await this.renderer.render(renderInput);

    let videoUrl: string;
    try {
      videoUrl = await this.uploadVideoToCloudinary(renderResult.outputPath, editorialRunId);
    } finally {
      await this.renderer.cleanup(renderResult.tempDir);
    }

    return videoUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TTS — Argentine voices only (Elena F / Tomás M)
  // ─────────────────────────────────────────────────────────────────────────

  private async generateArgentineTTS(text: string, voice: string): Promise<{
    audioDataUrl?: string;
    durationMs?: number;
    subtitleGroups: Array<{ startMs: number; endMs: number; text: string }>;
  }> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');
    const execFileAsync = promisify(execFile);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reel-tts-'));
    const audioFile = path.join(tmpDir, 'narration.mp3');
    const vttFile = path.join(tmpDir, 'subtitles.vtt');

    const pythonCmd = await this.resolvePython();

    try {
      await execFileAsync(pythonCmd, [
        '-m', 'edge_tts',
        '--voice', voice,
        '--rate', '+10%',
        '--text', text,
        '--write-media', audioFile,
        '--write-subtitles', vttFile,
      ], { timeout: 60_000 });

      const [audioBuffer, vttContent] = await Promise.all([
        fs.readFile(audioFile),
        fs.readFile(vttFile, 'utf8').catch(() => ''),
      ]);

      const audioDataUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
      const subtitleGroups = this.parseVTTToSubtitleGroups(vttContent);
      const durationMs = subtitleGroups.length > 0
        ? subtitleGroups[subtitleGroups.length - 1]!.endMs + 500
        : Math.ceil(text.length * 60);

      return { audioDataUrl, durationMs, subtitleGroups };
    } catch (err) {
      this.logger.warn(`[ReelComposer] TTS failed (${voice}): ${err}. Continuing without audio.`);
      return { subtitleGroups: [] };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** Try python3 first, fall back to python */
  private async resolvePython(): Promise<string> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    for (const cmd of PYTHON_CANDIDATES) {
      try {
        await execFileAsync(cmd, ['--version'], { timeout: 5_000 });
        return cmd;
      } catch {
        // try next
      }
    }

    this.logger.warn('[ReelComposer] Neither python3 nor python found — TTS will fail');
    return 'python3'; // best-effort fallback
  }

  /** Parse VTT subtitle file → subtitle groups for Remotion */
  private parseVTTToSubtitleGroups(vtt: string): Array<{ startMs: number; endMs: number; text: string }> {
    if (!vtt) return [];
    const groups: Array<{ startMs: number; endMs: number; text: string }> = [];
    const blocks = vtt.split(/\n\n+/).filter(b => b.includes('-->'));

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const timingLine = lines.find(l => l.includes('-->'));
      if (!timingLine) continue;

      const [startStr, endStr] = timingLine.split('-->').map(s => s.trim());
      if (!startStr || !endStr) continue;

      const textLines = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l.trim()) && l.trim() !== 'WEBVTT');
      const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
      if (!text) continue;

      groups.push({
        startMs: this.vttTimeToMs(startStr),
        endMs: this.vttTimeToMs(endStr),
        text,
      });
    }

    return groups;
  }

  private vttTimeToMs(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return (parseInt(h!) * 3600 + parseInt(m!) * 60 + parseFloat(s!)) * 1000;
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return (parseInt(m!) * 60 + parseFloat(s!)) * 1000;
    }
    return 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private detectReelTemplate(brief: any): 'product' | 'negocio' | 'testimonial' | 'default' {
    const angle     = (brief.angle ?? '').toLowerCase();
    const objective = (brief.objective ?? '').toLowerCase();

    if (angle.includes('product') || angle.includes('producto') || objective.includes('venta') || objective.includes('compra')) {
      return 'product';
    }
    if (angle.includes('testimonio') || angle.includes('testimonial') || angle.includes('review') || angle.includes('reseña')) {
      return 'testimonial';
    }
    if (angle.includes('brand') || angle.includes('marca') || angle.includes('empresa') || objective.includes('branding')) {
      return 'negocio';
    }
    return 'default';
  }

  private buildTemplateData(brief: any, version: any, persona: any): Record<string, string | undefined> {
    const brandName = (persona?.brandName ?? undefined) as string | undefined;
    const tagline   = (version?.hook ?? brief.cta ?? undefined) as string | undefined;

    // product — name/price not in schema, best-effort from brief angle
    const productName  = undefined as string | undefined;
    const productPrice = undefined as string | undefined;
    const productCta   = (brief.cta ?? undefined) as string | undefined;

    // testimonial
    const quote       = (version?.hook ?? undefined) as string | undefined;
    const quoteAuthor = (brandName ?? undefined) as string | undefined;

    return { brandName, tagline, productName, productPrice, productCta, quote, quoteAuthor };
  }

  private buildStylePrompt(style: { style?: string | null; colorPalette?: string[] | null } | null): string {
    if (!style) return 'modern dark cinematic';
    const styleMap: Record<string, string> = {
      MINIMALIST: 'minimal clean',
      FUTURISTIC: 'neon cyberpunk energetic',
      REALISTIC: 'cinematic photorealistic',
      ELEGANT: 'elegant luxury gold',
      BOLD: 'bold energetic dynamic',
      VINTAGE: 'warm vintage retro',
    };
    return `dark professional ${styleMap[style.style ?? ''] ?? 'modern'}`;
  }

  private hashStringToIndex(str: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % max;
  }

  private async uploadVideoToCloudinary(filePath: string, runId: string): Promise<string> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    if (!cloudName || !cloudKey || !cloudSecret) {
      return this.saveVideoLocally(filePath);
    }

    const { readFile } = await import('fs/promises');
    const crypto = await import('crypto');
    const fileBuffer = await readFile(filePath);

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'automatismos/remotion-reels';
    const params = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(`${params}${cloudSecret}`).digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), `reel_${runId}.mp4`);
    formData.append('folder', folder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', cloudKey);
    formData.append('signature', signature);
    formData.append('resource_type', 'video');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudinary video upload failed: ${err}`);
    }

    const data = (await res.json()) as { secure_url: string };
    return data.secure_url;
  }

  private async saveVideoLocally(sourcePath: string): Promise<string> {
    const path = await import('path');
    const fs = await import('fs/promises');
    const crypto = await import('crypto');

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const videoDir = path.join(uploadDir, 'videos');
    await fs.mkdir(videoDir, { recursive: true });

    const filename = `reel_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`;
    const destPath = path.join(videoDir, filename);
    await fs.copyFile(sourcePath, destPath);

    const apiUrl = this.config.get<string>('API_PUBLIC_URL', '') || 'http://localhost:3001';
    return `${apiUrl}/uploads/videos/${filename}`;
  }
}
