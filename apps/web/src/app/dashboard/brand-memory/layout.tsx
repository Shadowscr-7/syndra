'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function BrandMemoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="pro" feature="brandMemory">
      {children}
    </PlanGatedPage>
  );
}
