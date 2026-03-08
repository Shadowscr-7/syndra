// Setup script for jcg.software.solution@gmail.com user with AI Vanguard data
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting up JCG admin user + AI Vanguard...\n');

  // 1. Create/update user
  const hash = await bcrypt.hash('SyndraJCG2026!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'jcg.software.solution@gmail.com' },
    update: { role: 'ADMIN', emailVerified: true },
    create: {
      id: 'usr_jcg_admin',
      email: 'jcg.software.solution@gmail.com',
      passwordHash: hash,
      name: 'JCG Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log(`  ✓ User: ${user.email} (${user.id})`);

  // 2. Link to workspace
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: 'ws_default' } },
    update: { role: 'OWNER', isDefault: true },
    create: {
      userId: user.id,
      workspaceId: 'ws_default',
      role: 'OWNER',
      isDefault: true,
    },
  });
  console.log('  ✓ Linked to ws_default as OWNER');

  // 3. Create AI Vanguard Persona
  const persona = await prisma.userPersona.upsert({
    where: { id: 'persona_ai_vanguard' },
    update: {},
    create: {
      id: 'persona_ai_vanguard',
      userId: user.id,
      brandName: 'AI Vanguard',
      brandDescription: 'Canal de contenido sobre inteligencia artificial, automatización y tecnología de vanguardia. Informamos, educamos e inspiramos sobre el futuro de la IA.',
      tone: ['informativo', 'futurista', 'accesible', 'técnico-divulgativo'],
      expertise: ['inteligencia artificial', 'machine learning', 'deep learning', 'LLMs', 'IA generativa', 'automatización'],
      visualStyle: 'futurista',
      targetAudience: 'Profesionales tech, desarrolladores, emprendedores digitales, entusiastas de la IA (25-45 años)',
      avoidTopics: ['política', 'religión', 'contenido explícito', 'rumores sin fuente', 'cripto scams'],
      languageStyle: 'Tuteo, claro y directo, con tecnicismos explicados. Mezcla autoridad con accesibilidad.',
      examplePhrases: [
        '¿Sabías que este modelo puede hacer X en segundos?',
        'Esto cambia todo para los developers...',
        'La IA no te va a reemplazar, pero alguien que la use sí.',
      ],
      isActive: true,
    },
  });
  console.log(`  ✓ Persona: ${persona.brandName} (${persona.id})`);

  // 4. Create Content Profile
  const profile = await prisma.contentProfile.upsert({
    where: { id: 'cp_ai_vanguard' },
    update: {},
    create: {
      id: 'cp_ai_vanguard',
      userId: user.id,
      name: 'AI Vanguard Principal',
      tone: 'informativo-futurista',
      contentLength: 'MEDIUM',
      audience: 'Profesionales tech, developers, emprendedores digitales (25-45)',
      language: 'es',
      hashtags: ['#IA', '#InteligenciaArtificial', '#AI', '#MachineLearning', '#Tech', '#Automatización', '#FuturoIA'],
      postingGoal: 'Publicar contenido diario sobre IA: noticias, tutoriales, herramientas y tendencias',
      linkedSocialAccounts: [],
      isDefault: true,
    },
  });
  console.log(`  ✓ Content Profile: ${profile.name} (${profile.id})`);

  // 5. Create Visual Style
  const vs = await prisma.visualStyleProfile.upsert({
    where: { id: 'vs_futurista_tech' },
    update: {},
    create: {
      id: 'vs_futurista_tech',
      userId: user.id,
      contentProfileId: profile.id,
      name: 'Futurista Tech',
      style: 'FUTURISTIC',
      colorPalette: ['#0f172a', '#6366f1', '#06b6d4', '#f59e0b', '#f8fafc'],
      primaryFont: 'Space Grotesk',
      secondaryFont: 'Inter',
      logoUrl: null,
      preferredImageProvider: 'huggingface',
      customPromptPrefix: 'futuristic tech style, dark background, neon accents, clean modern design',
    },
  });
  console.log(`  ✓ Visual Style: ${vs.name} (${vs.id})`);

  // 6. Sync BrandProfile from persona
  await prisma.brandProfile.upsert({
    where: { workspaceId: 'ws_default' },
    update: {
      voice: persona.brandDescription,
      tone: persona.tone.join(', '),
      prohibitedTopics: persona.avoidTopics,
    },
    create: {
      workspaceId: 'ws_default',
      voice: persona.brandDescription,
      tone: persona.tone.join(', '),
      prohibitedTopics: persona.avoidTopics,
    },
  });
  console.log('  ✓ BrandProfile synced from persona');

  // 7. Extra AI themes (in addition to seed ones)
  const extraThemes = [
    { id: 'theme_herramientas_ai', name: 'Herramientas AI', keywords: ['herramientas IA', 'tools', 'apps', 'software'], priority: 9, type: 'EVERGREEN' },
    { id: 'theme_futuro_ai', name: 'Futuro de la AI', keywords: ['futuro', 'predicciones', 'AGI', 'singularidad', 'tendencias'], priority: 7, type: 'EVERGREEN' },
    { id: 'theme_tutoriales_ai', name: 'Tutoriales & Tips AI', keywords: ['tutorial', 'cómo', 'guía', 'paso a paso', 'prompt engineering'], priority: 8, type: 'EVERGREEN' },
    { id: 'theme_industria_ai', name: 'AI en la Industria', keywords: ['industria', 'salud', 'finanzas', 'educación', 'legal', 'Enterprise AI'], priority: 6, type: 'EVERGREEN' },
    { id: 'theme_modelos_research', name: 'Modelos & Research', keywords: ['GPT', 'Claude', 'Llama', 'Gemini', 'papers', 'benchmarks'], priority: 8, type: 'TRENDING' },
    { id: 'theme_ai_creativo', name: 'AI Creativo', keywords: ['imagen', 'video', 'música', 'diseño', 'Midjourney', 'DALL-E', 'Stable Diffusion'], priority: 7, type: 'TRENDING' },
  ];

  for (const t of extraThemes) {
    const created = await prisma.contentTheme.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        workspaceId: 'ws_default',
        name: t.name,
        keywords: t.keywords,
        audience: 'Profesionales tech y entusiastas de la IA',
        priority: t.priority,
        preferredFormats: ['post', 'carousel'],
        type: t.type,
      },
    });
    console.log(`  ✓ Theme: ${created.name}`);
  }

  // 8. Extra research sources
  const extraSources = [
    { id: 'src_mit_tech', name: 'MIT Technology Review', type: 'RSS', url: 'https://www.technologyreview.com/feed/' },
    { id: 'src_reddit_ml', name: 'Reddit r/MachineLearning', type: 'SOCIAL', url: 'https://www.reddit.com/r/MachineLearning/' },
    { id: 'src_reddit_ai', name: 'Reddit r/artificial', type: 'SOCIAL', url: 'https://www.reddit.com/r/artificial/' },
  ];

  for (const s of extraSources) {
    const created = await prisma.researchSource.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        workspaceId: 'ws_default',
        name: s.name,
        type: s.type,
        url: s.url,
      },
    });
    console.log(`  ✓ Source: ${created.name}`);
  }

  console.log('\n✅ JCG Admin + AI Vanguard setup complete!');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
