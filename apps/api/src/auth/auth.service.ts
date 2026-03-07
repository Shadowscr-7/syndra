// ============================================================
// Auth Service — Registration, Login, JWT tokens, bcrypt
// ============================================================

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  referralCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ── Constants ──────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_SEC = 900; // 15 min
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;

  constructor(private readonly prisma: PrismaService) {
    this.jwtSecret =
      process.env.JWT_SECRET ||
      process.env.SUPABASE_JWT_SECRET ||
      'dev-jwt-secret-change-in-production';

    if (this.jwtSecret === 'dev-jwt-secret-change-in-production') {
      this.logger.warn('⚠️  Using default JWT secret — set JWT_SECRET in production!');
    }
  }

  // ── Registration ────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ user: any; tokens: TokenPair }> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user + default workspace in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          name: dto.name.trim(),
          role: 'USER',
          emailVerified: false,
          referredByCode: dto.referralCode || null,
        },
      });

      // Create default workspace for this user
      const workspace = await tx.workspace.create({
        data: {
          name: `${dto.name.trim()}'s Workspace`,
          slug: `ws-${user.id}`,
        },
      });

      // Link user to workspace as OWNER
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          isDefault: true,
        },
      });

      return { user, workspace };
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(
      result.user.id,
      result.user.email,
      result.user.role,
      result.workspace.id,
    );

    this.logger.log(`✅ New user registered: ${result.user.email} (${result.user.role})`);

    return {
      user: this.sanitizeUser(result.user),
      tokens,
    };
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
