// ============================================================
// Video Compositor Service — Orquesta la creación de videos Pro
// Combina: imágenes + TTS (EdgeTTS) + música (Suno/Kie) + subtítulos
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { RemotionVideoRenderer } from '@automatismos/media';
import type { SubtitleGroupInput, ImageSlideInput } from '@automatismos/media';
import { EdgeTTSAdapter } from '@automatismos/media';
import { PiperTTSAdapter } from '@automatismos/media';
import { KieMusicAdapter, KieImageProAdapter } from '@automatismos/media';
import { OpenAIAdapter } from '@automatismos/ai';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

export interface CompositorSlideInput {
  mediaId?: string;        // UserMedia ID
  url?: string;            // Direct URL
  role?: 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
  order?: number;
  durationMs?: number;
  animation?: 'ken-burns-in' | 'ken-burns-out' | 'pan-left' | 'pan-right' | 'zoom-pulse' | 'none' | 'auto';
  caption?: string;
}

export interface CompositorInput {
  workspaceId: string;
  userId: string;

  // Images (legacy flat mode)
  imageIds?: string[];
  imageUrls?: string[];

  // Storyboard mode (takes priority over imageIds/imageUrls)
  imageSlides?: CompositorSlideInput[];

  // Video config
  aspectRatio?: '9:16' | '16:9' | '1:1';

  // Narration
  narrationText?: string;
  voiceId?: string;         // es-AR-ElenaNeural, es-MX-DaliaNeural, etc.
  voiceSpeed?: 'slow' | 'normal' | 'fast';
  voiceTone?: 'low' | 'normal' | 'high';
  voiceEngine?: 'edge' | 'piper';

  // Subtitles
  enableSubtitles?: boolean;
  subtitleStyle?: 'pill' | 'minimal' | 'word-by-word' | 'karaoke';

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
      // 3. Resolve slides (storyboard mode) or flat image URLs
      let slides: ImageSlideInput[] | undefined;
      let imageUrls: string[];

      if (input.imageSlides?.length) {
        slides = await this.resolveSlides(input.imageSlides, userId);
        imageUrls = slides.map(s => s.url);
      } else {
        imageUrls = await this.resolveImageUrls(input, userId);
      }

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

      // 6. Parse subtitle timing from VTT → SubtitleGroupInput[] for Remotion
      let subtitleGroups: SubtitleGroupInput[] = [];
      if (input.enableSubtitles && input.narrationText?.trim() && ttsVtt) {
        subtitleGroups = this.vttToSubtitleGroups(ttsVtt);
        this.logger.log(`Parsed ${subtitleGroups.length} subtitle groups from VTT`);
      } else if (input.enableSubtitles && input.narrationText?.trim()) {
        subtitleGroups = this.estimateSubtitleGroups(input.narrationText);
        this.logger.log(`Estimated ${subtitleGroups.length} subtitle groups (no VTT)`);
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

      // 9. Render with Remotion — duration follows narration length
      const renderer = new RemotionVideoRenderer();

      // Calculate TTS duration from VTT or estimation
      let ttsDurationMs: number | undefined;
      if (ttsVtt) {
        ttsDurationMs = this.getVttDurationMs(ttsVtt);
      } else if (input.narrationText) {
        const words = input.narrationText.split(/\s+/).length;
        ttsDurationMs = Math.round((words / 150) * 60 * 1000); // ~150 WPM
      }

      const result = await renderer.render({
        images: slides ? undefined : imageUrls,
        slides: slides,
        aspectRatio: input.aspectRatio ?? '9:16',
        ttsAudioUrl: ttsAudioUrl,
        musicAudioUrl: musicAudioUrl,
        musicVolume: 0.25,
        subtitleGroups,
        subtitleStyle: input.subtitleStyle,
        logoUrl,
        productOverlay,
        ttsDurationMs,
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
            hasSubtitles: subtitleGroups.length > 0,
            renderer: 'remotion',
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
        hasAudio: !!ttsAudioUrl,
        hasSubtitles: subtitleGroups.length > 0,
        hasMusic: !!musicAudioUrl,
        creditsUsed: totalCredits,
      };
    } catch (error: any) {
      this.logger.error(`Compositor render failed: ${error.message}`);
      throw error;
    }
  }

  // ── Resolve storyboard slides ──

  private async resolveSlides(slides: CompositorSlideInput[], userId: string): Promise<ImageSlideInput[]> {
    const resolved: ImageSlideInput[] = [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]!;
      let url: string | undefined;

      if (s.mediaId) {
        url = await this.resolveMediaUrl(s.mediaId, userId);
      } else if (s.url) {
        url = s.url;
      }

      if (!url) continue;

      resolved.push({
        url,
        role: s.role ?? 'slide',
        order: s.order ?? i,
        durationMs: s.durationMs,
        animation: s.animation,
        caption: s.caption,
      });
    }

    return resolved.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
    const text = input.narrationText!.slice(0, 2000);

    // Map speed: slow=0.85, normal=1.0, fast=1.2
    let speed = 1.0;
    if (input.voiceSpeed === 'slow') speed = 0.85;
    else if (input.voiceSpeed === 'fast') speed = 1.2;

    // Map pitch: low=0.9, normal=1.0, high=1.1
    let pitch = 1.0;
    if (input.voiceTone === 'low') pitch = 0.9;
    else if (input.voiceTone === 'high') pitch = 1.1;

    // Try Piper first if requested or if available
    if (input.voiceEngine === 'piper' && PiperTTSAdapter.isAvailable()) {
      try {
        this.logger.log(`Generating TTS with Piper: voice=${voiceId}, ${text.length} chars`);
        const piper = new PiperTTSAdapter();
        const audio = await piper.synthesize(text, { voiceId, speed });
        if (audio.url) return { url: audio.url, subtitlesVtt: audio.subtitlesVtt };
      } catch (err: any) {
        this.logger.warn(`Piper TTS failed, falling back to Edge TTS: ${err.message}`);
      }
    }

    // Default: Edge TTS
    const adapter = new EdgeTTSAdapter(voiceId);
    this.logger.log(`Generating TTS with Edge: voice=${voiceId}, ${text.length} chars`);
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
   * Convert edge-tts VTT (word-level cues) to SubtitleGroupInput[] for Remotion.
   * Groups words into 3-5 word segments with precise ms timing.
   */
  private vttToSubtitleGroups(vtt: string): SubtitleGroupInput[] {
    const cueRegex = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n(.+)/g;
    const cues: { startMs: number; endMs: number; text: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = cueRegex.exec(vtt)) !== null) {
      cues.push({
        startMs: this.timeToMs(match[1]!),
        endMs: this.timeToMs(match[2]!),
        text: match[3]!.trim(),
      });
    }

    if (cues.length === 0) return [];

    const WORDS_PER_GROUP = 4;
    const groups: SubtitleGroupInput[] = [];
    let currentWords: string[] = [];
    let groupStartMs = cues[0]!.startMs;

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]!;
      const words = cue.text.split(/\s+/);
      currentWords.push(...words);

      if (currentWords.length >= WORDS_PER_GROUP || i === cues.length - 1) {
        groups.push({
          startMs: groupStartMs,
          endMs: cue.endMs,
          text: currentWords.join(' '),
        });
        currentWords = [];
        if (i + 1 < cues.length) groupStartMs = cues[i + 1]!.startMs;
      }
    }

    return groups;
  }

  /**
   * Estimate subtitle groups when no VTT is available (fallback).
   */
  private estimateSubtitleGroups(text: string): SubtitleGroupInput[] {
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return [];

    const totalWords = text.split(/\s+/).length;
    const estimatedDuration = Math.max(5, (totalWords / 150) * 60) * 1000; // ms
    const timePerSentence = estimatedDuration / sentences.length;

    let currentMs = 0;
    return sentences.map((sentence) => {
      const startMs = currentMs;
      currentMs += timePerSentence;
      return { startMs, endMs: currentMs, text: sentence };
    });
  }

  /**
   * Get total VTT duration in ms from the last cue's end time.
   */
  private getVttDurationMs(vtt: string): number {
    const timeRegex = /-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/g;
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(vtt)) !== null) {
      lastEnd = this.timeToMs(match[1]!);
    }
    return lastEnd;
  }

  private timeToMs(timestamp: string): number {
    const parts = timestamp.split(':');
    const h = parseInt(parts[0]!, 10);
    const m = parseInt(parts[1]!, 10);
    const [s, ms] = parts[2]!.split('.');
    return h * 3600000 + m * 60000 + parseInt(s!, 10) * 1000 + parseInt(ms!, 10);
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

  // ── Generate full video script with AI ──

  async generateScript(input: {
    topic: string;
    intent: string;
    targetPlatform: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
    duration?: number;
    language?: string;
    productInfo?: { name?: string; price?: string; features?: string };
  }): Promise<{
    narration: string;
    imagePrompts: string[];
    musicStyle: string;
    subtitleStyle: string;
    preset: string;
  }> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    const baseUrl = this.config.get<string>('LLM_BASE_URL');
    if (!apiKey) throw new BadRequestException('LLM_API_KEY no configurada');

    const adapter = new OpenAIAdapter({
      apiKey,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const lang = input.language ?? 'es';
    const dur = input.duration ?? 30;
    const slideCount = Math.max(3, Math.min(8, Math.round(dur / 4)));

    const platformGuides: Record<string, string> = {
      reels: `Instagram Reels: Hook potente en los primeros 3 segundos. Ritmo rápido, frases cortas. CTA final claro (link en bio, guardá, compartí). Máximo ${dur}s.`,
      tiktok: `TikTok: Empezar con algo impactante o una pregunta. Ritmo muy dinámico, lenguaje coloquial. Usar trends cuando sea posible. CTA: seguí para más. Máximo ${dur}s.`,
      stories: `Instagram Stories: Tono personal y cercano. Hacer preguntas al espectador. Swipe-up o link CTA. Segmentos cortos (3-5s). Máximo ${dur}s.`,
      'youtube-shorts': `YouTube Shorts: Valor rápido, educativo o entretenido. Empezar con "¿Sabías que..." o dato impactante. CTA: suscribite. Máximo ${dur}s.`,
    };

    const intentMap: Record<string, string> = {
      vender: 'vender un producto o servicio, destacando beneficios y creando urgencia',
      educar: 'educar al espectador, explicando conceptos de forma clara',
      entretener: 'entretener con contenido dinámico y enganche emocional',
      inspirar: 'inspirar y motivar con un mensaje poderoso',
      informar: 'informar con datos concretos y lenguaje profesional',
      storytelling: 'contar una historia que atrape al espectador',
    };

    const productContext = input.productInfo
      ? `\nProducto/Servicio: ${input.productInfo.name ?? 'N/A'}. Precio: ${input.productInfo.price ?? 'N/A'}. Características: ${input.productInfo.features ?? 'N/A'}.`
      : '';

    const systemPrompt = `Eres un experto creador de guiones para videos cortos de redes sociales.

Plataforma: ${platformGuides[input.targetPlatform] ?? platformGuides.reels}

Intención: ${intentMap[input.intent] ?? input.intent}${productContext}

Idioma: ${lang === 'es' ? 'Español' : 'English'}

Genera un guión completo para un video sobre el tema dado. Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional) con esta estructura:
{
  "narration": "Texto completo de narración (${dur}s aprox, natural para voz)",
  "imagePrompts": ["prompt descriptivo en inglés para generar imagen 1", "prompt para imagen 2", ...],
  "musicStyle": "uno de: upbeat, calm, corporate, energetic, cinematic",
  "subtitleStyle": "uno de: pill, word-by-word, karaoke, minimal",
  "preset": "uno de: product-reel, educational, hook-content, before-after, testimonial, storytelling"
}

Reglas:
- La narración debe ser fluida y natural, como si alguien la hablara
- Genera exactamente ${slideCount} imagePrompts descriptivos en INGLÉS, aptos para generadores de imagen como Ideogram/DALL-E
- Cada imagePrompt debe ser descriptivo (estilo, iluminación, composición) sin texto en la imagen
- El musicStyle debe complementar el tono del contenido
- El subtitleStyle debe coincidir con la plataforma (reels/tiktok → word-by-word o pill, stories → minimal, shorts → karaoke)
- El preset debe ser el más cercano al tipo de contenido`;

    const result = await adapter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.topic },
    ], { temperature: 0.8, maxTokens: 1500 });

    try {
      const cleaned = result.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      return {
        narration: String(parsed.narration ?? ''),
        imagePrompts: Array.isArray(parsed.imagePrompts) ? parsed.imagePrompts.map(String) : [],
        musicStyle: String(parsed.musicStyle ?? 'upbeat'),
        subtitleStyle: String(parsed.subtitleStyle ?? 'pill'),
        preset: String(parsed.preset ?? 'storytelling'),
      };
    } catch {
      this.logger.warn('Failed to parse AI script response, returning raw narration');
      return {
        narration: result.trim(),
        imagePrompts: [],
        musicStyle: 'upbeat',
        subtitleStyle: 'pill',
        preset: 'storytelling',
      };
    }
  }
}
