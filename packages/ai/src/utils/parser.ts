// ============================================================
// LLM Response Parser — extracción segura de JSON de respuestas LLM
// ============================================================

/**
 * Extrae JSON de una respuesta de LLM que puede incluir texto extra,
 * markdown code blocks, etc.
 */
export function parseLLMJsonResponse<T = unknown>(raw: string): T {
  // Intentar parsear directamente
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Buscar bloques de código JSON
    const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1]) as T;
      } catch {
        // Continuar con otros métodos
      }
    }

    // Buscar el primer { ... } o [ ... ]
    const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch {
        // Si nada funciona
      }
    }

    throw new Error(`Could not parse JSON from LLM response: ${raw.substring(0, 200)}...`);
  }
}

/**
 * Extrae JSON de forma segura, devolviendo null si falla
 */
export function safeParseLLMJson<T = unknown>(raw: string): T | null {
  try {
    return parseLLMJsonResponse<T>(raw);
  } catch {
    return null;
  }
}

/**
 * Limpia una respuesta LLM de artefactos comunes
 */
export function cleanLLMResponse(raw: string): string {
  return raw
    .replace(/```(?:json)?\s*\n?/g, '')
    .replace(/```/g, '')
    .trim();
}
