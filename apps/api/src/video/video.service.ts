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
  type AvatarVideoAdapter,
  type VoiceSynthesisAdapter,
  type VideoMode,
  type VideoPipelineResult,
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
   * Llamado desde Telegram cuando el usuario presiona "Convertir a video".
   */
  async convertToVideo(
    editorialRunId: string,
    options?: { mode?: VideoMode },
  ): Promise<{ mediaAssetId: string; jobId: string }> {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: editorialRunId },
    });

    return this.generateVideoFromRun(editorialRunId, run.workspaceId, options);
  }

  /**
   * Polling: verifica el estado de un render de video y actualiza el MediaAsset.
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
    const jobId = metadata['jobId'] as string;

    if (!jobId) {
      return { status: 'failed', completed: true };
    }

    const status = await this.pipeline.checkStatus(jobId);

    if (status.status === 'completed' && status.url) {
      // Finalizar: subir a Cloudinary si disponible
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

    // Still rendering
    return {
      status: status.status,
      completed: false,
    };
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
