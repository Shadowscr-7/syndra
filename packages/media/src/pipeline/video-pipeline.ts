// ============================================================
// Video Pipeline — Orquesta el flujo: script → render → subtítulos → guardar
// ============================================================

import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';
import type { VoiceSynthesisAdapter, SynthesizedAudio } from '../adapters/voice-synthesis';
import type { CloudinaryAdapter } from '../adapters/cloudinary';
import {
  type VideoTemplate,
  type VideoMode,
  getVideoTemplateForMode,
  buildScriptFromTemplate,
  generateSRT,
} from '../templates/video-templates';

export interface VideoPipelineConfig {
  videoAdapter: AvatarVideoAdapter;
  voiceAdapter?: VoiceSynthesisAdapter;
  cloudinary?: CloudinaryAdapter;
}

export interface VideoScriptInput {
  hook: string;
  copy: string;
  cta: string;
  /** Modo de video — determina template y estructura */
  mode: VideoMode;
  /** Sobreescribir template */
  templateId?: string;
}

export interface VideoPipelineResult {
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string;
  subtitlesSRT?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  mode: VideoMode;
  scriptBlocks: Array<{ text: string; duration: number; role: string }>;
  metadata: Record<string, unknown>;
}

/**
 * Pipeline de video que orquesta:
 * 1. Selección de template según modo
 * 2. Generación del script estructurado
 * 3. Envío a HeyGen (o mock) para render con avatar
 * 4. Generación de subtítulos SRT
 * 5. Upload a Cloudinary (si disponible)
 */
export class VideoPipeline {
  private readonly videoAdapter: AvatarVideoAdapter;
  private readonly voiceAdapter?: VoiceSynthesisAdapter;
  private readonly cloudinary?: CloudinaryAdapter;

  constructor(config: VideoPipelineConfig) {
    this.videoAdapter = config.videoAdapter;
    this.voiceAdapter = config.voiceAdapter;
    this.cloudinary = config.cloudinary;
  }

  /**
   * Genera un video completo desde contenido editorial.
   * Retorna el jobId para polling posterior.
   */
  async generateVideo(
    input: VideoScriptInput,
    options?: VideoGenOptions,
  ): Promise<VideoPipelineResult> {
    // 1. Seleccionar template
    const template = getVideoTemplateForMode(input.mode);

    // 2. Construir script estructurado
    const { blocks, totalDuration } = buildScriptFromTemplate(template, {
      hook: input.hook,
      copy: input.copy,
      cta: input.cta,
    });

    // 3. Crear VideoScript para el adapter
    const videoScript: VideoScript = {
      blocks: blocks.map((b) => ({ text: b.text, duration: b.duration })),
      totalDuration,
    };

    // 4. Generar voz si hay adapter de TTS disponible (opcional, HeyGen tiene TTS integrado)
    let voiceAudio: SynthesizedAudio | undefined;
    if (this.voiceAdapter) {
      const fullText = blocks.map((b) => b.text).join('. ');
      voiceAudio = await this.voiceAdapter.synthesize(fullText, {
        language: options?.language ?? 'es',
      });
    }

    // 5. Enviar a render (HeyGen / Mock)
    const genResult: GeneratedVideo = await this.videoAdapter.generate(videoScript, {
      aspectRatio: options?.aspectRatio ?? template.aspectRatio,
      voiceId: options?.voiceId,
      avatarId: options?.avatarId,
      language: options?.language ?? 'es',
      outputFormat: options?.outputFormat ?? 'mp4',
    });

    // 6. Generar subtítulos SRT
    const subtitlesSRT = generateSRT(blocks);

    return {
      jobId: genResult.jobId,
      status: { status: genResult.status === 'queued' ? 'queued' : 'rendering', progress: 0 },
      durationSeconds: totalDuration,
      mode: input.mode,
      scriptBlocks: blocks,
      subtitlesSRT,
      metadata: {
        templateId: template.id,
        templateName: template.name,
        avatarConfig: template.avatarConfig,
        subtitleStyle: template.subtitleStyle,
        overlays: template.overlays,
        voiceProvider: voiceAudio?.provider ?? 'heygen-builtin',
        voiceDurationMs: voiceAudio?.durationMs,
      },
    };
  }

  /**
   * Polling del estado del video
   */
  async checkStatus(jobId: string): Promise<VideoJobStatus> {
    return this.videoAdapter.getStatus(jobId);
  }

  /**
   * Espera a que el video esté listo y sube a Cloudinary si disponible
   */
  async waitAndFinalize(jobId: string, timeoutMs = 600_000): Promise<{
    status: VideoJobStatus;
    finalUrl?: string;
    cloudinaryPublicId?: string;
  }> {
    const start = Date.now();
    let delay = 5_000;

    while (Date.now() - start < timeoutMs) {
      const status = await this.videoAdapter.getStatus(jobId);

      if (status.status === 'completed' && status.url) {
        // Upload a Cloudinary si disponible
        let finalUrl = status.url;
        let cloudinaryPublicId: string | undefined;

        if (this.cloudinary) {
          try {
            const uploaded = await this.cloudinary.upload(status.url, 'automatismos/videos');
            cloudinaryPublicId = uploaded.publicId;
            finalUrl = uploaded.secureUrl;
          } catch {
            // Si falla Cloudinary, usar URL directa
          }
        }

        return { status, finalUrl, cloudinaryPublicId };
      }

      if (status.status === 'failed') {
        return { status };
      }

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 30_000);
    }

    return {
      status: { status: 'failed', error: 'Timeout waiting for video render' },
    };
  }

  /**
   * Genera un script de video a partir del contenido sin renderizar.
   * Útil para previsualizar o exportar como texto.
   */
  buildScript(
    input: VideoScriptInput,
  ): { blocks: Array<{ text: string; duration: number; role: string }>; totalDuration: number; srt: string } {
    const template = getVideoTemplateForMode(input.mode);
    const { blocks, totalDuration } = buildScriptFromTemplate(template, {
      hook: input.hook,
      copy: input.copy,
      cta: input.cta,
    });
    const srt = generateSRT(blocks);
    return { blocks, totalDuration, srt };
  }
}
