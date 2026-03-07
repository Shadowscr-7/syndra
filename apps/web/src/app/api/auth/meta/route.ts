import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/meta
 * Initiates the Facebook OAuth 2.0 flow.
 * Redirects the user to Facebook's authorization dialog.
 */
export async function GET() {
  const appId = process.env.META_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  if (!appId) {
    // Redirect back to settings with a friendly error instead of raw JSON
    const url = new URL('/dashboard/settings', baseUrl);
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

  // Scopes for Facebook page management + Instagram publishing via Graph API.
  // All must be "Listo para prueba" in developers.facebook.com.
  // instagram_business_* scopes use a different OAuth flow — use classic scopes here.
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'instagram_manage_comments',
  ].join(',');

  // CSRF protection: use a simple state token
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
