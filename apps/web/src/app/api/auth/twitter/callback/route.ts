import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/twitter/callback
 * Exchanges code for tokens, stores credential via UserCredential (encrypted).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';
  const cookieStore = await cookies();

  let returnTo = '/dashboard/credentials';
  let statePayload: any = null;
  let isPopup = false;
  if (stateRaw) {
    try {
      statePayload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
      if (statePayload.returnTo) returnTo = statePayload.returnTo;
      if (statePayload.popup) isPopup = true;
    } catch { /* non-critical */ }
  }

  const finishFlow = (success: boolean, message: string) => {
    if (isPopup) {
      const html = `<!DOCTYPE html><html><body><script>
try { window.opener.postMessage({ type: 'twitter-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*'); } catch(e) {}
window.close();
</script><p style="font-family:system-ui;text-align:center;margin-top:40px">${success ? '✅' : '❌'} ${message}</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'twitter_success' : 'twitter_error';
    return NextResponse.redirect(`${baseUrl}${returnTo}?${param}=${encodeURIComponent(message)}`);
  };

  if (error || !code) return finishFlow(false, searchParams.get('error_description') || 'Autorización cancelada');

  const userId = cookieStore.get('auth-user-id')?.value || statePayload?.userId;
  if (!userId) return NextResponse.redirect(`${baseUrl}/login`);

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return finishFlow(false, 'TWITTER_CLIENT_ID o TWITTER_CLIENT_SECRET no configurados');

  const redirectUri = `${baseUrl}/api/auth/twitter/callback`;

  try {
    // Recover code_verifier from state
    const codeVerifier = statePayload?.codeVerifier;
    if (!codeVerifier) throw new Error('Missing PKCE code_verifier');

    // Exchange code for tokens
    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info
    const userRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData: any = await userRes.json();
    const twitterUserId = userData.data?.id;
    const twitterUsername = userData.data?.username;

    // Store in UserCredential (encrypted) via API
    const apiUrl = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3001';
    const credRes = await fetch(`${apiUrl}/credentials/TWITTER`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        cookie: cookieStore.toString(),
      },
      body: JSON.stringify({
        payload: {
          accessToken,
          refreshToken,
          userId: twitterUserId,
          username: twitterUsername,
        },
        label: twitterUsername ? `@${twitterUsername}` : 'Twitter/X',
      }),
    });

    if (!credRes.ok) {
      // Fallback: store directly in DB
      const { encryptJson } = await import('@automatismos/shared');
      const encryptedPayload = encryptJson({
        accessToken, refreshToken,
        userId: twitterUserId, username: twitterUsername,
      });

      await prisma.userCredential.upsert({
        where: { userId_provider: { userId, provider: 'TWITTER' } },
        update: { encryptedPayload, isActive: true, label: twitterUsername ? `@${twitterUsername}` : 'Twitter/X' },
        create: { userId, provider: 'TWITTER', encryptedPayload, isActive: true, label: twitterUsername ? `@${twitterUsername}` : 'Twitter/X' },
      });
    }

    // Clean up state cookie
    cookieStore.delete('twitter-oauth-state');

    return finishFlow(true, `Conectado como @${twitterUsername || twitterUserId || 'OK'}`);
  } catch (err: any) {
    console.error('[Twitter OAuth Callback] Error:', err);
    return finishFlow(false, err?.message || 'Error desconocido');
  }
}
