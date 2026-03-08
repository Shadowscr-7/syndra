const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const bp = await p.brandProfile.findMany(); 
  console.log('BrandProfiles:', bp.length, JSON.stringify(bp.map(b => ({ name: b.brandName, id: b.id }))));
  
  const per = await p.userPersona.findMany(); 
  console.log('Personas:', per.length, JSON.stringify(per.map(b => ({ name: b.name, id: b.id }))));
  
  const th = await p.contentTheme.findMany(); 
  console.log('Themes:', th.length, JSON.stringify(th.map(t => ({ name: t.name, id: t.id }))));
  
  const src = await p.researchSource.findMany(); 
  console.log('Sources:', src.length, JSON.stringify(src.map(s => ({ name: s.name, type: s.type, id: s.id }))));
  
  const cp = await p.contentProfile.findMany(); 
  console.log('ContentProfiles:', cp.length, JSON.stringify(cp.map(c => ({ name: c.name, id: c.id }))));
  
  const vs = await p.visualStyleProfile.findMany(); 
  console.log('VisualStyles:', vs.length, JSON.stringify(vs.map(v => ({ name: v.name, id: v.id }))));
  
  const cred = await p.apiCredential.findMany({ select: { provider: true, label: true, isActive: true } }); 
  console.log('Credentials:', JSON.stringify(cred));
  
  const er = await p.editorialRun.count();
  console.log('EditorialRuns:', er);

  await p.$disconnect();
})();
