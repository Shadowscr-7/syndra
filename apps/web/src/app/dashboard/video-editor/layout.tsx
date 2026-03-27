'use client';

import { PlanGatedPage } from '@/components/plan/plan-gated-page';

export default function VideoEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGatedPage minPlan="creator" feature="video">
      {children}
    </PlanGatedPage>
  );
}
