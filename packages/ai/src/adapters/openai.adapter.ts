// ============================================================
// OpenAI LLM Adapter
// ============================================================

import type { LLMAdapter, LLMOptions, ChatMessage } from '../index';

/**
 * Adaptador para OpenAI (GPT-4o / GPT-4o-mini).
 * Usa el SDK oficial de OpenAI.
 */
export class OpenAIAdapter implements LLMAdapter {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model ?? 'gpt-4o-mini';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return data.choices[0]?.message.content ?? '';
  }
}
