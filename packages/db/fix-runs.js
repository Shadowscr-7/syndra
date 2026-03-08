const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Clear the stale error message on the successful run
  const result = await p.editorialRun.updateMany({
    where: { status: 'APPROVED', errorMessage: { not: null } },
    data: { errorMessage: null },
  });
  console.log(`Cleared error messages on ${result.count} APPROVED run(s)`);
  await p.$disconnect();
}

main().catch(console.error);
