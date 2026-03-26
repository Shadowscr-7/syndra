// ============================================================
// Edge TTS Voice Adapter — Microsoft Edge TTS (gratis, sin API key)
// Usa el CLI edge-tts (pip) con --write-subtitles para timing real
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

export class EdgeTTSAdapter implements VoiceSynthesisAdapter {
  private readonly defaultVoice: string;

  constructor(defaultVoice?: string) {
    this.defaultVoice = defaultVoice ?? 'es-AR-ElenaNeural';
  }

  async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio> {
    const voiceId = options?.voiceId ?? this.defaultVoice;
    const speed = options?.speed ?? 1.0;

    // Pre-process text for more natural speech pauses
    const naturalText = this.addNaturalPauses(text);

    // 1. Try edge-tts CLI with --write-subtitles for word-level timing
    try {
      const result = await this.synthesizeViaCLI(naturalText, voiceId, speed);
      if (result.audio && result.audio.byteLength > 0) {
        const base64 = Buffer.from(result.audio).toString('base64');
        return {
          url: `data:audio/mp3;base64,${base64}`,
          durationMs: result.durationMs,
          provider: 'edge-tts-cli',
          voiceId,
          subtitlesVtt: result.vtt,
        };
      }
    } catch {
      // CLI not available, try REST
    }

    // 2. REST API fallback (no subtitle timing)
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceId.split('-').slice(0, 2).join('-')}">
        <voice name="${voiceId}">
          <prosody rate="${rateStr}">
            ${escapeXml(naturalText)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    try {
      const audioBuffer = await this.synthesizeViaRest(ssml);
      if (audioBuffer && audioBuffer.byteLength > 0) {
        const words = text.split(/\s+/).length;
        const durationMs = Math.round((words / (150 * speed)) * 60 * 1000);
        const base64 = Buffer.from(audioBuffer).toString('base64');
        return { url: `data:audio/mp3;base64,${base64}`, durationMs, provider: 'edge-tts', voiceId };
      }
    } catch {
      // REST also failed
    }

    throw new Error(`Edge TTS synthesis failed for voice ${voiceId} — both CLI and REST unavailable`);
  }

  /** Add natural pauses to make TTS sound more human */
  private addNaturalPauses(text: string): string {
    return text
      // Add comma before conjunctions if missing (natural breathing)
      .replace(/([a-záéíóúñ]{4,})\s+(y|pero|porque|aunque|sin embargo|además|también)\s/gi,
        (_, word, conj) => `${word}, ${conj} `)
      // Ensure spacing after colons/semicolons
      .replace(/([;:])\s*/g, '$1 ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private synthesizeViaCLI(
    text: string,
    voiceId: string,
    speed: number,
  ): Promise<{ audio: Buffer; vtt?: string; durationMs: number }> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const outFile = join(tmpdir(), `tts-${id}.mp3`);
      const vttFile = join(tmpdir(), `tts-${id}.vtt`);
      const rateStr = speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `${Math.round((speed - 1) * 100)}%`;
      const args = [
        '--voice', voiceId,
        '--rate', rateStr,
        '--text', text.slice(0, 2000),
        '--write-media', outFile,
        '--write-subtitles', vttFile,
      ];

      execFile('edge-tts', args, { timeout: 120_000 }, async (err) => {
        if (err) { reject(err); return; }
        try {
          const audio = await fsReadFile(outFile);
          let vtt: string | undefined;
          try { vtt = await fsReadFile(vttFile, 'utf-8'); } catch { /* VTT optional */ }

          // Get actual audio duration via ffprobe
          let durationMs = 0;
          try {
            durationMs = await this.getAudioDurationMs(outFile);
          } catch {
            const words = text.split(/\s+/).length;
            durationMs = Math.round((words / (150 * speed)) * 60 * 1000);
          }

          await unlink(outFile).catch(() => {});
          await unlink(vttFile).catch(() => {});
          resolve({ audio, vtt, durationMs });
        } catch (e) { reject(e); }
      });
    });
  }

  private getAudioDurationMs(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      execFile('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
      ], { timeout: 10_000 }, (err, stdout) => {
        if (err || !stdout.trim()) reject(err ?? new Error('no duration'));
        else resolve(Math.round(parseFloat(stdout.trim()) * 1000));
      });
    });
  }

  private async synthesizeViaRest(ssml: string): Promise<ArrayBuffer | null> {
    const tokenUrl = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
    try {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) return null;

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
