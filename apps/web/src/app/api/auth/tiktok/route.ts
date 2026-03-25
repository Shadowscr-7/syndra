import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/tiktok
 * Initiates TikTok OAuth 2.0 flow
 * https://developers.tiktok.com/doc/login-kit-web
 */
export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!clientKey) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?tiktok_error=${encodeURIComponent('TIKTOK_CLIENT_KEY no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  const scopes = ['user.info.basic', 'video.publish', 'video.upload'].join(',');

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
