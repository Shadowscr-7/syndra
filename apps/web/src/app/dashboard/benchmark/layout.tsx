'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function BenchmarkLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator">
      {children}
    </PlanGatedPage>
  );
}
