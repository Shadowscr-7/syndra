// ============================================================
// Video Service — Orquesta generación de video con avatar IA
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { QUEUES } from '@automatismos/shared';
import {
  VideoPipeline,
  HeyGenVideoAdapter,
  MockVideoAdapter,
  ElevenLabsVoiceAdapter,
  MockVoiceAdapter,
  EdgeTTSAdapter,
  CloudinaryAdapter,
  MockCloudinaryAdapter,
  BUILTIN_VIDEO_TEMPLATES,
  getVideoTemplateById,
  getVideoTemplateForMode,
  KieVideoAdapter,
  KIE_VIDEO_MODELS,
  SlideshowRenderer,
  type AvatarVideoAdapter,
  type VoiceSynthesisAdapter,
  type VideoMode,
  type VideoPipelineResult,
  type KieVideoType,
} from '@automatismos/media';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly pipeline: VideoPipeline;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {
    // --- Video adapter (HeyGen / Mock) ---
    const heygenKey = this.config.get<string>('HEYGEN_API_KEY', '');
    let videoAdapter: AvatarVideoAdapter;

    if (heygenKey) {
      videoAdapter = new HeyGenVideoAdapter({
        apiKey: heygenKey,
        defaultAvatarId: this.config.get<string>('HEYGEN_AVATAR_ID', ''),
        defaultVoiceId: this.config.get<string>('HEYGEN_VOICE_ID', ''),
      });
      this.logger.log('Using HeyGen video adapter');
    } else {
      videoAdapter = new MockVideoAdapter();
      this.logger.warn('Using MockVideoAdapter — set HEYGEN_API_KEY for real video');
    }

    // --- Voice synthesis adapter (ElevenLabs / Edge TTS / Mock) ---
    const elevenLabsKey = this.config.get<string>('ELEVENLABS_API_KEY', '');
    let voiceAdapter: VoiceSynthesisAdapter;

    if (elevenLabsKey) {
      voiceAdapter = new ElevenLabsVoiceAdapter({ apiKey: elevenLabsKey });
      this.logger.log('Using ElevenLabs voice adapter');
    } else {
      voiceAdapter = new EdgeTTSAdapter('es-AR-ElenaNeural');
      this.logger.log('Using EdgeTTS voice adapter — free, no API key needed');
    }

    // --- Cloudinary (reusa config existente) ---
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    const cloudinary = cloudName && cloudKey
      ? new CloudinaryAdapter({ cloudName, apiKey: cloudKey, apiSecret: cloudSecret })
      : undefined;

    // --- Pipeline ---
    this.pipeline = new VideoPipeline({
      videoAdapter,
      voiceAdapter,
      cloudinary: cloudinary as any,
    });
  }

  // ============================================================
  // Video Generation Flow
  // ============================================================

  /**
   * Genera un video a partir de un editorial run aprobado.
   * 1. Lee ContentVersion principal
   * 2. Determina modo de video
   * 3. Envía a pipeline → obtiene jobId
   * 4. Crea MediaAsset con status PENDING
   * 5. Encola job de polling en video_jobs queue
   */
  async generateVideoFromRun(
    editorialRunId: string,
    workspaceId: string,
    options?: { mode?: VideoMode; avatarId?: string; voiceId?: string },
  ): Promise<{ mediaAssetId: string; jobId: string }> {
    this.logger.log(`Starting video generation for run ${editorialRunId}`);

    // 1. Obtener brief y version
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: {
          where: { isMain: true },
          take: 1,
        },
      },
    });

    const version = brief.contentVersions[0];
    if (!version) {
      throw new Error(`No main content version for run ${editorialRunId}`);
    }

    // 2. Determinar modo de video
    const mode = options?.mode ?? this.inferVideoMode(brief.format, brief.tone);

    // 3. Generar video
    const result: VideoPipelineResult = await this.pipeline.generateVideo(
      {
        hook: version.hook,
        copy: version.copy,
        cta: brief.cta,
        mode,
      },
      {
        avatarId: options?.avatarId,
        voiceId: options?.voiceId,
        language: 'es',
        aspectRatio: '9:16',
        outputFormat: 'mp4',
      },
    );

    // 4. Crear MediaAsset
    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId: version.id,
        type: 'AVATAR_VIDEO',
        provider: this.config.get('HEYGEN_API_KEY', '') ? 'heygen' : 'mock',
        status: 'PENDING',
        metadata: {
          jobId: result.jobId,
          mode: result.mode,
          durationSeconds: result.durationSeconds,
          scriptBlocks: result.scriptBlocks,
          subtitlesSRT: result.subtitlesSRT,
          ...result.metadata,
        } as any,
      },
    });

    // 5. Encolar job de polling
    await this.queueService.enqueue(QUEUES.VIDEO, {
      type: 'generate_video',
      jobId: `job_video_${asset.id}`,
      editorialRunId,
      workspaceId,
      scriptId: asset.id,
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    this.logger.log(`Video job queued: ${result.jobId} (asset: ${asset.id})`);

    return { mediaAssetId: asset.id, jobId: result.jobId };
  }

  /**
   * Convierte un contenido existente (post/carrusel) a video.
   * Soporta tipo KIE ('slides' | 'video' | 'avatar') o legacy HeyGen (sin tipo).
   */
  async convertToVideo(
    editorialRunId: string,
    options?: { mode?: VideoMode; videoType?: KieVideoType },
  ): Promise<{ mediaAssetId: string; jobId: string }> {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
    });

    // Si tiene videoType, usar KIE
    if (options?.videoType) {
      return this.convertToVideoKIE(editorialRunId, run.workspaceId, options.videoType);
    }

    return this.generateVideoFromRun(editorialRunId, run.workspaceId, options);
  }

  /**
   * Genera video vía KIE API.
   * - slides: text-to-video con prompt basado en el contenido (escena visual)
   * - video: text-to-video con prompt cinemático
   * - slides: Renderizado LOCAL con FFmpeg + EdgeTTS (gratis, 0 créditos)
   * - video: text-to-video con KIE API
   * - avatar: TTS → audio URL → KIE avatar con imagen existente
   */
  private async convertToVideoKIE(
    editorialRunId: string,
    workspaceId: string,
    videoType: KieVideoType,
  ): Promise<{ mediaAssetId: string; jobId: string }> {

    // Slides: renderizado local gratuito
    if (videoType === 'slides') {
      return this.renderSlideshowLocal(editorialRunId, workspaceId);
    }

    // Video / Avatar: KIE API (async polling)
    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
    if (!kieApiKey) throw new Error('KIE_AI_API_KEY not configured');

    const adapter = new KieVideoAdapter({ apiKey: kieApiKey });

    // Get content
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: {
          where: { isMain: true },
          take: 1,
          include: {
            mediaAssets: {
              where: { status: 'READY', type: { in: ['IMAGE', 'CAROUSEL_SLIDE'] } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const version = brief.contentVersions[0];
    if (!version) throw new Error(`No main content version for run ${editorialRunId}`);

    const existingImage = version.mediaAssets[0];
    const imageUrl = existingImage?.optimizedUrl ?? existingImage?.originalUrl;
    const contentText = [version.hook, version.copy, brief.cta].filter(Boolean).join('. ');

    let taskId: string;
    let modelUsed: string;

    if (videoType === 'avatar') {
      // Avatar: TTS → upload audio → KIE avatar
      // Use AvatarProfile photo (face image) instead of post image
      let avatarImageUrl = imageUrl;

      const avatarProfile = await this.prisma.avatarProfile.findFirst({
        where: { workspaceId, isDefault: true },
      });

      if (avatarProfile?.photoUrl) {
        avatarImageUrl = avatarProfile.photoUrl;
        this.logger.log(`Using AvatarProfile face: ${avatarProfile.name} (${avatarProfile.id})`);
      } else {
        this.logger.warn('No AvatarProfile found — using post image as avatar face (may fail if not a real face)');
      }

      if (!avatarImageUrl) throw new Error('Se necesita una imagen para generar video con avatar');

      // KIE avatar max audio = 15s → limit text to ~140 chars + speed up TTS
      const narration = contentText.replace(/["\\]/g, ' ').slice(0, 140).replace(/\s\S*$/, '');
      const audioUrl = await this.generateTTSAndUpload(narration, kieApiKey);

      const result = await adapter.generateAvatarVideo(avatarImageUrl, audioUrl, 'natural head movement');
      taskId = result.taskId;
      modelUsed = 'kling/ai-avatar-standard';

    } else {
      // video: text-to-video via KIE
      const prompt = this.buildVideoPrompt('video', version.hook, version.copy, brief.cta);

      const result = await adapter.generateTextToVideo(prompt, {
        duration: '5',
        aspectRatio: '9:16',
      });
      taskId = result.taskId;
      modelUsed = 'kling-2.6/text-to-video';
    }

    // Create MediaAsset
    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId: version.id,
        type: videoType === 'avatar' ? 'AVATAR_VIDEO' : 'VIDEO',
        provider: 'kie',
        status: 'PENDING',
        metadata: {
          kieTaskId: taskId,
          videoType,
          modelUsed,
          contentSnippet: contentText.slice(0, 200),
          startedAt: new Date().toISOString(),
        } as any,
      },
    });

    // Enqueue polling job
    await this.queueService.enqueue(QUEUES.VIDEO, {
      type: 'generate_video',
      jobId: `job_kie_video_${asset.id}`,
      editorialRunId,
      workspaceId,
      scriptId: asset.id,
      timestamp: new Date().toISOString(),
      attempt: 1,
    });

    this.logger.log(`KIE Video job queued: ${taskId} (type=${videoType}, asset=${asset.id})`);
    return { mediaAssetId: asset.id, jobId: taskId };
  }

  /** Build a short video-generation prompt from post content */
  private buildVideoPrompt(type: KieVideoType, hook: string, copy: string, cta: string | null): string {
    const clean = (s: string) => s?.replace(/[#@*_\-\n]/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
    if (type === 'slides') {
      return `Cinematic slow pan and zoom over a professional social media visual. Theme: ${clean(hook)}. Smooth transitions, modern design, vertical format.`.slice(0, 500);
    }
    // type === 'video'
    return `Professional vertical video for social media. Scene: ${clean(hook)}. ${clean(copy).slice(0, 200)}. Modern, engaging, high quality visuals.`.slice(0, 500);
  }

  /**
   * Slideshow local: renderiza video con FFmpeg usando imágenes existentes + EdgeTTS.
   * Costo: 0 créditos. No requiere API externa.
   */
  private async renderSlideshowLocal(
    editorialRunId: string,
    workspaceId: string,
  ): Promise<{ mediaAssetId: string; jobId: string }> {

    // Get content + ALL images
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
    if (!version) throw new Error('No main content version');

    const imageUrls = [...new Set(
      version.mediaAssets
        .map((a: any) => a.optimizedUrl ?? a.originalUrl)
        .filter(Boolean) as string[]
    )];

    if (imageUrls.length === 0) {
      throw new Error('Se necesita al menos una imagen para generar video con slides');
    }

    // Generate TTS narration (free)
    const contentText = [version.hook, version.copy, brief.cta].filter(Boolean).join('. ');
    const voiceAdapter = new EdgeTTSAdapter('es-AR-ElenaNeural');
    let audioDataUrl: string | undefined;

    try {
      const audio = await voiceAdapter.synthesize(contentText.slice(0, 500));
      if (audio.url && audio.url.startsWith('data:')) {
        audioDataUrl = audio.url;
      }
    } catch (err) {
      this.logger.warn(`EdgeTTS failed for slideshow, continuing without audio: ${err}`);
    }

    // Render slideshow locally with FFmpeg
    const renderer = new SlideshowRenderer();
    const slideDuration = Math.max(2, Math.min(5, Math.ceil(15 / imageUrls.length)));

    this.logger.log(`Rendering slideshow: ${imageUrls.length} images, ${slideDuration}s/slide, audio=${!!audioDataUrl}`);

    const result = await renderer.render({
      imageUrls,
      audioDataUrl,
      slideDuration,
      aspectRatio: '9:16',
    });

    // Upload result to Cloudinary
    let videoUrl: string;
    try {
      videoUrl = await this.uploadVideoToCloudinary(result.outputPath);
    } finally {
      await renderer.cleanup(result.tempDir);
    }

    // Create MediaAsset (already READY — no polling needed)
    const asset = await this.prisma.mediaAsset.create({
      data: {
        contentVersionId: version.id,
        type: 'VIDEO',
        provider: 'local-ffmpeg',
        status: 'READY',
        originalUrl: videoUrl,
        optimizedUrl: videoUrl,
        metadata: {
          videoType: 'slides',
          modelUsed: 'ffmpeg-slideshow',
          imageCount: imageUrls.length,
          durationSeconds: result.durationSeconds,
          hasAudio: !!audioDataUrl,
          completedAt: new Date().toISOString(),
        } as any,
      },
    });

    this.logger.log(`Slideshow video ready: ${asset.id} (${result.durationSeconds}s, ${imageUrls.length} images)`);
    return { mediaAssetId: asset.id, jobId: `local_slideshow_${asset.id}` };
  }

  /** Upload a local video file to Cloudinary, or serve locally as fallback */
  private async uploadVideoToCloudinary(filePath: string): Promise<string> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    if (!cloudName || !cloudKey || !cloudSecret) {
      // Fallback: copy to local uploads directory and serve via static assets
      return this.saveVideoLocally(filePath);
    }

    const { readFile } = await import('fs/promises');
    const crypto = await import('crypto');
    const fileBuffer = await readFile(filePath);

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'automatismos/slideshow-videos';
    const params = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(`${params}${cloudSecret}`).digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), 'slideshow.mp4');
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
    this.logger.log(`Slideshow uploaded to Cloudinary: ${data.secure_url}`);
    return data.secure_url;
  }

  /** Save video to local uploads directory (fallback when Cloudinary not configured) */
  private async saveVideoLocally(sourcePath: string): Promise<string> {
    const path = await import('path');
    const fs = await import('fs/promises');
    const crypto = await import('crypto');

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const videoDir = path.join(uploadDir, 'videos');
    await fs.mkdir(videoDir, { recursive: true });

    const filename = `slideshow_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`;
    const destPath = path.join(videoDir, filename);

    await fs.copyFile(sourcePath, destPath);

    // Build URL: served via express.static at /uploads
    const apiUrl = this.config.get<string>('API_PUBLIC_URL', '') || 'http://localhost:3001';
    const videoUrl = `${apiUrl}/uploads/videos/${filename}`;

    this.logger.log(`Slideshow saved locally: ${videoUrl}`);
    return videoUrl;
  }

  /**
   * Generate TTS audio using edge-tts Python CLI, then upload to KIE storage.
   * Returns a publicly accessible URL for the audio file.
   */
  private async generateTTSAndUpload(text: string, kieApiKey: string): Promise<string> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');
    const execFileAsync = promisify(execFile);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-'));
    const outFile = path.join(tmpDir, 'speech.mp3');

    try {
      this.logger.log(`Generating TTS audio with edge-tts (${text.length} chars)`);

      await execFileAsync('python3', [
        '-m', 'edge_tts',
        '--voice', 'es-AR-ElenaNeural',
        '--rate', '+20%',
        '--text', text,
        '--write-media', outFile,
      ], { timeout: 30_000 });

      const audioBuffer = await fs.readFile(outFile);
      this.logger.log(`TTS audio generated: ${audioBuffer.byteLength} bytes`);

      // Upload to KIE free storage
      const rawBase64 = audioBuffer.toString('base64');
      const adapter = new KieVideoAdapter({ apiKey: kieApiKey });
      const audioUrl = await adapter.uploadToKieStorage(rawBase64, 'tts-audio', `tts_${Date.now()}.mp3`);

      return audioUrl;
    } finally {
      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** Save audio data URL to local uploads directory (fallback when Cloudinary not configured) */
  private async saveAudioLocally(audioDataUrl: string): Promise<string> {
    const path = await import('path');
    const fs = await import('fs/promises');
    const crypto = await import('crypto');

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const audioDir = path.join(uploadDir, 'audio');
    await fs.mkdir(audioDir, { recursive: true });

    // Decode base64 data URL → buffer
    const match = audioDataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
    if (!match) {
      this.logger.warn('Audio is not a valid data URL — avatar may fail');
      return audioDataUrl;
    }

    const ext = match[1] === 'mpeg' ? 'mp3' : match[1]!;
    const buffer = Buffer.from(match[2]!, 'base64');
    const filename = `tts_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const destPath = path.join(audioDir, filename);
    await fs.writeFile(destPath, buffer);

    const apiUrl = this.config.get<string>('API_PUBLIC_URL', '') || 'http://localhost:3001';
    const audioUrl = `${apiUrl}/uploads/audio/${filename}`;

    this.logger.warn(`Audio saved locally: ${audioUrl} — KIE needs this URL to be publicly accessible`);
    return audioUrl;
  }

  /**
   * Upload audio data URL to a temporary hosting for KIE to access.
   * Uses Cloudinary raw upload if available, otherwise falls back.
   */
  private async uploadAudioForKIE(audioDataUrl: string, _kieApiKey: string): Promise<string> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const cloudKey = this.config.get<string>('CLOUDINARY_API_KEY', '');
    const cloudSecret = this.config.get<string>('CLOUDINARY_API_SECRET', '');

    if (!cloudName || !cloudKey || !cloudSecret) {
      // No Cloudinary \u2014 upload to KIE's free file storage (Base64)
      this.logger.log('No Cloudinary \u2014 uploading audio to KIE file storage');
      const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
      const adapter = new KieVideoAdapter({ apiKey: kieApiKey });
      // Strip data URL prefix — KIE expects raw base64
      const rawBase64 = audioDataUrl.replace(/^data:[^;]+;base64,/, '');
      return adapter.uploadToKieStorage(rawBase64, 'tts-audio', `tts_${Date.now()}.mp3`);
    }

    // Upload as raw file to Cloudinary
    const crypto = await import('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'automatismos/tts-audio';
    const params = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(`${params}${cloudSecret}`).digest('hex');

    const formData = new FormData();
    formData.append('file', audioDataUrl);
    formData.append('folder', folder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', cloudKey);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Cloudinary audio upload failed: ${err}`);
      throw new Error(`Failed to upload audio for avatar: ${err}`);
    }

    const data = (await res.json()) as { secure_url: string };
    this.logger.log(`Audio uploaded to Cloudinary: ${data.secure_url}`);
    return data.secure_url;
  }

  /**
   * Marca un asset como FAILED con un mensaje de error.
   */
  async markAssetFailed(mediaAssetId: string, error: string): Promise<void> {
    await this.prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: 'FAILED',
        metadata: {
          error,
          failedAt: new Date().toISOString(),
        } as any,
      },
    });
  }

  /**
   * Polling: verifica el estado de un render de video y actualiza el MediaAsset.
   * Soporta tanto KIE (kieTaskId) como legacy pipeline (jobId).
   */
  async pollVideoStatus(mediaAssetId: string): Promise<{
    status: string;
    completed: boolean;
    videoUrl?: string;
  }> {
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({
      where: { id: mediaAssetId },
    });

    const metadata = (asset.metadata ?? {}) as Record<string, unknown>;

    // KIE video path
    const kieTaskId = metadata['kieTaskId'] as string | undefined;
    if (kieTaskId) {
      return this.pollKieVideoStatus(mediaAssetId, metadata, kieTaskId);
    }

    // Legacy HeyGen/pipeline path
    const jobId = metadata['jobId'] as string;

    if (!jobId) {
      return { status: 'failed', completed: true };
    }

    const status = await this.pipeline.checkStatus(jobId);

    if (status.status === 'completed' && status.url) {
      const finalized = await this.pipeline.waitAndFinalize(jobId, 5_000);

      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'READY',
          originalUrl: status.url,
          optimizedUrl: finalized.finalUrl ?? status.url,
          metadata: {
            ...metadata,
            completedAt: new Date().toISOString(),
            cloudinaryPublicId: finalized.cloudinaryPublicId,
          } as any,
        },
      });

      return { status: 'completed', completed: true, videoUrl: finalized.finalUrl ?? status.url };
    }

    if (status.status === 'failed') {
      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'FAILED',
          metadata: {
            ...metadata,
            error: status.error,
            failedAt: new Date().toISOString(),
          } as any,
        },
      });

      return { status: 'failed', completed: true };
    }

    return { status: status.status, completed: false };
  }

  /** Poll KIE video task status (single check) */
  private async pollKieVideoStatus(
    mediaAssetId: string,
    metadata: Record<string, unknown>,
    kieTaskId: string,
  ): Promise<{ status: string; completed: boolean; videoUrl?: string }> {
    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY', '');
    if (!kieApiKey) return { status: 'failed', completed: true };

    const adapter = new KieVideoAdapter({ apiKey: kieApiKey });
    const result = await adapter.checkStatus(kieTaskId);

    if (result.status === 'completed' && result.url) {
      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'READY',
          originalUrl: result.url,
          optimizedUrl: result.url,
          metadata: {
            ...metadata,
            completedAt: new Date().toISOString(),
            videoUrl: result.url,
          } as any,
        },
      });
      return { status: 'completed', completed: true, videoUrl: result.url };
    }

    if (result.status === 'failed') {
      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: 'FAILED',
          metadata: {
            ...metadata,
            error: result.error,
            failedAt: new Date().toISOString(),
          } as any,
        },
      });
      return { status: 'failed', completed: true };
    }

    return { status: 'pending', completed: false };
  }

  // ============================================================
  // Script Preview & Export
  // ============================================================

  /**
   * Genera un preview del script sin renderizar (para Telegram / panel)
   */
  async previewScript(
    editorialRunId: string,
    mode?: VideoMode,
  ): Promise<{
    blocks: Array<{ text: string; duration: number; role: string }>;
    totalDuration: number;
    srt: string;
    templateName: string;
  }> {
    const brief = await this.prisma.contentBrief.findUniqueOrThrow({
      where: { editorialRunId },
      include: {
        contentVersions: { where: { isMain: true }, take: 1 },
      },
    });

    const version = brief.contentVersions[0];
    if (!version) throw new Error('No main content version');

    const videoMode = mode ?? this.inferVideoMode(brief.format, brief.tone);
    const result = this.pipeline.buildScript({
      hook: version.hook,
      copy: version.copy,
      cta: brief.cta,
      mode: videoMode,
    });

    const template = getVideoTemplateForMode(videoMode);

    return {
      ...result,
      templateName: template.name,
    };
  }

  /**
   * Exporta el script como post de texto (reutilización)
   */
  async exportScriptAsPost(
    editorialRunId: string,
    mode?: VideoMode,
  ): Promise<{ caption: string; hashtags: string[] }> {
    const preview = await this.previewScript(editorialRunId, mode);

    const caption = preview.blocks
      .map((b) => {
        if (b.role === 'hook') return `🪝 ${b.text}`;
        if (b.role === 'cta') return `\n👉 ${b.text}`;
        return b.text;
      })
      .join('\n\n');

    return {
      caption,
      hashtags: ['#video', '#contenido', '#automatizado'],
    };
  }

  // ============================================================
  // Queries
  // ============================================================

  async listVideoAssets(workspaceId: string, filters?: { status?: string; limit?: number }) {
    return this.prisma.mediaAsset.findMany({
      where: {
        type: { in: ['VIDEO', 'AVATAR_VIDEO', 'MOTION_GRAPHIC'] },
        status: filters?.status ? (filters.status as any) : undefined,
        contentVersion: {
          brief: {
            editorialRun: { workspaceId },
          },
        },
      },
      include: {
        contentVersion: {
          select: {
            id: true,
            version: true,
            hook: true,
            caption: true,
            brief: {
              select: {
                format: true,
                angle: true,
                editorialRun: { select: { id: true, status: true, date: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });
  }

  async getVideoAsset(id: string) {
    return this.prisma.mediaAsset.findUniqueOrThrow({
      where: { id },
      include: {
        contentVersion: {
          select: {
            id: true,
            version: true,
            hook: true,
            copy: true,
            caption: true,
            brief: {
              select: {
                format: true,
                angle: true,
                tone: true,
                cta: true,
                editorialRun: { select: { id: true, status: true } },
              },
            },
          },
        },
      },
    });
  }

  async getTemplates() {
    return BUILTIN_VIDEO_TEMPLATES;
  }

  // ============================================================
  // Private
  // ============================================================

  private inferVideoMode(format: string, tone: string): VideoMode {
    const f = format.toLowerCase();
    if (f === 'avatar_video') return 'educational';
    if (f === 'hybrid_motion') return 'hybrid_motion';

    // Inferir del tono
    const toneMap: Record<string, VideoMode> = {
      didáctico: 'educational',
      técnico: 'educational',
      aspiracional: 'cta',
      polémico: 'news',
      premium: 'hybrid_motion',
      cercano: 'educational',
      mentor: 'educational',
      vendedor_suave: 'cta',
    };

    return toneMap[tone] ?? 'news';
  }
}
