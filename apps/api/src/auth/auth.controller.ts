// ============================================================
// Auth Controller — Register, Login, Refresh, Logout, Profile, Plans
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
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

  // ── Plans (public) ────────────────────────────────────

  @Public()
  @Get('plans')
  async getPlans() {
    return this.authService.getPlans();
  }

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

    if (!body.planId) {
      return { error: 'Debes seleccionar un plan' };
    }

    const result = await this.authService.register(body);
    this.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      user: result.user,
      subscription: result.subscription,
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

  // ── Email Verification ────────────────────────────────

  @Public()
  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      const appUrl = process.env.APP_URL || 'http://localhost:3002';
      return res.redirect(`${appUrl}/login?error=token_missing`);
    }

    try {
      await this.authService.verifyEmail(token);
      const appUrl = process.env.APP_URL || 'http://localhost:3002';
      return res.redirect(`${appUrl}/login?verified=true`);
    } catch (error: any) {
      this.logger.warn(`Email verification failed: ${error.message}`);
      const appUrl = process.env.APP_URL || 'http://localhost:3002';
      return res.redirect(`${appUrl}/login?error=verification_failed`);
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.sub) {
      return { error: 'No autenticado' };
    }
    await this.authService.sendVerificationEmail(user.sub);
    return { ok: true, message: 'Email de verificación enviado' };
  }

  // ── Password Reset ────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      return { error: 'Email requerido' };
    }
    // Always returns success to prevent email enumeration
    await this.authService.requestPasswordReset(body.email);
    return {
      ok: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    if (!body.token || !body.password) {
      return { error: 'Token y nueva contraseña son requeridos' };
    }
    if (body.password.length < 8) {
      return { error: 'La contraseña debe tener al menos 8 caracteres' };
    }
    await this.authService.resetPassword(body.token, body.password);
    return { ok: true, message: 'Contraseña actualizada correctamente' };
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
