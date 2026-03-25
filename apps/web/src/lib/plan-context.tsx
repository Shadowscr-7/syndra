'use client';

import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { getClientSession } from './client-session';

// ── Types ─────────────────────────────────────────────────

export interface UsageEntry {
  used: number;
  limit: number; // -1 = unlimited
}

export interface PlanInfo {
  plan: {
    name: string;
    displayName: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
  } | null;
  subscription: {
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  usage: Record<string, UsageEntry>;
  features: Record<string, boolean | string>;
}

interface PlanContextType {
  planInfo: PlanInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  canUse: (resource: string) => { allowed: boolean; used: number; limit: number; percent: number };
  planName: string;
  isPlan: (name: string) => boolean;
  isAtLeast: (name: string) => boolean;
}

const PLAN_ORDER: Record<string, number> = { starter: 0, creator: 1, pro: 2 };

const PlanContext = createContext<PlanContextType>({
  planInfo: null,
  loading: true,
  refresh: async () => {},
  hasFeature: () => false,
  canUse: () => ({ allowed: true, used: 0, limit: -1, percent: 0 }),
  planName: 'starter',
  isPlan: () => false,
  isAtLeast: () => false,
});

export function usePlan() {
  return useContext(PlanContext);
}

// ── Provider ──────────────────────────────────────────────

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlanInfo = useCallback(async () => {
    try {
      const { workspaceId } = getClientSession();
      if (!workspaceId) {
        console.warn('[PlanContext] No workspace-id cookie found, skipping plan fetch');
        return;
      }

      const res = await fetch('/api/plans/info', {
        headers: { 'x-workspace-id': workspaceId },
        credentials: 'include',
      });

      if (!res.ok) {
        console.warn('[PlanContext] API returned', res.status);
        return;
      }
      const json = await res.json();
      setPlanInfo(json.data ?? json);
    } catch (err) {
      console.error('[PlanContext] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanInfo();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPlanInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPlanInfo]);

  const planName = planInfo?.plan?.name ?? 'starter';

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!planInfo?.features) return false;
      return !!planInfo.features[feature];
    },
    [planInfo],
  );

  const canUse = useCallback(
    (resource: string): { allowed: boolean; used: number; limit: number; percent: number } => {
      if (!planInfo?.usage?.[resource]) return { allowed: true, used: 0, limit: -1, percent: 0 };
      const { used, limit } = planInfo.usage[resource];
      if (limit === -1) return { allowed: true, used, limit, percent: 0 };
      const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
      return { allowed: used < limit, used, limit, percent };
    },
    [planInfo],
  );

  const isPlan = useCallback(
    (name: string): boolean => planName === name,
    [planName],
  );

  const isAtLeast = useCallback(
    (name: string): boolean => {
      return (PLAN_ORDER[planName] ?? 0) >= (PLAN_ORDER[name] ?? 0);
    },
    [planName],
  );

  return (
    <PlanContext.Provider
      value={{
        planInfo,
        loading,
        refresh: fetchPlanInfo,
        hasFeature,
        canUse,
        planName,
        isPlan,
        isAtLeast,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}
