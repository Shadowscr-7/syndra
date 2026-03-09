'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator" feature="trendDetection">
      {children}
    </PlanGatedPage>
  );
}
