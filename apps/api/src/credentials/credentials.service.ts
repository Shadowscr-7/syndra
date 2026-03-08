// ============================================================
// Credentials Service — User-level API keys & tokens (AES-256-GCM)
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { encryptJson, decryptJson, maskSecret } from '@automatismos/shared';

// Provider-specific payload shapes
interface LlmPayload { apiKey: string; provider?: string }
interface ImageGenPayload { apiKey: string; provider?: string }
interface ResearchPayload { apiKey: string; provider?: string }
interface MetaPayload { accessToken: string; igUserId?: string; fbPageId?: string; threadsUserId?: string }
interface DiscordPayload { webhookUrl: string }
interface CloudinaryPayload { cloudName: string; apiKey: string; apiSecret: string }
interface GoogleDrivePayload { accessToken: string; refreshToken?: string; folderId?: string }
interface AwsS3Payload { bucket: string; accessKeyId: string; secretAccessKey: string; region?: string }
interface HeygenPayload { apiKey: string }
interface TelegramPayload { botToken: string }

type CredentialPayload =
  | LlmPayload | ImageGenPayload | ResearchPayload
  | MetaPayload | DiscordPayload | CloudinaryPayload
  | GoogleDrivePayload | AwsS3Payload | HeygenPayload | TelegramPayload;

// Fields exposed publicly (with masked secrets)
export interface CredentialSummary {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  maskedKey: string;
  lastTestedAt: Date | null;
  lastTestResult: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── List all credentials for a user (masked) ──────────

  async listForUser(userId: string): Promise<CredentialSummary[]> {
    const creds = await this.prisma.userCredential.findMany({
      where: { userId },
      orderBy: { provider: 'asc' },
    });

    return creds.map((c) => {
      let maskedKey = '••••';
      try {
        const payload = decryptJson(c.encryptedPayload);
        const firstKey = payload.apiKey || payload.accessToken || payload.webhookUrl || payload.botToken || payload.bucket || '';
        maskedKey = maskSecret(String(firstKey), 4);
      } catch { /* corrupted — show generic mask */ }

      return {
        id: c.id,
        provider: c.provider,
        label: c.label,
        isActive: c.isActive,
        maskedKey,
        lastTestedAt: c.lastTestedAt,
        lastTestResult: c.lastTestResult,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  // ── Upsert a credential ───────────────────────────────

  async upsert(userId: string, provider: string, payload: CredentialPayload, label?: string) {
    this.validatePayload(provider, payload);
    const encryptedPayload = encryptJson(payload as Record<string, any>);

    const credential = await this.prisma.userCredential.upsert({
      where: { userId_provider: { userId, provider: provider as any } },
      update: {
        encryptedPayload,
        label: label ?? undefined,
        isActive: true,
        lastTestedAt: null,
        lastTestResult: null,
      },
      create: {
        userId,
        provider: provider as any,
        encryptedPayload,
        label: label ?? null,
        isActive: true,
      },
    });

    this.logger.log(`✅ Credential saved: ${provider} for user ${userId}`);
    return { id: credential.id, provider: credential.provider };
  }

  // ── Delete a credential ───────────────────────────────

  async remove(userId: string, provider: string) {
    const existing = await this.prisma.userCredential.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });
    if (!existing) throw new NotFoundException('Credencial no encontrada');

    await this.prisma.userCredential.delete({ where: { id: existing.id } });
    this.logger.log(`🗑️ Credential removed: ${provider} for user ${userId}`);
    return { removed: true };
  }

  // ── Toggle active status ──────────────────────────────

  async toggleActive(userId: string, provider: string) {
    const existing = await this.prisma.userCredential.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });
    if (!existing) throw new NotFoundException('Credencial no encontrada');

    const updated = await this.prisma.userCredential.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive },
    });
    return { provider: updated.provider, isActive: updated.isActive };
  }

  // ── Test a credential ─────────────────────────────────

  async testCredential(userId: string, provider: string): Promise<{ ok: boolean; message: string }> {
    const existing = await this.prisma.userCredential.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });
    if (!existing) throw new NotFoundException('Credencial no encontrada');

    let payload: Record<string, any>;
    try {
      payload = decryptJson(existing.encryptedPayload);
    } catch {
      await this.updateTestResult(existing.id, 'error: no se pudo descifrar');
      return { ok: false, message: 'No se pudo descifrar la credencial' };
    }

    let result: { ok: boolean; message: string };

    try {
      switch (provider) {
        case 'LLM':
          result = await this.testLlm(payload);
          break;
        case 'IMAGE_GEN':
          result = await this.testImageGen(payload);
          break;
        case 'RESEARCH':
          result = await this.testResearch(payload);
          break;
        case 'CLOUDINARY':
          result = await this.testCloudinary(payload);
          break;
        case 'META':
          result = await this.testMeta(payload);
          break;
        case 'DISCORD':
          result = await this.testDiscord(payload);
          break;
        case 'TELEGRAM':
          result = await this.testTelegram(payload);
          break;
        case 'HEYGEN':
          result = await this.testHeygen(payload);
          break;
        default:
          result = { ok: true, message: 'Proveedor guardado (sin test automático)' };
      }
    } catch (e: any) {
      result = { ok: false, message: e.message || 'Error desconocido' };
    }

    await this.updateTestResult(existing.id, result.ok ? 'ok' : `error: ${result.message}`);
    return result;
  }

  // ── Get raw decrypted payload (internal use only) ─────

  async getDecryptedPayload(userId: string, provider: string): Promise<Record<string, any> | null> {
    const existing = await this.prisma.userCredential.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });
    if (!existing || !existing.isActive) return null;
    try {
      return decryptJson(existing.encryptedPayload);
    } catch {
      return null;
    }
  }

  // ── Private helpers ───────────────────────────────────

  private async updateTestResult(id: string, result: string) {
    await this.prisma.userCredential.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestResult: result },
    });
  }

  private validatePayload(provider: string, payload: any) {
    switch (provider) {
      case 'LLM':
      case 'IMAGE_GEN':
      case 'RESEARCH':
      case 'HEYGEN':
        if (!payload.apiKey?.trim()) throw new BadRequestException('API Key es requerida');
        break;
      case 'META':
        if (!payload.accessToken?.trim()) throw new BadRequestException('Access Token es requerido');
        break;
      case 'DISCORD':
        if (!payload.webhookUrl?.trim()) throw new BadRequestException('Webhook URL es requerida');
        break;
      case 'TELEGRAM':
        if (!payload.botToken?.trim()) throw new BadRequestException('Bot Token es requerido');
        break;
      case 'CLOUDINARY':
        if (!payload.cloudName?.trim() || !payload.apiKey?.trim() || !payload.apiSecret?.trim())
          throw new BadRequestException('Cloud Name, API Key y API Secret son requeridos');
        break;
      case 'GOOGLE_DRIVE':
        if (!payload.accessToken?.trim()) throw new BadRequestException('Access Token es requerido');
        break;
      case 'AWS_S3':
        if (!payload.bucket?.trim() || !payload.accessKeyId?.trim() || !payload.secretAccessKey?.trim())
          throw new BadRequestException('Bucket, Access Key y Secret Key son requeridos');
        break;
      default:
        throw new BadRequestException(`Proveedor no soportado: ${provider}`);
    }
  }

  // ── Test implementations ──────────────────────────────

  private async testLlm(payload: any): Promise<{ ok: boolean; message: string }> {
    // Test using OpenRouter or OpenAI /models endpoint
    const baseUrl = payload.provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/models'
      : payload.provider === 'openai'
        ? 'https://api.openai.com/v1/models'
        : 'https://openrouter.ai/api/v1/models';

    const headers: Record<string, string> = { 'Authorization': `Bearer ${payload.apiKey}` };
    if (payload.provider === 'anthropic') {
      headers['x-api-key'] = payload.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      delete headers['Authorization'];
    }

    const res = await fetch(baseUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
    }
    return { ok: true, message: 'Conexión exitosa' };
  }

  private async testImageGen(payload: any): Promise<{ ok: boolean; message: string }> {
    // Test HuggingFace API
    const res = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { 'Authorization': `Bearer ${payload.apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true, message: 'Conexión exitosa' };
  }

  private async testResearch(payload: any): Promise<{ ok: boolean; message: string }> {
    // Try Tavily first, then SerpAPI pattern
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: payload.apiKey, query: 'test', max_results: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true, message: 'Tavily: Conexión exitosa' };
    // Could be SerpAPI format
    const serpRes = await fetch(`https://serpapi.com/search.json?q=test&api_key=${payload.apiKey}&num=1`, {
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (serpRes?.ok) return { ok: true, message: 'SerpAPI: Conexión exitosa' };
    return { ok: false, message: 'No se pudo verificar la API key (ni Tavily ni SerpAPI)' };
  }

  private async testCloudinary(payload: any): Promise<{ ok: boolean; message: string }> {
    const { cloudName, apiKey, apiSecret } = payload;
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true, message: 'Conexión exitosa' };
  }

  private async testMeta(payload: any): Promise<{ ok: boolean; message: string }> {
    const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${payload.accessToken}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: 'Token inválido o expirado' };
    const data: any = await res.json();
    return { ok: true, message: `Conectado como: ${data.name || data.id}` };
  }

  private async testDiscord(payload: any): Promise<{ ok: boolean; message: string }> {
    // Validate webhook URL format
    if (!payload.webhookUrl.startsWith('https://discord.com/api/webhooks/'))
      return { ok: false, message: 'URL no es un webhook de Discord válido' };
    const res = await fetch(payload.webhookUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    const data: any = await res.json();
    return { ok: true, message: `Webhook: ${data.name || 'OK'}` };
  }

  private async testTelegram(payload: any): Promise<{ ok: boolean; message: string }> {
    const res = await fetch(`https://api.telegram.org/bot${payload.botToken}/getMe`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: 'Bot token inválido' };
    const data: any = await res.json();
    return { ok: true, message: `Bot: @${data.result?.username || 'OK'}` };
  }

  private async testHeygen(payload: any): Promise<{ ok: boolean; message: string }> {
    const res = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'X-Api-Key': payload.apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true, message: 'Conexión exitosa' };
  }

  // ════════════════════════════════════════════════════════
  // META OAUTH — Read status from workspace-level ApiCredential
  // ════════════════════════════════════════════════════════

  async getMetaOAuthStatus(workspaceId: string) {
    const cred = await this.prisma.apiCredential.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: 'META' } },
    });
    if (!cred || !cred.isActive) {
      return { connected: false, accountInfo: null };
    }
    try {
      const decoded = JSON.parse(Buffer.from(cred.encryptedKey, 'base64').toString('utf-8'));
      return {
        connected: true,
        accountInfo: {
          igUsername: decoded.igUsername || null,
          fbPageName: decoded.fbPageName || null,
          threadsUsername: decoded.threadsUsername || null,
          connectedAt: decoded.connectedAt || null,
          connectedVia: decoded.connectedVia || null,
        },
        scopes: cred.scopes,
        expiresAt: cred.expiresAt,
      };
    } catch {
      return { connected: true, accountInfo: null, scopes: cred.scopes };
    }
  }

  async disconnectMeta(workspaceId: string) {
    const cred = await this.prisma.apiCredential.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: 'META' } },
    });
    if (!cred) throw new NotFoundException('Meta no está conectado');
    await this.prisma.apiCredential.delete({ where: { id: cred.id } });
    this.logger.log(`🔌 Meta disconnected for workspace ${workspaceId}`);
    return { disconnected: true };
  }

  // ════════════════════════════════════════════════════════
  // TELEGRAM PAIRING — QR-based bot linking
  // ════════════════════════════════════════════════════════

  async getTelegramLinkStatus(userId: string) {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
    });
    if (!link || !link.isActive) {
      return { linked: false, link: null };
    }
    return {
      linked: true,
      link: {
        chatId: link.chatId,
        username: link.username,
        firstName: link.firstName,
        linkedAt: link.linkedAt,
      },
    };
  }

  async generatePairToken(userId: string) {
    // Clean up old expired tokens
    await this.prisma.telegramLinkToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    // Generate a 6-char alphanumeric token
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }

    // Store with 5-min expiry
    await this.prisma.telegramLinkToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Get bot username via getMe
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    let botUsername = 'SyndraBot';
    if (botToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          signal: AbortSignal.timeout(5000),
        });
        const data: any = await res.json();
        if (data.ok && data.result?.username) {
          botUsername = data.result.username;
        }
      } catch { /* use default */ }
    }

    const deepLink = `https://t.me/${botUsername}?start=LINK_${token}`;

    this.logger.log(`🔗 Telegram pair token generated for user ${userId}: ${token}`);
    return { token, deepLink, botUsername, expiresInSeconds: 300 };
  }

  async checkPairStatus(token: string) {
    const linkToken = await this.prisma.telegramLinkToken.findUnique({
      where: { token },
    });
    if (!linkToken) return { status: 'not_found' };
    if (linkToken.usedAt) return { status: 'linked' };
    if (linkToken.expiresAt < new Date()) return { status: 'expired' };
    return { status: 'pending' };
  }

  /**
   * Called by the Telegram bot when it receives /start LINK_xxx
   */
  async completePairing(token: string, chatId: string, username?: string, firstName?: string) {
    const linkToken = await this.prisma.telegramLinkToken.findUnique({
      where: { token },
    });

    if (!linkToken) throw new NotFoundException('Token no encontrado');
    if (linkToken.usedAt) throw new BadRequestException('Token ya utilizado');
    if (linkToken.expiresAt < new Date()) throw new BadRequestException('Token expirado');

    // Create or update TelegramLink
    await this.prisma.telegramLink.upsert({
      where: { userId: linkToken.userId },
      update: { chatId, username, firstName, isActive: true, linkedAt: new Date() },
      create: { userId: linkToken.userId, chatId, username, firstName },
    });

    // Mark token as used
    await this.prisma.telegramLinkToken.update({
      where: { id: linkToken.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`✅ Telegram linked: user ${linkToken.userId} → chat ${chatId} (@${username})`);
    return { linked: true, userId: linkToken.userId };
  }

  async unlinkTelegram(userId: string) {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
    });
    if (!link) throw new NotFoundException('Telegram no está vinculado');
    await this.prisma.telegramLink.delete({ where: { id: link.id } });
    this.logger.log(`🔌 Telegram unlinked for user ${userId}`);
    return { unlinked: true };
  }
}
