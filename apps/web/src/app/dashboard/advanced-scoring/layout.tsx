'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function AdvancedScoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator" feature="aiScoring">
      {children}
    </PlanGatedPage>
  );
}
