import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * GET /api/auth/twitter
 * Initiates Twitter/X OAuth 2.0 with PKCE
 * https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?twitter_error=${encodeURIComponent('TWITTER_CLIENT_ID no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/twitter/callback`;

  // PKCE: generate code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup, codeVerifier })).toString('base64url');

  // Store code_verifier in cookie (needed for callback)
  cookieStore.set('twitter-oauth-state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' ');

  const authUrl = new URL('https://x.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(authUrl.toString());
}
