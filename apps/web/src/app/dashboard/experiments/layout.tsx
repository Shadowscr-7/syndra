'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function ExperimentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="pro">
      {children}
    </PlanGatedPage>
  );
}
