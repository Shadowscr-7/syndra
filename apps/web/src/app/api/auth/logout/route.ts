import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  // Call NestJS logout to invalidate refresh token
  const refreshToken = cookieStore.get('refresh-token')?.value;
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh-token=${refreshToken}`,
        },
      });
    } catch {
      // Best effort — still clear local cookies
    }
  }

  // Clear all auth cookies
  cookieStore.delete('access_token');
  cookieStore.delete('refresh-token');
  cookieStore.delete('auth-user-id');
  cookieStore.delete('auth-email');
  cookieStore.delete('workspace-id');

  return NextResponse.json({ ok: true });
}
