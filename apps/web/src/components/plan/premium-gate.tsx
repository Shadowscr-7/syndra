'use client';

import { useState } from 'react';
import { usePlan } from '@/lib/plan-context';

// ── Upgrade Modal ─────────────────────────────────────────

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: string;
  feature?: string;
  resource?: string;
}

const PLAN_DISPLAY: Record<string, { name: string; price: string; color: string }> = {
  starter: { name: 'Starter', price: '$15/mes', color: '#a78bfa' },
  creator: { name: 'Creator', price: '$39/mes', color: '#06b6d4' },
  pro: { name: 'Pro', price: '$99/mes', color: '#f59e0b' },
};

export function UpgradeModal({ open, onClose, requiredPlan = 'creator', feature, resource }: UpgradeModalProps) {
  const target = PLAN_DISPLAY[requiredPlan] ?? { name: 'Creator', price: '$39/mes', color: '#06b6d4' };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6 space-y-5"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(20,20,45,0.98))',
          border: `1px solid ${target.color}33`,
          boxShadow: `0 0 40px ${target.color}15, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl transition-colors"
          style={{ color: 'rgba(160,160,192,0.5)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(160,160,192,0.5)')}
        >
          ✕
        </button>

        {/* Icon */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl"
            style={{ background: `${target.color}15`, boxShadow: `0 0 20px ${target.color}10` }}
          >
            💎
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Desbloquea más con <span style={{ color: target.color }}>{target.name}</span>
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {feature
              ? `La función "${feature}" requiere el plan ${target.name} o superior.`
              : resource
              ? `Has alcanzado el límite de ${resource} en tu plan actual.`
              : `Actualiza a ${target.name} para desbloquear todas las funcionalidades.`}
          </p>
        </div>

        {/* Price */}
        <div
          className="text-center py-3 rounded-xl"
          style={{ background: `${target.color}08`, border: `1px solid ${target.color}15` }}
        >
          <span className="text-3xl font-bold" style={{ color: target.color }}>
            {target.price.split('/')[0]}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--color-text-muted)' }}>
            /mes
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <a
            href="/dashboard/plans"
            className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${target.color}, ${target.color}cc)`,
              boxShadow: `0 4px 16px ${target.color}30`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 24px ${target.color}40`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${target.color}30`; }}
          >
            Ver planes y precios →
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Premium Gate ──────────────────────────────────────────

interface PremiumGateProps {
  feature?: string;        // boolean feature to check
  resource?: string;       // numeric resource to check
  minPlan?: string;        // minimum plan name: 'starter' | 'creator' | 'pro'
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wraps content that requires a plan feature/resource.
 * Shows children if the user has access, otherwise shows an upgrade prompt.
 */
export function PremiumGate({ feature, resource, minPlan, children, fallback }: PremiumGateProps) {
  const { hasFeature, canUse, isAtLeast, loading } = usePlan();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <>{children}</>;
  }

  let allowed = true;
  let requiredPlan = minPlan ?? 'creator';

  if (feature) {
    allowed = hasFeature(feature);
  }

  if (resource) {
    const usage = canUse(resource);
    allowed = allowed && usage.allowed;
  }

  if (minPlan) {
    allowed = allowed && isAtLeast(minPlan);
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        {/* Blurred content preview */}
        <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.4 }}>
          {children}
        </div>
        {/* Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: 'rgba(6,6,15,0.7)' }}
        >
          <span className="text-4xl">🔒</span>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Requiere plan {PLAN_DISPLAY[requiredPlan]?.name ?? 'superior'}
          </p>
          <span
            className="text-xs px-4 py-2 rounded-lg font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.15))',
              color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            Actualizar plan →
          </span>
        </div>
      </div>
      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        requiredPlan={requiredPlan}
        feature={feature}
        resource={resource}
      />
    </>
  );
}
