// ============================================================
// API client helpers — Server-side fetch to NestJS API
// ============================================================

/**
 * Base URL de la API.
 * En Docker: http://api:3001 (internal network)
 * En dev: http://localhost:3001
 */
export function getApiUrl(): string {
  return process.env.API_URL || 'http://localhost:3001';
}

/**
 * Fetch helper para server components que llama a la API interna
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = `${getApiUrl()}${path}`;
    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
