// ============================================================
// PayPal Service — Subscription management via PayPal REST API
// ============================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// ── Types ──────────────────────────────────────────────────

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalPlanMapping {
  planName: string;
  monthlyPlanId: string;
  yearlyPlanId: string;
  monthlyDiscountPlanId: string;
  yearlyDiscountPlanId: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: any;
  summary: string;
  create_time: string;
}

// ── Service ────────────────────────────────────────────────

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly webhookId: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  // PayPal plan IDs mapped from our plan names
  // Set these via env: PAYPAL_PLAN_STARTER_MONTHLY, PAYPAL_PLAN_PRO_YEARLY, etc.
  private readonly planMappings: PayPalPlanMapping[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID || '';

    // Use sandbox in dev, live in production
    this.baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    this.planMappings = [
      {
        planName: 'starter',
        monthlyPlanId: process.env.PAYPAL_PLAN_STARTER_MONTHLY || '',
        yearlyPlanId: process.env.PAYPAL_PLAN_STARTER_YEARLY || '',
        monthlyDiscountPlanId: process.env.PAYPAL_PLAN_STARTER_MONTHLY_DISCOUNT || '',
        yearlyDiscountPlanId: process.env.PAYPAL_PLAN_STARTER_YEARLY_DISCOUNT || '',
      },
      {
        planName: 'creator',
        monthlyPlanId: process.env.PAYPAL_PLAN_CREATOR_MONTHLY || '',
        yearlyPlanId: process.env.PAYPAL_PLAN_CREATOR_YEARLY || '',
        monthlyDiscountPlanId: process.env.PAYPAL_PLAN_CREATOR_MONTHLY_DISCOUNT || '',
        yearlyDiscountPlanId: process.env.PAYPAL_PLAN_CREATOR_YEARLY_DISCOUNT || '',
      },
      {
        planName: 'pro',
        monthlyPlanId: process.env.PAYPAL_PLAN_PRO_MONTHLY || '',
        yearlyPlanId: process.env.PAYPAL_PLAN_PRO_YEARLY || '',
        monthlyDiscountPlanId: process.env.PAYPAL_PLAN_PRO_MONTHLY_DISCOUNT || '',
        yearlyDiscountPlanId: process.env.PAYPAL_PLAN_PRO_YEARLY_DISCOUNT || '',
      },
    ];

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        '⚠️  PayPal credentials not configured — payment features disabled. ' +
        'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  // ── Check if PayPal is configured ─────────────────────

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  // ── Get OAuth2 access token ───────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`PayPal OAuth failed: ${err}`);
      throw new InternalServerErrorException('PayPal authentication failed');
    }

    const data = (await res.json()) as PayPalTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1min early
    return this.accessToken;
  }

  // ── API call helper ───────────────────────────────────

  private async paypalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`PayPal API error [${res.status}]: ${err}`);
      throw new InternalServerErrorException(`PayPal API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Create subscription (checkout) ────────────────────

  async createSubscription(
    workspaceId: string,
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<{ approvalUrl: string; subscriptionId: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('PayPal no está configurado');
    }

    // Get our plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new BadRequestException('Plan no válido');

    if (plan.name === 'FREE') {
      throw new BadRequestException('El plan gratuito no requiere pago');
    }

    // Find PayPal plan ID
    const mapping = this.planMappings.find((m) => m.planName === plan.name);
    if (!mapping) {
      throw new BadRequestException(`No hay plan de PayPal configurado para ${plan.name}`);
    }

    // Check if workspace has a referral discount → use discount plan ID
    const sub = await this.prisma.subscription.findUnique({ where: { workspaceId } });
    const hasDiscount = (sub?.discountPercent ?? 0) > 0;

    let paypalPlanId: string;
    if (hasDiscount) {
      paypalPlanId = dto.billingCycle === 'YEARLY'
        ? mapping.yearlyDiscountPlanId
        : mapping.monthlyDiscountPlanId;
    } else {
      paypalPlanId = dto.billingCycle === 'YEARLY'
        ? mapping.yearlyPlanId
        : mapping.monthlyPlanId;
    }

    if (!paypalPlanId) {
      throw new BadRequestException(
        `Plan PayPal ${plan.name} (${dto.billingCycle}) no configurado`,
      );
    }

    // Get user info for subscriber
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const appUrl = process.env.APP_URL || 'http://localhost:3002';
    const returnUrl = dto.returnUrl || `${appUrl}/dashboard?payment=success`;
    const cancelUrl = dto.cancelUrl || `${appUrl}/dashboard?payment=cancelled`;

    // Create PayPal subscription
    const subscription = await this.paypalFetch<any>('/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: {
          name: {
            given_name: user?.name?.split(' ')[0] || 'User',
            surname: user?.name?.split(' ').slice(1).join(' ') || '',
          },
          email_address: user?.email,
        },
        application_context: {
          brand_name: 'Syndra',
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    const approvalLink = subscription.links?.find(
      (l: any) => l.rel === 'approve',
    );

    if (!approvalLink) {
      throw new InternalServerErrorException('PayPal no devolvió URL de aprobación');
    }

    // Store pending subscription reference
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        paypalSubscriptionId: subscription.id,
        paypalPlanId: paypalPlanId,
        status: 'PAUSED', // Using PAUSED as pending state until PayPal activates
      },
    });

    this.logger.log(
      `PayPal subscription ${subscription.id} created for workspace ${workspaceId}`,
    );

    return {
      approvalUrl: approvalLink.href,
      subscriptionId: subscription.id,
    };
  }

  // ── Cancel subscription ───────────────────────────────

  async cancelSubscription(workspaceId: string, reason?: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub?.paypalSubscriptionId) {
      throw new BadRequestException('No hay suscripción PayPal activa');
    }

    if (this.isConfigured()) {
      await this.paypalFetch(`/v1/billing/subscriptions/${sub.paypalSubscriptionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Customer requested cancellation' }),
      });
    }

    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
      },
    });

    this.logger.log(`Subscription cancelled for workspace ${workspaceId}`);
  }

  // ── Get subscription details from PayPal ──────────────

  async getSubscriptionDetails(paypalSubscriptionId: string): Promise<any> {
    return this.paypalFetch(`/v1/billing/subscriptions/${paypalSubscriptionId}`);
  }

  // ── Webhook verification ──────────────────────────────

  async verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
    if (!this.isConfigured() || !this.webhookId) {
      this.logger.warn('Webhook verification failed — PayPal not configured');
      return false;
    }

    try {
      const result = await this.paypalFetch<any>('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: this.webhookId,
          webhook_event: JSON.parse(body),
        }),
      });

      return result.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      return false;
    }
  }

  // ── Process webhook events ────────────────────────────

  async handleWebhook(event: PayPalWebhookEvent): Promise<void> {
    this.logger.log(`PayPal webhook: ${event.event_type} [${event.id}]`);

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await this.onSubscriptionActivated(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.onSubscriptionCancelled(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.onSubscriptionSuspended(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await this.onSubscriptionExpired(event.resource);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        await this.onPaymentCompleted(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await this.onSubscriptionUpdated(event.resource);
        break;
      default:
        this.logger.log(`Unhandled PayPal event: ${event.event_type}`);
    }
  }

  // ── Webhook handlers ──────────────────────────────────

  private async onSubscriptionActivated(resource: any) {
    const paypalSubId = resource.id;
    const sub = await this.prisma.subscription.findFirst({
      where: { paypalSubscriptionId: paypalSubId },
      include: { plan: true, workspace: { include: { users: { include: { user: true } } } } },
    });

    if (!sub) {
      this.logger.warn(`No subscription found for PayPal ID: ${paypalSubId}`);
      return;
    }

    // Update subscription status
    const now = new Date();
    const periodEnd = new Date(now);
    if (sub.billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        paypalCustomerId: resource.subscriber?.payer_id || null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Send confirmation email
    const owner = sub.workspace?.users?.find((u: any) => u.role === 'OWNER');
    if (owner?.user?.email) {
      await this.emailService.sendSubscriptionEmail(
        owner.user.email,
        owner.user.name || 'Usuario',
        sub.plan?.displayName || sub.planId,
      );
    }

    // Record payment
    const price = sub.billingCycle === 'YEARLY'
      ? sub.plan?.yearlyPrice || 0
      : sub.plan?.monthlyPrice || 0;
    const discountedAmount = Math.round(price * (1 - (sub.discountPercent || 0) / 100));

    await this.prisma.paymentLog.create({
      data: {
        workspaceId: sub.workspaceId,
        amount: discountedAmount,
        currency: 'USD',
        method: 'paypal',
        reference: paypalSubId,
        description: `Suscripción ${sub.plan?.displayName} (${sub.billingCycle})`,
        recordedBy: 'system',
      },
    });

    // Handle affiliate commission
    await this.processAffiliateCommission(sub.workspaceId, discountedAmount);

    // Process AI Fund Ledger automatically
    await this.processAiFundReserveAddition(sub.workspaceId, sub.plan?.name || '', sub.billingCycle);

    this.logger.log(`Subscription activated: ${sub.workspaceId} → ${sub.plan?.name}`);
  }

  private async onSubscriptionCancelled(resource: any) {
    const paypalSubId = resource.id;
    const sub = await this.prisma.subscription.findFirst({
      where: { paypalSubscriptionId: paypalSubId },
      include: { workspace: { include: { users: { include: { user: true } } } }, plan: true },
    });

    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true },
    });

    const owner = sub.workspace?.users?.find((u: any) => u.role === 'OWNER');
    if (owner?.user?.email) {
      await this.emailService.sendSubscriptionEmail(
        owner.user.email,
        owner.user.name || 'Usuario',
        sub.plan?.displayName || sub.planId,
      );
    }

    this.logger.log(`Subscription cancelled: ${sub.workspaceId}`);
  }

  private async onSubscriptionSuspended(resource: any) {
    const paypalSubId = resource.id;
    await this.prisma.subscription.updateMany({
      where: { paypalSubscriptionId: paypalSubId },
      data: { status: 'PAST_DUE' },
    });
    this.logger.log(`Subscription suspended: ${paypalSubId}`);
  }

  private async onSubscriptionExpired(resource: any) {
    const paypalSubId = resource.id;
    const sub = await this.prisma.subscription.findFirst({
      where: { paypalSubscriptionId: paypalSubId },
    });

    if (sub) {
      // Downgrade to starter plan (lowest tier)
      const starterPlan = await this.prisma.plan.findUnique({ where: { name: 'starter' } });
      if (starterPlan) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: starterPlan.id,
            status: 'ACTIVE',
            paypalSubscriptionId: null,
            paypalCustomerId: null,
            paypalPlanId: null,
          },
        });
      }
    }
    this.logger.log(`Subscription expired, downgraded to Starter: ${paypalSubId}`);
  }

  private async onPaymentCompleted(resource: any) {
    // Payment for recurring billing
    const paypalSubId = resource.billing_agreement_id;
    if (!paypalSubId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { paypalSubscriptionId: paypalSubId },
      include: { plan: true },
    });

    if (sub) {
      // Extend period
      const periodEnd = new Date(sub.currentPeriodEnd || new Date());
      if (sub.billingCycle === 'YEARLY') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodEnd: periodEnd,
          status: 'ACTIVE',
        },
      });

      // Record payment
      const amountValue = parseFloat(resource.amount?.total || '0') * 100;
      await this.prisma.paymentLog.create({
        data: {
          workspaceId: sub.workspaceId,
          amount: Math.round(amountValue),
          currency: resource.amount?.currency || 'USD',
          method: 'paypal',
          reference: resource.id,
          description: `Pago recurrente ${sub.plan?.displayName}`,
          recordedBy: 'system',
        },
      });

      // Process affiliate commission
      await this.processAffiliateCommission(sub.workspaceId, Math.round(amountValue));

      // Process AI Fund Ledger automatically
      await this.processAiFundReserveAddition(sub.workspaceId, sub.plan?.name || '', sub.billingCycle);
    }
  }

  private async onSubscriptionUpdated(resource: any) {
    this.logger.log(`Subscription updated: ${resource.id}`);
    // Sync plan details if needed
  }

  // ── Affiliate commission helper ───────────────────────

  private async processAffiliateCommission(workspaceId: string, amountPaid: number) {
    try {
      // Find if workspace owner was referred
      const wsUser = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, role: 'OWNER' },
        include: { user: true },
      });

      if (!wsUser?.user?.referredByCode) return;

      // Find referring user
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: wsUser.user.referredByCode },
      });
      if (!referrer) return;

      // Find active referral
      const referral = await this.prisma.affiliateReferral.findFirst({
        where: {
          referredUserId: wsUser.userId,
          collaboratorId: referrer.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (referral) {
        const commissionAmount = Math.round(amountPaid * (referral.commissionPercent / 100));
        await this.prisma.affiliateReferral.update({
          where: { id: referral.id },
          data: {
            amountPaid,
            commissionAmount,
            status: 'APPROVED',
          },
        });
      }
    } catch (error) {
      this.logger.error('Error processing affiliate commission:', error);
    }
  }

  // ── AI Fund Ledger helper ──────────────────────────────

  private async processAiFundReserveAddition(workspaceId: string, planName: string, billingCycle: string) {
    try {
      let amountToAdd = 0;
      const normalizedPlan = planName.toLowerCase();

      if (normalizedPlan === 'starter') amountToAdd = 5;
      else if (normalizedPlan === 'creator') amountToAdd = 10;
      else if (normalizedPlan === 'pro') amountToAdd = 15;

      if (amountToAdd > 0) {
        // Multiplier for yearly subscriptions
        if (billingCycle === 'YEARLY') {
          amountToAdd *= 12;
        }

        await this.prisma.aiFundLedger.create({
          data: {
            amount: amountToAdd,
            reason: `Pago Suscripción ${planName} (${billingCycle}) - WS: ${workspaceId}`,
            type: 'TOP_UP',
            workspaceId,
          },
        });
        
        this.logger.log(`AI Fund Reserve: Added $${amountToAdd} for WS ${workspaceId} (${planName})`);
      }
    } catch (error) {
      this.logger.error('Failed to update AI Fund Reserve Ledger:', error);
    }
  }

  // ── Get checkout status ───────────────────────────────

  async getCheckoutStatus(workspaceId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub) {
      return { hasSubscription: false, plan: null, status: null };
    }

    return {
      hasSubscription: true,
      plan: sub.plan,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodEnd: sub.currentPeriodEnd,
      paypalSubscriptionId: sub.paypalSubscriptionId,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  // ── Get billing history ───────────────────────────────

  async getBillingHistory(workspaceId: string) {
    const payments = await this.prisma.paymentLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    return {
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        reference: p.reference,
        description: p.description,
        createdAt: p.createdAt,
      })),
      subscription: sub ? {
        planName: sub.plan?.displayName,
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        paypalSubscriptionId: sub.paypalSubscriptionId,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        discountPercent: sub.discountPercent,
      } : null,
    };
  }
}
