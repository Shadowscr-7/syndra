// ============================================================
// Tipos del pipeline editorial
// ============================================================

export type EditorialStage =
  | 'research'
  | 'strategy'
  | 'content'
  | 'media'
  | 'compliance'
  | 'review'
  | 'approved'
  | 'publishing'
  | 'published';

export type ContentFormatType =
  | 'post'
  | 'carousel'
  | 'reel'
  | 'story'
  | 'avatar_video'
  | 'hybrid_motion';

export type TonePreset =
  | 'didáctico'
  | 'técnico'
  | 'aspiracional'
  | 'polémico'
  | 'premium'
  | 'cercano'
  | 'mentor'
  | 'vendedor_suave';

export type ObjectiveType =
  | 'authority'
  | 'traffic'
  | 'lead_capture'
  | 'sale'
  | 'community'
  | 'engagement';

export type PlatformType = 'instagram' | 'facebook';

export type ApprovalActionType =
  | 'approved'
  | 'correct_text'
  | 'change_tone'
  | 'regenerate_image'
  | 'convert_to_video'
  | 'make_avatar_video'
  | 'postpone'
  | 'rejected';

export interface ResearchItem {
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string | null;
  keyPoints: string[];
  suggestedAngle: string | null;
  relevanceScore: number;
}

export interface ContentBriefDTO {
  angle: string;
  format: ContentFormatType;
  cta: string;
  references: string[];
  seedPrompt: string;
  objective: string;
  tone: TonePreset;
}

export interface ContentVersionDTO {
  hook: string;
  copy: string;
  caption: string;
  title: string;
  hashtags: string[];
  version: number;
  isMain: boolean;
}

export interface TelegramPreview {
  editorialRunId: string;
  version: number;
  copy: string;
  caption: string;
  hook: string;
  format: ContentFormatType;
  targetChannels: PlatformType[];
  objective: string;
  cta: string;
  tone: string;
  themeSource: string;
  thumbnailUrl?: string;
}
