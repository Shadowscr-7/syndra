// ============================================================
// Edge TTS Voice Adapter — Microsoft Edge TTS (gratis, sin API key)
// Usa el CLI edge-tts (pip) o el endpoint público de Microsoft Edge
// ============================================================

import type { VoiceSynthesisAdapter, VoiceSynthesisOptions, SynthesizedAudio, VoiceInfo } from './voice-synthesis';
import { execFile } from 'child_process';
import { readFile as fsReadFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

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
    const words = text.split(/\s+/).length;
    const durationMs = Math.round((words / (150 * speed)) * 60 * 1000);

    // 1. Try edge-tts CLI (most reliable in Docker containers)
    try {
      const audioBuffer = await this.synthesizeViaCLI(text, voiceId, speed);
      if (audioBuffer && audioBuffer.byteLength > 0) {
        const base64 = Buffer.from(audioBuffer).toString('base64');
        return { url: `data:audio/mp3;base64,${base64}`, durationMs, provider: 'edge-tts-cli', voiceId };
      }
    } catch {
      // CLI not available, try REST
    }

    // 2. Try REST API fallback
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
      const audioBuffer = await this.synthesizeViaRest(ssml);
      if (audioBuffer && audioBuffer.byteLength > 0) {
        const base64 = Buffer.from(audioBuffer).toString('base64');
        return { url: `data:audio/mp3;base64,${base64}`, durationMs, provider: 'edge-tts', voiceId };
      }
    } catch {
      // REST also failed
    }

    throw new Error(`Edge TTS synthesis failed for voice ${voiceId} — both CLI and REST unavailable`);
  }

  private synthesizeViaCLI(text: string, voiceId: string, speed: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const outFile = join(tmpdir(), `tts-${randomUUID()}.mp3`);
      const rateStr = speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `${Math.round((speed - 1) * 100)}%`;
      const args = ['--voice', voiceId, '--rate', rateStr, '--text', text.slice(0, 2000), '--write-media', outFile];

      execFile('edge-tts', args, { timeout: 60_000 }, async (err) => {
        if (err) { reject(err); return; }
        try {
          const buf = await fsReadFile(outFile);
          await unlink(outFile).catch(() => {});
          resolve(buf);
        } catch (e) { reject(e); }
      });
    });
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
