import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';

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
      response.cookies.set('access_token', data.accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    if (data.refreshToken) {
      response.cookies.set('refresh-token', data.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    if (data.user?.id) {
      response.cookies.set('auth-user-id', data.user.id, {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (data.user?.email) {
      response.cookies.set('auth-email', data.user.email, {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Resolve and set workspace-id cookie so PlanContext works immediately
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
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      } catch (e) {
        console.error('[Register] Failed to resolve workspace:', e);
      }
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
