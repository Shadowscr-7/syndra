import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/youtube
 * DEPRECATED: Redirects to /api/auth/google (unified Google OAuth).
 * Kept for backward compatibility.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';
  const { search } = new URL(req.url);
  return NextResponse.redirect(`${baseUrl}/api/auth/google${search}`);
}
