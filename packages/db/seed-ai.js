const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const wsId = 'ws_default';

  // Delete old generic themes
  const deleted = await p.contentTheme.deleteMany({ where: { workspaceId: wsId } });
  console.log(`Deleted ${deleted.count} old themes`);

  // Create AI-focused themes
  const themes = [
    {
      name: 'Noticias AI',
      keywords: ['OpenAI', 'Google AI', 'Meta AI', 'Anthropic', 'modelo nuevo', 'lanzamiento', 'actualización'],
      audience: 'Tech enthusiasts que quieren estar al día',
      priority: 10,
      preferredFormats: ['post', 'carousel'],
      type: 'TRENDING',
    },
    {
      name: 'Herramientas AI',
      keywords: ['herramienta', 'app', 'extensión', 'plugin', 'productividad', 'automatización', 'workflow'],
      audience: 'Profesionales y creadores que buscan optimizar su trabajo',
      priority: 9,
      preferredFormats: ['carousel', 'post'],
      type: 'EVERGREEN',
    },
    {
      name: 'Futuro de la AI',
      keywords: ['AGI', 'superinteligencia', 'regulación', 'ética', 'empleo', 'impacto social', 'predicciones'],
      audience: 'Pensadores y visionarios tech interesados en el futuro',
      priority: 8,
      preferredFormats: ['post', 'carousel'],
      type: 'EVERGREEN',
    },
    {
      name: 'Tutoriales & Tips AI',
      keywords: ['cómo usar', 'tutorial', 'prompt', 'tips', 'ChatGPT', 'Copilot', 'Midjourney', 'guía'],
      audience: 'Principiantes y usuarios intermedios de IA',
      priority: 8,
      preferredFormats: ['carousel', 'post'],
      type: 'EVERGREEN',
    },
    {
      name: 'AI en la Industria',
      keywords: ['medicina', 'finanzas', 'educación', 'gaming', 'robótica', 'manufactura', 'caso real'],
      audience: 'Profesionales de industrias impactadas por la IA',
      priority: 7,
      preferredFormats: ['post', 'carousel'],
      type: 'EVERGREEN',
    },
    {
      name: 'Modelos & Research',
      keywords: ['paper', 'investigación', 'benchmark', 'GPT', 'Claude', 'Gemini', 'Llama', 'open source'],
      audience: 'Desarrolladores e investigadores de ML/AI',
      priority: 7,
      preferredFormats: ['post', 'carousel'],
      type: 'TRENDING',
    },
    {
      name: 'AI Creativo',
      keywords: ['arte IA', 'música IA', 'video IA', 'Sora', 'Midjourney', 'DALL-E', 'Stable Diffusion', 'creatividad'],
      audience: 'Creativos y artistas digitales explorando AI',
      priority: 6,
      preferredFormats: ['post', 'carousel'],
      type: 'EVERGREEN',
    },
  ];

  for (const t of themes) {
    const created = await p.contentTheme.create({
      data: {
        workspaceId: wsId,
        name: t.name,
        keywords: t.keywords,
        audience: t.audience,
        priority: t.priority,
        preferredFormats: t.preferredFormats,
        type: t.type,
      },
    });
    console.log(`Created theme: ${created.name} (${created.id})`);
  }

  // Create research sources
  const deletedSrc = await p.researchSource.deleteMany({ where: { workspaceId: wsId } });
  console.log(`\nDeleted ${deletedSrc.count} old sources`);

  const sources = [
    { name: 'OpenAI Blog', type: 'RSS', url: 'https://openai.com/blog/rss.xml', priority: 10 },
    { name: 'Google AI Blog', type: 'RSS', url: 'https://blog.google/technology/ai/rss/', priority: 9 },
    { name: 'The Verge AI', type: 'RSS', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', priority: 9 },
    { name: 'TechCrunch AI', type: 'RSS', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', priority: 8 },
    { name: 'Ars Technica AI', type: 'RSS', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', priority: 7 },
    { name: 'MIT Technology Review', type: 'RSS', url: 'https://www.technologyreview.com/feed/', priority: 8 },
    { name: 'Hugging Face Blog', type: 'RSS', url: 'https://huggingface.co/blog/feed.xml', priority: 7 },
    { name: 'Anthropic Blog', type: 'WEB', url: 'https://www.anthropic.com/news', priority: 8 },
    { name: 'Reddit r/artificial', type: 'WEB', url: 'https://www.reddit.com/r/artificial/.rss', priority: 6 },
    { name: 'Reddit r/MachineLearning', type: 'WEB', url: 'https://www.reddit.com/r/MachineLearning/.rss', priority: 6 },
  ];

  for (const s of sources) {
    const created = await p.researchSource.create({
      data: {
        workspaceId: wsId,
        name: s.name,
        type: s.type,
        url: s.url,
        priority: s.priority,
        isActive: true,
      },
    });
    console.log(`Created source: ${created.name} (${created.id})`);
  }

  console.log('\n✅ All themes and sources created!');
  await p.$disconnect();
})();
