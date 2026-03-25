// ============================================================
// KIE AI Adapter — Unified API for music (Suno) and pro images (Ideogram V3)
// ============================================================

import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

// ── Interfaces ──────────────────────────────────────────────

export interface KieAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface MusicGenerationOptions {
  style?: string;       // upbeat | calm | corporate | energetic | cinematic
  prompt?: string;      // Custom description for the music
  model?: string;       // V4_5PLUS | V4_5 | V4 | V3_5 | V5
  instrumental?: boolean;
  durationSeconds?: number;
}

export interface GeneratedMusic {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  title?: string;
  duration?: number;
  provider: string;
  metadata: Record<string, unknown>;
}

export interface KieTaskResult {
  code: number;
  msg: string;
  data?: {
    taskId?: string;
    task_id?: string;
    status?: string;
    output?: any;
    [key: string]: any;
  };
}

// ── Music Generation (Suno via KIE) ────────────────────────

export class KieMusicAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: KieAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.kie.ai/api/v1';
  }

  /**
   * Generate background music for social media content
   * Uses the Suno-specific endpoint: POST /api/v1/generate
   */
  async generate(options: MusicGenerationOptions): Promise<GeneratedMusic> {
    const style = options.style ?? 'upbeat';
    const prompt = options.prompt ?? this.buildPromptFromStyle(style);
    const model = options.model ?? 'V4';

    const payload: Record<string, any> = {
      prompt,
      instrumental: options.instrumental ?? true,
      customMode: true,
      model,
      title: `bg_${style}_${Date.now()}`.slice(0, 80),
      style: this.mapStyleToSunoTag(style),
      callBackUrl: 'https://noop.example.com/callback',
    };

    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KIE Music API error ${res.status}: ${text}`);
    }

    const result = (await res.json()) as KieTaskResult;
    console.log('[KIE-MUSIC] Generate response:', JSON.stringify(result));
    const taskId = result.data?.taskId ?? result.data?.task_id ?? '';

    if (!taskId) {
      throw new Error(`KIE Music API: no task ID returned — ${JSON.stringify(result)}`);
    }

    return {
      taskId,
      status: 'pending',
      provider: 'kie-suno',
      metadata: { style, model },
    };
  }

  /**
   * Poll task status using the Suno-specific endpoint:
   * GET /api/v1/generate/record-info?taskId=...
   */
  async getTaskResult(taskId: string): Promise<GeneratedMusic> {
    const res = await fetch(
      `${this.baseUrl}/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      },
    );

    if (!res.ok) {
      throw new Error(`KIE task query error ${res.status}`);
    }

    const result = (await res.json()) as any;
    console.log('[KIE-MUSIC] Poll response:', JSON.stringify(result).slice(0, 500));
    const data = result.data;

    if (!data) {
      return { taskId, status: 'pending', provider: 'kie-suno', metadata: {} };
    }

    const status = (data.status ?? data.response?.status ?? '').toUpperCase();
    console.log('[KIE-MUSIC] Parsed status:', status);

    if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
      // Suno returns sunoData array inside data.response
      const sunoData = data.response?.sunoData;
      let audioUrl: string | undefined;
      let title: string | undefined;
      let duration: number | undefined;

      if (Array.isArray(sunoData) && sunoData.length > 0) {
        audioUrl = sunoData[0].audioUrl ?? sunoData[0].streamAudioUrl;
        title = sunoData[0].title;
        duration = sunoData[0].duration;
      }

      return {
        taskId,
        status: 'completed',
        audioUrl,
        title,
        duration,
        provider: 'kie-suno',
        metadata: { raw: data },
      };
    }

    if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED' ||
        status === 'CALLBACK_EXCEPTION' || status === 'SENSITIVE_WORD_ERROR') {
      return {
        taskId,
        status: 'failed',
        provider: 'kie-suno',
        metadata: { error: data.response?.errorMessage ?? data },
      };
    }

    // PENDING or TEXT_SUCCESS — still in progress
    return {
      taskId,
      status: 'processing',
      provider: 'kie-suno',
      metadata: { raw: data },
    };
  }

  /**
   * Generate and poll until complete (with timeout)
   */
  async generateAndWait(
    options: MusicGenerationOptions,
    maxWaitMs = 180_000,
    pollIntervalMs = 5_000,
  ): Promise<GeneratedMusic> {
    const task = await this.generate(options);
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      try {
        const result = await this.getTaskResult(task.taskId);

        if (result.status === 'completed' || result.status === 'failed') {
          return result;
        }
      } catch (err) {
        // Transient network errors (timeout, DNS) — retry instead of crashing
        if (Date.now() + pollIntervalMs >= deadline) {
          throw err; // no more retries, propagate
        }
      }
    }

    return { ...task, status: 'processing', metadata: { ...task.metadata, timedOut: true } };
  }

  private buildPromptFromStyle(style: string): string {
    const prompts: Record<string, string> = {
      upbeat: 'Upbeat, positive background music for social media. Energetic and motivating with a modern pop feel. No vocals.',
      calm: 'Calm, relaxing ambient background music. Soft piano and gentle pads. Perfect for wellness and lifestyle content. No vocals.',
      corporate: 'Professional corporate background music. Inspiring and clean, suitable for business presentations and brand content. No vocals.',
      energetic: 'High-energy electronic background music. Fast tempo, driving beats, perfect for product launches and hype content. No vocals.',
      cinematic: 'Cinematic orchestral background music. Epic and emotional, perfect for storytelling and brand narratives. No vocals.',
    };
    return prompts[style] ?? prompts['upbeat']!;
  }

  private mapStyleToSunoTag(style: string): string {
    const tags: Record<string, string> = {
      upbeat: 'pop, upbeat, energetic, instrumental',
      calm: 'ambient, calm, piano, relaxing, instrumental',
      corporate: 'corporate, inspiring, clean, professional, instrumental',
      energetic: 'electronic, energetic, fast, driving, instrumental',
      cinematic: 'cinematic, orchestral, epic, emotional, instrumental',
    };
    return tags[style] ?? tags['upbeat']!;
  }
}

// ── Pro Image Model Catalog ─────────────────────────────────

export type KieImageModelId =
  | 'ideogram/v3-text-to-image'
  | 'gpt-image/1.5-text-to-image'
  | 'gpt-image/4o-text-to-image'
  | 'flux-2/pro-text-to-image'
  | 'flux/kontext-text-to-image'
  | 'bytedance/seedream'
  | 'grok-imagine/text-to-image'
  | 'qwen/text-to-image'
  | 'qwen/2.0-text-to-image'
  | 'google/imagen-4'
  | 'google/nano-banana-2';

export type ProImageModelId = KieImageModelId | 'replicate/flux-dev' | 'replicate/recraft-v3' | 'standard';

/** Default KIE model for batch generation when KIE API key is available */
export const DEFAULT_BATCH_KIE_MODEL: KieImageModelId = 'ideogram/v3-text-to-image';

export interface ProImageModelDef {
  id: ProImageModelId;
  name: string;
  provider: 'kie' | 'replicate' | 'free';
  description: string;
  credits: number;
  recommended?: boolean;
  textCapability: 'excellent' | 'good' | 'limited' | 'none';
}

export const PRO_IMAGE_MODELS: ProImageModelDef[] = [
  // ── KIE Premium ──
  {
    id: 'ideogram/v3-text-to-image',
    name: 'Ideogram V3',
    provider: 'kie',
    description: 'El mejor para texto legible dentro de imágenes. Tipografía nítida y diseños profesionales.',
    credits: 4,
    recommended: true,
    textCapability: 'excellent',
  },
  {
    id: 'gpt-image/1.5-text-to-image',
    name: 'GPT Image 1.5',
    provider: 'kie',
    description: 'OpenAI. Alta calidad fotorrealista con buen manejo de texto y detalles complejos.',
    credits: 5,
    textCapability: 'good',
  },
  {
    id: 'flux-2/pro-text-to-image',
    name: 'Flux-2 Pro',
    provider: 'kie',
    description: 'Black Forest Labs. Fotorrealismo de alta gama, excelente para fotografía y escenas naturales.',
    credits: 4,
    textCapability: 'limited',
  },
  {
    id: 'bytedance/seedream',
    name: 'Seedream 4.5',
    provider: 'kie',
    description: 'ByteDance. Buena calidad a menor costo. Ideal para ilustraciones y contenido variado.',
    credits: 3,
    textCapability: 'limited',
  },
  {
    id: 'grok-imagine/text-to-image',
    name: 'Grok Imagine',
    provider: 'kie',
    description: 'xAI. Estilo cinematográfico y artístico. Excelente para retratos y escenas dramáticas.',
    credits: 4,
    textCapability: 'limited',
  },
  {
    id: 'qwen/text-to-image',
    name: 'Qwen',
    provider: 'kie',
    description: 'Alibaba. Rápido y accesible. Bueno para contenido general y estilos variados.',
    credits: 3,
    textCapability: 'limited',
  },
  {
    id: 'gpt-image/4o-text-to-image',
    name: 'OpenAI 4o Image',
    provider: 'kie',
    description: 'OpenAI GPT-4o nativo. Excelente comprensión de instrucciones y texto en imágenes.',
    credits: 5,
    textCapability: 'excellent',
  },
  {
    id: 'flux/kontext-text-to-image',
    name: 'Flux Kontext',
    provider: 'kie',
    description: 'Black Forest Labs. Contexto visual avanzado, ideal para edición e imagen a imagen.',
    credits: 4,
    textCapability: 'limited',
  },
  {
    id: 'qwen/2.0-text-to-image',
    name: 'Qwen Image 2.0',
    provider: 'kie',
    description: 'Alibaba Qwen 2.0. Mejor calidad que V1, excelente texto y detalles.',
    credits: 3,
    textCapability: 'good',
  },
  {
    id: 'google/imagen-4',
    name: 'Google Imagen 4',
    provider: 'kie',
    description: 'Google. Fotorrealismo de última generación con texto legible.',
    credits: 5,
    textCapability: 'good',
  },
  {
    id: 'google/nano-banana-2',
    name: 'Nano Banana 2',
    provider: 'kie',
    description: 'Google. Rápido y económico, buena calidad general.',
    credits: 2,
    textCapability: 'limited',
  },
  // ── Replicate ──
  {
    id: 'replicate/flux-dev',
    name: 'Flux Dev',
    provider: 'replicate',
    description: 'Modelo open-source de alta calidad. Buen balance calidad-precio.',
    credits: 2,
    textCapability: 'none',
  },
  {
    id: 'replicate/recraft-v3',
    name: 'Recraft V3',
    provider: 'replicate',
    description: 'Especializado en diseño gráfico, iconos y estilos vectoriales.',
    credits: 3,
    textCapability: 'limited',
  },
  // ── Estándar (gratis) ──
  {
    id: 'standard',
    name: 'Estándar (Gratis)',
    provider: 'free',
    description: 'Pollinations / HuggingFace FLUX. Sin costo de créditos, puede ser más lento.',
    credits: 0,
    textCapability: 'none',
  },
];

// ── Pro Image Generation (Multi-model via KIE) ─────────────

export interface IdeogramOptions {
  renderingSpeed?: 'Turbo' | 'Balanced' | 'Quality';
  style?: 'Auto' | 'General' | 'Realistic' | 'Design';
  imageSize?: string;
  negativePrompt?: string;
}

/**
 * Generic KIE Image adapter — supports all KIE image models via unified API.
 * Uses a static queue to serialize requests and avoid overwhelming the network.
 */
export class KieImageProAdapter implements ImageGeneratorAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelId: KieImageModelId;

  /** Static mutex to serialize all KIE image requests across instances */
  private static queue: Promise<any> = Promise.resolve();

  constructor(config: KieAIConfig & { modelId?: KieImageModelId }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.kie.ai/api/v1';
    this.modelId = config.modelId ?? 'ideogram/v3-text-to-image';
  }

  async generate(prompt: string, options?: ImageGenOptions & IdeogramOptions): Promise<GeneratedImage> {
    console.log(`[KIE] 📋 Queuing ${this.modelId} — prompt: "${prompt.slice(0, 80)}..."`);
    // Serialize: wait for previous KIE request to finish before starting a new one
    const result = await (KieImageProAdapter.queue = KieImageProAdapter.queue
      .catch(() => {}) // don't let a previous failure block the queue
      .then(() => this._generate(prompt, options)));
    return result;
  }

  private async _generate(prompt: string, options?: ImageGenOptions & IdeogramOptions): Promise<GeneratedImage> {
    const input = this.buildInput(prompt, options);
    console.log(`[KIE] 🚀 Creating task ${this.modelId} — input keys: ${Object.keys(input).join(', ')}`);

    const res = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.modelId, input }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[KIE] ❌ createTask error ${res.status}: ${text}`);
      throw new Error(`KIE ${this.modelId} API error ${res.status}: ${text}`);
    }

    const result = (await res.json()) as KieTaskResult;
    const taskId = result.data?.taskId ?? result.data?.task_id ?? '';
    console.log(`[KIE] ✅ Task created: ${taskId} (code=${result.code}, msg=${result.msg})`);

    if (!taskId) {
      throw new Error(`KIE ${this.modelId}: no task ID — ${JSON.stringify(result)}`);
    }

    const imageResult = await this.pollForResult(taskId);
    console.log(`[KIE] 🖼️ Task ${taskId} completed — URL: ${imageResult.url.slice(0, 80)}...`);

    return {
      url: imageResult.url,
      prompt,
      provider: `kie-${this.modelId.split('/')[0]}`,
      metadata: { taskId, model: this.modelId },
    };
  }

  /**
   * Build model-specific input parameters from a common options set.
   */
  private buildInput(prompt: string, options?: ImageGenOptions & IdeogramOptions): Record<string, any> {
    switch (this.modelId) {
      case 'ideogram/v3-text-to-image':
        return {
          prompt,
          rendering_speed: options?.renderingSpeed ?? 'BALANCED',
          style: options?.style ?? 'AUTO',
          expand_prompt: true,
          image_size: options?.imageSize ?? 'square_hd',
          ...(options?.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
        };

      case 'gpt-image/1.5-text-to-image':
        return {
          prompt,
          aspect_ratio: '1:1',
          quality: 'high',
        };

      case 'flux-2/pro-text-to-image':
        return {
          prompt,
          aspect_ratio: '1:1',
          resolution: '1K',
        };

      case 'bytedance/seedream':
        return {
          prompt,
          image_size: 'square_hd',
          guidance_scale: 2.5,
        };

      case 'grok-imagine/text-to-image':
        return {
          prompt,
          aspect_ratio: '1:1',
        };

      case 'qwen/text-to-image':
        return {
          prompt,
          image_size: 'square_hd',
          guidance_scale: 2.5,
          acceleration: 'none',
        };

      case 'gpt-image/4o-text-to-image':
        return {
          prompt,
          aspect_ratio: '1:1',
          quality: 'high',
        };

      case 'flux/kontext-text-to-image':
        return {
          prompt,
          aspect_ratio: '1:1',
        };

      case 'qwen/2.0-text-to-image':
        return {
          prompt,
          image_size: 'square_hd',
          guidance_scale: 3.0,
        };

      case 'google/imagen-4':
        return {
          prompt,
          aspect_ratio: '1:1',
        };

      case 'google/nano-banana-2':
        return {
          prompt,
          aspect_ratio: '1:1',
        };

      default:
        return { prompt };
    }
  }

  private async pollForResult(taskId: string, maxWaitMs = 300_000): Promise<{ url: string }> {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;
    const startTime = Date.now();

    while (Date.now() < deadline) {
      attempt++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`[KIE] 🔄 Poll #${attempt} task=${taskId.slice(0, 12)}... (${elapsed}s elapsed)`);

      const res = await fetch(
        `${this.baseUrl}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        },
      );

      if (!res.ok) {
        console.error(`[KIE] ❌ Poll error ${res.status} for task ${taskId}`);
        throw new Error(`KIE task query error ${res.status}`);
      }

      const result = (await res.json()) as KieTaskResult;
      const data = result.data;
      // Log raw response on first poll or every 5th to debug structure
      if (attempt <= 2 || attempt % 5 === 0) {
        console.log(`[KIE] 📦 Raw response: ${JSON.stringify(result).slice(0, 500)}`);
      }

      if (!data) {
        console.log(`[KIE] ⏳ Task ${taskId.slice(0, 12)}... no data yet`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      const status = (data.status ?? (data as any).state ?? (data as any).taskStatus)?.toString().toLowerCase();
      console.log(`[KIE] 📊 Task ${taskId.slice(0, 12)}... status=${status} keys=[${Object.keys(data).join(',')}]`);

      if (status === 'completed' || status === 'success') {
        let url: string | undefined;

        // KIE returns URLs inside resultJson (a JSON string with resultUrls array)
        if (typeof (data as any).resultJson === 'string') {
          try {
            const parsed = JSON.parse((data as any).resultJson);
            if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
              url = parsed.resultUrls[0];
            }
          } catch { /* ignore parse errors, fall through */ }
        }

        // Fallback: check data.output for other API shapes
        if (!url) {
          const output = data.output;
          if (Array.isArray(output) && output.length > 0) {
            url = output[0].url ?? output[0].image_url;
          } else if (typeof output === 'object' && output) {
            url = output.url ?? output.image_url;
          }
        }

        if (!url) {
          throw new Error(`KIE ${this.modelId}: completed but no URL found — ${JSON.stringify(data)}`);
        }

        console.log(`[KIE] ✅ Task ${taskId.slice(0, 12)}... DONE in ${elapsed}s`);
        return { url };
      }

      if (status === 'failed' || status === 'fail' || status === 'error') {
        console.error(`[KIE] ❌ Task ${taskId.slice(0, 12)}... FAILED: ${JSON.stringify(data)}`);
        throw new Error(`KIE ${this.modelId} failed: ${JSON.stringify(data)}`);
      }

      await new Promise((r) => setTimeout(r, 5000));
    }

    console.error(`[KIE] ⏰ Task ${taskId} TIMEOUT after ${attempt} polls`);
    throw new Error(`KIE ${this.modelId}: timeout waiting for result after ${attempt} polls`);
  }
}

// ── KIE Video Adapter ──────────────────────────────────────

export type KieVideoType = 'slides' | 'video' | 'avatar';

export interface KieVideoModelDef {
  id: string;
  name: string;
  type: KieVideoType;
  description: string;
  ourCredits: number;
}

export const KIE_VIDEO_MODELS: KieVideoModelDef[] = [
  {
    id: 'kling/v2-1-standard',
    name: 'Kling V2.1 Standard',
    type: 'video',
    description: 'Video IA desde texto — 5 segundos, calidad estándar',
    ourCredits: 15,
  },
  {
    id: 'kling/ai-avatar-standard',
    name: 'Kling Avatar Standard',
    type: 'avatar',
    description: 'Avatar parlante con voz IA — calidad estándar',
    ourCredits: 25,
  },
];

export class KieVideoAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: KieAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.kie.ai/api/v1';
  }

  /**
   * Generate a text-to-video using Kling V2.1 Standard via KIE API.
   */
  async generateTextToVideo(
    prompt: string,
    options?: { duration?: '5' | '10'; aspectRatio?: '1:1' | '16:9' | '9:16' },
  ): Promise<{ taskId: string }> {
    const modelId = 'kling-2.6/text-to-video';
    const body = {
      model: modelId,
      input: {
        prompt,
        sound: false,
        aspect_ratio: options?.aspectRatio ?? '9:16',
        duration: options?.duration ?? '5',
      },
    };

    console.log(`[KIE-VIDEO] 🚀 Creating text-to-video task — model=${modelId}`);
    console.log(`[KIE-VIDEO] Body: ${JSON.stringify(body)}`);

    const res = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KIE Video createTask error ${res.status}: ${text}`);
    }

    const result = (await res.json()) as KieTaskResult;
    const taskId = result.data?.taskId ?? result.data?.task_id ?? '';
    console.log(`[KIE-VIDEO] ✅ Task created: ${taskId}`);

    if (!taskId) {
      throw new Error(`KIE Video: no taskId returned — ${JSON.stringify(result)}`);
    }

    return { taskId };
  }

  /**
   * Generate an avatar video using Kling AI Avatar Standard.
   * Requires image_url (avatar face) and audio_url (narration audio).
   */
  async generateAvatarVideo(
    imageUrl: string,
    audioUrl: string,
    prompt?: string,
  ): Promise<{ taskId: string }> {
    const modelId = 'kling/ai-avatar-standard';
    const body = {
      model: modelId,
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt: prompt ?? '',
      },
    };

    console.log(`[KIE-VIDEO] 🚀 Creating avatar task — model=${modelId}`);

    const res = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KIE Avatar createTask error ${res.status}: ${text}`);
    }

    const result = (await res.json()) as KieTaskResult;
    const taskId = result.data?.taskId ?? result.data?.task_id ?? '';
    console.log(`[KIE-VIDEO] ✅ Avatar task created: ${taskId}`);

    if (!taskId) {
      throw new Error(`KIE Avatar: no taskId returned — ${JSON.stringify(result)}`);
    }

    return { taskId };
  }

  /**
   * Upload a file to KIE's free temporary storage (Base64).
   * Files are kept for 3 days.
   */
  async uploadToKieStorage(base64Data: string, uploadPath = 'audio', fileName?: string): Promise<string> {
    const res = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        uploadPath,
        ...(fileName ? { fileName } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KIE file upload error ${res.status}: ${text}`);
    }

    const result = (await res.json()) as { success: boolean; data?: { fileUrl?: string; downloadUrl?: string } };
    const fileUrl = result.data?.fileUrl ?? result.data?.downloadUrl;
    if (!fileUrl) {
      throw new Error(`KIE file upload: no fileUrl returned — ${JSON.stringify(result)}`);
    }

    console.log(`[KIE-VIDEO] \u{1F4E4} File uploaded to KIE storage: ${fileUrl}`);
    return fileUrl;
  }

  /**
   * Poll a video/avatar task until completion.
   * Returns the video URL.
   */
  async pollUntilDone(taskId: string, maxWaitMs = 600_000): Promise<{ url: string }> {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt++;
      const elapsed = Math.round((Date.now() - (deadline - maxWaitMs)) / 1000);

      const res = await fetch(
        `${this.baseUrl}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } },
      );

      if (!res.ok) {
        console.error(`[KIE-VIDEO] ❌ Poll error ${res.status} for task ${taskId}`);
        throw new Error(`KIE Video poll error ${res.status}`);
      }

      const result = (await res.json()) as KieTaskResult;
      const data = result.data;

      if (attempt <= 2 || attempt % 10 === 0) {
        console.log(`[KIE-VIDEO] 📦 Poll #${attempt} (${elapsed}s): ${JSON.stringify(result).slice(0, 500)}`);
      }

      if (!data) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }

      const status = (data.status ?? (data as any).state ?? (data as any).taskStatus)?.toString().toLowerCase();
      console.log(`[KIE-VIDEO] 🔄 Task ${taskId.slice(0, 16)}... status=${status} (${elapsed}s)`);

      if (status === 'completed' || status === 'success') {
        let url: string | undefined;

        // Parse resultJson (same pattern as images)
        if (typeof (data as any).resultJson === 'string') {
          try {
            const parsed = JSON.parse((data as any).resultJson);
            if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
              url = parsed.resultUrls[0];
            }
          } catch { /* ignore */ }
        }

        // Fallback to output
        if (!url) {
          const output = data.output;
          if (Array.isArray(output) && output.length > 0) {
            url = output[0].url ?? output[0].video_url;
          } else if (typeof output === 'object' && output) {
            url = output.url ?? output.video_url;
          }
        }

        if (!url) {
          throw new Error(`KIE Video: completed but no URL — ${JSON.stringify(data)}`);
        }

        console.log(`[KIE-VIDEO] ✅ Task ${taskId.slice(0, 16)}... DONE in ${elapsed}s`);
        return { url };
      }

      if (status === 'failed' || status === 'fail' || status === 'error') {
        const failMsg = (data as any).failMsg ?? JSON.stringify(data);
        console.error(`[KIE-VIDEO] ❌ Task ${taskId.slice(0, 16)}... FAILED: ${failMsg}`);
        throw new Error(`KIE Video failed: ${failMsg}`);
      }

      // Video generation takes longer — poll every 10s
      await new Promise((r) => setTimeout(r, 10_000));
    }

    throw new Error(`KIE Video: timeout after ${maxWaitMs / 1000}s`);
  }

  /**
   * Single status check (no loop). Used by the video worker for periodic polling.
   * Returns status + url if completed.
   */
  async checkStatus(taskId: string): Promise<{ status: 'pending' | 'completed' | 'failed'; url?: string; error?: string }> {
    const res = await fetch(
      `${this.baseUrl}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { 'Authorization': `Bearer ${this.apiKey}` } },
    );

    if (!res.ok) {
      console.log(`[KIE-STATUS] ❌ HTTP ${res.status} for task ${taskId.slice(0, 12)}...`);
      return { status: 'failed', error: `HTTP ${res.status}` };
    }

    const result = (await res.json()) as KieTaskResult;
    const data = result.data;

    // Log raw response for debugging
    const rawKeys = data ? Object.keys(data).join(',') : 'null';
    const rawStatus = data ? ((data as any).status ?? (data as any).state ?? (data as any).taskStatus ?? 'undefined') : 'no-data';
    console.log(`[KIE-STATUS] 📦 task=${taskId.slice(0, 12)}... keys=[${rawKeys}] rawStatus=${rawStatus} raw=${JSON.stringify(result).slice(0, 400)}`);

    if (!data) return { status: 'pending' };

    const status = (data.status ?? (data as any).state ?? (data as any).taskStatus)?.toString().toLowerCase();

    if (status === 'completed' || status === 'success') {
      let url: string | undefined;

      if (typeof (data as any).resultJson === 'string') {
        try {
          const parsed = JSON.parse((data as any).resultJson);
          if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
            url = parsed.resultUrls[0];
          }
        } catch { /* ignore */ }
      }

      if (!url) {
        const output = data.output;
        if (Array.isArray(output) && output.length > 0) {
          url = output[0].url ?? output[0].video_url;
        } else if (typeof output === 'object' && output) {
          url = output.url ?? output.video_url;
        }
      }

      return url ? { status: 'completed', url } : { status: 'failed', error: 'No URL in completed result' };
    }

    if (status === 'failed' || status === 'fail' || status === 'error') {
      return { status: 'failed', error: (data as any).failMsg ?? 'Unknown error' };
    }

    return { status: 'pending' };
  }
}
