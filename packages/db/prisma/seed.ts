import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding database...');

  // ---- Workspace de prueba ----
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws_default' },
    update: {},
    create: {
      id: 'ws_default',
      name: 'Mi Workspace',
      timezone: 'America/Mexico_City',
      primaryColor: '#6366f1',
      objectives: ['autoridad', 'captación', 'tráfico', 'venta'],
      activeChannels: ['instagram', 'facebook'],
    },
  });
  console.info(`  ✓ Workspace: ${workspace.name}`);

  // ---- Brand Profile ----
  const brandProfile = await prisma.brandProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      voice:
        'Experto en IA aplicada a negocios. Tono cercano pero con autoridad técnica. Combina educación práctica con visión estratégica.',
      tone: 'didáctico',
      allowedClaims: [
        'Automatización inteligente',
        'IA con criterio de negocio',
        'Productividad real con tecnología',
      ],
      baseCta: 'Únete al canal para más contenido sobre IA aplicada',
      prohibitedTopics: ['política', 'religión', 'contenido explícito', 'rumores sin fuente'],
      hashtags: [
        '#InteligenciaArtificial',
        '#IAParaNegocios',
        '#Automatización',
        '#Productividad',
        '#TechBusiness',
      ],
      visualStyle: {
        primaryFont: 'Inter',
        secondaryFont: 'Space Grotesk',
        primaryColor: '#6366f1',
        secondaryColor: '#0ea5e9',
        backgroundColor: '#0f172a',
        textColor: '#f8fafc',
        accentColor: '#f59e0b',
      },
    },
  });
  console.info(`  ✓ Brand Profile: ${brandProfile.voice.substring(0, 40)}...`);

  // ---- Content Themes ----
  const themes = [
    {
      id: 'theme_ia_general',
      name: 'IA General',
      keywords: ['inteligencia artificial', 'machine learning', 'deep learning', 'LLMs'],
      audience: 'Profesionales y emprendedores interesados en IA',
      priority: 8,
      preferredFormats: ['post', 'carousel'],
      type: 'EVERGREEN' as const,
    },
    {
      id: 'theme_automatizacion',
      name: 'Automatización',
      keywords: ['automatización', 'workflows', 'no-code', 'bots', 'RPA'],
      audience: 'Emprendedores digitales que buscan escalar',
      priority: 9,
      preferredFormats: ['carousel', 'reel'],
      type: 'EVERGREEN' as const,
    },
    {
      id: 'theme_agentes',
      name: 'Agentes de IA',
      keywords: ['agentes IA', 'AI agents', 'autonomous agents', 'agentic'],
      audience: 'Desarrolladores y early adopters de IA',
      priority: 7,
      preferredFormats: ['post', 'carousel', 'reel'],
      type: 'TRENDING' as const,
    },
    {
      id: 'theme_productividad',
      name: 'Productividad con IA',
      keywords: ['productividad', 'eficiencia', 'herramientas IA', 'prompts'],
      audience: 'Cualquier profesional que quiera ser más productivo',
      priority: 8,
      preferredFormats: ['carousel', 'reel'],
      type: 'EVERGREEN' as const,
    },
    {
      id: 'theme_noticias',
      name: 'Noticias IA del Día',
      keywords: ['breaking', 'lanzamiento', 'actualización', 'nueva herramienta'],
      audience: 'Seguidores que quieren estar al día',
      priority: 10,
      preferredFormats: ['post', 'reel'],
      type: 'TRENDING' as const,
    },
  ];

  for (const theme of themes) {
    const created = await prisma.contentTheme.upsert({
      where: { id: theme.id },
      update: {},
      create: {
        ...theme,
        workspaceId: workspace.id,
      },
    });
    console.info(`  ✓ Theme: ${created.name}`);
  }

  // ---- Research Sources ----
  const sources = [
    {
      id: 'src_openai_blog',
      name: 'OpenAI Blog',
      type: 'BLOG' as const,
      url: 'https://openai.com/blog',
    },
    {
      id: 'src_anthropic_news',
      name: 'Anthropic News',
      type: 'BLOG' as const,
      url: 'https://www.anthropic.com/news',
    },
    {
      id: 'src_hf_blog',
      name: 'Hugging Face Blog',
      type: 'BLOG' as const,
      url: 'https://huggingface.co/blog',
    },
    {
      id: 'src_techcrunch_ai',
      name: 'TechCrunch AI',
      type: 'RSS' as const,
      url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    },
    {
      id: 'src_the_verge_ai',
      name: 'The Verge AI',
      type: 'RSS' as const,
      url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    },
    {
      id: 'src_ars_ai',
      name: 'Ars Technica AI',
      type: 'RSS' as const,
      url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    },
  ];

  for (const source of sources) {
    const created = await prisma.researchSource.upsert({
      where: { id: source.id },
      update: {},
      create: {
        ...source,
        workspaceId: workspace.id,
      },
    });
    console.info(`  ✓ Research Source: ${created.name}`);
  }

  // ---- Campaign de ejemplo ----
  const campaign = await prisma.campaign.upsert({
    where: { id: 'camp_default' },
    update: {},
    create: {
      id: 'camp_default',
      workspaceId: workspace.id,
      name: 'Crecimiento Orgánico Q1 2026',
      objective: 'AUTHORITY',
      offer: null,
      landingUrl: null,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      kpiTarget: '1000 seguidores nuevos en 3 meses',
      isActive: true,
    },
  });
  console.info(`  ✓ Campaign: ${campaign.name}`);

  console.info('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
