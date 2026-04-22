// ============================================================
// Video Compositor Service — Orquesta la creación de videos Pro
// Combina: imágenes + TTS (EdgeTTS) + música (Suno/Kie) + subtítulos
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { RemotionVideoRenderer } from '@automatismos/media';
import type { SubtitleGroupInput, ImageSlideInput, CarouselRenderInput, CarouselSlideInput } from '@automatismos/media';
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
  subtitleStyle?: 'pill' | 'minimal' | 'word-by-word' | 'karaoke' | 'neon';

  // Music
  enableMusic?: boolean;
  musicStyle?: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';

  // Auto-generate images from narration (when no images provided)
  autoGenerateImages?: boolean;

  // Overlay theme for dynamic visual elements
  overlayTheme?: 'none' | 'minimal' | 'modern' | 'neon' | 'elegant';

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

// ── Manual / Carousel input ──

export interface ManualSlideInput {
  text: string;
  imageId?: string;    // UserMedia ID (optional)
  imageUrl?: string;   // Direct URL (optional)
  role?: 'hook' | 'body' | 'cta' | 'slide';
  caption?: string;
}

export interface ManualCompositorInput {
  workspaceId: string;
  userId: string;

  slides: ManualSlideInput[];
  outputType: 'video' | 'carousel';
  aspectRatio?: '9:16' | '16:9' | '1:1';

  // Palette / visual theme
  palette?: 'tech-azul' | 'anthropic' | 'openai' | 'google' | 'dark-purple' | 'custom';
  accentColor?: string;
  handle?: string;
  logoId?: string;
  techGrid?: boolean;
  particles?: boolean;

  // Audio (only if outputType === 'video')
  enableTTS?: boolean;
  narrationText?: string;
  voiceId?: string;
  voiceSpeed?: 'slow' | 'normal' | 'fast';
  voiceEngine?: 'edge' | 'piper';
  enableSubtitles?: boolean;
  subtitleStyle?: 'pill' | 'minimal' | 'word-by-word' | 'karaoke' | 'neon';
  enableMusic?: boolean;
  musicStyle?: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
}

export interface ManualCompositorResult {
  /** Single video URL (video mode) OR array of image URLs (carousel mode) */
  outputUrls: string[];
  outputType: 'video' | 'carousel';
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

      // Auto-generate images from narration if none provided
      if (imageUrls.length === 0 && input.autoGenerateImages && input.narrationText?.trim()) {
        this.logger.log('No images provided, auto-generating from narration...');
        const generated = await this.autoGenerateImages({
          narrationText: input.narrationText,
          aspectRatio: input.aspectRatio ?? '9:16',
          userId: input.userId,
          workspaceId: input.workspaceId,
        });
        imageUrls = generated.imageUrls;
        if (!slides) {
          slides = generated.imageUrls.map((url, i) => ({
            url,
            role: 'slide' as const,
            order: i,
            animation: 'auto' as const,
            caption: generated.captions[i],
          }));
        }
        this.logger.log(`Auto-generated ${imageUrls.length} images`);
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
        ttsAudioUrl = this.toFileUrl(ttsResult.url);   // file:// — disableWebSecurity allows local files
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
        overlayTheme: input.overlayTheme ?? 'modern',
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

  // ── renderManual — Tech carousel / manual video with CarouselComposition ──

  async renderManual(input: ManualCompositorInput): Promise<ManualCompositorResult> {
    const { workspaceId, userId } = input;

    // Credits: 2 for carousel stills, 3 for video, +3 for music
    let totalCredits = input.outputType === 'carousel' ? 2 : 3;
    if (input.enableMusic && input.outputType === 'video') totalCredits += 3;

    const hasCredits = await this.credits.hasEnoughCredits(workspaceId, totalCredits);
    if (!hasCredits) {
      throw new BadRequestException(`Créditos insuficientes. Necesitas ${totalCredits} créditos.`);
    }

    this.logger.log(`Starting manual render: ${input.slides.length} slides, output=${input.outputType}, credits=${totalCredits}`);

    try {
      // 1. Resolve image URLs for each slide
      const carouselSlides: CarouselSlideInput[] = [];
      for (let i = 0; i < input.slides.length; i++) {
        const s = input.slides[i]!;
        let imageUrl: string | undefined;
        if (s.imageId) {
          imageUrl = await this.resolveMediaUrl(s.imageId, userId);
        } else if (s.imageUrl) {
          imageUrl = s.imageUrl;
        }

        carouselSlides.push({
          text: s.text,
          imageUrl: imageUrl ? this.toDataUrl(imageUrl) : undefined,
          role: s.role ?? (i === 0 ? 'hook' : i === input.slides.length - 1 ? 'cta' : 'body'),
          caption: s.caption,
        });
      }

      // 2. Resolve logo
      let logoUrl: string | undefined;
      if (input.logoId) {
        const raw = await this.resolveMediaUrl(input.logoId, userId);
        if (raw) logoUrl = this.toDataUrl(raw);
      }

      // 3. TTS + Music (only for video mode)
      let ttsAudioUrl: string | undefined;
      let musicAudioUrl: string | undefined;

      if (input.outputType === 'video' && input.enableTTS && input.narrationText?.trim()) {
        const ttsResult = await this.generateTTS({
          narrationText: input.narrationText,
          voiceId: input.voiceId,
          voiceSpeed: input.voiceSpeed,
          voiceEngine: input.voiceEngine,
        } as any);
        ttsAudioUrl = this.toFileUrl(ttsResult.url);
      }

      if (input.outputType === 'video' && input.enableMusic) {
        musicAudioUrl = await this.generateMusic(input.musicStyle ?? 'upbeat');
      }

      // 4. Determine aspect ratio — carousel defaults to 1:1
      const aspectRatio = input.aspectRatio ?? (input.outputType === 'carousel' ? '1:1' : '9:16');

      // 5. Build carousel render input
      const renderInput: CarouselRenderInput = {
        slides: carouselSlides,
        mode: input.outputType === 'carousel' ? 'stills' : 'video',
        aspectRatio,
        framesPerSlide: 90,
        accentColor: input.accentColor,
        palette: input.palette ?? 'tech-azul',
        handle: input.handle ?? '@syndra',
        logoUrl,
        techGrid: input.techGrid ?? true,
        particles: input.particles ?? true,
        ttsAudioUrl,
        musicAudioUrl,
        musicVolume: 0.22,
      };

      // 6. Render
      const renderer = new RemotionVideoRenderer();
      const result = await renderer.renderCarousel(renderInput);

      // 7. Upload outputs
      const outputUrls: string[] = [];
      for (const filePath of result.outputPaths) {
        if (input.outputType === 'carousel') {
          const url = await this.uploadImage(filePath);
          outputUrls.push(url);
        } else {
          const url = await this.uploadVideo(filePath);
          outputUrls.push(url);
        }
      }
      await renderer.cleanup(result.tempDir);

      // 8. Consume credits
      const creditType = input.outputType === 'carousel' ? 'VIDEO_COMPOSITOR' : 'VIDEO_COMPOSITOR';
      await this.credits.consumeCredits(workspaceId, creditType, `Manual ${input.outputType}: ${input.slides.length} slides`);
      if (input.enableMusic && input.outputType === 'video') {
        await this.credits.consumeCredits(workspaceId, 'MUSIC_BACKGROUND', 'Música para carousel video');
      }

      // 9. Save VideoRenderJob
      await this.prisma.videoRenderJob.create({
        data: {
          workspaceId,
          tier: 'MVP' as any,
          provider: 'COMPOSITOR' as any,
          inputType: 'COMPOSITOR' as any,
          inputPayload: {
            slideCount: input.slides.length,
            outputType: input.outputType,
            palette: input.palette ?? 'tech-azul',
            renderer: 'remotion-carousel',
          } as any,
          status: 'COMPLETED',
          outputUrl: outputUrls[0] ?? '',
          durationSeconds: input.outputType === 'video' ? input.slides.length * 3 : 0,
          aspectRatio,
          creditsUsed: totalCredits,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      this.logger.log(`Manual render complete: ${outputUrls.length} file(s), ${totalCredits} credits`);

      return { outputUrls, outputType: input.outputType, creditsUsed: totalCredits };
    } catch (error: any) {
      this.logger.error(`Manual render failed: ${error.message}`);
      throw error;
    }
  }

  // ── Upload image (carousel stills) ──

  private async uploadImage(localPath: string): Promise<string> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
        const result = await cloudinary.uploader.upload(localPath, {
          resource_type: 'image',
          folder: 'syndra/carousel',
          format: 'png',
        });
        return result.secure_url;
      } catch (err: any) {
        this.logger.warn(`Cloudinary image upload failed, saving locally: ${err.message}`);
      }
    }

    // Fallback: local
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const imgDir = path.join(uploadDir, 'images');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
    const filename = `carousel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
    const destPath = path.join(imgDir, filename);
    fs.copyFileSync(localPath, destPath);
    return `/uploads/images/${filename}`;
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

    return this.toDataUrl(media.url);
  }

  /**
   * Converts any local file path to a base64 data URL so Remotion's Chromium
   * can use it. Chromium blocks file:// access from http:// pages (security),
   * but data: URLs are embedded and always work.
   * Remote URLs (https://) and existing data: URLs pass through unchanged.
   */
  private toDataUrl(url: string): string {
    if (!url) return url;
    // Already remote or data — usable as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;

    // Strip file:// if already converted from a prior step
    const diskPath = url.startsWith('file://') ? url.slice(7) : url;

    // Resolve relative /uploads/... paths
    let localPath = diskPath;
    if (diskPath.startsWith('/uploads/')) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      localPath = path.join(uploadDir, diskPath.replace('/uploads/', ''));
    }

    if (!fs.existsSync(localPath)) {
      this.logger.warn(`[toDataUrl] File not found on disk: ${localPath}`);
      return url; // return as-is; Remotion will fail with a clear message
    }

    const buf = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase().slice(1);
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png'  ? 'image/png'  :
      ext === 'webp' ? 'image/webp' :
      ext === 'gif'  ? 'image/gif'  :
      ext === 'mp3'  ? 'audio/mpeg' :
      ext === 'wav'  ? 'audio/wav'  :
      ext === 'ogg'  ? 'audio/ogg'  :
      'application/octet-stream';

    this.logger.log(`[toDataUrl] Encoded ${localPath} (${(buf.length / 1024).toFixed(0)} KB) as ${mime}`);
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  /** Converts a local path to file:// URL for large files (audio).
   *  Requires disableWebSecurity:true in Chromium (set in remotion-renderer). */
  private toFileUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('file://')) return url;
    const diskPath = url.startsWith('/uploads/')
      ? path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), url.replace('/uploads/', ''))
      : url;
    return fs.existsSync(diskPath) ? `file://${diskPath}` : url;
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
    // Normalize line endings (edge-tts may use \r\n)
    const normalized = vtt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Match cues: timestamp --> timestamp \n text (handle optional cue ids and extra whitespace)
    const cueRegex = /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})[^\n]*\n([^\n]+)/g;
    const cues: { startMs: number; endMs: number; text: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = cueRegex.exec(normalized)) !== null) {
      const text = match[3]!.trim().replace(/<[^>]+>/g, ''); // Strip HTML tags from VTT
      if (!text) continue;
      cues.push({
        startMs: this.timeToMs(match[1]!.replace(',', '.')),
        endMs: this.timeToMs(match[2]!.replace(',', '.')),
        text,
      });
    }

    this.logger.log(`VTT parsing: ${normalized.length} chars, ${cues.length} cues found`);
    if (cues.length === 0 && normalized.length > 0) {
      // Log first 300 chars for debugging
      this.logger.warn(`VTT content (first 300 chars): ${normalized.slice(0, 300)}`);
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
    // Edge TTS generates VTT with format: MM:SS.mmm or HH:MM:SS.mmm
    // We capture all end timestamps (after -->) and return the last one.
    // Regex handles both 2-part (mm:ss.mmm) and 3-part (hh:mm:ss.mmm) formats.
    const timeRegex = /--> *(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/g;
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(vtt)) !== null) {
      lastEnd = this.timeToMs(match[1]!);
    }
    return lastEnd;
  }

  private timeToMs(timestamp: string): number {
    // Normalize separator: VTT allows both '.' and ','
    const normalized = timestamp.replace(',', '.');
    const parts = normalized.split(':');
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      const h = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10);
      const [s, ms] = parts[2]!.split('.');
      return h * 3_600_000 + m * 60_000 + parseInt(s!, 10) * 1_000 + parseInt((ms ?? '0').padEnd(3, '0').slice(0, 3), 10);
    } else {
      // MM:SS.mmm
      const m = parseInt(parts[0]!, 10);
      const [s, ms] = parts[1]!.split('.');
      return m * 60_000 + parseInt(s!, 10) * 1_000 + parseInt((ms ?? '0').padEnd(3, '0').slice(0, 3), 10);
    }
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

  // ── Auto-generate images from narration ──

  async autoGenerateImages(opts: {
    narrationText: string;
    aspectRatio: string;
    userId: string;
    workspaceId: string;
  }): Promise<{ imageUrls: string[]; captions: string[] }> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    const baseUrl = this.config.get<string>('LLM_BASE_URL');
    const kieApiKey = this.config.get<string>('KIE_AI_API_KEY');
    if (!apiKey) throw new BadRequestException('LLM_API_KEY no configurada');
    if (!kieApiKey) throw new BadRequestException('KIE_AI_API_KEY no configurada');

    // 1. Generate image prompts from narration using AI
    const adapter = new OpenAIAdapter({
      apiKey,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const words = opts.narrationText.split(/\s+/).length;
    const slideCount = Math.max(3, Math.min(8, Math.round(words / 25)));

    const result = await adapter.chat([
      {
        role: 'system',
        content: `You are an expert visual director for social media videos. Given narration text, generate ${slideCount} image prompts that visually tell the story. Each prompt must be highly descriptive for AI image generators (Ideogram V3).

Respond ONLY with valid JSON (no markdown):
{
  "slides": [
    { "prompt": "detailed English prompt for image generation", "caption": "short overlay text in the narration language (max 8 words)" }
  ]
}

Rules:
- Prompts must be in ENGLISH, detailed (style, lighting, mood, composition, camera angle)
- Include visual style (cinematic, editorial, flat lay, lifestyle, etc.)
- DO NOT include text/typography in image prompts
- Each image should match a different segment of the narration
- Captions should be punchy key phrases from the narration (in the narration's language)
- Make images visually diverse: alternate between close-ups, wide shots, abstract, lifestyle, etc.
- Add atmosphere: golden hour, neon lights, soft bokeh, dramatic shadows, etc.`,
      },
      { role: 'user', content: opts.narrationText },
    ], { temperature: 0.8, maxTokens: 1200 });

    let slides: Array<{ prompt: string; caption: string }> = [];
    try {
      const cleaned = result.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      slides = Array.isArray(parsed.slides) ? parsed.slides : [];
    } catch {
      this.logger.warn('Failed to parse auto-image prompts, using fallback');
    }

    if (slides.length === 0) {
      // Fallback: split narration into segments and create generic prompts
      const sentences = opts.narrationText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      slides = sentences.slice(0, slideCount).map((s, i) => ({
        prompt: `Professional cinematic photograph representing: ${s.trim()}. High quality, editorial style, dramatic lighting, no text.`,
        caption: s.trim().split(/\s+/).slice(0, 6).join(' '),
      }));
    }

    // 2. Generate images in parallel (max 5 concurrent)
    const imageAdapter = new KieImageProAdapter({ apiKey: kieApiKey, modelId: 'ideogram/v3-text-to-image' });
    const sizeMap: Record<string, string> = { '9:16': 'portrait_16_9', '16:9': 'landscape_16_9', '1:1': 'square_hd' };
    const imageSize = sizeMap[opts.aspectRatio] || 'portrait_16_9';

    const imageUrls: string[] = [];
    const captions: string[] = [];
    const batchSize = 3;

    for (let i = 0; i < slides.length; i += batchSize) {
      const batch = slides.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (slide) => {
          const finalPrompt = slide.prompt + '. Do NOT include any text, letters, numbers, or typography within the image.';
          const generated = await imageAdapter.generate(finalPrompt, { imageSize });
          if (generated.url) {
            // Save as UserMedia
            const media = await this.prisma.userMedia.create({
              data: {
                userId: opts.userId, filename: `autogen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`,
                url: generated.url, thumbnailUrl: generated.url, mimeType: 'image/png',
                sizeBytes: 0, category: 'BACKGROUND' as any, tags: ['video-compositor', 'auto-generated'],
              },
            });
            return { url: generated.url, caption: slide.caption, mediaId: media.id };
          }
          throw new Error('No URL returned');
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          imageUrls.push(r.value.url);
          captions.push(r.value.caption);
        }
      }
    }

    // Consume credits for auto-generated images (4 credits each)
    const generatedCount = imageUrls.length;
    if (generatedCount > 0) {
      await this.credits.consumeCredits(
        opts.workspaceId,
        'IMAGE_PRO_TEXT',
        `Auto-generated ${generatedCount} images for video (Ideogram V3)`,
      );
    }

    return { imageUrls, captions };
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
