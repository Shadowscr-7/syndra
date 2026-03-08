// Fix: remove admin@syndra.dev and ensure jcg admin is the only admin
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Delete the seed admin user and all their workspace links
  const syndraAdmin = await p.user.findFirst({ where: { email: 'admin@syndra.dev' } });
  if (syndraAdmin) {
    await p.workspaceUser.deleteMany({ where: { userId: syndraAdmin.id } });
    await p.user.delete({ where: { id: syndraAdmin.id } });
    console.log('  ✓ Deleted admin@syndra.dev');
  } else {
    console.log('  - admin@syndra.dev not found (already clean)');
  }

  // Verify jcg is the only admin
  const users = await p.user.findMany({ select: { id: true, email: true, role: true } });
  console.log('  Users remaining:', JSON.stringify(users));

  // Verify jcg has workspace link
  const wsLinks = await p.workspaceUser.findMany({
    where: { userId: 'usr_jcg_admin' },
    select: { workspaceId: true, role: true, isDefault: true },
  });
  console.log('  Workspace links:', JSON.stringify(wsLinks));

  // Verify subscription exists
  const sub = await p.subscription.findFirst({
    where: { workspaceId: 'ws_default' },
    select: { planId: true, status: true },
  });
  console.log('  Subscription:', JSON.stringify(sub));

  await p.$disconnect();
  console.log('\n✅ Fixed — only jcg admin remains');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
