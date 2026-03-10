// ============================================================
// VideoTierRouter — Routes video generation to provider by tier
// T1 MVP: Pika / Luma / Mock (API-based, fast iteration)
// T2 Self-hosted: Local GPU models (SVD, WAN, Hunyuan)
// T3 Premium: HeyGen avatars, ElevenLabs premium voices
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AvatarVideoAdapter,
  HeyGenVideoAdapter,
  PikaVideoAdapter,
  LumaVideoAdapter,
  LocalGPUVideoAdapter,
  CompositeVideoAdapter,
  MockVideoAdapter,
  ReplicateVideoAdapter,
  FalVideoAdapter,
  DIDVideoAdapter,
  HedraVideoAdapter,
} from '@automatismos/media';

export type VideoTier = 'MVP' | 'SELFHOST' | 'PREMIUM';
export type VideoProviderKey =
  | 'PIKA' | 'LUMA' | 'HEYGEN'
  | 'SVD_LOCAL' | 'WAN_LOCAL' | 'HUNYUAN_LOCAL'
  | 'REPLICATE_WAN' | 'FAL_WAN' | 'DID' | 'HEDRA'
  | 'MOCK';

@Injectable()
export class VideoTierRouterService {
  private readonly logger = new Logger(VideoTierRouterService.name);
  private readonly adapters = new Map<VideoProviderKey, AvatarVideoAdapter>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initAdapters();
  }

  private initAdapters() {
    // Always register mock
    this.adapters.set('MOCK', new MockVideoAdapter());

    // T1 MVP — Pika
    const pikaKey = this.config.get<string>('PIKA_API_KEY', '');
    if (pikaKey) {
      this.adapters.set('PIKA', new PikaVideoAdapter({ apiKey: pikaKey }));
      this.logger.log('✓ Pika adapter registered');
    } else {
      this.adapters.set('PIKA', new PikaVideoAdapter({ apiKey: 'mock' }));
      this.logger.warn('Pika adapter registered in mock mode');
    }

    // T1 MVP — Luma
    const lumaKey = this.config.get<string>('LUMA_API_KEY', '');
    if (lumaKey) {
      this.adapters.set('LUMA', new LumaVideoAdapter({ apiKey: lumaKey }));
      this.logger.log('✓ Luma adapter registered');
    } else {
      this.adapters.set('LUMA', new LumaVideoAdapter({ apiKey: 'mock' }));
      this.logger.warn('Luma adapter registered in mock mode');
    }

    // T3 Premium — HeyGen
    const heygenKey = this.config.get<string>('HEYGEN_API_KEY', '');
    if (heygenKey) {
      this.adapters.set('HEYGEN', new HeyGenVideoAdapter({
        apiKey: heygenKey,
        defaultAvatarId: this.config.get<string>('HEYGEN_AVATAR_ID', ''),
        defaultVoiceId: this.config.get<string>('HEYGEN_VOICE_ID', ''),
      }));
      this.logger.log('✓ HeyGen adapter registered');
    }

    // T2 Self-hosted — Local GPU models
    const gpuWorkerUrl = this.config.get<string>('GPU_WORKER_URL', '');
    if (gpuWorkerUrl) {
      this.adapters.set('SVD_LOCAL', new LocalGPUVideoAdapter({ workerUrl: gpuWorkerUrl, model: 'svd' }));
      this.adapters.set('WAN_LOCAL', new LocalGPUVideoAdapter({ workerUrl: gpuWorkerUrl, model: 'wan' }));
      this.adapters.set('HUNYUAN_LOCAL', new LocalGPUVideoAdapter({ workerUrl: gpuWorkerUrl, model: 'hunyuan' }));
      this.logger.log('✓ Local GPU adapters registered (SVD, WAN, Hunyuan)');
    } else {
      // Register mock-backed local adapters for dev
      this.adapters.set('SVD_LOCAL', new LocalGPUVideoAdapter({ workerUrl: 'http://localhost:7860', model: 'svd' }));
      this.logger.warn('Local GPU adapters in mock mode — set GPU_WORKER_URL for real GPU');
    }

    // T2 — Composite video adapter (ffmpeg-based)
    this.adapters.set('EDGE_TTS_COMPOSE' as any, new CompositeVideoAdapter());

    // --- New AI video providers (credit-based) ---

    // Replicate WAN 2.1 video
    const replicateToken = this.config.get<string>('REPLICATE_API_TOKEN', '');
    if (replicateToken) {
      this.adapters.set('REPLICATE_WAN', new ReplicateVideoAdapter({ apiToken: replicateToken }));
      this.logger.log('✓ Replicate WAN video adapter registered');
    }

    // fal.ai WAN 2.5 video (cheaper alternative)
    const falKey = this.config.get<string>('FAL_KEY', '');
    if (falKey) {
      this.adapters.set('FAL_WAN', new FalVideoAdapter({ apiKey: falKey }));
      this.logger.log('✓ fal.ai WAN video adapter registered');
    }

    // D-ID Talking Head avatar
    const didKey = this.config.get<string>('DID_API_KEY', '');
    if (didKey) {
      this.adapters.set('DID', new DIDVideoAdapter({ apiKey: didKey }));
      this.logger.log('✓ D-ID avatar adapter registered');
    }

    // Hedra Audio-driven face animation
    const hedraKey = this.config.get<string>('HEDRA_API_KEY', '');
    if (hedraKey) {
      this.adapters.set('HEDRA', new HedraVideoAdapter({ apiKey: hedraKey }));
      this.logger.log('✓ Hedra avatar adapter registered');
    }
  }

  /**
   * Get the appropriate adapter for a given tier and optional provider preference.
   */
  getAdapter(tier: VideoTier, preferredProvider?: VideoProviderKey): AvatarVideoAdapter {
    // If specific provider, use it
    if (preferredProvider && this.adapters.has(preferredProvider)) {
      return this.adapters.get(preferredProvider)!;
    }

    // Route by tier
    switch (tier) {
      case 'MVP': {
        // Prefer Pika, fall back to Luma, then Mock
        return this.adapters.get('PIKA') ?? this.adapters.get('LUMA') ?? this.adapters.get('MOCK')!;
      }
      case 'SELFHOST': {
        // T2: will be SVD_LOCAL/WAN_LOCAL, for now fall to mock
        return this.adapters.get('SVD_LOCAL') ?? this.adapters.get('MOCK')!;
      }
      case 'PREMIUM': {
        // T3: HeyGen, fall to MVP providers
        return this.adapters.get('HEYGEN') ?? this.adapters.get('PIKA') ?? this.adapters.get('MOCK')!;
      }
      default:
        return this.adapters.get('MOCK')!;
    }
  }

  /**
   * Determine effective provider for a given tier.
   */
  resolveProvider(tier: VideoTier, preferred?: VideoProviderKey): VideoProviderKey {
    if (preferred && this.adapters.has(preferred)) return preferred;
    switch (tier) {
      case 'MVP':
        return this.adapters.has('PIKA') ? 'PIKA' : this.adapters.has('LUMA') ? 'LUMA' : 'MOCK';
      case 'SELFHOST':
        return this.adapters.has('SVD_LOCAL') ? 'SVD_LOCAL' : 'MOCK';
      case 'PREMIUM':
        return this.adapters.has('HEYGEN') ? 'HEYGEN' : 'PIKA';
      default:
        return 'MOCK';
    }
  }

  /**
   * Create a VideoRenderJob DB record and start rendering.
   */
  async createRenderJob(params: {
    workspaceId: string;
    editorialRunId?: string;
    tier: VideoTier;
    provider?: VideoProviderKey;
    inputType: string;
    inputPayload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) {
    const provider = this.resolveProvider(params.tier, params.provider as VideoProviderKey);
    const adapter = this.getAdapter(params.tier, params.provider as VideoProviderKey);

    const job = await this.prisma.videoRenderJob.create({
      data: {
        workspaceId: params.workspaceId,
        editorialRunId: params.editorialRunId,
        tier: params.tier,
        provider,
        inputType: params.inputType as any,
        inputPayload: params.inputPayload as any,
        status: 'QUEUED',
        aspectRatio: (params.options?.['aspectRatio'] as string) ?? '9:16',
      },
    });

    this.logger.log(`VideoRenderJob ${job.id} created (${provider} / ${params.tier})`);

    // Start generation async
    try {
      const script = {
        blocks: [{ text: (params.inputPayload['script'] as string) ?? 'Default script', duration: 10 }],
        totalDuration: (params.inputPayload['duration'] as number) ?? 15,
      };

      const imageUrl = params.inputPayload['imageUrl'] as string | undefined;
      const motionPrompt = params.inputPayload['motionPrompt'] as string | undefined;
      const isI2V = !!imageUrl;

      const result = await adapter.generate(script, {
        aspectRatio: (params.options?.['aspectRatio'] as any) ?? '9:16',
        language: 'es',
        // Image-to-video options
        imageUrl,
        motionPrompt,
        // Replicate: auto-select i2v model when imageUrl is provided
        ...(isI2V && provider === 'REPLICATE_WAN' ? { model: 'wan-2.1-i2v-480p' as any } : {}),
        // fal.ai: auto-select i2v endpoint when imageUrl is provided
        ...(isI2V && provider === 'FAL_WAN' ? { endpoint: 'wan-i2v' as any } : {}),
      });

      await this.prisma.videoRenderJob.update({
        where: { id: job.id },
        data: {
          status: 'RENDERING',
          externalJobId: result.jobId,
          startedAt: new Date(),
        },
      });

      return { jobId: job.id, externalJobId: result.jobId, provider, tier: params.tier };
    } catch (err: any) {
      await this.prisma.videoRenderJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      throw err;
    }
  }

  /**
   * Poll provider status and update job record.
   */
  async pollRenderJob(jobId: string) {
    const job = await this.prisma.videoRenderJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.externalJobId || job.status === 'COMPLETED' || job.status === 'FAILED') {
      return job;
    }

    const adapter = this.getAdapter(job.tier as VideoTier, job.provider as VideoProviderKey);
    const status = await adapter.getStatus(job.externalJobId);

    if (status.status === 'completed' && status.url) {
      return this.prisma.videoRenderJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          outputUrl: status.url,
          completedAt: new Date(),
        },
      });
    }

    if (status.status === 'failed') {
      return this.prisma.videoRenderJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: status.error },
      });
    }

    return this.prisma.videoRenderJob.update({
      where: { id: jobId },
      data: { status: 'RENDERING' },
    });
  }

  /**
   * List available providers and their status.
   */
  getAvailableProviders() {
    return Array.from(this.adapters.keys()).map((key) => ({
      provider: key,
      available: true,
      tier: this.getTierForProvider(key),
    }));
  }

  private getTierForProvider(p: VideoProviderKey): VideoTier {
    if (p === 'PIKA' || p === 'LUMA' || p === 'MOCK') return 'MVP';
    if (p === 'SVD_LOCAL' || p === 'WAN_LOCAL' || p === 'HUNYUAN_LOCAL') return 'SELFHOST';
    if (p === 'REPLICATE_WAN' || p === 'FAL_WAN' || p === 'DID' || p === 'HEDRA') return 'PREMIUM';
    return 'PREMIUM';
  }
}
