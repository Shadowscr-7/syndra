// ============================================================
// PayPal Controller — Subscription checkout & webhooks
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { PaypalService, CreateSubscriptionDto } from './paypal.service';
import { Public } from '../auth/decorators';

@Controller('paypal')
export class PaypalController {
  private readonly logger = new Logger(PaypalController.name);

  constructor(private readonly paypalService: PaypalService) {}

  // ── Check if PayPal is configured ─────────────────────

  @Get('status')
  getStatus() {
    return { configured: this.paypalService.isConfigured() };
  }

  // ── Create subscription (checkout) ────────────────────

  @Post('subscribe')
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const workspaceId = (req as any).workspaceId;

    if (!user?.sub || !workspaceId) {
      return { error: 'No autenticado' };
    }

    const result = await this.paypalService.createSubscription(
      workspaceId,
      user.sub,
      dto,
    );

    return result;
  }

  // ── Cancel subscription ───────────────────────────────

  @Post('cancel')
  async cancelSubscription(
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    const workspaceId = (req as any).workspaceId;
    if (!workspaceId) return { error: 'No workspace' };

    await this.paypalService.cancelSubscription(workspaceId, body.reason);
    return { ok: true };
  }

  // ── Get checkout status ───────────────────────────────

  @Get('checkout-status')
  async getCheckoutStatus(@Req() req: Request) {
    const workspaceId = (req as any).workspaceId;
    if (!workspaceId) return { error: 'No workspace' };

    return this.paypalService.getCheckoutStatus(workspaceId);
  }

  // ── Webhook (public — PayPal calls this) ──────────────

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`PayPal webhook received: ${body?.event_type}`);

    // Verify webhook signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    const isValid = await this.paypalService.verifyWebhookSignature(headers, rawBody);

    if (!isValid) {
      this.logger.warn('Invalid PayPal webhook signature');
      return { error: 'Invalid signature' };
    }

    // Process the event
    await this.paypalService.handleWebhook(body);

    return { ok: true };
  }
}
