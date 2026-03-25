import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth 2.0 flow
 * https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?linkedin_error=${encodeURIComponent('LINKEDIN_CLIENT_ID no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  const scopes = ['openid', 'profile', 'w_member_social'].join(' ');

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
