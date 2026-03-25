import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/mercadolibre/callback
 * Exchanges code for tokens, discovers user info, stores MERCADOLIBRE credential.
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
    } catch { /* ignore */ }
  }

  const finishFlow = (success: boolean, message: string) => {
    if (isPopup) {
      const html = `<!DOCTYPE html><html><body><script>
try { window.opener.postMessage({ type: 'mercadolibre-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*'); } catch(e) {}
window.close();
</script><p style="font-family:system-ui;text-align:center;margin-top:40px">${success ? '✅' : '❌'} ${message}</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'ml_success' : 'ml_error';
    return NextResponse.redirect(`${baseUrl}${returnTo}?${param}=${encodeURIComponent(message)}`);
  };

  if (error || !code) return finishFlow(false, 'Autorización cancelada');

  const userId = cookieStore.get('auth-user-id')?.value || statePayload?.userId;
  if (!userId) return NextResponse.redirect(`${baseUrl}/login`);

  const appId = process.env.MERCADOLIBRE_APP_ID;
  const appSecret = process.env.MERCADOLIBRE_APP_SECRET;
  if (!appId || !appSecret) return finishFlow(false, 'MERCADOLIBRE_APP_ID o MERCADOLIBRE_APP_SECRET no configurados');

  const redirectUri = `${baseUrl}/api/auth/mercadolibre/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: appSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.message || tokenData.error);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const mlUserId = String(tokenData.user_id);

    // Get user info
    let nickname = '';
    let siteId = 'MLA';
    try {
      const meRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData: any = await meRes.json();
      nickname = meData.nickname || '';
      siteId = meData.site_id || 'MLA';
    } catch { /* non-critical */ }

    // Store credential
    const { encryptJson } = await import('@automatismos/shared');
    const encryptedPayload = encryptJson({
      accessToken, refreshToken, userId: mlUserId, nickname, siteId,
    });

    await prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: 'MERCADOLIBRE' } },
      update: { encryptedPayload, isActive: true, label: nickname || `ML ${mlUserId}` },
      create: { userId, provider: 'MERCADOLIBRE', encryptedPayload, isActive: true, label: nickname || `ML ${mlUserId}` },
    });

    return finishFlow(true, `Conectado como: ${nickname || mlUserId}`);
  } catch (err: any) {
    console.error('[MercadoLibre OAuth Callback] Error:', err);
    return finishFlow(false, err?.message || 'Error desconocido');
  }
}
