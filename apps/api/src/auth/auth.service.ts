// ============================================================
// Auth Service — Registration, Login, JWT tokens, bcrypt
// ============================================================

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// ── Types ──────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AccessTokenPayload {
  sub: string;        // userId
  email: string;
  role: string;       // UserRole
  workspaceId?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  planId: string;            // required: plan_starter | plan_creator | plan_pro
  billingCycle?: 'MONTHLY' | 'YEARLY';
  referralCode?: string;     // optional referral code for 20% discount
}

export interface LoginDto {
  email: string;
  password: string;
}

// ── Constants ──────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '24h';
const ACCESS_TOKEN_EXPIRY_SEC = 86400; // 24 hours
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFERRAL_DISCOUNT_PERCENT = 20;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.jwtSecret =
      process.env.JWT_SECRET ||
      process.env.SUPABASE_JWT_SECRET ||
      '';

    if (!this.jwtSecret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET is required in production. Set it in your .env file.');
    }
    if (!this.jwtSecret) {
      this.logger.warn('⚠️  No JWT_SECRET set — running in dev mode. DO NOT use in production!');
    }
  }

  // ── Registration ────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ user: any; tokens: TokenPair; workspaceId: string; subscription: any }> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    // Validate plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new BadRequestException('Plan no válido');
    }

    // Validate referral code if provided
    let referrer: any = null;
    let discountPercent = 0;
    if (dto.referralCode?.trim()) {
      referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
      if (!referrer) {
        throw new BadRequestException('Código de referido no válido');
      }
      discountPercent = REFERRAL_DISCOUNT_PERCENT;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Generate unique referral code for this new user
    const userReferralCode = await this.generateReferralCode(dto.name);

    // Create user + workspace + subscription in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          name: dto.name.trim(),
          role: 'USER',
          emailVerified: false,
          referredByCode: dto.referralCode?.trim().toUpperCase() || null,
          referralCode: userReferralCode,
        },
      });

      // 2. Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: `${dto.name.trim()}'s Workspace`,
          slug: `ws-${user.id}`,
        },
      });

      // 3. Link user as OWNER
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          isDefault: true,
        },
      });

      // 4. Create subscription with selected plan (TRIALING until PayPal payment)
      const billingCycle = dto.billingCycle || 'MONTHLY';
      const periodStart = new Date();
      const periodEnd = new Date();
      // Trial period: 7 days to complete PayPal payment
      periodEnd.setDate(periodEnd.getDate() + 7);

      const subscription = await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          planId: plan.id,
          status: 'TRIALING',
          billingCycle,
          discountPercent,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      // 5. Grant initial credits based on plan
      const INITIAL_CREDITS: Record<string, number> = {
        starter: 50,
        creator: 200,
        pro: 2000,
      };
      const initialCredits = INITIAL_CREDITS[plan.name] ?? 50;
      await tx.creditBalance.create({
        data: {
          workspaceId: workspace.id,
          totalPurchased: initialCredits,
          currentBalance: initialCredits,
        },
      });

      // 7. Create default brand profile for the workspace
      await tx.brandProfile.create({
        data: {
          workspaceId: workspace.id,
          voice: '',
          tone: 'profesional',
        },
      });

      // 8. Create AffiliateReferral if registering with a referral code
      let affiliateReferral = null;
      if (referrer) {
        const priceInCents = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
        const discountedPrice = Math.round(priceInCents * (1 - discountPercent / 100));
        const commissionAmount = Math.round(discountedPrice * 0.20); // 20% commission

        affiliateReferral = await tx.affiliateReferral.create({
          data: {
            collaboratorId: referrer.id,
            referredUserId: user.id,
            referralCode: referrer.referralCode,
            subscriptionId: subscription.id,
            planName: plan.displayName,
            amountPaid: discountedPrice,
            commissionPercent: 20,
            commissionAmount,
            commissionType: 'FIRST_PURCHASE',
            status: 'PENDING',
          },
        });
      }

      return { user, workspace, subscription, affiliateReferral };
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(
      result.user.id,
      result.user.email,
      result.user.role,
      result.workspace.id,
    );

    this.logger.log(
      `✅ New user: ${result.user.email} | Plan: ${plan.displayName} | Referral: ${dto.referralCode || 'none'} | Discount: ${discountPercent}%`,
    );

    // Send email verification (async, don't block registration)
    this.sendVerificationEmail(result.user.id).catch((err) =>
      this.logger.error(`Failed to send verification email: ${err.message}`),
    );

    return {
      user: this.sanitizeUser(result.user),
      tokens,
      workspaceId: result.workspace.id,
      subscription: {
        planId: result.subscription.planId,
        planName: result.subscription.plan.displayName,
        billingCycle: result.subscription.billingCycle,
        discountPercent: result.subscription.discountPercent,
        status: result.subscription.status,
      },
    };
  }

  // ── Get Plans (public) ─────────────────────────────────

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        monthlyPrice: true,
        yearlyPrice: true,
        maxPublications: true,
        maxVideos: true,
        maxSources: true,
        maxChannels: true,
        maxEditors: true,
        analyticsEnabled: true,
        aiScoringEnabled: true,
        prioritySupport: true,
        customBranding: true,
      },
    });
  }

  // ── Generate Referral Code ──────────────────────────────

  private async generateReferralCode(name: string): Promise<string> {
    const base = name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    
    for (let i = 0; i < 10; i++) {
      const random = randomBytes(2).toString('hex').toUpperCase();
      const code = `${base}${random}`;
      const exists = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (!exists) return code;
    }
    // Fallback: fully random
    return randomBytes(4).toString('hex').toUpperCase();
  }

  // ── Login ───────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ user: any; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        workspaces: {
          where: { isDefault: true },
          select: { workspaceId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Tu cuenta ha sido bloqueada. Contacta al administrador.');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const defaultWorkspaceId = user.workspaces[0]?.workspaceId;

    // If no default workspace found, try to get any workspace
    let workspaceId = defaultWorkspaceId;
    if (!workspaceId) {
      const anyWs = await this.prisma.workspaceUser.findFirst({
        where: { userId: user.id },
        select: { workspaceId: true },
      });
      workspaceId = anyWs?.workspaceId;
    }

    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      workspaceId,
    );

    this.logger.log(`✅ Login: ${user.email} (${user.role})`);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ── Refresh Token ───────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Find the refresh token in DB
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    if (stored.revokedAt) {
      // Token reuse detected — revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`🚨 Refresh token reuse detected for user ${stored.userId}`);
      throw new UnauthorizedException('Sesión comprometida. Inicia sesión nuevamente.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de refresco expirado');
    }

    if (stored.user.isBlocked) {
      throw new ForbiddenException('Tu cuenta ha sido bloqueada');
    }

    // Revoke current refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Get default workspace
    const membership = await this.prisma.workspaceUser.findFirst({
      where: { userId: stored.userId, isDefault: true },
      select: { workspaceId: true },
    });

    // Issue new pair
    return this.generateTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      membership?.workspaceId,
      stored.family,
    );
  }

  // ── Logout ──────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (stored) {
      // Revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revokedAt: new Date() },
      });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── Token Generation ────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    workspaceId?: string,
    family?: string,
  ): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email,
      role,
      workspaceId,
    };

    const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token (random string stored in DB)
    const refreshTokenStr = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenStr,
        family: family || undefined,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    };
  }

  // ── Verify Access Token ─────────────────────────────────

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ── Get User Profile ────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      ...this.sanitizeUser(user),
      workspaces: user.workspaces.map((wu) => ({
        id: wu.workspace.id,
        name: wu.workspace.name,
        slug: wu.workspace.slug,
        logoUrl: wu.workspace.logoUrl,
        role: wu.role,
        isDefault: wu.isDefault,
      })),
    };
  }

  // ── Email Verification ───────────────────────────────────

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.emailVerified) return; // already verified

    // Invalidate previous tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'Usuario',
      token,
    );

    this.logger.log(`📧 Verification email sent to ${user.email}`);
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) throw new BadRequestException('Token de verificación inválido');
    if (record.usedAt) throw new BadRequestException('Este enlace ya fue usado');
    if (record.expiresAt < new Date()) throw new BadRequestException('Este enlace ha expirado');

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
    ]);

    this.logger.log(`✅ Email verified: ${record.user.email}`);
    return { success: true };
  }

  // ── Password Reset (Forgot Password) ───────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.warn(`Password reset requested for nonexistent email: ${email}`);
      return;
    }

    // Invalidate previous tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name || 'Usuario',
      token,
    );

    this.logger.log(`📧 Password reset email sent to ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) throw new BadRequestException('Token de restablecimiento inválido');
    if (record.usedAt) throw new BadRequestException('Este enlace ya fue usado');
    if (record.expiresAt < new Date()) throw new BadRequestException('Este enlace ha expirado');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens (force re-login)
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`✅ Password reset for: ${record.user.email}`);
    return { success: true };
  }

  // ── Admin: Generate password reset link ─────────────────

  async generatePasswordResetLink(userId: string): Promise<{ token: string; url: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Invalidate previous tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h for admin-generated

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.emailService.sendAdminPasswordResetEmail(
      user.email,
      user.name || 'Usuario',
      token,
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3002';
    return {
      token,
      url: `${appUrl}/reset-password?token=${token}`,
    };
  }

  // ── Helpers ─────────────────────────────────────────────

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  /** Hash a password — can be used for migration */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}
