'use client';

import { useEffect } from 'react';
import { useToast } from '@/lib/toast-context';
import { registerPlanLimitHandler, unregisterPlanLimitHandler, type PlanLimitError } from '@/lib/api-fetch';

const PLAN_DISPLAY: Record<string, string> = {
  starter: 'Starter',
  creator: 'Creator',
  pro: 'Pro',
};

/**
 * Invisible component that registers a global 403 PLAN_LIMIT handler.
 * When a 403 PLAN_LIMIT response is detected by apiFetch(), this shows
 * a toast notification with an upgrade button.
 *
 * Must be rendered inside both ToastProvider and PlanProvider.
 */
export function PlanLimitInterceptor() {
  const { showToast } = useToast();

  useEffect(() => {
    registerPlanLimitHandler((error: PlanLimitError) => {
      const details = error.details;
      const requiredPlan = details.requiredPlanDisplayName
        ?? PLAN_DISPLAY[details.requiredPlan ?? '']
        ?? details.requiredPlan
        ?? 'superior';

      const resource = details.resource ?? details.feature ?? 'recurso';

      showToast({
        type: 'plan-limit',
        message: `Límite de plan alcanzado`,
        detail: error.message || `Has alcanzado el límite de ${resource}. Necesitas el plan ${requiredPlan}.`,
        requiredPlan,
        duration: 8000,
      });
    });

    return () => {
      unregisterPlanLimitHandler();
    };
  }, [showToast]);

  return null;
}
