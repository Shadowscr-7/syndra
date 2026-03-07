// ============================================================
// Auth Guard — Validates Supabase JWT on protected endpoints
// ============================================================
// In production: verifies Supabase JWT from Authorization header.
// In dev (no SUPABASE_JWT_SECRET): allows all requests with a mock user.
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac } from 'crypto';

export const IS_PUBLIC_KEY = 'isPublic';

/** Decoded JWT payload from Supabase */
export interface JwtPayload {
  sub: string;       // user id
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwtSecret: string | null;

  constructor(private readonly reflector: Reflector) {
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET ?? null;
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
    if (!this.jwtSecret) {
      request.user = { sub: 'dev-user', email: 'dev@localhost' } satisfies JwtPayload;
      return true;
    }

    // Extract token from Authorization header
    const authHeader = request.headers['authorization'] as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.verifyJwt(token);
      if (!payload.sub) throw new Error('Missing sub claim');
      request.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${err}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Minimal JWT verification (HS256) — no external dependency needed.
   * For production with RS256, use jose or jsonwebtoken library.
   */
  private verifyJwt(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature (HS256)
    const expected = createHmac('sha256', this.jwtSecret!)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (expected !== signatureB64) {
      throw new Error('Invalid JWT signature');
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64!, 'base64url').toString('utf-8'),
    ) as JwtPayload;

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('JWT expired');
    }

    return payload;
  }
}
