// ============================================================
// ContentPlaybookService — Save, apply, and share content formulas
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentPlaybookService {
  private readonly logger = new Logger(ContentPlaybookService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ──────────────────────────────────────────────

  async create(workspaceId: string, data: {
    name: string;
    description?: string;
    rules?: Record<string, unknown>;
    formatMix?: Array<{ format: string; percentage: number }>;
    basePrompts?: string[];
    scheduleConfig?: Record<string, unknown>;
    preferredCTAs?: string[];
    visualStyles?: Record<string, unknown>;
    sourceTypes?: string[];
    isPublic?: boolean;
  }) {
    return this.prisma.contentPlaybook.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        rules: (data.rules ?? {}) as any,
        formatMix: (data.formatMix ?? []) as any,
        basePrompts: data.basePrompts as any,
        scheduleConfig: data.scheduleConfig as any,
        preferredCTAs: data.preferredCTAs as any,
        visualStyles: data.visualStyles as any,
        sourceTypes: data.sourceTypes as any,
        isPublic: data.isPublic ?? false,
      },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.contentPlaybook.findMany({
      where: {
        OR: [{ workspaceId }, { isPublic: true }],
      },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    return this.prisma.contentPlaybook.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    rules: Record<string, unknown>;
    formatMix: unknown[];
    basePrompts: string[];
    scheduleConfig: Record<string, unknown>;
    preferredCTAs: string[];
    visualStyles: Record<string, unknown>;
    sourceTypes: string[];
    isPublic: boolean;
  }>) {
    return this.prisma.contentPlaybook.update({
      where: { id },
      data: data as any,
    });
  }

  async remove(id: string) {
    await this.prisma.contentPlaybook.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Save from campaign ────────────────────────────────

  async saveFromCampaign(workspaceId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      include: {
        campaignThemes: { include: { theme: true } },
      },
    });

    const brand = await this.prisma.brandProfile.findUnique({ where: { workspaceId } });

    // Gather publication stats for this campaign
    const pubs = await this.prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        editorialRun: { campaignId },
      },
      include: {
        editorialRun: { include: { contentBrief: true } },
      },
    });

    // Compute format mix from actual publications
    const formatCounts: Record<string, number> = {};
    for (const p of pubs) {
      const f = p.editorialRun?.contentBrief?.format ?? 'POST';
      formatCounts[f] = (formatCounts[f] ?? 0) + 1;
    }
    const total = pubs.length || 1;
    const formatMix = Object.entries(formatCounts).map(([format, count]) => ({
      format,
      percentage: Math.round((count / total) * 100),
    }));

    // Extract CTAs used
    const ctas = [...new Set(pubs.map((p) => p.editorialRun?.contentBrief?.cta).filter(Boolean))];

    return this.prisma.contentPlaybook.create({
      data: {
        workspaceId,
        name: `Playbook: ${campaign.name}`,
        description: `Fórmula extraída de la campaña "${campaign.name}" (${campaign.objective}). ${pubs.length} publicaciones analizadas.`,
        rules: {
          objective: campaign.objective,
          themes: campaign.campaignThemes.map((ct) => ct.theme.name),
          channels: campaign.targetChannels,
          kpiTarget: campaign.kpiTarget,
        } as any,
        formatMix: formatMix as any,
        preferredCTAs: ctas as any,
        visualStyles: brand?.visualStyle as any,
        isPublic: false,
      },
    });
  }

  // ── Apply playbook to campaign ────────────────────────

  async applyToCampaign(playbookId: string, campaignId: string) {
    const playbook = await this.prisma.contentPlaybook.findUniqueOrThrow({ where: { id: playbookId } });

    const rules = (playbook.rules as Record<string, unknown>) ?? {};
    const formatMix = (playbook.formatMix as any[]) ?? [];
    const ctas = (playbook.preferredCTAs as string[]) ?? [];

    // Build channel formats from format mix
    const channelFormats: Record<string, string[]> = {};
    const formats = formatMix.map((f: any) => f.format?.toLowerCase()).filter(Boolean);
    if (rules['channels'] && Array.isArray(rules['channels'])) {
      for (const ch of rules['channels'] as string[]) {
        channelFormats[ch] = formats;
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        objective: rules['objective'] as any,
        channelFormats: Object.keys(channelFormats).length > 0 ? channelFormats : undefined,
        kpiTarget: rules['kpiTarget'] != null ? String(rules['kpiTarget']) : undefined,
      },
    });

    // Increment usage count
    await this.prisma.contentPlaybook.update({
      where: { id: playbookId },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(`Applied playbook ${playbookId} to campaign ${campaignId}`);
    return { applied: true, playbookId, campaignId };
  }

  // ── Marketplace (public playbooks) ────────────────────

  async listPublic() {
    return this.prisma.contentPlaybook.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: 50,
    });
  }
}
