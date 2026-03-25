// ============================================================
// Credits Controller — Balance, history, and PayPal credit purchase
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Headers,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/decorators';
import {
  CreditService,
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  CreditPackageKey,
} from './credits.service';

@Controller('credits')
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

  // PayPal config (reuse existing env vars)
  private readonly paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
  private readonly paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  private readonly paypalBaseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  private readonly paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID || '';

  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(private readonly creditService: CreditService) {}

  // ── Balance ───────────────────────────────────────────

  @Get('balance')
  @UseGuards(AuthGuard)
  async getBalance(@Req() req: any) {
    const workspaceId = req.headers['x-workspace-id'] ?? req.workspaceId;
    const data = await this.creditService.getBalance(workspaceId);
    // Map to frontend contract
    return {
      balance: data.currentBalance,
      unlimited: data.isUnlimited,
      totalPurchased: data.totalPurchased,
      totalConsumed: data.totalConsumed,
      totalRefunded: data.totalRefunded,
    };
  }

  // ── Cost table ────────────────────────────────────────

  @Get('costs')
  getCosts() {
    // Frontend expects costs as flat object and packages as array
    const packagesArray = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
      key,
      credits: pkg.credits,
      price: parseFloat(pkg.priceUsd),
      label: pkg.label,
      popular: key === 'popular',
    }));
    return { costs: CREDIT_COSTS, packages: packagesArray };
  }

  // ── History ───────────────────────────────────────────

  @Get('history')
  @UseGuards(AuthGuard)
  async getHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('source') source?: string,
  ) {
    const workspaceId = req.headers['x-workspace-id'] ?? req.workspaceId;
    const records = await this.creditService.getHistory(workspaceId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      source,
    });
    return { history: records };
  }

  // ── Create PayPal order for credit purchase ───────────

  @Post('purchase')
  @UseGuards(AuthGuard)
  async createOrder(
    @Req() req: any,
    @Body() body: { packageKey?: CreditPackageKey; package?: CreditPackageKey },
  ) {
    const workspaceId = req.headers['x-workspace-id'] ?? req.workspaceId;
    // Accept both 'packageKey' (frontend) and 'package' for backwards compat
    const packageKey = body.packageKey ?? body.package;
    if (!packageKey) throw new BadRequestException('packageKey is required');
    const pkg = CREDIT_PACKAGES[packageKey];
    if (!pkg) throw new BadRequestException('Invalid package');

    if (!this.paypalClientId || !this.paypalClientSecret) {
      // Dev mode: acreditar directamente
      this.logger.warn('PayPal not configured — crediting directly (dev mode)');
      const result = await this.creditService.addCredits(
        workspaceId,
        pkg.credits,
        'PURCHASE',
        `Compra dev: ${pkg.label}`,
      );
      return { directCredit: true, creditsAdded: pkg.credits, newBalance: result.newBalance };
    }

    const token = await this.getPayPalToken();
    const appUrl = process.env.APP_URL || 'http://localhost:3002';

    const order = await this.paypalFetch<any>(token, '/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: pkg.priceUsd },
            description: `Syndra AI Credits: ${pkg.label}`,
            custom_id: JSON.stringify({
              workspaceId,
              packageKey,
              credits: pkg.credits,
            }),
          },
        ],
        application_context: {
          brand_name: 'Syndra',
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${appUrl}/dashboard/credits?payment=success`,
          cancel_url: `${appUrl}/dashboard/credits?payment=cancelled`,
        },
      }),
    });

    const approvalLink = order.links?.find((l: any) => l.rel === 'approve');
    if (!approvalLink) {
      throw new BadRequestException('PayPal no devolvió URL de aprobación');
    }

    this.logger.log(
      `PayPal order ${order.id} created for ${pkg.credits} credits (workspace ${workspaceId})`,
    );

    return {
      orderId: order.id,
      approvalUrl: approvalLink.href,
      approveUrl: approvalLink.href,  // alias for frontend compat
    };
  }

  // ── Capture PayPal order (called from frontend after approval) ─

  @Post('capture')
  @UseGuards(AuthGuard)
  async captureOrder(
    @Req() req: any,
    @Body() body: { orderId: string },
  ) {
    const workspaceId = req.headers['x-workspace-id'] ?? req.workspaceId;

    if (!this.paypalClientId) {
      throw new BadRequestException('PayPal not configured');
    }

    const token = await this.getPayPalToken();
    const capture = await this.paypalFetch<any>(
      token,
      `/v2/checkout/orders/${body.orderId}/capture`,
      { method: 'POST' },
    );

    if (capture.status !== 'COMPLETED') {
      throw new BadRequestException(`Payment not completed: ${capture.status}`);
    }

    // Extraer metadata del custom_id
    const purchaseUnit = capture.purchase_units?.[0];
    const customId = purchaseUnit?.payments?.captures?.[0]?.custom_id
      ?? purchaseUnit?.custom_id;
    let meta: any = {};
    try {
      meta = JSON.parse(customId);
    } catch {
      this.logger.warn('Could not parse custom_id from PayPal capture');
    }

    const credits = meta.credits ?? 100;
    const packageKey = meta.packageKey ?? 'basic';
    const targetWs = meta.workspaceId ?? workspaceId;

    // Deduplication: check if this order was already credited
    const existing = await this.creditService.findByPaypalOrderId(body.orderId);
    if (existing) {
      this.logger.warn(`Order ${body.orderId} already credited — skipping`);
      return { creditsAdded: 0, newBalance: existing.balance, alreadyCredited: true };
    }

    const result = await this.creditService.addCredits(
      targetWs,
      credits,
      'PURCHASE',
      `Compra PayPal: ${CREDIT_PACKAGES[packageKey as CreditPackageKey]?.label ?? packageKey}`,
      body.orderId,
    );

    this.logger.log(`Credited ${credits} to workspace ${targetWs} (order ${body.orderId})`);
    return { creditsAdded: credits, newBalance: result.newBalance };
  }

  // ── PayPal Webhook (alternative to capture flow) ──────

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Credits webhook: ${body?.event_type}`);

    // Verify signature — always required
    if (!this.paypalWebhookId || !this.paypalClientId) {
      this.logger.error('Credits webhook rejected — PayPal credentials not configured');
      return { error: 'Webhook not configured' };
    }
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    const valid = await this.verifyWebhookSignature(headers, rawBody);
    if (!valid) {
      this.logger.warn('Invalid webhook signature');
      return { error: 'Invalid signature' };
    }

    if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
      // Auto-capture
      const orderId = body.resource?.id;
      if (orderId) {
        try {
          const token = await this.getPayPalToken();
          const capture = await this.paypalFetch<any>(
            token,
            `/v2/checkout/orders/${orderId}/capture`,
            { method: 'POST' },
          );
          if (capture.status === 'COMPLETED') {
            const pu = capture.purchase_units?.[0];
            const customId = pu?.payments?.captures?.[0]?.custom_id ?? pu?.custom_id;
            const meta = JSON.parse(customId || '{}');
            if (meta.workspaceId && meta.credits) {
              // Dedup: skip if already credited
              const existing = await this.creditService.findByPaypalOrderId(orderId);
              if (!existing) {
                await this.creditService.addCredits(
                  meta.workspaceId,
                  meta.credits,
                  'PURCHASE',
                  `PayPal webhook: ${meta.packageKey}`,
                  orderId,
                );
              }
            }
          }
        } catch (err: any) {
          this.logger.error(`Webhook capture failed: ${err.message}`);
        }
      }
    }

    if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = body.resource;
      const customId = capture?.custom_id;
      if (customId) {
        try {
          const meta = JSON.parse(customId);
          if (meta.workspaceId && meta.credits) {
            // Dedup: skip if already credited
            const existing = await this.creditService.findByPaypalOrderId(capture.id);
            if (!existing) {
              await this.creditService.addCredits(
                meta.workspaceId,
                meta.credits,
                'PURCHASE',
                `PayPal capture: ${meta.packageKey}`,
                capture.id,
              );
            }
          }
        } catch (err: any) {
          this.logger.error(`Webhook credit error: ${err.message}`);
        }
      }
    }

    return { ok: true };
  }

  // ── PayPal helpers (reuse pattern from PaypalService) ─

  private async getPayPalToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.paypalClientId}:${this.paypalClientSecret}`,
    ).toString('base64');

    const res = await fetch(`${this.paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`PayPal auth failed: ${err}`);
    }

    const data = (await res.json()) as any;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async paypalFetch<T>(
    token: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.paypalBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`PayPal API error [${res.status}]: ${err}`);
    }

    return res.json() as Promise<T>;
  }

  private async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
  ): Promise<boolean> {
    try {
      const token = await this.getPayPalToken();
      const result = await this.paypalFetch<any>(
        token,
        '/v1/notifications/verify-webhook-signature',
        {
          method: 'POST',
          body: JSON.stringify({
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: this.paypalWebhookId,
            webhook_event: JSON.parse(body),
          }),
        },
      );
      return result.verification_status === 'SUCCESS';
    } catch {
      return false;
    }
  }
}
