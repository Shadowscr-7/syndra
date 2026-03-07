// ============================================================
// Anthropic (Claude) LLM Adapter
// ============================================================

import type { LLMAdapter, LLMOptions, ChatMessage } from '../index';

/**
 * Adaptador para Anthropic (Claude 3.5 Sonnet / Haiku).
 * Usa la API HTTP directamente sin SDK.
 */
export class AnthropicAdapter implements LLMAdapter {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model ?? 'claude-3-5-sonnet-20241022';
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    return this.chat(
      [{ role: 'user', content: prompt }],
      options,
    );
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const model = options?.model ?? this.defaultModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 2048;

    // Anthropic requiere separar los system messages
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: chatMessages,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const textBlock = data.content.find((c) => c.type === 'text');
    return textBlock?.text ?? '';
  }
}
