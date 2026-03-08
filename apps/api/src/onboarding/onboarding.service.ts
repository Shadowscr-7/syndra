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
        researchSources: { where: { isActive: true }, take: 1 },
        users: {
          take: 1,
          include: {
            user: {
              select: {
                telegramLink: true,
                personas: { where: { isActive: true }, take: 1 },
                contentProfiles: { where: { isDefault: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return {
        completed: false,
        percent: 0,
        steps: {
          workspace: false,
          brand: false,
          channels: false,
          themes: false,
          plan: false,
          metaConnected: false,
          telegramLinked: false,
          llmConfigured: false,
          sourcesAdded: false,
          personaCreated: false,
          profileCreated: false,
        },
      };
    }

    const user = workspace.users[0]?.user;
    const metaCred = workspace.apiCredentials.find((c) => c.provider === 'META' && c.isActive);
    const llmCred = workspace.apiCredentials.find((c) => c.provider === 'LLM' && c.isActive);
    const telegramLinked = !!user?.telegramLink;

    const steps = {
      workspace: !!workspace.name && !!workspace.slug,
      brand: !!workspace.brandProfile,
      channels: workspace.apiCredentials.length > 0,
      themes: workspace.contentThemes.length > 0,
      plan: !!workspace.subscription,
      metaConnected: !!metaCred,
      telegramLinked,
      llmConfigured: !!llmCred,
      sourcesAdded: workspace.researchSources.length > 0,
      personaCreated: (user?.personas?.length ?? 0) > 0,
      profileCreated: (user?.contentProfiles?.length ?? 0) > 0,
    };

    const totalSteps = Object.keys(steps).length;
    const completedSteps = Object.values(steps).filter(Boolean).length;
    const percent = Math.round((completedSteps / totalSteps) * 100);

    return {
      completed: workspace.onboardingCompleted,
      percent,
      steps,
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
        industry: workspace.industry,
      },
    };
  }

  // ── Get industry presets (DB-backed with fallback) ──
  async getPresets(industry: string) {
    const playbook = await this.prisma.industryPlaybook.findUnique({
      where: { slug: industry },
    });
    if (playbook) {
      return {
        themes: playbook.themes,
        tones: playbook.tones,
        hashtags: playbook.hashtags,
        formats: playbook.formats,
        audiences: playbook.audiences,
        scheduleHint: playbook.scheduleHint,
      };
    }
    // Fallback to hardcoded presets
    return INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS['generic'];
  }

  async listIndustries() {
    const playbooks = await this.prisma.industryPlaybook.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    if (playbooks.length > 0) {
      return playbooks.map((p) => ({
        id: p.slug,
        name: p.name,
        icon: p.icon,
        description: p.description,
        themes: p.themes.length,
        formats: p.formats,
        scheduleHint: p.scheduleHint,
      }));
    }
    // Fallback
    return Object.keys(INDUSTRY_PRESETS).map((key) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: '🏪',
      description: '',
      themes: INDUSTRY_PRESETS[key]!.themes.length,
      formats: [],
      scheduleHint: null,
    }));
  }

  /**
   * Full playbook list for admin management
   */
  async listPlaybooksFull() {
    return this.prisma.industryPlaybook.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ── Seed industry playbooks to DB ────────────────────
  async seedPlaybooks() {
    const playbooks = [
      {
        slug: 'ecommerce',
        name: 'E-Commerce',
        icon: '🛒',
        description: 'Tiendas online, productos, ofertas y catálogos digitales',
        themes: ['Producto del día', 'Oferta flash', 'Testimonio cliente', 'Detrás de escena', 'Tutorial producto'],
        tones: ['Promocional', 'Educativo', 'Inspiracional'],
        hashtags: ['#ecommerce', '#tiendaonline', '#compraonline', '#ofertas'],
        formats: ['carousel', 'post', 'reel', 'story'],
        audiences: ['Compradores online', 'Millennials digitales', 'Cazadores de ofertas'],
        scheduleHint: '4-5 posts/semana',
      },
      {
        slug: 'restaurant',
        name: 'Restaurante / Gastronomía',
        icon: '🍽️',
        description: 'Restaurantes, cafeterías, dark kitchens y servicios de catering',
        themes: ['Plato estrella', 'Receta del chef', 'Ambiente del local', 'Equipo', 'Evento especial'],
        tones: ['Casual', 'Gourmet', 'Divertido'],
        hashtags: ['#restaurante', '#gastronomia', '#foodie', '#comida'],
        formats: ['post', 'reel', 'story', 'carousel'],
        audiences: ['Foodies locales', 'Familias', 'Parejas'],
        scheduleHint: '3-4 posts/semana',
      },
      {
        slug: 'fitness',
        name: 'Fitness & Salud',
        icon: '💪',
        description: 'Gimnasios, entrenadores, nutrición y bienestar',
        themes: ['Rutina del día', 'Transformación', 'Nutrición', 'Motivación', 'Clase grupal'],
        tones: ['Motivacional', 'Educativo', 'Energético'],
        hashtags: ['#fitness', '#gym', '#entrena', '#saludable'],
        formats: ['reel', 'carousel', 'post', 'story'],
        audiences: ['Jóvenes activos', 'Principiantes', 'Atletas'],
        scheduleHint: '5-6 posts/semana',
      },
      {
        slug: 'realestate',
        name: 'Inmobiliaria',
        icon: '🏠',
        description: 'Bienes raíces, propiedades, inversiones inmobiliarias',
        themes: ['Propiedad destacada', 'Tour virtual', 'Consejo compra', 'Zona residencial', 'Caso éxito'],
        tones: ['Profesional', 'Aspiracional', 'Informativo'],
        hashtags: ['#inmobiliaria', '#bienes', '#hogar', '#inversión'],
        formats: ['carousel', 'post', 'reel'],
        audiences: ['Compradores primerizos', 'Inversionistas', 'Familias jóvenes'],
        scheduleHint: '3-4 posts/semana',
      },
      {
        slug: 'tech',
        name: 'Tech / SaaS',
        icon: '💻',
        description: 'Startups, software, servicios digitales y tecnología',
        themes: ['Nuevo feature', 'Behind the code', 'Team spotlight', 'Tutorial', 'Caso de uso'],
        tones: ['Profesional', 'Innovador', 'Educativo'],
        hashtags: ['#tech', '#startup', '#innovation', '#software'],
        formats: ['carousel', 'post', 'reel'],
        audiences: ['Developers', 'CTOs', 'Early adopters'],
        scheduleHint: '3-5 posts/semana',
      },
      {
        slug: 'beauty',
        name: 'Belleza & Moda',
        icon: '💄',
        description: 'Maquillaje, skincare, moda y tendencias',
        themes: ['Look del día', 'Tutorial maquillaje', 'Antes y después', 'Producto favorito', 'Tendencia'],
        tones: ['Glamuroso', 'Natural', 'Educativo'],
        hashtags: ['#belleza', '#makeup', '#skincare', '#beauty'],
        formats: ['reel', 'carousel', 'story', 'post'],
        audiences: ['Mujeres 18-35', 'Beauty enthusiasts', 'Influencers'],
        scheduleHint: '4-5 posts/semana',
      },
      {
        slug: 'coaching',
        name: 'Coaching / Marca Personal',
        icon: '🎯',
        description: 'Coaches, mentores, speakers y marcas personales',
        themes: ['Tip del día', 'Historia personal', 'Testimonio cliente', 'Framework/Método', 'Live Q&A'],
        tones: ['Mentor', 'Inspiracional', 'Cercano'],
        hashtags: ['#coaching', '#desarrollo', '#mentalidad', '#liderazgo'],
        formats: ['carousel', 'reel', 'post'],
        audiences: ['Emprendedores', 'Profesionales en transición', 'Líderes'],
        scheduleHint: '4-6 posts/semana',
      },
      {
        slug: 'generic',
        name: 'General',
        icon: '🏪',
        description: 'Plantilla genérica para cualquier tipo de negocio',
        themes: ['Producto/Servicio', 'Testimonio', 'Educativo', 'Detrás de escena', 'Entretenimiento'],
        tones: ['Profesional', 'Casual', 'Inspiracional'],
        hashtags: ['#marca', '#contenido', '#socialmedia'],
        formats: ['post', 'carousel', 'reel'],
        audiences: ['Audiencia general', 'Seguidores de nicho'],
        scheduleHint: '3-4 posts/semana',
      },
    ];

    let created = 0;
    for (const pb of playbooks) {
      await this.prisma.industryPlaybook.upsert({
        where: { slug: pb.slug },
        update: { ...pb },
        create: { ...pb },
      });
      created++;
    }

    this.logger.log(`✅ Seeded ${created} industry playbooks`);
    return { seeded: created };
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
        const preset = (await this.getPresets(data.industry))!;
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
