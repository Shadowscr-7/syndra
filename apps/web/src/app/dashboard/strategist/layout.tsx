'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function StrategistLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator" feature="aiStrategist">
      {children}
    </PlanGatedPage>
  );
}
