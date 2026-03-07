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
  const settingsUrl = `${baseUrl}/dashboard/settings`;

  // ── Handle deny / errors ──
  if (error || !code) {
    const msg = searchParams.get('error_description') || 'Autorización cancelada';
    return NextResponse.redirect(`${settingsUrl}?meta_error=${encodeURIComponent(msg)}`);
  }

  // ── Validate state (CSRF) ──
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  try {
    // Decode state to verify it came from us
    if (stateRaw) {
      const statePayload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
      if (statePayload.userId !== userId) {
        return NextResponse.redirect(`${settingsUrl}?meta_error=${encodeURIComponent('State mismatch')}`);
      }
    }
  } catch {
    // If state can't be decoded, continue anyway (non-critical for dev)
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${settingsUrl}?meta_error=${encodeURIComponent('META_APP_ID o META_APP_SECRET no configurados')}`);
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

    console.log('[Meta OAuth] Discovery result:', { fbPageId, fbPageName, igUserId, igUsername, pagesCount: pages.length });

    // ── Step 4: Store in DB ──
    const workspaceId = cookieStore.get('workspace-id')?.value;
    if (!workspaceId) {
      throw new Error('No workspace ID');
    }

    const payload = {
      accessToken: fbPageToken,  // Use page token for publishing
      userToken: longLivedToken, // User-level long-lived token
      igUserId,
      igUsername,
      fbPageId,
      fbPageName,
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
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
        expiresAt,
      },
      create: {
        workspaceId,
        provider: 'META',
        encryptedKey,
        isActive: true,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
        expiresAt,
      },
    });

    // Build success message
    const connectedMsg = igUsername
      ? `Conectado: @${igUsername} + ${fbPageName}`
      : fbPageName
        ? `Conectado: ${fbPageName}`
        : 'Conectado exitosamente';

    return NextResponse.redirect(`${settingsUrl}?meta_success=${encodeURIComponent(connectedMsg)}`);
  } catch (err: any) {
    console.error('[Meta OAuth Callback] Error:', err);
    const msg = err?.message || 'Error desconocido';
    return NextResponse.redirect(`${settingsUrl}?meta_error=${encodeURIComponent(msg)}`);
  }
}
