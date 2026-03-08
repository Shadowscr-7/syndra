const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const runs = await p.editorialRun.findMany({
    select: { id: true, status: true, errorMessage: true, createdAt: true },
  });
  console.log('Editorial runs:', JSON.stringify(runs, null, 2));

  const briefs = await p.contentBrief.findMany({
    select: { id: true, editorialRunId: true },
  });
  console.log('Content briefs:', JSON.stringify(briefs, null, 2));

  // Clean up FAILED runs
  for (const run of runs) {
    if (run.status === 'FAILED') {
      console.log(`Cleaning up FAILED run: ${run.id}`);
      await p.contentBrief.deleteMany({ where: { editorialRunId: run.id } });
      await p.researchSnapshot.deleteMany({ where: { editorialRunId: run.id } });
      await p.jobQueueLog.deleteMany({ where: { editorialRunId: run.id } });
      await p.editorialRun.delete({ where: { id: run.id } });
      console.log(`  Deleted run ${run.id}`);
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
