import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/activate') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Check auth cookie for dashboard routes
  const authUserId = request.cookies.get('auth-user-id')?.value;
  const authEmail = request.cookies.get('auth-email')?.value;
  if (!authUserId && !authEmail && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/onboarding/:path*', '/activate'],
};
