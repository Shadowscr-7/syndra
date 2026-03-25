import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/auth/meta/callback
 * Facebook redirects here after user authorizes.
 * Exchanges the code for a long-lived token, discovers IG + FB accounts,
 * and stores everything in ApiCredential.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3002';

  // Decode returnTo from state (default: /dashboard/settings)
  let returnTo = '/dashboard/settings';
  let statePayload: any = null;
  let isPopup = false;
  if (stateRaw) {
    try {
      statePayload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
      if (statePayload.returnTo) returnTo = statePayload.returnTo;
      if (statePayload.popup) isPopup = true;
    } catch { /* non-critical */ }
  }
  const redirectUrl = `${baseUrl}${returnTo}`;

  // Helper: return popup close page or redirect based on mode
  const finishFlow = (success: boolean, message: string) => {
    if (isPopup) {
      const html = `<!DOCTYPE html><html><head><title>Meta OAuth</title></head><body>
<script>
  try {
    window.opener.postMessage({ type: 'meta-oauth-complete', success: ${success}, message: ${JSON.stringify(message)} }, '*');
  } catch(e) {}
  window.close();
</script>
<p style="font-family:system-ui;text-align:center;margin-top:40px;color:#888">
  ${success ? '✅' : '❌'} ${message}<br/><br/>
  <small>Esta ventana se cerrará automáticamente...</small>
</p>
</body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    const param = success ? 'meta_success' : 'meta_error';
    return NextResponse.redirect(`${redirectUrl}?${param}=${encodeURIComponent(message)}`);
  };

  // ── Handle deny / errors ──
  if (error || !code) {
    const msg = searchParams.get('error_description') || 'Autorización cancelada';
    return finishFlow(false, msg);
  }

  // ── Validate state & resolve user ──
  // After Facebook's redirect, cookies may not be available in popup contexts
  // (cross-site navigation with SameSite=Lax). Use the state param as primary
  // source for userId since we encoded it when initiating the flow.
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get('auth-user-id')?.value;
  const stateUserId = statePayload?.userId;
  const userId = cookieUserId || stateUserId;
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return finishFlow(false, 'META_APP_ID o META_APP_SECRET no configurados');
  }

  const redirectUri = `${baseUrl}/api/auth/meta/callback`;

  try {
    // ── Step 1: Exchange code for short-lived token ──
    const tokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Error al obtener token');
    }
    const shortLivedToken = tokenData.access_token;

    // ── Step 2: Exchange for long-lived token (60 days) ──
    const longRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        }),
    );
    const longData = await longRes.json();
    if (longData.error) {
      throw new Error(longData.error.message || 'Error al obtener token de larga duración');
    }
    const longLivedToken = longData.access_token;
    const expiresIn = longData.expires_in || 5184000; // default 60 days

    // ── Step 3: Get user's Facebook Pages ──
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`,
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) {
      throw new Error(pagesData.error.message || 'Error al obtener páginas');
    }

    const pages = pagesData.data || [];
    let fbPageId = '';
    let fbPageName = '';
    let fbPageToken = longLivedToken;
    let igUserId = '';
    let igUsername = '';

    // Find a page with an Instagram Business Account connected
    for (const page of pages) {
      if (page.instagram_business_account) {
        fbPageId = page.id;
        fbPageName = page.name;
        fbPageToken = page.access_token || longLivedToken;
        igUserId = page.instagram_business_account.id;

        // Get IG username
        try {
          const igRes = await fetch(
            `${GRAPH_API}/${igUserId}?fields=username,name,profile_picture_url&access_token=${fbPageToken}`,
          );
          const igData = await igRes.json();
          igUsername = igData.username || '';
        } catch {
          // Non-critical
        }
        break;
      }
    }

    // If no IG account found via instagram_business_account field,
    // try querying the page's instagram_accounts edge directly
    if (!igUserId && pages.length > 0) {
      for (const page of pages) {
        const pageToken = page.access_token || longLivedToken;
        try {
          // Try /{page-id}?fields=instagram_business_account with page token
          const pageIgRes = await fetch(
            `${GRAPH_API}/${page.id}?fields=instagram_business_account&access_token=${pageToken}`,
          );
          const pageIgData = await pageIgRes.json();
          if (pageIgData.instagram_business_account?.id) {
            fbPageId = page.id;
            fbPageName = page.name;
            fbPageToken = pageToken;
            igUserId = pageIgData.instagram_business_account.id;

            try {
              const igRes = await fetch(
                `${GRAPH_API}/${igUserId}?fields=username,name,profile_picture_url&access_token=${pageToken}`,
              );
              const igData = await igRes.json();
              igUsername = igData.username || '';
            } catch { /* non-critical */ }
            break;
          }
        } catch {
          // continue trying other pages
        }
      }
    }

    // If still no IG account found, just use first page
    if (!fbPageId && pages.length > 0) {
      fbPageId = pages[0].id;
      fbPageName = pages[0].name;
      fbPageToken = pages[0].access_token || longLivedToken;
    }

    // ── Step 3b: Discover Threads user ID ──
    let threadsUserId = '';
    let threadsUsername = '';
    try {
      const threadsRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${longLivedToken}`,
      );
      const threadsData = await threadsRes.json();
      if (threadsData.id) {
        threadsUserId = threadsData.id;
        threadsUsername = threadsData.username || '';
        console.log('[Meta OAuth] Threads user discovered:', { threadsUserId, threadsUsername });
      }
    } catch (threadsErr) {
      console.warn('[Meta OAuth] Threads discovery failed (non-blocking):', threadsErr);
    }

    console.log('[Meta OAuth] Discovery result:', { fbPageId, fbPageName, igUserId, igUsername, threadsUserId, threadsUsername, pagesCount: pages.length });

    // ── Step 3c: Discover Ad Accounts ──
    let adAccountId = '';
    let adAccountName = '';
    try {
      const adsRes = await fetch(
        `${GRAPH_API}/me/adaccounts?fields=id,name,account_status&access_token=${longLivedToken}&limit=5`,
      );
      const adsData = await adsRes.json();
      if (adsData.data?.length) {
        // Pick first active ad account (account_status 1 = ACTIVE)
        const active = adsData.data.find((a: any) => a.account_status === 1) || adsData.data[0];
        adAccountId = active.id; // format: act_XXXXXXX
        adAccountName = active.name || '';
        console.log('[Meta OAuth] Ad account discovered:', { adAccountId, adAccountName });
      }
    } catch (adsErr) {
      console.warn('[Meta OAuth] Ad account discovery failed (non-blocking):', adsErr);
    }

    // ── Step 4: Store in DB ──
    // Resolve workspace: try cookie first, then DB lookup with userId from state
    let workspaceId = cookieStore.get('workspace-id')?.value;
    if (!workspaceId) {
      try {
        console.log('[Meta OAuth] Looking up workspace for userId:', userId);
        const allWu = await prisma.workspaceUser.findMany({
          where: { userId },
          select: { workspaceId: true, isDefault: true },
        });
        console.log('[Meta OAuth] Found workspace_users:', JSON.stringify(allWu));
        const wu = allWu.find(w => w.isDefault) || allWu[0];
        if (wu) workspaceId = wu.workspaceId;
        console.log('[Meta OAuth] Resolved workspace from DB:', workspaceId);
      } catch (e) {
        console.error('[Meta OAuth] DB lookup for workspace failed:', e);
      }
    } else {
      console.log('[Meta OAuth] Got workspace from cookie:', workspaceId);
    }
    if (!workspaceId) {
      throw new Error('No workspace ID found — ensure the user belongs to a workspace');
    }

    const payload = {
      accessToken: fbPageToken,  // Use page token for publishing
      userToken: longLivedToken, // User-level long-lived token
      igUserId,
      igUsername,
      fbPageId,
      fbPageName,
      threadsUserId,
      threadsUsername,
      adAccountId,
      adAccountName,
      connectedAt: new Date().toISOString(),
      connectedVia: 'oauth',
    };

    const encryptedKey = Buffer.from(JSON.stringify(payload)).toString('base64');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.apiCredential.upsert({
      where: {
        workspaceId_provider: { workspaceId, provider: 'META' },
      },
      update: {
        encryptedKey,
        isActive: true,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'ads_management'],
        expiresAt,
      },
      create: {
        workspaceId,
        provider: 'META',
        encryptedKey,
        isActive: true,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'ads_management'],
        expiresAt,
      },
    });

    // Build success message
    const parts: string[] = [];
    if (igUsername) parts.push(`@${igUsername}`);
    if (fbPageName) parts.push(fbPageName);
    if (threadsUsername) parts.push(`🧵 ${threadsUsername}`);
    if (adAccountName) parts.push(`📢 ${adAccountName}`);
    const connectedMsg = parts.length > 0
      ? `Conectado: ${parts.join(' + ')}`
      : 'Conectado exitosamente';

    return finishFlow(true, connectedMsg);
  } catch (err: any) {
    console.error('[Meta OAuth Callback] Error:', err);
    const msg = err?.message || 'Error desconocido';
    return finishFlow(false, msg);
  }
}
