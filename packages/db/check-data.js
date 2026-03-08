const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const users = await p.user.findMany({ select: { id: true, email: true, role: true } });
  console.log('USERS:', JSON.stringify(users));

  const personas = await p.userPersona.findMany({ select: { id: true, userId: true, brandName: true, isActive: true } });
  console.log('PERSONAS:', JSON.stringify(personas));

  const profiles = await p.contentProfile.findMany({ select: { id: true, userId: true, name: true, isDefault: true } });
  console.log('PROFILES:', JSON.stringify(profiles));

  const vs = await p.visualStyleProfile.findMany({ select: { id: true, userId: true, name: true } });
  console.log('VISUAL_STYLES:', JSON.stringify(vs));

  const creds = await p.apiCredential.findMany({ select: { id: true, workspaceId: true, provider: true } });
  console.log('CREDENTIALS:', JSON.stringify(creds));

  const themes = await p.contentTheme.count();
  console.log('THEMES:', themes);

  const sources = await p.researchSource.count();
  console.log('SOURCES:', sources);

  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
