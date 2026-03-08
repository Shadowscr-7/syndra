// ============================================================
// Credentials Controller — User-level credential CRUD + test
// ============================================================

import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  Req,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { PlanLimitsGuard, PlanCheck } from '../plans/plan-limits.guard';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  /** GET /credentials — List all user credentials (masked) */
  @Get()
  async list(@Req() req: any) {
    const userId = req.user?.sub;
    const items = await this.credentialsService.listForUser(userId);
    return { data: items };
  }

  /** PUT /credentials/:provider — Upsert a credential */
  @Put(':provider')
  @UseGuards(PlanLimitsGuard)
  @PlanCheck('CHANNELS')
  async upsert(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body: { payload: Record<string, any>; label?: string },
  ) {
    const userId = req.user?.sub;
    const result = await this.credentialsService.upsert(
      userId,
      provider.toUpperCase(),
      body.payload as any,
      body.label,
    );
    return { data: result };
  }

  /** DELETE /credentials/:provider — Remove a credential */
  @Delete(':provider')
  @HttpCode(200)
  async remove(@Req() req: any, @Param('provider') provider: string) {
    const userId = req.user?.sub;
    return this.credentialsService.remove(userId, provider.toUpperCase());
  }

  /** POST /credentials/:provider/test — Test connection */
  @Post(':provider/test')
  @HttpCode(200)
  async test(@Req() req: any, @Param('provider') provider: string) {
    const userId = req.user?.sub;
    return this.credentialsService.testCredential(userId, provider.toUpperCase());
  }

  /** PUT /credentials/:provider/toggle — Toggle active/inactive */
  @Put(':provider/toggle')
  async toggle(@Req() req: any, @Param('provider') provider: string) {
    const userId = req.user?.sub;
    return this.credentialsService.toggleActive(userId, provider.toUpperCase());
  }

  // ════════════════════════════════════════════════════════
  // META OAUTH
  // ════════════════════════════════════════════════════════

  /** GET /credentials/meta/oauth-status — Check Meta connection */
  @Get('meta/oauth-status')
  async metaOAuthStatus(@Req() req: any) {
    const wsId = req.headers['x-workspace-id'] || 'ws_default';
    return this.credentialsService.getMetaOAuthStatus(wsId);
  }

  /** DELETE /credentials/meta/oauth — Disconnect Meta */
  @Delete('meta/oauth')
  @HttpCode(200)
  async metaDisconnect(@Req() req: any) {
    const wsId = req.headers['x-workspace-id'] || 'ws_default';
    return this.credentialsService.disconnectMeta(wsId);
  }

  // ════════════════════════════════════════════════════════
  // TELEGRAM PAIRING
  // ════════════════════════════════════════════════════════

  /** GET /credentials/telegram/link — Get Telegram link status */
  @Get('telegram/link')
  async telegramLinkStatus(@Req() req: any) {
    const userId = req.user?.sub;
    return this.credentialsService.getTelegramLinkStatus(userId);
  }

  /** POST /credentials/telegram/pair — Generate pairing token + QR link */
  @Post('telegram/pair')
  @HttpCode(200)
  async telegramPair(@Req() req: any) {
    const userId = req.user?.sub;
    return this.credentialsService.generatePairToken(userId);
  }

  /** GET /credentials/telegram/pair-status — Check if pairing completed */
  @Get('telegram/pair-status')
  async telegramPairStatus(@Query('token') token: string) {
    return this.credentialsService.checkPairStatus(token);
  }

  /** DELETE /credentials/telegram/link — Unlink Telegram */
  @Delete('telegram/link')
  @HttpCode(200)
  async telegramUnlink(@Req() req: any) {
    const userId = req.user?.sub;
    return this.credentialsService.unlinkTelegram(userId);
  }
}
