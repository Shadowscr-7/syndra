// ============================================================
// Client-side session helpers — safe for 'use client' components
// ============================================================

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function getClientSession() {
  const userId = getCookie('auth-user-id');
  const email = getCookie('auth-email');
  const workspaceId = getCookie('workspace-id');
  return { userId, email, workspaceId };
}

/**
 * API base URL for client-side fetch calls.
 * In browser: uses same-origin /api proxy routes (avoids cross-origin cookie issues).
 * Server-side: calls NestJS directly.
 */
export function getClientApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return url.endsWith('/api') ? url : `${url}/api`;
}
