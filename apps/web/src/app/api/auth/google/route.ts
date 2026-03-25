import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/google
 * Initiates unified Google OAuth 2.0 flow (YouTube + Google Ads).
 * Replaces the old /api/auth/youtube route.
 * https://developers.google.com/identity/protocols/oauth2/web-server
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?google_error=${encodeURIComponent('GOOGLE_CLIENT_ID no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/adwords',
  ].join(' ');

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
