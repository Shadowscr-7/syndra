import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/meta
 * Initiates the Facebook OAuth 2.0 flow.
 * Redirects the user to Facebook's authorization dialog.
 */
export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  // Check if the request came from the credentials page
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('from') === 'credentials'
    ? '/dashboard/credentials'
    : '/dashboard/settings';

  if (!appId) {
    const url = new URL(returnTo, baseUrl);
    url.searchParams.set('meta_error', 'META_APP_ID no configurado. Creá una app en developers.facebook.com y configurá META_APP_ID y META_APP_SECRET en el archivo .env');
    return NextResponse.redirect(url.toString());
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  // Build the redirect URI — must match what's registered in the Facebook App
  const redirectUri = `${baseUrl}/api/auth/meta/callback`;

  // Scopes for Facebook page management + Instagram publishing + Threads via Graph API.
  // All must be "Listo para prueba" in developers.facebook.com.
  // instagram_business_* scopes use a different OAuth flow — use classic scopes here.
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'business_management',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'instagram_manage_comments',
    'threads_basic',
    'threads_content_publish',
  ].join(',');

  // CSRF protection: use a simple state token (include returnTo for redirect)
  const popup = searchParams.get('popup') === '1';
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now(), returnTo, popup })).toString('base64url');

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
