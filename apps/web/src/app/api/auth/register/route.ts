import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Proxy register to NestJS API → sets httpOnly cookies for the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const apiRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Error al crear cuenta' },
        { status: apiRes.status },
      );
    }

    // Set cookies from tokens returned by NestJS
    const response = NextResponse.json({
      ok: true,
      user: data.user,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    if (data.accessToken) {
      response.cookies.set('access-token', data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60,
      });
    }

    if (data.user?.id) {
      response.cookies.set('auth-user-id', data.user.id, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (data.user?.email) {
      response.cookies.set('auth-email', data.user.email, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: any) {
    console.error('[Register Proxy]', error);
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 502 },
    );
  }
}
