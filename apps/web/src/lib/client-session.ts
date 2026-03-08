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
 * Uses NEXT_PUBLIC_API_URL if set, otherwise defaults to localhost:3001.
 */
export function getClientApiUrl(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3001';
}
