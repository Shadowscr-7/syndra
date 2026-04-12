// ============================================================
// Assistant Chat DTOs
// ============================================================

export type AssistantProfile = 'CREATIVE' | 'BUSINESS' | 'GENERATOR';

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatRequestDto {
  message!: string;
  profile?: AssistantProfile;
  sessionId?: string;
  currentPage?: string; // e.g. '/dashboard/personas', '/dashboard/editorial'
}
