// ============================================================
// Auth Guard — Validates JWT on protected endpoints
// ============================================================
// Extracts JWT from:
//   1. Authorization: Bearer <token> header
//   2. access-token cookie
// In dev (no JWT_SECRET): allows all requests with a mock user.
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, type AccessTokenPayload } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

export const IS_PUBLIC_KEY = 'isPublic';

/** Decoded JWT payload — used throughout the app */
export interface JwtPayload {
  sub: string;       // user id
  email?: string;
  role?: string;
  workspaceId?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly isDev: boolean;
  /** Cached dev user data (resolved once from DB) */
  private devUserCache: { sub: string; email: string; role: string; workspaceId: string } | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {
    const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    this.isDev = !secret;
    if (this.isDev) {
      this.logger.warn('⚠️  No JWT_SECRET set — running in dev mode (mock auth)');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Dev mode: no secret configured → allow with mock user
    if (this.isDev) {
      // Try to extract a real token first (useful during dev with real auth)
      const token = this.extractToken(request);
      if (token) {
        try {
          const payload = this.authService.verifyAccessToken(token);
          request.user = payload as JwtPayload;
          this.resolveWorkspaceId(request, payload as JwtPayload);
          return true;
        } catch {
          // Fall through to mock user
        }
      }

      request.user = await this.getDevUser();
      // TenantMiddleware runs BEFORE guards, so it can't resolve workspace.
      // Set workspace from the cached dev user.
      request.workspaceId = (request.user as JwtPayload).workspaceId ?? 'ws_default';
      return true;
    }

    // Production: require valid JWT
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No se proporcionó token de autenticación');
    }

    try {
      const payload = this.authService.verifyAccessToken(token);
      request.user = payload as JwtPayload;
      this.resolveWorkspaceId(request, payload as JwtPayload);
      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${err}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Resolve a real user from the DB for dev mode (cached after first call).
   * Uses the first ADMIN/OWNER user found, falling back to any user.
   */
  private async getDevUser(): Promise<JwtPayload> {
    if (this.devUserCache) return this.devUserCache;

    // Try to find the admin user
    const user = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });

    if (user) {
      // Find their first workspace
      const membership = await this.prisma.workspaceUser.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { workspaceId: true },
      });

      this.devUserCache = {
        sub: user.id,
        email: user.email,
        role: user.role,
        workspaceId: membership?.workspaceId ?? 'ws_default',
      };

      this.logger.log(`🔧 Dev mode using real user: ${user.email} (${user.id}), workspace: ${this.devUserCache.workspaceId}`);
      return this.devUserCache;
    }

    // Fallback if no user exists
    this.devUserCache = {
      sub: 'dev-user',
      email: 'dev@localhost',
      role: 'ADMIN',
      workspaceId: 'ws_default',
    };
    return this.devUserCache;
  }

  /**
   * Set request.workspaceId from the JWT payload.
   * TenantMiddleware runs BEFORE guards, so it can never see req.user.
   * We resolve the workspace here after authentication succeeds.
   */
  private resolveWorkspaceId(request: any, payload: JwtPayload): void {
    // Don't overwrite if already set (e.g. via header/query in TenantMiddleware)
    if (request.workspaceId) return;

    // Use workspaceId from JWT payload if present
    if (payload.workspaceId) {
      request.workspaceId = payload.workspaceId;
    }
  }

  /**
   * Extract JWT from Authorization header or cookie.
   */
  private extractToken(request: any): string | null {
    // 1. Authorization: Bearer <token>
    const authHeader = request.headers?.['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 2. access-token cookie
    const cookieToken = request.cookies?.['access-token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }
}
