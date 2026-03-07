import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  // Check auth: prefer JWT cookie, fallback to legacy cookies
  const accessToken = request.cookies.get('access-token')?.value;
  const authUserId = request.cookies.get('auth-user-id')?.value;
  const authEmail = request.cookies.get('auth-email')?.value;

  const isAuthenticated = !!accessToken || !!authUserId || !!authEmail;

  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/onboarding/:path*', '/activate'],
};
