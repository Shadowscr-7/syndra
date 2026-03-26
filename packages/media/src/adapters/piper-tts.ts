// ============================================================
// Piper TTS Adapter — Offline, free, natural-sounding TTS
// Uses piper binary with ONNX voice models
// Requires: piper binary + model files in Docker image
// ============================================================

import type { VoiceSynthesisAdapter, VoiceSynthesisOptions, SynthesizedAudio, VoiceInfo } from './voice-synthesis';
import { execFile } from 'child_process';
import { readFile as fsReadFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';

// Available Piper voices for Spanish
const PIPER_VOICES: VoiceInfo[] = [
  { id: 'es_ES-sharvard-medium', name: 'Sharvard (España)', language: 'es-ES', gender: 'male' },
  { id: 'es_ES-davefx-medium', name: 'DaveFX (España)', language: 'es-ES', gender: 'male' },
  { id: 'es_MX-ald-medium', name: 'Ald (México)', language: 'es-MX', gender: 'male' },
  { id: 'en_US-amy-medium', name: 'Amy (US English)', language: 'en-US', gender: 'female' },
  { id: 'en_US-lessac-medium', name: 'Lessac (US English)', language: 'en-US', gender: 'male' },
];

// Map Edge TTS voice IDs to Piper model names by language prefix
const EDGE_TO_PIPER_MAP: Record<string, string> = {
  'es-AR': 'es_ES-sharvard-medium',
  'es-MX': 'es_MX-ald-medium',
  'es-ES': 'es_ES-sharvard-medium',
  'es-CO': 'es_ES-sharvard-medium',
  'es-CL': 'es_ES-sharvard-medium',
  'en-US': 'en_US-amy-medium',
  'en-GB': 'en_US-lessac-medium',
};

export class PiperTTSAdapter implements VoiceSynthesisAdapter {
  private readonly piperBin: string;
  private readonly modelsDir: string;
  private readonly defaultVoice: string;

  constructor(options?: { piperBin?: string; modelsDir?: string; defaultVoice?: string }) {
    this.piperBin = options?.piperBin ?? process.env.PIPER_BIN ?? '/usr/bin/piper';
    this.modelsDir = options?.modelsDir ?? process.env.PIPER_MODELS_DIR ?? '/opt/piper-models';
    this.defaultVoice = options?.defaultVoice ?? 'es_ES-sharvard-medium';
  }

  /**
   * Check if Piper binary and at least one model are available.
   */
  static isAvailable(): boolean {
    const piperBin = process.env.PIPER_BIN ?? '/usr/bin/piper';
    const modelsDir = process.env.PIPER_MODELS_DIR ?? '/opt/piper-models';
    return existsSync(piperBin) && existsSync(modelsDir);
  }

  async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<SynthesizedAudio> {
    const rawVoiceId = options?.voiceId ?? this.defaultVoice;
    const speed = options?.speed ?? 1.0;

    // Resolve Edge TTS voice IDs (e.g. "es-AR-ElenaNeural") to Piper model names
    const voiceId = this.resolvePiperVoice(rawVoiceId);

    const modelPath = join(this.modelsDir, `${voiceId}.onnx`);
    if (!existsSync(modelPath)) {
      throw new Error(`Piper model not found: ${modelPath}. Available models should be in ${this.modelsDir}`);
    }

    const tmpId = randomUUID();
    const wavPath = join(tmpdir(), `piper_${tmpId}.wav`);
    const mp3Path = join(tmpdir(), `piper_${tmpId}.mp3`);

    try {
      // 1. Generate WAV with Piper
      await this.runPiper(text, voiceId, modelPath, wavPath, speed);

      // 2. Convert WAV → MP3 with ffmpeg
      await this.wavToMp3(wavPath, mp3Path);

      // 3. Read MP3 and convert to data URL
      const mp3Data = await fsReadFile(mp3Path);
      const base64 = mp3Data.toString('base64');

      // 4. Estimate duration (Piper doesn't provide exact timestamps)
      const durationMs = await this.estimateAudioDuration(wavPath);

      // 5. Generate estimated subtitle timing
      const subtitlesVtt = this.generateEstimatedVtt(text, durationMs);

      return {
        url: `data:audio/mp3;base64,${base64}`,
        durationMs,
        provider: 'piper',
        voiceId,
        subtitlesVtt,
      };
    } finally {
      // Cleanup temp files
      await unlink(wavPath).catch(() => {});
      await unlink(mp3Path).catch(() => {});
    }
  }

  async listVoices(): Promise<VoiceInfo[]> {
    // Return only voices that have models downloaded
    return PIPER_VOICES.filter(v => {
      const modelPath = join(this.modelsDir, `${v.id}.onnx`);
      return existsSync(modelPath);
    });
  }

  /**
   * Resolve an Edge TTS voice ID (e.g. "es-AR-ElenaNeural") to a Piper model name.
   * If already a Piper model name (contains underscore), returns as-is.
   */
  private resolvePiperVoice(voiceId: string): string {
    // Already a Piper voice (e.g. "es_ES-sharvard-medium")
    if (voiceId.includes('_')) return voiceId;

    // Try mapping by language prefix (e.g. "es-AR" from "es-AR-ElenaNeural")
    const parts = voiceId.split('-');
    if (parts.length >= 2) {
      const langPrefix = `${parts[0]}-${parts[1]}`;
      if (EDGE_TO_PIPER_MAP[langPrefix]) return EDGE_TO_PIPER_MAP[langPrefix];
    }

    // Fallback by first segment (es → Spanish, en → English)
    if (parts[0] === 'es') return 'es_ES-sharvard-medium';
    if (parts[0] === 'en') return 'en_US-amy-medium';

    return this.defaultVoice;
  }

  private runPiper(text: string, voiceId: string, modelPath: string, outputPath: string, speed: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const lengthScale = speed > 0 ? (1 / speed) : 1.0;

      const proc = execFile(
        this.piperBin,
        [
          '--model', modelPath,
          '--output_file', outputPath,
          '--length_scale', lengthScale.toFixed(2),
        ],
        { timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
        (error) => {
          if (error) reject(new Error(`Piper failed: ${error.message}`));
          else resolve();
        },
      );

      // Pipe text to stdin
      if (proc.stdin) {
        proc.stdin.write(text);
        proc.stdin.end();
      }
    });
  }

  private wavToMp3(wavPath: string, mp3Path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', wavPath,
        '-codec:a', 'libmp3lame',
        '-qscale:a', '4',
        '-y',
        mp3Path,
      ], { timeout: 30000 }, (error) => {
        if (error) reject(new Error(`FFmpeg wav→mp3 failed: ${error.message}`));
        else resolve();
      });
    });
  }

  private async estimateAudioDuration(wavPath: string): Promise<number> {
    try {
      const wavData = await fsReadFile(wavPath);
      // WAV header: bytes 28-31 = byte rate, total audio = filesize - 44
      if (wavData.byteLength < 44) return 5000;
      const byteRate = wavData.readUInt32LE(28);
      const audioBytes = wavData.byteLength - 44;
      return byteRate > 0 ? Math.round((audioBytes / byteRate) * 1000) : 5000;
    } catch {
      return 5000;
    }
  }

  /**
   * Generate estimated VTT subtitles based on word count and duration.
   * Since Piper doesn't provide word-level timestamps, we distribute evenly.
   */
  private generateEstimatedVtt(text: string, totalDurationMs: number): string {
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return '';

    const totalWords = text.split(/\s+/).length;
    let lines = ['WEBVTT', ''];
    let currentMs = 0;

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).length;
      const durationMs = Math.round((wordCount / totalWords) * totalDurationMs);
      const startTime = this.msToVttTime(currentMs);
      currentMs += durationMs;
      const endTime = this.msToVttTime(currentMs);
      lines.push(`${startTime} --> ${endTime}`);
      lines.push(sentence);
      lines.push('');
    }

    return lines.join('\n');
  }

  private msToVttTime(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
}
