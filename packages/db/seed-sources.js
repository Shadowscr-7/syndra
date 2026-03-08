const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const wsId = 'ws_default';

  const sources = [
    { name: 'OpenAI Blog', type: 'RSS', url: 'https://openai.com/blog/rss.xml' },
    { name: 'Google AI Blog', type: 'RSS', url: 'https://blog.google/technology/ai/rss/' },
    { name: 'The Verge AI', type: 'RSS', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
    { name: 'TechCrunch AI', type: 'RSS', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Ars Technica', type: 'RSS', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
    { name: 'MIT Technology Review', type: 'RSS', url: 'https://www.technologyreview.com/feed/' },
    { name: 'Hugging Face Blog', type: 'BLOG', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'Anthropic News', type: 'BLOG', url: 'https://www.anthropic.com/news' },
    { name: 'Reddit r/artificial', type: 'SOCIAL', url: 'https://www.reddit.com/r/artificial/.rss' },
    { name: 'Reddit r/MachineLearning', type: 'SOCIAL', url: 'https://www.reddit.com/r/MachineLearning/.rss' },
  ];

  for (const s of sources) {
    const created = await p.researchSource.create({
      data: {
        workspaceId: wsId,
        name: s.name,
        type: s.type,
        url: s.url,
        isActive: true,
      },
    });
    console.log('Created source: ' + created.name + ' (' + created.id + ')');
  }

  console.log('\nDone!');
  await p.$disconnect();
})();
