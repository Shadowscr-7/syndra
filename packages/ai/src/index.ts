// ============================================================
// @automatismos/ai — LLM adapters, prompts, utils & evaluators
// ============================================================

// --- Interfaces base ---

/**
 * Interface base para adaptadores de LLM.
 * Permite cambiar de proveedor sin reescribir lógica.
 */
export interface LLMAdapter {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// --- Adapters ---
export { OpenAIAdapter } from './adapters/openai.adapter';
export { AnthropicAdapter } from './adapters/anthropic.adapter';

// --- Prompts ---
export * from './prompts/index';

// --- Utils ---
export * from './utils/index';

// --- Placeholder (fallback para desarrollo) ---
export class PlaceholderLLMAdapter implements LLMAdapter {
  async complete(prompt: string): Promise<string> {
    return `[PLACEHOLDER] Response for: ${prompt.substring(0, 50)}...`;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    return `[PLACEHOLDER] Chat response for: ${lastMessage?.content.substring(0, 50)}...`;
  }
}
