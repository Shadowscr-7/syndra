'use client';

import { usePlan } from '@/lib/plan-context';
import { UpgradeModal } from './premium-gate';
import { useState } from 'react';

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  starter: { name: 'Starter', color: '#a78bfa' },
  creator: { name: 'Creator', color: '#06b6d4' },
  pro: { name: 'Pro', color: '#f59e0b' },
};

interface PlanGatedPageProps {
  minPlan?: string;
  feature?: string;
  children: React.ReactNode;
}

/**
 * Full-page gate: if the user's plan doesn't meet requirements,
 * shows a centered upgrade prompt instead of page content.
 */
export function PlanGatedPage({ minPlan, feature, children }: PlanGatedPageProps) {
  const { isAtLeast, hasFeature, loading, planName } = usePlan();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  let allowed = true;
  let requiredPlan = minPlan ?? 'creator';

  if (minPlan && !isAtLeast(minPlan)) {
    allowed = false;
  }

  if (feature && !hasFeature(feature)) {
    allowed = false;
  }

  if (allowed) {
    return <>{children}</>;
  }

  const target = PLAN_DISPLAY[requiredPlan] ?? { name: 'Creator', color: '#06b6d4' };

  return (
    <>
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: `${target.color}10`, boxShadow: `0 0 30px ${target.color}08` }}
        >
          🔒
        </div>

        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Función exclusiva de <span style={{ color: target.color }}>{target.name}</span>
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {feature
              ? `Esta función requiere el plan ${target.name} o superior para acceder.`
              : `Tu plan actual (${PLAN_DISPLAY[planName]?.name ?? planName}) no incluye acceso a esta sección.`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, ${target.color}, ${target.color}cc)`,
            boxShadow: `0 4px 16px ${target.color}30`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Ver planes y precios →
        </button>

        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Actualiza en cualquier momento desde la página de planes
        </p>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        requiredPlan={requiredPlan}
        feature={feature}
      />
    </>
  );
}
