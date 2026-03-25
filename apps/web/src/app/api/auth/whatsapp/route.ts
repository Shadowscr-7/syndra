import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/whatsapp
 * Configura WhatsApp via Evolution API.
 * No es OAuth — el usuario provee la URL y API key de su instancia Evolution API.
 * El endpoint crea la instancia y devuelve el QR code para escanear.
 *
 * Body: { instanceUrl: string, apiKey: string, instanceName?: string }
 *
 * GET /api/auth/whatsapp?action=qr&instanceUrl=...&apiKey=...&instanceName=...
 * Obtiene el QR code actual de una instancia existente.
 *
 * GET /api/auth/whatsapp?action=status&instanceUrl=...&apiKey=...&instanceName=...
 * Verifica el estado de conexión.
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { instanceUrl, apiKey, instanceName: rawName } = body;
  if (!instanceUrl?.trim() || !apiKey?.trim()) {
    return NextResponse.json({ error: 'instanceUrl y apiKey son requeridos' }, { status: 400 });
  }

  // Sanitize instance name
  const instanceName = (rawName?.trim() || `syndra_${userId.slice(0, 8)}`).replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    // Import WhatsAppPublisher for static helpers
    const { WhatsAppPublisher } = await import('@automatismos/publishers');

    // 1. Create instance in Evolution API
    const result = await WhatsAppPublisher.createInstance(instanceUrl, apiKey, instanceName);

    // 2. Store credentials (encrypted) — even before QR scan, so user can retry
    const { encryptJson } = await import('@automatismos/shared');
    const encryptedPayload = encryptJson({ instanceUrl, apiKey, instanceName });

    await prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: 'WHATSAPP' } },
      update: { encryptedPayload, isActive: false, label: `WhatsApp (${instanceName})` },
      create: {
        userId,
        provider: 'WHATSAPP',
        encryptedPayload,
        isActive: false, // Will be activated after QR scan
        label: `WhatsApp (${instanceName})`,
      },
    });

    return NextResponse.json({
      success: true,
      instanceName,
      qrCode: result.qrCode,
      pairingCode: result.pairingCode,
      message: 'Escanea el código QR con tu WhatsApp para conectar.',
    });
  } catch (err: any) {
    console.error('[WhatsApp Setup] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al crear instancia' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Get stored WhatsApp credentials
  const cred = await prisma.userCredential.findUnique({
    where: { userId_provider: { userId, provider: 'WHATSAPP' } },
  });

  if (!cred) {
    return NextResponse.json({ error: 'WhatsApp no configurado. Usa POST para iniciar.' }, { status: 404 });
  }

  const { decryptJson } = await import('@automatismos/shared');
  let payload: any;
  try {
    payload = decryptJson(cred.encryptedPayload);
  } catch {
    return NextResponse.json({ error: 'No se pudieron descifrar las credenciales' }, { status: 500 });
  }

  const { instanceUrl, apiKey, instanceName } = payload;
  const { WhatsAppPublisher } = await import('@automatismos/publishers');

  try {
    if (action === 'qr') {
      const result = await WhatsAppPublisher.getQrCode(instanceUrl, apiKey, instanceName);
      return NextResponse.json({
        qrCode: result.qrCode,
        state: result.state,
      });
    }

    if (action === 'status') {
      const result = await WhatsAppPublisher.checkConnection(instanceUrl, apiKey, instanceName);

      // If connected, activate the credential
      if (result.connected && !cred.isActive) {
        await prisma.userCredential.update({
          where: { id: cred.id },
          data: {
            isActive: true,
            label: result.number ? `WhatsApp (+${result.number})` : `WhatsApp (${instanceName})`,
            lastTestedAt: new Date(),
            lastTestResult: 'ok',
          },
        });
      }

      return NextResponse.json({
        connected: result.connected,
        state: result.state,
        number: result.number,
      });
    }

    return NextResponse.json({ error: 'action requerida: qr o status' }, { status: 400 });
  } catch (err: any) {
    console.error('[WhatsApp Status Check] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al consultar Evolution API' }, { status: 500 });
  }
}
