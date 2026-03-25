import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/pinterest/callback
 * Exchanges code for tokens, discovers boards, stores credential.
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
try { window.opener.postMessage({ type: 'pinterest-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*'); } catch(e) {}
window.close();
</script><p style="font-family:system-ui;text-align:center;margin-top:40px">${success ? '✅' : '❌'} ${message}</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'pinterest_success' : 'pinterest_error';
    return NextResponse.redirect(`${baseUrl}${returnTo}?${param}=${encodeURIComponent(message)}`);
  };

  if (error || !code) return finishFlow(false, searchParams.get('error_description') || 'Autorización cancelada');

  const userId = cookieStore.get('auth-user-id')?.value || statePayload?.userId;
  if (!userId) return NextResponse.redirect(`${baseUrl}/login`);

  const appId = process.env.PINTEREST_APP_ID;
  const appSecret = process.env.PINTEREST_APP_SECRET;
  if (!appId || !appSecret) return finishFlow(false, 'PINTEREST_APP_ID o PINTEREST_APP_SECRET no configurados');

  const redirectUri = `${baseUrl}/api/auth/pinterest/callback`;

  try {
    // Exchange code for tokens
    const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.message || tokenData.error);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info
    let username = '';
    try {
      const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData: any = await userRes.json();
      username = userData.username || '';
    } catch { /* non-critical */ }

    // Get first board (default target)
    let boardId = '';
    let boardName = '';
    try {
      const boardsRes = await fetch('https://api.pinterest.com/v5/boards?page_size=25', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const boardsData: any = await boardsRes.json();
      if (boardsData.items?.length > 0) {
        boardId = boardsData.items[0].id;
        boardName = boardsData.items[0].name;
      }
    } catch { /* non-critical */ }

    // Store credential
    const { encryptJson } = await import('@automatismos/shared');
    const encryptedPayload = encryptJson({
      accessToken, refreshToken, boardId, boardName, username,
    });

    const label = username ? `@${username}` : 'Pinterest';

    await prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: 'PINTEREST' } },
      update: { encryptedPayload, isActive: true, label },
      create: { userId, provider: 'PINTEREST', encryptedPayload, isActive: true, label },
    });

    const parts = [username ? `@${username}` : null, boardName ? `Board: ${boardName}` : null].filter(Boolean);
    return finishFlow(true, `Conectado: ${parts.join(' · ') || 'OK'}`);
  } catch (err: any) {
    console.error('[Pinterest OAuth Callback] Error:', err);
    return finishFlow(false, err?.message || 'Error desconocido');
  }
}
