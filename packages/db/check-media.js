const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const run = await p.editorialRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, targetChannels: true, errorMessage: true },
  });
  console.log('Run:', JSON.stringify(run, null, 2));

  const brief = await p.contentBrief.findFirst({
    where: { editorialRunId: run.id },
    select: { id: true, format: true, angle: true },
  });
  console.log('Brief:', JSON.stringify(brief, null, 2));

  const versions = await p.contentVersion.findMany({
    where: { briefId: brief.id },
    select: { id: true, version: true, isMain: true, hook: true, title: true },
  });
  console.log('Versions:', JSON.stringify(versions, null, 2));

  const media = await p.mediaAsset.findMany({
    where: { contentVersion: { briefId: brief.id } },
    select: {
      id: true, type: true, provider: true, status: true,
      prompt: true, originalUrl: true, optimizedUrl: true, storagePath: true,
    },
  });
  console.log('Media assets:', JSON.stringify(media, null, 2));

  // Check job queue logs for media stage
  const jobs = await p.jobQueueLog.findMany({
    where: { editorialRunId: run.id },
    select: { id: true, jobType: true, status: true, error: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Job logs:', JSON.stringify(jobs, null, 2));

  // Check credentials
  const creds = await p.apiCredential.findMany({
    select: { id: true, provider: true, isActive: true },
  });
  console.log('API Credentials:', JSON.stringify(creds, null, 2));

  const userCreds = await p.userCredential.findMany({
    select: { id: true, provider: true, isActive: true },
  });
  console.log('User Credentials:', JSON.stringify(userCreds, null, 2));

  await p.$disconnect();
}

main().catch(console.error);
