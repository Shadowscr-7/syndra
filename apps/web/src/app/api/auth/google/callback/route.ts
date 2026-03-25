import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/google/callback
 * Exchanges code for tokens, discovers YouTube channel + Ads accounts,
 * stores unified GOOGLE credential.
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
try { window.opener.postMessage({ type: 'google-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*'); } catch(e) {}
window.close();
</script><p style="font-family:system-ui;text-align:center;margin-top:40px">${success ? '✅' : '❌'} ${message}</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'google_success' : 'google_error';
    return NextResponse.redirect(`${baseUrl}${returnTo}?${param}=${encodeURIComponent(message)}`);
  };

  if (error || !code) return finishFlow(false, searchParams.get('error_description') || 'Autorización cancelada');

  const userId = cookieStore.get('auth-user-id')?.value || statePayload?.userId;
  if (!userId) return NextResponse.redirect(`${baseUrl}/login`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return finishFlow(false, 'GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados');

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Discover YouTube channel (optional — user may not have one)
    let channelId = '';
    let channelTitle = '';
    try {
      const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const chData: any = await chRes.json();
      if (chData.items?.[0]) {
        channelId = chData.items[0].id;
        channelTitle = chData.items[0].snippet?.title || '';
      }
    } catch { /* non-critical */ }

    // Discover Google Ads accounts (optional)
    let adsCustomerId = '';
    let adsCustomerName = '';
    try {
      const adsRes = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const adsData: any = await adsRes.json();
      if (adsData.resourceNames?.length) {
        // Take first accessible customer
        const firstCustomer = adsData.resourceNames[0];
        adsCustomerId = firstCustomer.replace('customers/', '');
        adsCustomerName = adsCustomerId; // Name requires developer-token to fetch
      }
    } catch { /* no ads access — that's fine */ }

    // Store unified GOOGLE credential
    const { encryptJson } = await import('@automatismos/shared');
    const encryptedPayload = encryptJson({
      accessToken,
      refreshToken,
      channelId,
      channelTitle,
      adsCustomerId,
      adsCustomerName,
    });

    const label = [channelTitle, adsCustomerId ? `Ads: ${adsCustomerId}` : '']
      .filter(Boolean).join(' + ') || 'Google';

    await prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: 'GOOGLE' } },
      update: { encryptedPayload, isActive: true, label },
      create: { userId, provider: 'GOOGLE', encryptedPayload, isActive: true, label },
    });

    // Also update legacy YOUTUBE credential if it exists (backward compat)
    try {
      const legacyYt = await prisma.userCredential.findUnique({
        where: { userId_provider: { userId, provider: 'YOUTUBE' } },
      });
      if (legacyYt) {
        await prisma.userCredential.update({
          where: { id: legacyYt.id },
          data: {
            encryptedPayload: encryptJson({ accessToken, refreshToken, channelId, channelTitle }),
            isActive: true,
          },
        });
      }
    } catch { /* ignore */ }

    const parts = [];
    if (channelTitle) parts.push(`YouTube: ${channelTitle}`);
    if (adsCustomerId) parts.push(`Ads: ${adsCustomerId}`);
    const msg = parts.length ? `Conectado: ${parts.join(', ')}` : 'Google conectado';

    return finishFlow(true, msg);
  } catch (err: any) {
    console.error('[Google OAuth Callback] Error:', err);
    return finishFlow(false, err?.message || 'Error desconocido');
  }
}
