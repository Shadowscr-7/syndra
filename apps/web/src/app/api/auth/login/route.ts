import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Proxy login to NestJS API → sets httpOnly cookies for the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const apiRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Error al iniciar sesión' },
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

    // Store JWT tokens as httpOnly cookies
    if (data.accessToken) {
      response.cookies.set('access-token', data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60, // 15 min
      });
    }

    // Also store legacy cookies for backward compatibility during migration
    if (data.user?.id) {
      response.cookies.set('auth-user-id', data.user.id, {
        ...cookieOptions,
        httpOnly: false, // Must be readable by client-side JS
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (data.user?.email) {
      response.cookies.set('auth-email', data.user.email, {
        ...cookieOptions,
        httpOnly: false, // Must be readable by client-side JS
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Resolve and set workspace-id cookie so OAuth flows and proxy routes work
    if (data.user?.id) {
      try {
        const wu = await prisma.workspaceUser.findFirst({
          where: { userId: data.user.id },
          orderBy: { isDefault: 'desc' },
          select: { workspaceId: true },
        });
        if (wu) {
          response.cookies.set('workspace-id', wu.workspaceId, {
            ...cookieOptions,
            httpOnly: false, // Must be readable by client-side JS (PlanContext, etc.)
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      } catch (e) {
        console.error('[Login] Failed to resolve workspace:', e);
      }
    }

    return response;
  } catch (error: any) {
    console.error('[Login Proxy]', error);
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 502 },
    );
  }
}
