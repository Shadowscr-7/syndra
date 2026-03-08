// ============================================================
// Partner Controller — Self-serve panel for COLLABORATOR users
// ============================================================

import { Controller, Get, Logger } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.guard';

@Controller('partner')
export class PartnerController {
  private readonly logger = new Logger(PartnerController.name);

  constructor(private readonly partner: PartnerService) {}

  /**
   * GET /api/partner/dashboard — Get partner dashboard (COLLABORATOR only)
   */
  @Roles('COLLABORATOR')
  @Get('dashboard')
  async dashboard(@CurrentUser() user: JwtPayload) {
    const data = await this.partner.getDashboard(user.sub);
    return { data };
  }
}
