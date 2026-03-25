import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/pinterest
 * Initiates Pinterest OAuth 2.0 flow
 * https://developers.pinterest.com/docs/getting-started/authentication/
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.PINTEREST_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?pinterest_error=${encodeURIComponent('PINTEREST_APP_ID no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/pinterest/callback`;

  const scopes = ['boards:read', 'pins:read', 'pins:write', 'user_accounts:read'].join(',');

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
