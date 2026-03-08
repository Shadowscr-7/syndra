// ============================================================
// OnboardingTrackingService — Instrumenta y rastrea progreso del embudo
// Tracks granular onboarding step completion and drives nudge logic.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// Step name → field mapping
const STEP_FIELDS: Record<string, string> = {
  account_created: 'accountCreatedAt',
  email_verified: 'emailVerifiedAt',
  workspace_configured: 'workspaceConfiguredAt',
  brand_configured: 'brandConfiguredAt',
  channels_connected: 'channelsConnectedAt',
  themes_configured: 'themesConfiguredAt',
  sources_added: 'sourcesAddedAt',
  llm_configured: 'llmConfiguredAt',
  telegram_linked: 'telegramLinkedAt',
  persona_created: 'personaCreatedAt',
  profile_created: 'profileCreatedAt',
  first_run_triggered: 'firstRunTriggeredAt',
  first_publication: 'firstPublicationAt',
};

const TOTAL_STEPS = Object.keys(STEP_FIELDS).length;

const NUDGE_TEMPLATES: Record<number, { subject: string; message: string }> = {
  1: {
    subject: '¡Tu cuenta está casi lista! — Syndra',
    message: 'Completa tu configuración para empezar a automatizar tu contenido. Solo faltan unos pasos.',
  },
  2: {
    subject: '¿Necesitas ayuda para configurar? — Syndra',
    message: 'Te falta poco para completar tu setup. Si necesitas ayuda, contáctanos o revisa nuestra guía.',
  },
  3: {
    subject: 'Última oportunidad — Syndra',
    message: 'Tu cuenta sigue incompleta. Completa tu configuración ahora para no perderte las funciones de automatización.',
  },
};

@Injectable()
export class OnboardingTrackingService {
  private readonly logger = new Logger(OnboardingTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ── Track a step completion event ──────────────────────

  async trackStep(workspaceId: string, step: string): Promise<void> {
    const field = STEP_FIELDS[step];
    if (!field) {
      this.logger.warn(`Unknown onboarding step: ${step}`);
      return;
    }

    // Upsert progress record
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    });

    const now = new Date();

    if (!existing) {
      const data: any = {
        workspaceId,
        [field]: now,
        completedSteps: 1,
        totalSteps: TOTAL_STEPS,
        percentComplete: Math.round((1 / TOTAL_STEPS) * 100),
      };
      await this.prisma.onboardingProgress.create({ data });
      this.logger.log(`Onboarding progress created for ${workspaceId} — step: ${step}`);
      return;
    }

    // Skip if already completed
    if ((existing as any)[field]) return;

    // Count completed steps
    let completedSteps = 0;
    for (const f of Object.values(STEP_FIELDS)) {
      if (f === field || (existing as any)[f]) completedSteps++;
    }

    const percentComplete = Math.round((completedSteps / TOTAL_STEPS) * 100);

    await this.prisma.onboardingProgress.update({
      where: { workspaceId },
      data: {
        [field]: now,
        completedSteps,
        percentComplete,
        ...(percentComplete >= 100 ? {} : {}),
      },
    });

    this.logger.log(`Onboarding step "${step}" tracked for ${workspaceId} — ${completedSteps}/${TOTAL_STEPS} (${percentComplete}%)`);
  }

  // ── Initialize progress for a new workspace ────────────

  async initializeProgress(workspaceId: string): Promise<void> {
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    });
    if (existing) return;

    await this.prisma.onboardingProgress.create({
      data: {
        workspaceId,
        accountCreatedAt: new Date(),
        completedSteps: 1,
        totalSteps: TOTAL_STEPS,
        percentComplete: Math.round((1 / TOTAL_STEPS) * 100),
      },
    });
    this.logger.log(`Onboarding progress initialized for ${workspaceId}`);
  }

  // ── Get progress for a workspace ──────────────────────

  async getProgress(workspaceId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    });

    if (!progress) {
      return {
        percentComplete: 0,
        completedSteps: 0,
        totalSteps: TOTAL_STEPS,
        nextStep: 'account_created',
        nudgeDismissed: false,
        steps: Object.fromEntries(
          Object.entries(STEP_FIELDS).map(([step]) => [step, null]),
        ),
      };
    }

    // Build step status map
    const steps: Record<string, Date | null> = {};
    let nextStep: string | null = null;
    for (const [step, field] of Object.entries(STEP_FIELDS)) {
      const val = (progress as any)[field] as Date | null;
      steps[step] = val;
      if (!val && !nextStep) nextStep = step;
    }

    return {
      percentComplete: progress.percentComplete,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      nextStep,
      nudgeDismissed: progress.nudgeDismissed,
      steps,
    };
  }

  // ── Dismiss nudge banner ──────────────────────────────

  async dismissNudge(workspaceId: string): Promise<void> {
    await this.prisma.onboardingProgress.updateMany({
      where: { workspaceId },
      data: { nudgeDismissed: true },
    });
  }

  // ── Daily nudge cron — send email to stalled workspaces ──

  @Cron('0 10 * * *', { name: 'onboarding-nudge-emails' })
  async sendNudgeEmails(): Promise<void> {
    this.logger.log('📧 Checking for onboarding nudge emails...');

    // Find workspaces with incomplete onboarding, < 3 nudges, not dismissed
    const candidates = await this.prisma.onboardingProgress.findMany({
      where: {
        percentComplete: { lt: 100 },
        nudgeDismissed: false,
        nudgeCount: { lt: 3 },
        // Only nudge if last nudge was > 48h ago (or never sent)
        OR: [
          { lastNudgeSentAt: null },
          { lastNudgeSentAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
        ],
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            users: {
              where: { role: 'OWNER' },
              take: 1,
              include: { user: { select: { email: true, name: true } } },
            },
          },
        },
      },
    });

    // Only send nudges to workspaces older than 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eligible = candidates.filter((c) => c.workspace.createdAt < dayAgo);

    let sent = 0;
    for (const progress of eligible) {
      const owner = progress.workspace.users[0]?.user;
      if (!owner?.email) continue;

      const nudgeNum = Math.min(progress.nudgeCount + 1, 3) as 1 | 2 | 3;
      const template = NUDGE_TEMPLATES[nudgeNum]!;

      const success = await this.email.send({
        to: owner.email,
        subject: template.subject,
        html: this.buildNudgeHtml(
          owner.name ?? 'usuario',
          template.message,
          progress.percentComplete,
          progress.completedSteps,
          progress.totalSteps,
        ),
        text: template.message,
      });

      if (success) {
        await this.prisma.onboardingProgress.update({
          where: { id: progress.id },
          data: {
            nudgeCount: { increment: 1 },
            lastNudgeSentAt: new Date(),
          },
        });
        sent++;
      }
    }

    if (sent > 0) {
      this.logger.log(`📧 Sent ${sent} onboarding nudge emails`);
    }
  }

  // ── In-app banner data ────────────────────────────────

  async getBannerData(workspaceId: string) {
    const progress = await this.getProgress(workspaceId);

    if (progress.percentComplete >= 100 || progress.nudgeDismissed) {
      return null;
    }

    const stepLabels: Record<string, string> = {
      account_created: 'Crear cuenta',
      email_verified: 'Verificar email',
      workspace_configured: 'Configurar workspace',
      brand_configured: 'Configurar marca',
      channels_connected: 'Conectar canales',
      themes_configured: 'Configurar temas',
      sources_added: 'Agregar fuentes',
      llm_configured: 'Configurar LLM',
      telegram_linked: 'Vincular Telegram',
      persona_created: 'Crear persona',
      profile_created: 'Crear perfil',
      first_run_triggered: 'Primer run editorial',
      first_publication: 'Primera publicación',
    };

    return {
      show: true,
      percentComplete: progress.percentComplete,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      nextStep: progress.nextStep,
      nextStepLabel: progress.nextStep ? stepLabels[progress.nextStep] ?? progress.nextStep : null,
    };
  }

  // ── Private helpers ───────────────────────────────────

  private buildNudgeHtml(
    name: string,
    message: string,
    percent: number,
    completed: number,
    total: number,
  ): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">¡Hola ${name}! 👋</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">${message}</p>
        <div style="margin: 24px 0; background: #f3f4f6; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666; font-size: 14px;">Progreso</span>
            <span style="color: #6366f1; font-weight: 600; font-size: 14px;">${percent}%</span>
          </div>
          <div style="background: #e5e7eb; border-radius: 999px; height: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); height: 100%; width: ${percent}%; border-radius: 999px;"></div>
          </div>
          <p style="color: #888; font-size: 13px; margin-top: 8px;">${completed} de ${total} pasos completados</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:3002'}/dashboard/settings" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Completar configuración
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Syndra</p>
      </div>
    `;
  }
}
