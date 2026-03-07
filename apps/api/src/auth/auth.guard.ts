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

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
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
          return true;
        } catch {
          // Fall through to mock user
        }
      }

      request.user = {
        sub: 'dev-user',
        email: 'dev@localhost',
        role: 'ADMIN',
      } satisfies JwtPayload;
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
      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${err}`);
      throw new UnauthorizedException('Token inválido o expirado');
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
