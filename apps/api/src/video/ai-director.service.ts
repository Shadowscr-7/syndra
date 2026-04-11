// ============================================================
// AiDirectorService — Generates video storyboards via LLM
// Takes a topic or existing copy and returns a coordinated storyboard
// where avatar speech and scene prompts are semantically aligned.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIAdapter } from '@automatismos/ai';
import {
  buildAvatarDirectorSystemPrompt,
  buildAvatarDirectorFromTopicPrompt,
  buildAvatarDirectorFromCopyPrompt,
  type AvatarDirectorContext,
} from '@automatismos/ai';

// ── Types ─────────────────────────────────────────────────────

export interface AvatarSceneSegment {
  order: number;
  text: string;
  durationSeconds: number;
  scenePrompt: string;
  sceneStyle?: string;
  transition: 'cut' | 'dissolve' | 'fade';
}

export interface AvatarSceneStoryboard {
  compositeMode: 'overlay' | 'split' | 'full';
  overallMood: string;
  musicStyle: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
  segments: AvatarSceneSegment[];
  totalDurationSeconds: number;
}

export interface GenerateStoryboardFromTopicInput {
  topic: string;
  intent?: string;
  industry?: string;
  personaTone?: string;
  platform?: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
  durationTarget?: number;
  language?: string;
}

export interface GenerateStoryboardFromRunInput {
  editorialRunId: string;
  platform?: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
  durationTarget?: number;
}

// ── Service ───────────────────────────────────────────────────

@Injectable()
export class AiDirectorService {
  private readonly logger = new Logger(AiDirectorService.name);
  private readonly llm: OpenAIAdapter;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    this.llm = new OpenAIAdapter({ apiKey, model: 'gpt-4o' });
  }

  // ── Public API ────────────────────────────────────────────

  /**
   * Generate a storyboard from a free topic + intent description.
   */
  async fromTopic(input: GenerateStoryboardFromTopicInput): Promise<AvatarSceneStoryboard> {
    const ctx: AvatarDirectorContext = {
      topic: input.topic,
      intent: input.intent,
      industry: input.industry,
      personaTone: input.personaTone,
      platform: input.platform ?? 'reels',
      language: input.language ?? 'es',
      durationTarget: input.durationTarget ?? 30,
    };

    this.logger.log(`AiDirector: generating storyboard from topic — "${input.topic}"`);

    const raw = await this.llm.chat(
      [
        { role: 'system', content: buildAvatarDirectorSystemPrompt() },
        { role: 'user', content: buildAvatarDirectorFromTopicPrompt(ctx) },
      ],
      { temperature: 0.7, maxTokens: 1500 },
    );

    return this.parseAndValidate(raw);
  }

  /**
   * Generate a storyboard from an existing editorial run (copy + brief).
   */
  async fromEditorialRun(input: GenerateStoryboardFromRunInput): Promise<AvatarSceneStoryboard> {
    const run = await this.prisma.editorialRun.findUniqueOrThrow({
      where: { id: input.editorialRunId },
      include: {
        contentBrief: {
          include: {
            contentVersions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        campaign: {
          include: { workspace: true },
        },
        userPersona: true,
      },
    });

    const latestVersion = run.contentBrief?.contentVersions[0];
    const brief = run.contentBrief;

    const copy = latestVersion?.copy ?? latestVersion?.caption ?? brief?.angle ?? '';
    const intent = brief?.objective ?? 'informar y generar interés';
    const industry = (run.campaign?.workspace as any)?.industry ?? '';
    const personaTone = (run.userPersona as any)?.tone ?? 'profesional';

    if (!copy) {
      throw new Error(`EditorialRun ${input.editorialRunId} has no content to convert to storyboard`);
    }

    const ctx: AvatarDirectorContext = {
      copy,
      intent,
      industry,
      personaTone,
      platform: input.platform ?? 'reels',
      language: 'es',
      durationTarget: input.durationTarget ?? 30,
    };

    this.logger.log(`AiDirector: generating storyboard from run ${input.editorialRunId}`);

    const raw = await this.llm.chat(
      [
        { role: 'system', content: buildAvatarDirectorSystemPrompt() },
        { role: 'user', content: buildAvatarDirectorFromCopyPrompt(ctx) },
      ],
      { temperature: 0.6, maxTokens: 1500 },
    );

    return this.parseAndValidate(raw);
  }

  // ── Private ───────────────────────────────────────────────

  private parseAndValidate(raw: string): AvatarSceneStoryboard {
    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.error(`AiDirector: LLM returned invalid JSON — ${raw.slice(0, 300)}`);
      throw new Error('AiDirector: LLM returned invalid JSON for storyboard');
    }

    // Validate required fields
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      throw new Error('AiDirector: storyboard has no segments');
    }

    // Normalize and fill defaults
    const segments: AvatarSceneSegment[] = parsed.segments.map((s: any, i: number) => ({
      order: s.order ?? i,
      text: s.text ?? '',
      durationSeconds: this.estimateDuration(s.text ?? '', s.durationSeconds),
      scenePrompt: s.scenePrompt ?? s.scene_prompt ?? '',
      sceneStyle: s.sceneStyle ?? s.scene_style,
      transition: (['cut', 'dissolve', 'fade'].includes(s.transition) ? s.transition : 'dissolve') as any,
    }));

    const totalDurationSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);

    return {
      compositeMode: (['overlay', 'split', 'full'].includes(parsed.compositeMode)
        ? parsed.compositeMode
        : 'overlay') as any,
      overallMood: parsed.overallMood ?? parsed.overall_mood ?? 'profesional',
      musicStyle: (['upbeat', 'calm', 'corporate', 'energetic', 'cinematic'].includes(parsed.musicStyle)
        ? parsed.musicStyle
        : 'cinematic') as any,
      segments,
      totalDurationSeconds,
    };
  }

  /**
   * Estimate speech duration: ~150 words per minute.
   * Uses LLM-provided value if reasonable, otherwise calculates from word count.
   */
  private estimateDuration(text: string, provided?: number): number {
    const words = text.trim().split(/\s+/).length;
    const calculated = Math.max(2, Math.round((words / 150) * 60));

    if (provided && provided >= 2 && provided <= 30) {
      return provided;
    }
    return calculated;
  }
}
