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
import { KieMusicAdapter, KieImageProAdapter } from '@automatismos/media';
import { OpenAIAdapter } from '@automatismos/ai';
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

      // 4. Generate TTS audio (with word-level subtitle timing)
      let ttsAudioUrl: string | undefined;
      let ttsVtt: string | undefined;
      if (input.narrationText?.trim()) {
        const ttsResult = await this.generateTTS(input);
        ttsAudioUrl = ttsResult.url;
        ttsVtt = ttsResult.subtitlesVtt;
      }

      // 5. Generate music (Suno via Kie)
      let musicAudioUrl: string | undefined;
      if (input.enableMusic) {
        musicAudioUrl = await this.generateMusic(input.musicStyle ?? 'upbeat');
      }

      // 6. Generate SRT subtitles — prefer real timing from TTS, fallback to estimated
      let srtContent: string | undefined;
      if (input.enableSubtitles && input.narrationText?.trim()) {
        if (ttsVtt) {
          srtContent = this.vttToGroupedSRT(ttsVtt);
          this.logger.log(`Using word-level VTT subtitles (${srtContent.split('\n\n').length} segments)`);
        } else {
          srtContent = this.generateSRT(input.narrationText);
          this.logger.log('Using estimated SRT subtitles (no VTT available)');
        }
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

      // 9. Render with ProVideoRenderer — duration follows narration length
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

  private async generateTTS(input: CompositorInput): Promise<{ url: string; subtitlesVtt?: string }> {
    const voiceId = input.voiceId ?? 'es-AR-ElenaNeural';
    const adapter = new EdgeTTSAdapter(voiceId);

    const text = input.narrationText!.slice(0, 2000);

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
    return { url: audio.url, subtitlesVtt: audio.subtitlesVtt };
  }

  // ── Music (Suno via Kie) ──

  private async generateMusic(style: string): Promise<string | undefined> {
    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY');
    if (!kieApiKey) {
      this.logger.warn('KIE_AI_API_KEY not set, skipping music generation');
      return undefined;
    }

    try {
      const adapter = new KieMusicAdapter({
        apiKey: kieApiKey,
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

  /**
   * Convert edge-tts VTT (word-level cues) to grouped SRT (3-5 words per caption).
   * This creates an animated caption effect synced with actual speech timing.
   */
  private vttToGroupedSRT(vtt: string): string {
    // Parse VTT cues: each line has a timestamp range and one or more words
    const cueRegex = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n(.+)/g;
    const cues: { start: string; end: string; text: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = cueRegex.exec(vtt)) !== null) {
      cues.push({ start: match[1]!, end: match[2]!, text: match[3]!.trim() });
    }

    if (cues.length === 0) return '';

    // Group cues into chunks of 3-5 words for readability
    const WORDS_PER_GROUP = 4;
    const groups: { start: string; end: string; text: string }[] = [];
    let currentWords: string[] = [];
    let groupStart = cues[0]!.start;

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]!;
      const words = cue.text.split(/\s+/);
      currentWords.push(...words);

      if (currentWords.length >= WORDS_PER_GROUP || i === cues.length - 1) {
        groups.push({
          start: groupStart,
          end: cue.end,
          text: currentWords.join(' '),
        });
        currentWords = [];
        if (i + 1 < cues.length) groupStart = cues[i + 1]!.start;
      }
    }

    // Convert to SRT format (timestamps: HH:MM:SS,mmm)
    return groups.map((g, i) => {
      const srtStart = g.start.replace('.', ',');
      const srtEnd = g.end.replace('.', ',');
      return `${i + 1}\n${srtStart} --> ${srtEnd}\n${g.text}`;
    }).join('\n\n') + '\n';
  }

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

  // ── Generate Image (Kie Ideogram) ──

  async generateImage(opts: {
    userId: string;
    workspaceId: string;
    prompt: string;
    language: 'es' | 'en';
    includeText: boolean;
    aspectRatio: string;
  }): Promise<{ success: boolean; imageUrl: string; userMediaId: string }> {
    const apiKey = this.config.get<string>('KIE_AI_API_KEY');
    if (!apiKey) throw new BadRequestException('KIE_AI_API_KEY no configurada');

    // Check credits (IMAGE_PRO_TEXT = 4 credits for Ideogram V3)
    const hasCredits = await this.credits.hasEnoughCredits(opts.workspaceId, 4);
    if (!hasCredits) throw new BadRequestException('Créditos insuficientes. Necesitas 4 créditos.');

    // Build prompt with language context
    let finalPrompt = opts.prompt;
    if (opts.includeText && opts.language === 'es') {
      finalPrompt += '. All text within the image must be in Spanish (español).';
    } else if (opts.includeText && opts.language === 'en') {
      finalPrompt += '. All text within the image must be in English.';
    }
    if (!opts.includeText) {
      finalPrompt += '. Do NOT include any text, letters, numbers, or typography within the image.';
    }

    const adapter = new KieImageProAdapter({
      apiKey,
      modelId: 'ideogram/v3-text-to-image',
    });

    // Map aspect ratio to Ideogram V3 image_size values
    const sizeMap: Record<string, string> = {
      '9:16': 'portrait_16_9',
      '16:9': 'landscape_16_9',
      '1:1': 'square_hd',
    };

    this.logger.log(`Generating image: user=${opts.userId}, ws=${opts.workspaceId}, prompt="${opts.prompt.slice(0, 80)}...", lang=${opts.language}, text=${opts.includeText}`);

    try {
      const result = await adapter.generate(finalPrompt, {
        imageSize: sizeMap[opts.aspectRatio] || 'square_hd',
      });

      if (!result.url) throw new BadRequestException('La generación de imagen falló — sin URL');

      // Save as UserMedia
      const userMedia = await this.prisma.userMedia.create({
        data: {
          userId: opts.userId,
          filename: `ideogram_${Date.now()}.png`,
          url: result.url,
          thumbnailUrl: result.url,
          mimeType: 'image/png',
          sizeBytes: 0,
          category: 'BACKGROUND' as any,
          tags: ['video-compositor', 'ai-generated'],
        },
      });

      // Consume credits (IMAGE_PRO_TEXT = 4 for Ideogram V3)
      await this.credits.consumeCredits(opts.workspaceId, 'IMAGE_PRO_TEXT', 'Ideogram V3 image for video compositor');

      return { success: true, imageUrl: result.url, userMediaId: userMedia.id };
    } catch (error: any) {
      this.logger.error(`Image generation failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Error generando imagen: ${error.message}`);
    }
  }

  // ── Improve narration with AI ──

  async improveNarration(text: string, intent: string): Promise<{ improved: string }> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    const baseUrl = this.config.get<string>('LLM_BASE_URL');
    if (!apiKey) throw new BadRequestException('LLM_API_KEY no configurada');

    const adapter = new OpenAIAdapter({
      apiKey,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const intentMap: Record<string, string> = {
      vender: 'persuasivo y orientado a ventas, destacando beneficios y creando urgencia',
      educar: 'educativo y didáctico, explicando conceptos de forma clara y accesible',
      entretener: 'entretenido y dinámico, con humor ligero y enganche emocional',
      inspirar: 'inspirador y motivacional, con frases poderosas que muevan a la acción',
      informar: 'informativo y profesional, con datos concretos y lenguaje claro',
      storytelling: 'narrativo tipo storytelling, contando una historia que atrape al espectador',
    };

    const toneDesc = intentMap[intent] || intent;

    const improved = await adapter.chat([
      {
        role: 'system',
        content: `Eres un experto copywriter para videos de redes sociales. Tu trabajo es mejorar narrativas para que suenen profesionales, naturales y efectivas como narración de video. El tono debe ser: ${toneDesc}. Responde SOLO con el texto mejorado, sin explicaciones ni comillas. Mantén una extensión similar al original (máximo 20% más largo). El idioma debe ser español.`,
      },
      {
        role: 'user',
        content: text,
      },
    ], { temperature: 0.7, maxTokens: 500 });

    return { improved: improved.trim() };
  }
}
