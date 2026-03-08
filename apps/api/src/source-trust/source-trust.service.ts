import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// ============================================================
// SourceTrustService — Scoring de dominios + ClaimTrace + ComplianceRules
// Feature #9: Moderación avanzada de fuentes y claims
// ============================================================

@Injectable()
export class SourceTrustService {
  private readonly logger = new Logger(SourceTrustService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Source Trust Profiles ──────────────────────────────────

  /** List all source trust profiles for a workspace */
  async listProfiles(workspaceId: string) {
    return this.prisma.sourceTrustProfile.findMany({
      where: { workspaceId },
      orderBy: { trustScore: 'desc' },
    });
  }

  /** Upsert a source trust profile (whitelist/blacklist/score) */
  async upsertProfile(
    workspaceId: string,
    data: {
      domain: string;
      trustScore?: number;
      isWhitelisted?: boolean;
      isBlacklisted?: boolean;
      notes?: string;
    },
  ) {
    const domain = data.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    return this.prisma.sourceTrustProfile.upsert({
      where: { workspaceId_domain: { workspaceId, domain } },
      create: {
        workspaceId,
        domain,
        trustScore: data.trustScore ?? 50,
        isWhitelisted: data.isWhitelisted ?? false,
        isBlacklisted: data.isBlacklisted ?? false,
        notes: data.notes,
      },
      update: {
        trustScore: data.trustScore,
        isWhitelisted: data.isWhitelisted,
        isBlacklisted: data.isBlacklisted,
        notes: data.notes,
        lastEvaluatedAt: new Date(),
      },
    });
  }

  /** Delete a profile */
  async deleteProfile(workspaceId: string, domain: string) {
    return this.prisma.sourceTrustProfile.deleteMany({
      where: { workspaceId, domain },
    });
  }

  /** Get trust score for a domain. Returns null if no profile. */
  async getTrustScore(workspaceId: string, rawUrl: string): Promise<{ score: number; blocked: boolean } | null> {
    const domain = this.extractDomain(rawUrl);
    if (!domain) return null;

    const profile = await this.prisma.sourceTrustProfile.findUnique({
      where: { workspaceId_domain: { workspaceId, domain } },
    });

    if (!profile) return null;
    return {
      score: profile.trustScore,
      blocked: profile.isBlacklisted,
    };
  }

  /** Evaluate a source URL during RESEARCH stage — updates article count and returns trust info */
  async evaluateSource(workspaceId: string, sourceUrl: string) {
    const domain = this.extractDomain(sourceUrl);
    if (!domain) return { trusted: true, score: 50, action: 'ALLOW' as const };

    let profile = await this.prisma.sourceTrustProfile.findUnique({
      where: { workspaceId_domain: { workspaceId, domain } },
    });

    if (!profile) {
      // Auto-create with neutral score
      profile = await this.prisma.sourceTrustProfile.create({
        data: { workspaceId, domain, trustScore: 50 },
      });
    }

    // Increment article count
    await this.prisma.sourceTrustProfile.update({
      where: { id: profile.id },
      data: { totalArticles: { increment: 1 } },
    });

    if (profile.isBlacklisted) {
      return { trusted: false, score: 0, action: 'BLOCK' as const };
    }
    if (profile.trustScore < 30) {
      return { trusted: false, score: profile.trustScore, action: 'REQUIRE_APPROVAL' as const };
    }
    if (profile.isWhitelisted) {
      return { trusted: true, score: 100, action: 'ALLOW' as const };
    }
    return { trusted: true, score: profile.trustScore, action: 'ALLOW' as const };
  }

  // ── Claim Traces ──────────────────────────────────────────

  /** Record a claim trace for an editorial run */
  async recordClaim(data: {
    editorialRunId: string;
    claim: string;
    sourceUrl?: string;
    confidence?: number;
    isVerified?: boolean;
  }) {
    const sourceDomain = data.sourceUrl ? this.extractDomain(data.sourceUrl) : null;
    return this.prisma.claimTrace.create({
      data: {
        editorialRunId: data.editorialRunId,
        claim: data.claim,
        sourceUrl: data.sourceUrl,
        sourceDomain,
        confidence: data.confidence ?? 0,
        isVerified: data.isVerified ?? false,
      },
    });
  }

  /** List claim traces for an editorial run */
  async getClaimsForRun(editorialRunId: string) {
    return this.prisma.claimTrace.findMany({
      where: { editorialRunId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Verify a claim */
  async verifyClaim(claimId: string) {
    return this.prisma.claimTrace.update({
      where: { id: claimId },
      data: { isVerified: true, confidence: 100 },
    });
  }

  // ── Compliance Rules ──────────────────────────────────────

  /** List compliance rules for a workspace */
  async listRules(workspaceId: string) {
    return this.prisma.complianceRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Create a compliance rule */
  async createRule(
    workspaceId: string,
    data: { ruleType: string; condition: any; action: string },
  ) {
    return this.prisma.complianceRule.create({
      data: {
        workspaceId,
        ruleType: data.ruleType,
        condition: data.condition,
        action: data.action,
      },
    });
  }

  /** Toggle a compliance rule */
  async toggleRule(ruleId: string, isActive: boolean) {
    return this.prisma.complianceRule.update({
      where: { id: ruleId },
      data: { isActive },
    });
  }

  /** Delete a compliance rule */
  async deleteRule(ruleId: string) {
    return this.prisma.complianceRule.delete({
      where: { id: ruleId },
    });
  }

  /** Check all active rules for a workspace against content data */
  async checkCompliance(
    workspaceId: string,
    contentData: { sourceDomain?: string; topic?: string; claims?: string[] },
  ): Promise<{ passed: boolean; violations: { ruleId: string; ruleType: string; action: string }[] }> {
    const rules = await this.prisma.complianceRule.findMany({
      where: { workspaceId, isActive: true },
    });

    const violations: { ruleId: string; ruleType: string; action: string }[] = [];

    for (const rule of rules) {
      const cond = rule.condition as any;
      let violated = false;

      switch (rule.ruleType) {
        case 'BLOCK_DOMAIN':
          if (contentData.sourceDomain && cond.domain) {
            violated = contentData.sourceDomain.includes(cond.domain);
          }
          break;
        case 'SENSITIVE_TOPIC':
          if (contentData.topic && cond.topics) {
            violated = (cond.topics as string[]).some(
              (t) => contentData.topic!.toLowerCase().includes(t.toLowerCase()),
            );
          }
          break;
        case 'REQUIRE_SOURCE_TRUST':
          if (contentData.sourceDomain && cond.minScore) {
            const profile = await this.prisma.sourceTrustProfile.findFirst({
              where: { workspaceId, domain: contentData.sourceDomain },
            });
            violated = !profile || profile.trustScore < cond.minScore;
          }
          break;
      }

      if (violated) {
        violations.push({ ruleId: rule.id, ruleType: rule.ruleType, action: rule.action });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats(workspaceId: string) {
    const [totalProfiles, whitelisted, blacklisted, lowTrust, totalClaims, verifiedClaims, totalRules] =
      await Promise.all([
        this.prisma.sourceTrustProfile.count({ where: { workspaceId } }),
        this.prisma.sourceTrustProfile.count({ where: { workspaceId, isWhitelisted: true } }),
        this.prisma.sourceTrustProfile.count({ where: { workspaceId, isBlacklisted: true } }),
        this.prisma.sourceTrustProfile.count({ where: { workspaceId, trustScore: { lt: 30 } } }),
        this.prisma.claimTrace.count({
          where: { editorialRun: { workspaceId } },
        }),
        this.prisma.claimTrace.count({
          where: { editorialRun: { workspaceId }, isVerified: true },
        }),
        this.prisma.complianceRule.count({ where: { workspaceId } }),
      ]);

    return { totalProfiles, whitelisted, blacklisted, lowTrust, totalClaims, verifiedClaims, totalRules };
  }

  // ── Cron: re-evaluate trust scores ────────────────────────

  @Cron(CronExpression.EVERY_WEEK)
  async cronReEvaluateTrust() {
    this.logger.log('[SourceTrust] Weekly trust re-evaluation...');
    try {
      const profiles = await this.prisma.sourceTrustProfile.findMany({
        where: { isWhitelisted: false, isBlacklisted: false },
        include: {
          workspace: {
            include: {
              editorialRuns: {
                where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
                select: { id: true },
              },
            },
          },
        },
      });

      for (const profile of profiles) {
        // Count claims from this domain in recent runs
        const runIds = profile.workspace.editorialRuns.map((r) => r.id);
        if (runIds.length === 0) continue;

        const claims = await this.prisma.claimTrace.findMany({
          where: {
            editorialRunId: { in: runIds },
            sourceDomain: profile.domain,
          },
        });

        if (claims.length === 0) continue;

        const verified = claims.filter((c) => c.isVerified).length;
        const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
        const verificationRate = verified / claims.length;

        // Calculate new trust score: weighted average
        const newScore = Math.min(100, Math.max(0,
          profile.trustScore * 0.5 + avgConfidence * 0.25 + verificationRate * 100 * 0.25,
        ));

        await this.prisma.sourceTrustProfile.update({
          where: { id: profile.id },
          data: {
            trustScore: Math.round(newScore * 10) / 10,
            accuracyRate: Math.round(verificationRate * 100 * 10) / 10,
            lastEvaluatedAt: new Date(),
          },
        });
      }

      this.logger.log(`[SourceTrust] Re-evaluated ${profiles.length} profiles`);
    } catch (err) {
      this.logger.error('[SourceTrust] cron error', err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private extractDomain(url: string): string | null {
    try {
      if (!url.startsWith('http')) url = 'https://' + url;
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '') || null;
    }
  }
}
