import { NextResponse, type NextRequest } from 'next/server';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/activate') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Check auth: only trust the httpOnly JWT cookie
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;

  if (!accessToken && refreshToken && pathname.startsWith('/dashboard')) {
    // Token expired but refresh token exists → try auto-refresh
    try {
      const apiRes = await fetch(`${INTERNAL_API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        const response = NextResponse.next();

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          path: '/',
        };

        if (data.accessToken) {
          response.cookies.set('access_token', data.accessToken, {
            ...cookieOptions,
            maxAge: 60 * 60 * 24,
          });
        }
        if (data.refreshToken) {
          response.cookies.set('refresh-token', data.refreshToken, {
            ...cookieOptions,
            maxAge: 60 * 60 * 24 * 7,
          });
        }
        return response;
      }
    } catch {
      // Refresh failed — redirect to login
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!accessToken && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/onboarding/:path*', '/activate'],
};
