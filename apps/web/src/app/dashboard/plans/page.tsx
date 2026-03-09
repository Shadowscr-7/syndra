import { prisma } from '@automatismos/db';
import { PlansPageClient } from './plans-client';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const session = await getSession();

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  });

  let currentPlan = 'starter';

  if (session?.workspaceId) {
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId: session.workspaceId },
      include: { plan: true },
    });
    if (sub?.plan) {
      currentPlan = sub.plan.name;
    }
  }

  // Serialize dates for client component
  const serializedPlans = plans.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return <PlansPageClient plans={serializedPlans} currentPlan={currentPlan} />;
}
