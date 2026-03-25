// ============================================================
// Video Compositor Service — Orquesta la creación de videos Pro
// Combina: imágenes + TTS (EdgeTTS) + música (Suno/Kie) + subtítulos
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { ProVideoRenderer } from '@automatismos/media';
import { EdgeTTSAdapter } from '@automatismos/media';
import { KieMusicAdapter } from '@automatismos/media';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

export interface CompositorInput {
  workspaceId: string;
  userId: string;

  // Images (IDs from user-media or URLs)
  imageIds?: string[];
  imageUrls?: string[];

  // Video config
  aspectRatio?: '9:16' | '16:9' | '1:1';

  // Narration
  narrationText?: string;
  voiceId?: string;         // es-AR-ElenaNeural, es-MX-DaliaNeural, etc.
  voiceSpeed?: 'slow' | 'normal' | 'fast';
  voiceTone?: 'low' | 'normal' | 'high';

  // Subtitles
  enableSubtitles?: boolean;

  // Music
  enableMusic?: boolean;
  musicStyle?: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';

  // Product mode
  mode?: 'general' | 'product';
  logoId?: string;
  productImageId?: string;
  productName?: string;
  productPrice?: string;
  productCta?: string;
}

export interface CompositorResult {
  videoUrl: string;
  durationSeconds: number;
  hasAudio: boolean;
  hasSubtitles: boolean;
  hasMusic: boolean;
  creditsUsed: number;
}

// ── Available voices ──
export const AVAILABLE_VOICES = [
  { id: 'es-AR-ElenaNeural', label: 'Elena (Argentina)', gender: 'F' },
  { id: 'es-AR-TomasNeural', label: 'Tomás (Argentina)', gender: 'M' },
  { id: 'es-ES-ElviraNeural', label: 'Elvira (España)', gender: 'F' },
  { id: 'es-ES-AlvaroNeural', label: 'Álvaro (España)', gender: 'M' },
  { id: 'es-MX-DaliaNeural', label: 'Dalia (México)', gender: 'F' },
  { id: 'es-MX-JorgeNeural', label: 'Jorge (México)', gender: 'M' },
  { id: 'es-CO-GonzaloNeural', label: 'Gonzalo (Colombia)', gender: 'M' },
  { id: 'es-CO-SalomeNeural', label: 'Salomé (Colombia)', gender: 'F' },
];

@Injectable()
export class VideoCompositorService {
  private readonly logger = new Logger(VideoCompositorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credits: CreditService,
  ) {}

  async render(input: CompositorInput): Promise<CompositorResult> {
    const { workspaceId, userId } = input;

    // 1. Calculate total credit cost
    let totalCredits = 3; // Base compositor cost
    if (input.enableMusic) totalCredits += 3; // Suno music

    // 2. Check credits
    const hasCredits = await this.credits.hasEnoughCredits(workspaceId, totalCredits);
    if (!hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necesitas ${totalCredits} créditos.`,
      );
    }

    this.logger.log(`Starting compositor render: ${totalCredits} credits, mode=${input.mode ?? 'general'}`);

    try {
      // 3. Resolve image URLs from IDs
      const imageUrls = await this.resolveImageUrls(input, userId);
      if (imageUrls.length === 0) {
        throw new BadRequestException('Se necesita al menos una imagen');
      }
      if (imageUrls.length > 10) {
        throw new BadRequestException('Máximo 10 imágenes por video');
      }

      // 4. Generate TTS audio
      let ttsAudioUrl: string | undefined;
      if (input.narrationText?.trim()) {
        ttsAudioUrl = await this.generateTTS(input);
      }

      // 5. Generate music (Suno via Kie)
      let musicAudioUrl: string | undefined;
      if (input.enableMusic) {
        musicAudioUrl = await this.generateMusic(input.musicStyle ?? 'upbeat');
      }

      // 6. Generate SRT subtitles
      let srtContent: string | undefined;
      if (input.enableSubtitles && input.narrationText?.trim()) {
        srtContent = this.generateSRT(input.narrationText);
      }

      // 7. Resolve logo URL
      let logoUrl: string | undefined;
      if (input.logoId) {
        logoUrl = await this.resolveMediaUrl(input.logoId, userId);
      }

      // 8. Build product overlay
      let productOverlay: { name?: string; price?: string; cta?: string } | undefined;
      if (input.mode === 'product') {
        productOverlay = {
          name: input.productName,
          price: input.productPrice,
          cta: input.productCta,
        };
      }

      // 9. Render with ProVideoRenderer
      const renderer = new ProVideoRenderer();
      const result = await renderer.render({
        imageUrls,
        aspectRatio: input.aspectRatio ?? '9:16',
        ttsAudioUrl,
        musicAudioUrl,
        musicVolume: 0.25,
        srtContent,
        logoUrl,
        productOverlay,
        maxDuration: 60,
      });

      // 10. Upload to Cloudinary or save locally
      let videoUrl: string;
      try {
        videoUrl = await this.uploadVideo(result.outputPath);
      } finally {
        await renderer.cleanup(result.tempDir);
      }

      // 11. Consume credits
      await this.credits.consumeCredits(
        workspaceId,
        'VIDEO_COMPOSITOR',
        `Video compositor: ${imageUrls.length} imágenes, ${result.durationSeconds}s`,
      );
      if (input.enableMusic) {
        await this.credits.consumeCredits(
          workspaceId,
          'MUSIC_BACKGROUND',
          'Música de fondo (Suno) para video compositor',
        );
      }

      // 12. Create VideoRenderJob record
      await this.prisma.videoRenderJob.create({
        data: {
          workspaceId,
          tier: 'MVP' as any,
          provider: 'COMPOSITOR' as any,
          inputType: 'COMPOSITOR' as any,
          inputPayload: {
            imageCount: imageUrls.length,
            mode: input.mode ?? 'general',
            hasNarration: !!ttsAudioUrl,
            hasMusic: !!musicAudioUrl,
            hasSubtitles: !!srtContent,
          } as any,
          status: 'COMPLETED',
          outputUrl: videoUrl,
          durationSeconds: Math.round(result.durationSeconds),
          aspectRatio: input.aspectRatio ?? '9:16',
          creditsUsed: totalCredits,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      this.logger.log(`Compositor video ready: ${videoUrl} (${result.durationSeconds}s, ${totalCredits} credits)`);

      return {
        videoUrl,
        durationSeconds: result.durationSeconds,
        hasAudio: result.hasAudio,
        hasSubtitles: result.hasSubtitles,
        hasMusic: result.hasMusic,
        creditsUsed: totalCredits,
      };
    } catch (error: any) {
      this.logger.error(`Compositor render failed: ${error.message}`);
      throw error;
    }
  }

  // ── Resolve image URLs ──

  private async resolveImageUrls(input: CompositorInput, userId: string): Promise<string[]> {
    const urls: string[] = [];

    // If product mode, put product image first and logo image
    if (input.mode === 'product' && input.productImageId) {
      const productUrl = await this.resolveMediaUrl(input.productImageId, userId);
      if (productUrl) urls.push(productUrl);
    }

    // Resolve IDs from user-media
    if (input.imageIds?.length) {
      for (const id of input.imageIds) {
        const url = await this.resolveMediaUrl(id, userId);
        if (url) urls.push(url);
      }
    }

    // Add direct URLs
    if (input.imageUrls?.length) {
      urls.push(...input.imageUrls.filter(Boolean));
    }

    return [...new Set(urls)]; // deduplicate
  }

  private async resolveMediaUrl(mediaId: string, userId: string): Promise<string | undefined> {
    const media = await this.prisma.userMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.userId !== userId) return undefined;

    const url = media.url;
    // If it's a relative upload path, make it absolute for server-side fetch
    if (url.startsWith('/uploads/')) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      const localPath = path.join(uploadDir, url.replace('/uploads/', ''));
      if (fs.existsSync(localPath)) return localPath;
    }
    return url;
  }

  // ── TTS ──

  private async generateTTS(input: CompositorInput): Promise<string> {
    const voiceId = input.voiceId ?? 'es-AR-ElenaNeural';
    const adapter = new EdgeTTSAdapter(voiceId);

    const text = input.narrationText!.slice(0, 1000);

    // Map speed: slow=0.85, normal=1.0, fast=1.2
    let speed = 1.0;
    if (input.voiceSpeed === 'slow') speed = 0.85;
    else if (input.voiceSpeed === 'fast') speed = 1.2;

    // Map pitch: low=0.9, normal=1.0, high=1.1
    let pitch = 1.0;
    if (input.voiceTone === 'low') pitch = 0.9;
    else if (input.voiceTone === 'high') pitch = 1.1;

    this.logger.log(`Generating TTS: voice=${voiceId}, ${text.length} chars`);
    const audio = await adapter.synthesize(text, { voiceId, speed, pitch });

    if (!audio.url) throw new Error('TTS generation failed: no audio URL returned');
    return audio.url; // data:audio/mp3;base64,...
  }

  // ── Music (Suno via Kie) ──

  private async generateMusic(style: string): Promise<string | undefined> {
    const kieApiKey = this.config.get<string>('KIE_API_KEY');
    if (!kieApiKey) {
      this.logger.warn('KIE_API_KEY not set, skipping music generation');
      return undefined;
    }

    try {
      const adapter = new KieMusicAdapter({
        apiKey: kieApiKey,
        baseUrl: this.config.get<string>('KIE_API_BASE_URL') ?? 'https://api.kieai.com',
      });

      this.logger.log(`Generating music: style=${style}`);
      const result = await adapter.generateAndWait({
        style: style as any,
        instrumental: true,
        model: 'V4',
      });

      if (result.audioUrl) {
        return result.audioUrl;
      }

      this.logger.warn('Music generation returned no audio URL');
      return undefined;
    } catch (error: any) {
      this.logger.error(`Music generation failed: ${error.message}`);
      return undefined; // Non-fatal — continue without music
    }
  }

  // ── Subtitles (SRT) ──

  private generateSRT(text: string): string {
    // Split text into sentences
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return '';

    // Estimate ~150 words per minute reading speed
    const totalWords = text.split(/\s+/).length;
    const estimatedDuration = Math.max(5, (totalWords / 150) * 60);
    const timePerSentence = estimatedDuration / sentences.length;

    const lines: string[] = [];
    let currentTime = 0;

    sentences.forEach((sentence, i) => {
      const start = this.formatSRTTime(currentTime);
      currentTime += timePerSentence;
      const end = this.formatSRTTime(currentTime);

      lines.push(`${i + 1}`);
      lines.push(`${start} --> ${end}`);
      lines.push(sentence);
      lines.push('');
    });

    return lines.join('\n');
  }

  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  // ── Upload ──

  private async uploadVideo(localPath: string): Promise<string> {
    // Try Cloudinary first
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

        const result = await cloudinary.uploader.upload(localPath, {
          resource_type: 'video',
          folder: 'syndra/videos/compositor',
          format: 'mp4',
        });
        return result.secure_url;
      } catch (err: any) {
        this.logger.warn(`Cloudinary upload failed, saving locally: ${err.message}`);
      }
    }

    // Fallback: save locally
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const videoDir = path.join(uploadDir, 'videos');
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const filename = `compositor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
    const destPath = path.join(videoDir, filename);
    fs.copyFileSync(localPath, destPath);

    return `/uploads/videos/${filename}`;
  }
}
