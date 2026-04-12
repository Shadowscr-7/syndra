// ============================================================
// Assistant Service — AI chat with Syndra context + tools
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { buildSystemPrompt } from './prompts/system.prompt';
import type { AssistantChatMessage, AssistantProfile, ChatRequestDto } from './dto/chat.dto';

// ── OpenAI types ─────────────────────────────────────────────

interface OAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: OAIToolCall[];
}

interface OAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OAIToolCall[];
    };
    finish_reason: string;
  }>;
}

// ── Session store ─────────────────────────────────────────────

interface Session {
  profile: AssistantProfile;
  history: AssistantChatMessage[];
  lastActive: number;
}

const MAX_HISTORY = 20; // messages kept per session
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Tool definitions ──────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_workspace_status',
      description:
        'Returns a summary of what the user has configured in their Syndra workspace: personas, content profiles, connected social channels, and recent editorial activity. Call this when you need to give personalized advice based on their actual setup.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_setup_checklist',
      description:
        'Returns the onboarding checklist with which steps the user has completed and which are still pending. Call this when the user asks about getting started, what to do next, or how to set up Syndra.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_publications',
      description:
        'Returns the last 5 editorial runs (publications) with their status. Call this when the user asks about their publications, content queue, or editorial history.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of publications to return (1-10, default 5)',
          },
        },
        required: [],
      },
    },
  },
] as const;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly sessions = new Map<string, Session>();
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.model = this.config.get<string>('ASSISTANT_MODEL', 'gpt-4o-mini');
    // Clean up stale sessions every 30 minutes
    setInterval(() => this.pruneSessions(), 30 * 60 * 1000);
  }

  // ── Public API ────────────────────────────────────────────

  async chat(
    userId: string,
    workspaceId: string,
    dto: ChatRequestDto,
  ): Promise<{ message: string; sessionId: string }> {
    const sessionKey = dto.sessionId
      ? `${userId}:${dto.sessionId}`
      : `${userId}:default`;

    // Get or create session
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, {
        profile: dto.profile ?? 'GENERATOR',
        history: [],
        lastActive: Date.now(),
      });
    }

    const session = this.sessions.get(sessionKey)!;
    // Update profile if provided
    if (dto.profile) session.profile = dto.profile;
    session.lastActive = Date.now();

    // Add user message to history
    session.history.push({ role: 'user', content: dto.message });
    // Trim history to keep only last N messages
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }

    try {
      const reply = await this.runConversation(
        userId,
        workspaceId,
        session,
        dto.currentPage,
      );

      // Add assistant reply to history
      session.history.push({ role: 'assistant', content: reply });

      return {
        message: reply,
        sessionId: sessionKey.split(':')[1] ?? 'default',
      };
    } catch (err) {
      this.logger.error('Assistant chat error', err);
      throw err;
    }
  }

  clearSession(userId: string, sessionId = 'default'): void {
    this.sessions.delete(`${userId}:${sessionId}`);
  }

  // ── Core conversation loop ────────────────────────────────

  private async runConversation(
    userId: string,
    workspaceId: string,
    session: Session,
    currentPage?: string,
  ): Promise<string> {
    const systemPrompt = buildSystemPrompt(session.profile, '', currentPage);

    // Build messages array for OpenAI
    const messages: OAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...session.history.slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      // Last message is the current user turn (already added to history)
      {
        role: 'user' as const,
        content: session.history[session.history.length - 1]?.content ?? '',
      },
    ];

    // First call — may include tool use
    const firstResponse = await this.callOpenAI(messages, true);
    const firstChoice = firstResponse.choices[0];

    if (!firstChoice) throw new Error('No response from OpenAI');

    // If no tool calls, return content directly
    if (!firstChoice.message.tool_calls?.length) {
      return firstChoice.message.content ?? 'Lo siento, no pude generar una respuesta.';
    }

    // Process tool calls
    const toolCallMsg: OAIMessage = {
      role: 'assistant',
      content: firstChoice.message.content,
      tool_calls: firstChoice.message.tool_calls,
    };
    messages.push(toolCallMsg);

    for (const toolCall of firstChoice.message.tool_calls) {
      const result = await this.executeTool(
        toolCall.function.name,
        toolCall.function.arguments,
        userId,
        workspaceId,
      );
      messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }

    // Second call with tool results — get final answer
    const secondResponse = await this.callOpenAI(messages, false);
    return (
      secondResponse.choices[0]?.message.content ??
      'Lo siento, no pude generar una respuesta.'
    );
  }

  // ── OpenAI call ────────────────────────────────────────────

  private async callOpenAI(
    messages: OAIMessage[],
    includeTools: boolean,
  ): Promise<OAIResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    };

    if (includeTools) {
      body.tools = TOOLS;
      body.tool_choice = 'auto';
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }

    return res.json() as Promise<OAIResponse>;
  }

  // ── Tool execution ─────────────────────────────────────────

  private async executeTool(
    name: string,
    argsJson: string,
    userId: string,
    workspaceId: string,
  ): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson);
    } catch {
      // ignore parse error, use defaults
    }

    switch (name) {
      case 'get_workspace_status':
        return this.toolGetWorkspaceStatus(userId, workspaceId);
      case 'get_setup_checklist':
        return this.toolGetSetupChecklist(userId, workspaceId);
      case 'get_recent_publications':
        return this.toolGetRecentPublications(
          workspaceId,
          typeof args.limit === 'number' ? args.limit : 5,
        );
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // ── Tool implementations ───────────────────────────────────

  private async toolGetWorkspaceStatus(
    userId: string,
    workspaceId: string,
  ): Promise<unknown> {
    try {
      const [personas, profiles, channels, workspace] = await Promise.all([
        this.prisma.userPersona.count({ where: { userId } }),
        this.prisma.contentProfile.count({ where: { userId } }),
        this.prisma.apiCredential.count({
          where: { workspaceId, isActive: true },
        }),
        this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { name: true, industry: true },
        }),
      ]);

      return {
        workspace: {
          name: workspace?.name ?? 'Mi workspace',
          industry: workspace?.industry ?? 'No especificada',
        },
        setup: {
          personas,
          contentProfiles: profiles,
          connectedChannels: channels,
        },
      };
    } catch (err) {
      this.logger.warn('toolGetWorkspaceStatus error', err);
      return { error: 'Could not fetch workspace status' };
    }
  }

  private async toolGetSetupChecklist(
    userId: string,
    workspaceId: string,
  ): Promise<unknown> {
    try {
      const [
        personaCount,
        profileCount,
        channelCount,
        briefCount,
        scheduleCount,
        publicationCount,
        telegramLink,
      ] = await Promise.all([
        this.prisma.userPersona.count({ where: { userId } }),
        this.prisma.contentProfile.count({ where: { userId } }),
        this.prisma.apiCredential.count({
          where: { workspaceId, isActive: true },
        }),
        this.prisma.businessBrief.count({ where: { workspaceId } }),
        this.prisma.publishSchedule.count({ where: { userId } }),
        this.prisma.editorialRun.count({
          where: { workspaceId, status: { in: ['PUBLISHED', 'APPROVED'] } },
        }),
        this.prisma.telegramLink.findFirst({
          where: { userId, isActive: true },
          select: { id: true },
        }),
      ]);

      return {
        checklist: [
          {
            step: 1,
            label: 'Crear Persona de IA',
            done: personaCount > 0,
            path: '/dashboard/personas',
          },
          {
            step: 2,
            label: 'Crear Perfil de contenido',
            done: profileCount > 0,
            path: '/dashboard/profiles',
          },
          {
            step: 3,
            label: 'Conectar red social',
            done: channelCount > 0,
            path: '/dashboard/credentials',
          },
          {
            step: 4,
            label: 'Agregar contenido (Brief o fuente RSS)',
            done: briefCount > 0,
            path: '/dashboard/my-business/briefs',
          },
          {
            step: 5,
            label: 'Configurar horario de publicación',
            done: scheduleCount > 0,
            path: '/dashboard/schedules',
          },
          {
            step: 6,
            label: 'Conectar Telegram para aprobaciones',
            done: !!telegramLink,
            path: '/dashboard/settings',
          },
          {
            step: 7,
            label: 'Primera publicación aprobada',
            done: publicationCount > 0,
            path: '/dashboard/editorial',
          },
        ],
        completedSteps: [
          personaCount > 0,
          profileCount > 0,
          channelCount > 0,
          briefCount > 0,
          scheduleCount > 0,
          !!telegramLink,
          publicationCount > 0,
        ].filter(Boolean).length,
        totalSteps: 7,
      };
    } catch (err) {
      this.logger.warn('toolGetSetupChecklist error', err);
      return { error: 'Could not fetch checklist' };
    }
  }

  private async toolGetRecentPublications(
    workspaceId: string,
    limit: number,
  ): Promise<unknown> {
    const safeLimit = Math.min(Math.max(limit, 1), 10);
    try {
      const runs = await this.prisma.editorialRun.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          status: true,
          createdAt: true,
          contentBrief: {
            select: { angle: true, format: true },
          },
        },
      });

      return {
        publications: runs.map((r) => ({
          title: r.contentBrief?.angle ?? 'Sin título',
          format: r.contentBrief?.format ?? 'POST',
          status: r.status,
          createdAt: r.createdAt,
        })),
        total: runs.length,
      };
    } catch (err) {
      this.logger.warn('toolGetRecentPublications error', err);
      return { error: 'Could not fetch publications' };
    }
  }

  // ── Session cleanup ────────────────────────────────────────

  private pruneSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActive > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }
}
