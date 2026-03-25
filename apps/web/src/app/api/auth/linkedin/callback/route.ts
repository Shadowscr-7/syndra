import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/linkedin/callback
 * Exchanges code for tokens, discovers member URN, stores credential.
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
try { window.opener.postMessage({ type: 'linkedin-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*'); } catch(e) {}
window.close();
</script><p style="font-family:system-ui;text-align:center;margin-top:40px">${success ? '✅' : '❌'} ${message}</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'linkedin_success' : 'linkedin_error';
    return NextResponse.redirect(`${baseUrl}${returnTo}?${param}=${encodeURIComponent(message)}`);
  };

  if (error || !code) return finishFlow(false, searchParams.get('error_description') || 'Autorización cancelada');

  const userId = cookieStore.get('auth-user-id')?.value || statePayload?.userId;
  if (!userId) return NextResponse.redirect(`${baseUrl}/login`);

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return finishFlow(false, 'LINKEDIN_CLIENT_ID o LINKEDIN_CLIENT_SECRET no configurados');

  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info (OpenID)
    const userRes = await fetch('https://api.linkedin.com/rest/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202402',
      },
    });
    const userData: any = await userRes.json();
    const memberSub = userData.sub; // LinkedIn member ID
    const name = userData.name || '';
    const authorUrn = `urn:li:person:${memberSub}`;

    // Store encrypted credential
    const { encryptJson } = await import('@automatismos/shared');
    const encryptedPayload = encryptJson({
      accessToken, refreshToken, authorUrn, name,
    });

    await prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: 'LINKEDIN' } },
      update: { encryptedPayload, isActive: true, label: name || 'LinkedIn' },
      create: { userId, provider: 'LINKEDIN', encryptedPayload, isActive: true, label: name || 'LinkedIn' },
    });

    return finishFlow(true, `Conectado como: ${name || memberSub}`);
  } catch (err: any) {
    console.error('[LinkedIn OAuth Callback] Error:', err);
    return finishFlow(false, err?.message || 'Error desconocido');
  }
}
