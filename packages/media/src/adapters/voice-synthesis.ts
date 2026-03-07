// ============================================================
// Voice Synthesis Adapters — TTS para scripts de video
// ============================================================

export interface VoiceSynthesisAdapter {
  synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio>;
  listVoices(): Promise<VoiceInfo[]>;
}

export interface VoiceSynthesisOptions {
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  outputFormat?: 'mp3' | 'wav' | 'ogg';
}

export interface SynthesizedAudio {
  url: string;
  durationMs: number;
  provider: string;
  voiceId: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  preview_url?: string;
}

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// ============================================================
// ElevenLabs Adapter
// ============================================================

export interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId?: string;
}

export class ElevenLabsVoiceAdapter implements VoiceSynthesisAdapter {
  private readonly apiKey: string;
  private readonly defaultVoiceId: string;

  constructor(config: ElevenLabsConfig) {
    if (!config.apiKey) throw new Error('ElevenLabsVoiceAdapter requires apiKey');
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.defaultVoiceId ?? '21m00Tcm4TlvDq8ikWAM'; // Rachel
  }

  async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio> {
    const voiceId = options?.voiceId ?? this.defaultVoiceId;

    const res = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: options?.speed ?? 1.0,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`);
    }

    // ElevenLabs returns raw audio bytes
    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const format = options?.outputFormat ?? 'mp3';
    const dataUrl = `data:audio/${format};base64,${base64}`;

    // Estimate duration: ~150 words/min for Spanish
    const words = text.split(/\s+/).length;
    const estimatedDurationMs = Math.round((words / 150) * 60 * 1000);

    return {
      url: dataUrl,
      durationMs: estimatedDurationMs,
      provider: 'elevenlabs',
      voiceId,
    };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const res = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      voices?: Array<{
        voice_id: string;
        name: string;
        labels?: { language?: string; gender?: string };
        preview_url?: string;
      }>;
    };

    return (data.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      language: v.labels?.language ?? 'en',
      gender: (v.labels?.gender ?? 'neutral') as 'male' | 'female' | 'neutral',
      preview_url: v.preview_url,
    }));
  }
}

// ============================================================
// Mock Adapter (desarrollo sin API keys)
// ============================================================

export class MockVoiceAdapter implements VoiceSynthesisAdapter {
  async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio> {
    const words = text.split(/\s+/).length;
    const durationMs = Math.round((words / 150) * 60 * 1000);

    return {
      url: `https://mock-tts.dev/audio/${Date.now()}.mp3`,
      durationMs,
      provider: 'mock',
      voiceId: options?.voiceId ?? 'mock-voice-es',
    };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return [
      { id: 'mock-voice-es-f', name: 'Ana (Mock)', language: 'es', gender: 'female' },
      { id: 'mock-voice-es-m', name: 'Carlos (Mock)', language: 'es', gender: 'male' },
      { id: 'mock-voice-en-f', name: 'Rachel (Mock)', language: 'en', gender: 'female' },
    ];
  }
}
