// ============================================================
// Event types para comunicación entre módulos
// ============================================================

export interface QueueJobBase {
  jobId: string;
  editorialRunId: string;
  workspaceId: string;
  timestamp: string;
  attempt: number;
}

export interface EditorialJob extends QueueJobBase {
  type: 'editorial_pipeline';
  stage: 'research' | 'strategy' | 'content' | 'media' | 'compliance' | 'review';
}

export interface MediaJob extends QueueJobBase {
  type: 'generate_image' | 'generate_carousel' | 'process_media';
  contentVersionId: string;
  prompt?: string;
  format?: string;
}

export interface PublishJob extends QueueJobBase {
  type: 'publish';
  platform: 'instagram' | 'facebook';
  contentVersionId: string;
}

export interface VideoJob extends QueueJobBase {
  type: 'generate_video' | 'generate_avatar';
  scriptId: string;
  duration?: number;
}

export interface AnalyticsJob extends QueueJobBase {
  type: 'collect_metrics';
  publicationId: string;
  platform: 'instagram' | 'facebook';
}

export type QueueJob = EditorialJob | MediaJob | PublishJob | VideoJob | AnalyticsJob;
