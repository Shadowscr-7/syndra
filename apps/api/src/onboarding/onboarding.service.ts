// ============================================================
// Onboarding Service — Wizard de configuración inicial
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Preset industry templates
const INDUSTRY_PRESETS: Record<
  string,
  { themes: string[]; tones: string[]; hashtags: string[] }
> = {
  ecommerce: {
    themes: ['Producto del día', 'Oferta flash', 'Testimonio cliente', 'Detrás de escena', 'Tutorial producto'],
    tones: ['Promocional', 'Educativo', 'Inspiracional'],
    hashtags: ['#ecommerce', '#tiendaonline', '#compraonline', '#ofertas'],
  },
  restaurant: {
    themes: ['Plato estrella', 'Receta del chef', 'Ambiente del local', 'Equipo', 'Evento especial'],
    tones: ['Casual', 'Gourmet', 'Divertido'],
    hashtags: ['#restaurante', '#gastronomia', '#foodie', '#comida'],
  },
  fitness: {
    themes: ['Rutina del día', 'Transformación', 'Nutrición', 'Motivación', 'Clase grupal'],
    tones: ['Motivacional', 'Educativo', 'Energético'],
    hashtags: ['#fitness', '#gym', '#entrena', '#saludable'],
  },
  realestate: {
    themes: ['Propiedad destacada', 'Tour virtual', 'Consejo compra', 'Zona residencial', 'Caso éxito'],
    tones: ['Profesional', 'Aspiracional', 'Informativo'],
    hashtags: ['#inmobiliaria', '#bienes', '#hogar', '#inversión'],
  },
  tech: {
    themes: ['Nuevo feature', 'Behind the code', 'Team spotlight', 'Tutorial', 'Caso de uso'],
    tones: ['Profesional', 'Innovador', 'Educativo'],
    hashtags: ['#tech', '#startup', '#innovation', '#software'],
  },
  beauty: {
    themes: ['Look del día', 'Tutorial maquillaje', 'Antes y después', 'Producto favorito', 'Tendencia'],
    tones: ['Glamuroso', 'Natural', 'Educativo'],
    hashtags: ['#belleza', '#makeup', '#skincare', '#beauty'],
  },
  generic: {
    themes: ['Producto/Servicio', 'Testimonio', 'Educativo', 'Detrás de escena', 'Entretenimiento'],
    tones: ['Profesional', 'Casual', 'Inspiracional'],
    hashtags: ['#marca', '#contenido', '#socialmedia'],
  },
};

export interface OnboardingData {
  workspaceName?: string;
  slug?: string;
  industry?: string;
  brandName?: string;
  brandDescription?: string;
  brandVoice?: string;
  brandColors?: string[];
  platforms?: string[];
  instagramToken?: string;
  facebookToken?: string;
  facebookPageId?: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Get onboarding status ────────────────────────────
  async getStatus(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        brandProfile: true,
        apiCredentials: true,
        contentThemes: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!workspace) {
      return {
        completed: false,
        steps: {
          workspace: false,
          brand: false,
          channels: false,
          themes: false,
          plan: false,
        },
      };
    }

    return {
      completed: workspace.onboardingCompleted,
      steps: {
        workspace: !!workspace.name && !!workspace.slug,
        brand: !!workspace.brandProfile,
        channels: workspace.apiCredentials.length > 0,
        themes: workspace.contentThemes.length > 0,
        plan: !!workspace.subscription,
      },
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
        industry: workspace.industry,
      },
    };
  }

  // ── Get industry presets ─────────────────────────────
  getPresets(industry: string) {
    return INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS['generic'];
  }

  listIndustries() {
    return Object.keys(INDUSTRY_PRESETS).map((key) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      themes: INDUSTRY_PRESETS[key]!.themes.length,
    }));
  }

  // ── Complete onboarding ──────────────────────────────
  async completeOnboarding(workspaceId: string, data: OnboardingData) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Update workspace
      const workspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          name: data.workspaceName,
          slug: data.slug,
          industry: data.industry,
          onboardingCompleted: true,
        },
      });

      // 2️⃣ Create brand profile if provided
      if (data.brandName) {
        await tx.brandProfile.upsert({
          where: { workspaceId },
          update: {
            voice: data.brandVoice || 'Profesional',
            tone: data.brandDescription || 'didáctico',
            hashtags: data.brandColors || [],
          },
          create: {
            workspaceId,
            voice: data.brandVoice || 'Profesional',
            tone: data.brandDescription || 'didáctico',
            hashtags: [],
          },
        });
      }

      // 3️⃣ Seed themes from industry preset
      if (data.industry) {
        const preset = this.getPresets(data.industry)!;
        for (const themeName of preset.themes) {
          await tx.contentTheme.create({
            data: {
              workspaceId,
              name: themeName,
              keywords: preset.hashtags,
            },
          });
        }
      }

      // 4️⃣ Store API credentials if provided
      if (data.instagramToken) {
        await tx.apiCredential.upsert({
          where: {
            workspaceId_provider: { workspaceId, provider: 'META' },
          },
          update: {
            encryptedKey: data.instagramToken,
            isActive: true,
          },
          create: {
            workspaceId,
            provider: 'META',
            encryptedKey: data.instagramToken,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (data.facebookToken && !data.instagramToken) {
        await tx.apiCredential.upsert({
          where: {
            workspaceId_provider: { workspaceId, provider: 'META' },
          },
          update: {
            encryptedKey: data.facebookToken,
            isActive: true,
          },
          create: {
            workspaceId,
            provider: 'META',
            encryptedKey: data.facebookToken,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // 5️⃣ Assign FREE plan if no subscription
      const existingSub = await tx.subscription.findUnique({
        where: { workspaceId },
      });

      if (!existingSub) {
        const freePlan = await tx.plan.findUnique({
          where: { name: 'FREE' },
        });
        if (freePlan) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await tx.subscription.create({
            data: {
              workspaceId,
              planId: freePlan.id,
              billingCycle: 'MONTHLY',
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
        }
      }

      this.logger.log(`✅ Onboarding completed for workspace ${workspaceId}`);
      return workspace;
    });
  }
}
