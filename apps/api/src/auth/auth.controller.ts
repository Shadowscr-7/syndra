// ============================================================
// Auth Controller — Register, Login, Refresh, Logout, Profile
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { Public } from './decorators';

// ── Cookie config ────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;       // 15 min
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ── Register ──────────────────────────────────────────

  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.email || !body.password || !body.name) {
      return { error: 'Email, contraseña y nombre son requeridos' };
    }

    if (body.password.length < 8) {
      return { error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    const result = await this.authService.register(body);
    this.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  // ── Login ─────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.email || !body.password) {
      return { error: 'Email y contraseña son requeridos' };
    }

    const result = await this.authService.login(body);
    this.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  // ── Refresh ───────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.['refresh-token'] ||
      req.body?.refreshToken;

    if (!refreshToken) {
      return { error: 'No refresh token provided' };
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  // ── Logout ────────────────────────────────────────────

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh-token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear all auth cookies
    res.clearCookie('access-token', { path: '/' });
    res.clearCookie('refresh-token', { path: '/' });
    res.clearCookie('auth-user-id', { path: '/' });
    res.clearCookie('auth-email', { path: '/' });
    res.clearCookie('workspace-id', { path: '/' });

    return { ok: true };
  }

  // ── Profile ───────────────────────────────────────────

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.sub) {
      return { error: 'Not authenticated' };
    }
    return this.authService.getProfile(user.sub);
  }

  // ── Helpers ───────────────────────────────────────────

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access-token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh-token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}
