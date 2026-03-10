'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function MyBusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="pro" feature="customBranding">
      {children}
    </PlanGatedPage>
  );
}
