'use server';

import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ── Helpers ──────────────────────────────────────────

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error('No autenticado');
  return session;
}

// ── Editorial Run ────────────────────────────────────

export async function createEditorialRun(formData: FormData) {
  const session = await requireSession();
  const campaignId = formData.get('campaignId') as string || undefined;
  const channels = formData.getAll('channels') as string[];
  const priority = parseInt(formData.get('priority') as string) || 5;

  // Call the API orchestrator to create AND start the pipeline
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/editorial/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId: session.workspaceId,
      campaignId: campaignId || undefined,
      origin: 'manual',
      priority,
      targetChannels: channels.length > 0 ? channels : ['instagram'],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    console.error('[createEditorialRun] API error:', err);
    // Fallback: create the row directly so user sees something
    await prisma.editorialRun.create({
      data: {
        workspaceId: session.workspaceId,
        campaignId: campaignId || null,
        origin: 'manual',
        priority,
        targetChannels: channels.length > 0 ? channels : ['instagram'],
        status: 'PENDING',
      },
    });
  }

  revalidatePath('/dashboard/editorial');
  redirect('/dashboard/editorial');
}

export async function approveEditorialRun(formData: FormData) {
  const session = await requireSession();
  const runId = formData.get('runId') as string;

  await prisma.$transaction([
    prisma.editorialRun.update({
      where: { id: runId },
      data: { status: 'APPROVED' },
    }),
    prisma.approvalEvent.create({
      data: {
        editorialRunId: runId,
        action: 'APPROVED',
        approvedBy: session.email,
        comment: 'Aprobado desde panel web',
      },
    }),
  ]);

  revalidatePath(`/dashboard/editorial/${runId}`);
  revalidatePath('/dashboard/editorial');
}

export async function rejectEditorialRun(formData: FormData) {
  const session = await requireSession();
  const runId = formData.get('runId') as string;
  const reason = formData.get('reason') as string || 'Rechazado desde panel web';

  await prisma.$transaction([
    prisma.editorialRun.update({
      where: { id: runId },
      data: { status: 'REJECTED' },
    }),
    prisma.approvalEvent.create({
      data: {
        editorialRunId: runId,
        action: 'REJECTED',
        approvedBy: session.email,
        comment: reason,
      },
    }),
  ]);

  revalidatePath(`/dashboard/editorial/${runId}`);
  revalidatePath('/dashboard/editorial');
}

export async function triggerPipeline(formData: FormData) {
  const runId = formData.get('runId') as string;
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${apiUrl}/api/editorial/run/${runId}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[triggerPipeline] API returned ${res.status}:`, body);
    }
  } catch (e) {
    console.error('[triggerPipeline] API unreachable, resetting status manually:', e);
    // Fallback: reset status so user can at least re-trigger
    await prisma.editorialRun.update({
      where: { id: runId },
      data: { status: 'PENDING', errorMessage: null },
    });
  }
  revalidatePath(`/dashboard/editorial/${runId}`);
  revalidatePath('/dashboard/editorial');
}

// ── Content Theme ────────────────────────────────────

export async function createTheme(formData: FormData) {
  const session = await requireSession();
  const name = formData.get('name') as string;
  const audience = formData.get('audience') as string || '';
  const keywordsRaw = formData.get('keywords') as string || '';
  const priority = parseInt(formData.get('priority') as string) || 5;
  const type = formData.get('type') as string || 'EVERGREEN';

  if (!name?.trim()) throw new Error('Nombre requerido');

  const keywords = keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean);

  await prisma.contentTheme.create({
    data: {
      workspaceId: session.workspaceId,
      name: name.trim(),
      audience,
      keywords,
      priority,
      type: type as any,
    },
  });

  revalidatePath('/dashboard/themes');
  redirect('/dashboard/themes');
}

export async function deleteTheme(id: string) {
  const session = await requireSession();
  await prisma.contentTheme.deleteMany({ where: { id, workspaceId: session.workspaceId } });
  revalidatePath('/dashboard/themes');
}

// ── Campaign ─────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  const session = await requireSession();
  const name = formData.get('name') as string;
  const objective = formData.get('objective') as string || 'ENGAGEMENT';
  const offer = formData.get('offer') as string || null;
  const landingUrl = formData.get('landingUrl') as string || null;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string || null;
  const kpiTarget = formData.get('kpiTarget') as string || null;
  const contentProfileId = formData.get('contentProfileId') as string || null;
  const userPersonaId = formData.get('userPersonaId') as string || null;
  const operationMode = formData.get('operationMode') as string || null;
  const channels = formData.getAll('channels') as string[];
  const themeIds = formData.getAll('themeIds') as string[];
  const channelFormatsRaw = formData.get('channelFormats') as string || '{}';
  let channelFormats: Record<string, string[]> | null = null;
  try { channelFormats = JSON.parse(channelFormatsRaw); } catch { /* ignore */ }

  if (!name?.trim()) throw new Error('Nombre requerido');

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: session.workspaceId,
      name: name.trim(),
      objective: objective as any,
      offer,
      landingUrl,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      kpiTarget,
      operationMode: operationMode ? (operationMode as any) : null,
      contentProfileId: contentProfileId || null,
      userPersonaId: userPersonaId || null,
      targetChannels: channels.length > 0 ? channels : ['instagram'],
      channelFormats: channelFormats ?? undefined,
      campaignThemes: themeIds.length > 0 ? {
        create: themeIds.map((tId) => ({ themeId: tId })),
      } : undefined,
    },
  });

  revalidatePath('/dashboard/campaigns');
  redirect('/dashboard/campaigns');
}

export async function deleteCampaign(id: string) {
  const session = await requireSession();
  await prisma.campaign.deleteMany({ where: { id, workspaceId: session.workspaceId } });
  revalidatePath('/dashboard/campaigns');
}

export async function updateCampaign(id: string, formData: FormData) {
  const session = await requireSession();
  const name = formData.get('name') as string;
  const objective = formData.get('objective') as string || 'ENGAGEMENT';
  const offer = formData.get('offer') as string || null;
  const landingUrl = formData.get('landingUrl') as string || null;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string || null;
  const kpiTarget = formData.get('kpiTarget') as string || null;
  const isActive = formData.get('isActive') === 'true';
  const operationMode = formData.get('operationMode') as string || null;
  const contentProfileId = formData.get('contentProfileId') as string || null;
  const userPersonaId = formData.get('userPersonaId') as string || null;
  const channels = formData.getAll('channels') as string[];
  const themeIds = formData.getAll('themeIds') as string[];
  const channelFormatsRaw = formData.get('channelFormats') as string || '{}';
  let channelFormats: Record<string, string[]> | null = null;
  try { channelFormats = JSON.parse(channelFormatsRaw); } catch { /* ignore */ }

  if (!name?.trim()) throw new Error('Nombre requerido');

  // Update campaign fields
  await prisma.campaign.updateMany({
    where: { id, workspaceId: session.workspaceId },
    data: {
      name: name.trim(),
      objective: objective as any,
      offer,
      landingUrl,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : null,
      kpiTarget,
      isActive,
      operationMode: operationMode ? (operationMode as any) : null,
      contentProfileId: contentProfileId || null,
      userPersonaId: userPersonaId || null,
      targetChannels: channels.length > 0 ? channels : undefined,
      channelFormats: channelFormats ?? undefined,
    },
  });

  // Sync campaign themes (delete + recreate)
  if (themeIds.length > 0) {
    await prisma.campaignTheme.deleteMany({ where: { campaignId: id } });
    await prisma.campaignTheme.createMany({
      data: themeIds.map((tId) => ({ campaignId: id, themeId: tId })),
    });
  }

  revalidatePath('/dashboard/campaigns');
  revalidatePath('/dashboard/editorial');
}

// ── Brand Profile ────────────────────────────────────

export async function updateBrandProfile(formData: FormData) {
  const session = await requireSession();

  const voice = formData.get('voice') as string || '';
  const tone = formData.get('tone') as string || 'didáctico';
  const baseCta = formData.get('baseCta') as string || '';
  const hashtagsRaw = formData.get('hashtags') as string || '';
  const allowedClaimsRaw = formData.get('allowedClaims') as string || '';
  const prohibitedTopicsRaw = formData.get('prohibitedTopics') as string || '';

  const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  await prisma.brandProfile.upsert({
    where: { workspaceId: session.workspaceId },
    update: {
      voice,
      tone,
      baseCta,
      hashtags: split(hashtagsRaw),
      allowedClaims: split(allowedClaimsRaw),
      prohibitedTopics: split(prohibitedTopicsRaw),
    },
    create: {
      workspaceId: session.workspaceId,
      voice,
      tone,
      baseCta,
      hashtags: split(hashtagsRaw),
      allowedClaims: split(allowedClaimsRaw),
      prohibitedTopics: split(prohibitedTopicsRaw),
    },
  });

  revalidatePath('/dashboard/brand');
  redirect('/dashboard/brand');
}

// ── API Credentials ──────────────────────────────────

export async function saveApiCredential(formData: FormData) {
  const session = await requireSession();

  const provider = formData.get('provider') as string;
  const apiKey = formData.get('apiKey') as string;
  const scopesRaw = formData.get('scopes') as string || '';

  if (!provider) throw new Error('Provider requerido');

  // Build credential payload depending on provider
  let payload: Record<string, string> = {};

  if (provider === 'META') {
    if (!apiKey?.trim()) throw new Error('Access Token requerido');
    payload = {
      accessToken: apiKey.trim(),
      igUserId: (formData.get('igUserId') as string || '').trim(),
      fbPageId: (formData.get('fbPageId') as string || '').trim(),
    };
  } else if (provider === 'CLOUDINARY') {
    const cloudName = (formData.get('cloudName') as string || '').trim();
    const cloudKey = (formData.get('apiKey') as string || '').trim();
    const cloudSecret = (formData.get('cloudSecret') as string || '').trim();
    if (!cloudName || !cloudKey || !cloudSecret) throw new Error('Los 3 campos de Cloudinary son requeridos');
    payload = { cloudName, apiKey: cloudKey, apiSecret: cloudSecret };
  } else {
    if (!apiKey?.trim()) throw new Error('API key requerido');
    payload = { apiKey: apiKey.trim() };
  }

  // Store as base64-encoded JSON — in prod use proper encryption
  const encryptedKey = Buffer.from(JSON.stringify(payload)).toString('base64');
  const scopes = scopesRaw.split(',').map((s) => s.trim()).filter(Boolean);

  await prisma.apiCredential.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: session.workspaceId,
        provider: provider as any,
      },
    },
    update: { encryptedKey, scopes, isActive: true },
    create: {
      workspaceId: session.workspaceId,
      provider: provider as any,
      encryptedKey,
      scopes,
      isActive: true,
    },
  });

  revalidatePath('/dashboard/settings');
  redirect('/dashboard/settings');
}

// ── Disconnect Credential ────────────────────────────

export async function disconnectCredential(provider: string) {
  const session = await requireSession();

  await prisma.apiCredential.deleteMany({
    where: {
      workspaceId: session.workspaceId,
      provider: provider as any,
    },
  });

  revalidatePath('/dashboard/settings');
}

// ── Test Cloudinary Connection ───────────────────────

export async function testCloudinaryConnection(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const cloudName = (formData.get('cloudName') as string || '').trim();
  const apiKey = (formData.get('apiKey') as string || '').trim();
  const apiSecret = (formData.get('cloudSecret') as string || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, message: 'Los 3 campos son requeridos' };
  }

  try {
    // Test connection by calling Cloudinary Admin API (ping)
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (res.ok) {
      return { ok: true, message: `Conexión exitosa con "${cloudName}"` };
    } else if (res.status === 401) {
      return { ok: false, message: 'Credenciales inválidas (401 Unauthorized)' };
    } else {
      return { ok: false, message: `Error: ${res.status} ${res.statusText}` };
    }
  } catch (e: any) {
    return { ok: false, message: `Error de red: ${e.message}` };
  }
}

// ── Workspace Settings ───────────────────────────────

export async function updateWorkspaceSettings(formData: FormData) {
  const session = await requireSession();

  const name = formData.get('name') as string;
  const timezone = formData.get('timezone') as string || 'America/Mexico_City';
  const channels = formData.getAll('activeChannels') as string[];

  await prisma.workspace.update({
    where: { id: session.workspaceId },
    data: {
      name: name?.trim() || undefined,
      timezone,
      activeChannels: channels.length > 0 ? channels : ['instagram'],
    },
  });

  revalidatePath('/dashboard/settings');
  redirect('/dashboard/settings');
}

// ── Research Sources ─────────────────────────────────

export async function createResearchSource(formData: FormData) {
  const session = await requireSession();

  const name = formData.get('name') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as string || 'RSS';

  if (!name?.trim() || !url?.trim()) throw new Error('Nombre y URL requeridos');

  await prisma.researchSource.create({
    data: {
      workspaceId: session.workspaceId,
      name: name.trim(),
      url: url.trim(),
      type: type as any,
      isActive: true,
    },
  });

  revalidatePath('/dashboard/sources');
  redirect('/dashboard/sources');
}

export async function deleteResearchSource(id: string) {
  const session = await requireSession();
  await prisma.researchSource.deleteMany({ where: { id, workspaceId: session.workspaceId } });
  revalidatePath('/dashboard/sources');
}

// ── Admin: Generate License Keys ─────────────────────

export async function generateLicenseKeys(formData: FormData) {
  const planName = formData.get('planName') as string || 'PRO';
  const count = parseInt(formData.get('count') as string) || 5;
  const durationDays = parseInt(formData.get('durationDays') as string) || 30;
  const batchName = formData.get('batchName') as string || null;
  const buyerEmail = formData.get('buyerEmail') as string || null;

  const plan = await prisma.plan.findUnique({ where: { name: planName } });
  if (!plan) throw new Error(`Plan ${planName} no encontrado. Ejecuta seed primero.`);

  const { randomBytes } = await import('crypto');
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const prefix = `AUTO-${planName.substring(0, 3).toUpperCase()}`;
    const segments = Array.from({ length: 3 }, () =>
      randomBytes(2).toString('hex').toUpperCase(),
    );
    keys.push(`${prefix}-${segments.join('-')}`);
  }

  await prisma.licenseKey.createMany({
    data: keys.map((key) => ({
      key,
      planId: plan.id,
      durationDays,
      batchName,
      buyerEmail,
      status: 'AVAILABLE' as const,
    })),
  });

  revalidatePath('/dashboard/admin');
  redirect('/dashboard/admin');
}

// ── Admin: Record Payment ────────────────────────────

export async function recordPayment(formData: FormData) {
  const session = await requireSession();

  const workspaceId = formData.get('workspaceId') as string || session.workspaceId;
  const amount = Math.round(parseFloat(formData.get('amount') as string) * 100);
  const method = formData.get('method') as string || 'manual';
  const reference = formData.get('reference') as string || null;
  const description = formData.get('description') as string || null;

  await prisma.paymentLog.create({
    data: {
      workspaceId,
      amount,
      currency: 'USD',
      method,
      reference,
      description,
      recordedBy: session.email,
    },
  });

  revalidatePath('/dashboard/admin');
  redirect('/dashboard/admin');
}
