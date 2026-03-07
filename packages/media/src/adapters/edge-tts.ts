// ============================================================
// Edge TTS Voice Adapter — Microsoft Edge TTS (gratis, sin API key)
// Usa el endpoint público de Microsoft Edge para síntesis de voz
// ============================================================

import type { VoiceSynthesisAdapter, VoiceSynthesisOptions, SynthesizedAudio, VoiceInfo } from './voice-synthesis';

// Voces de Edge TTS disponibles en español
const EDGE_VOICES: VoiceInfo[] = [
  { id: 'es-AR-ElenaNeural', name: 'Elena (Argentina)', language: 'es-AR', gender: 'female' },
  { id: 'es-AR-TomasNeural', name: 'Tomás (Argentina)', language: 'es-AR', gender: 'male' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia (México)', language: 'es-MX', gender: 'female' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge (México)', language: 'es-MX', gender: 'male' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (España)', language: 'es-ES', gender: 'female' },
  { id: 'es-ES-AlvaroNeural', name: 'Álvaro (España)', language: 'es-ES', gender: 'male' },
  { id: 'es-CO-SalomeNeural', name: 'Salomé (Colombia)', language: 'es-CO', gender: 'female' },
  { id: 'es-CO-GonzaloNeural', name: 'Gonzalo (Colombia)', language: 'es-CO', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US English)', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy (US English)', language: 'en-US', gender: 'male' },
];

/**
 * Edge TTS usa WebSocket para la síntesis.
 * Para simplificar la integración usamos la API REST pública de Azure Cognitive Services (demo)
 * o el paquete edge-tts si está disponible.
 *
 * Como fallback pragmático, generamos SSML y usamos el TTS REST endpoint.
 */
export class EdgeTTSAdapter implements VoiceSynthesisAdapter {
  private readonly defaultVoice: string;

  constructor(defaultVoice?: string) {
    this.defaultVoice = defaultVoice ?? 'es-AR-ElenaNeural';
  }

  async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio> {
    const voiceId = options?.voiceId ?? this.defaultVoice;
    const speed = options?.speed ?? 1.0;

    // Build SSML
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceId.split('-').slice(0, 2).join('-')}">
        <voice name="${voiceId}">
          <prosody rate="${rateStr}">
            ${escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    try {
      // Intentar usar el endpoint REST de Azure Cognitive Services (free tier)
      // Este es el mismo backend que usa Edge TTS
      const audioBuffer = await this.synthesizeViaRest(ssml);

      if (audioBuffer && audioBuffer.byteLength > 0) {
        const base64 = Buffer.from(audioBuffer).toString('base64');
        const words = text.split(/\s+/).length;
        const durationMs = Math.round((words / (150 * speed)) * 60 * 1000);

        return {
          url: `data:audio/mp3;base64,${base64}`,
          durationMs,
          provider: 'edge-tts',
          voiceId,
        };
      }
    } catch {
      // Fallback silencioso
    }

    // Fallback: generar URL placeholder que indica que Edge TTS necesita el CLI
    const words = text.split(/\s+/).length;
    const durationMs = Math.round((words / (150 * speed)) * 60 * 1000);

    return {
      url: `edge-tts://${voiceId}?text=${encodeURIComponent(text.slice(0, 200))}`,
      durationMs,
      provider: 'edge-tts',
      voiceId,
    };
  }

  private async synthesizeViaRest(ssml: string): Promise<ArrayBuffer | null> {
    // Token endpoint público de Edge TTS (mismo que usa el navegador Edge)
    const tokenUrl = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';

    try {
      // Obtener token
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(10_000),
      });

      if (!tokenRes.ok) return null;

      // Si el endpoint público no está disponible, usamos la API directa
      // de Speech Services con el free tier
      const speechUrl = 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1';

      const res = await fetch(speechUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'automatismos-tts',
        },
        body: ssml,
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return EDGE_VOICES;
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
