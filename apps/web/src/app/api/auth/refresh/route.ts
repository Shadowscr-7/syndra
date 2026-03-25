import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * POST /api/auth/refresh
 * Uses the refresh-token cookie to get a new access_token from the backend.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 },
      );
    }

    const apiRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      // Refresh failed — clear cookies so user gets redirected to login
      const errResponse = NextResponse.json(
        { error: data.message || 'Refresh failed' },
        { status: 401 },
      );
      errResponse.cookies.delete('access_token');
      errResponse.cookies.delete('refresh-token');
      return errResponse;
    }

    const response = NextResponse.json({ ok: true, accessToken: data.accessToken });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    if (data.accessToken) {
      response.cookies.set('access_token', data.accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24, // 24h
      });
    }

    if (data.refreshToken) {
      response.cookies.set('refresh-token', data.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    console.error('[Refresh Proxy]', error);
    return NextResponse.json(
      { error: 'Error refreshing token' },
      { status: 502 },
    );
  }
}
