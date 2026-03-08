import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { SourceTrustService } from './source-trust.service';
import { CurrentWorkspace } from '../auth/decorators';

// ============================================================
// SourceTrustController — Endpoints para Feature #9
// ============================================================

@Controller('source-trust')
export class SourceTrustController {
  constructor(private readonly svc: SourceTrustService) {}

  // ── Profiles ───────────────────────────────────────────

  @Get('profiles')
  listProfiles(@CurrentWorkspace() wsId: string) {
    return this.svc.listProfiles(wsId);
  }

  @Post('profiles')
  upsertProfile(
    @CurrentWorkspace() wsId: string,
    @Body() body: { domain: string; trustScore?: number; isWhitelisted?: boolean; isBlacklisted?: boolean; notes?: string },
  ) {
    return this.svc.upsertProfile(wsId, body);
  }

  @Delete('profiles/:domain')
  deleteProfile(@CurrentWorkspace() wsId: string, @Param('domain') domain: string) {
    return this.svc.deleteProfile(wsId, domain);
  }

  @Post('evaluate')
  evaluateSource(@CurrentWorkspace() wsId: string, @Body() body: { sourceUrl: string }) {
    return this.svc.evaluateSource(wsId, body.sourceUrl);
  }

  // ── Claims ─────────────────────────────────────────────

  @Get('claims/:editorialRunId')
  getClaims(@Param('editorialRunId') runId: string) {
    return this.svc.getClaimsForRun(runId);
  }

  @Post('claims')
  recordClaim(
    @Body() body: { editorialRunId: string; claim: string; sourceUrl?: string; confidence?: number; isVerified?: boolean },
  ) {
    return this.svc.recordClaim(body);
  }

  @Patch('claims/:id/verify')
  verifyClaim(@Param('id') id: string) {
    return this.svc.verifyClaim(id);
  }

  // ── Compliance Rules ───────────────────────────────────

  @Get('rules')
  listRules(@CurrentWorkspace() wsId: string) {
    return this.svc.listRules(wsId);
  }

  @Post('rules')
  createRule(
    @CurrentWorkspace() wsId: string,
    @Body() body: { ruleType: string; condition: any; action: string },
  ) {
    return this.svc.createRule(wsId, body);
  }

  @Patch('rules/:id/toggle')
  toggleRule(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleRule(id, body.isActive);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.svc.deleteRule(id);
  }

  // ── Compliance Check ───────────────────────────────────

  @Post('check')
  checkCompliance(
    @CurrentWorkspace() wsId: string,
    @Body() body: { sourceDomain?: string; topic?: string; claims?: string[] },
  ) {
    return this.svc.checkCompliance(wsId, body);
  }

  // ── Stats ──────────────────────────────────────────────

  @Get('stats')
  getStats(@CurrentWorkspace() wsId: string) {
    return this.svc.getStats(wsId);
  }
}
