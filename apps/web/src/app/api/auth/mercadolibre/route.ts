import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/mercadolibre
 * Initiates Mercado Libre OAuth 2.0.
 * https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion
 */
export async function GET(req: NextRequest) {
  const appId = process.env.MERCADOLIBRE_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';
  const popup = searchParams.get('popup') === '1';

  if (!appId) {
    return NextResponse.redirect(`${baseUrl}${returnTo}?ml_error=${encodeURIComponent('MERCADOLIBRE_APP_ID no configurado')}`);
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) return NextResponse.redirect(new URL('/login', baseUrl));

  const redirectUri = `${baseUrl}/api/auth/mercadolibre/callback`;
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://auth.mercadolibre.com.ar/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
