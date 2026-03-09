'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator" feature="team">
      {children}
    </PlanGatedPage>
  );
}
