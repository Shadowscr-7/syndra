'use client';

import { usePlan } from '@/lib/plan-context';

// ── Usage Badge ───────────────────────────────────────────

interface UsageBadgeProps {
  resource: string;
  label?: string;
  compact?: boolean;
}

/**
 * Displays usage progress for a resource (e.g., "12/40 publicaciones")
 */
export function UsageBadge({ resource, label, compact = false }: UsageBadgeProps) {
  const { canUse, loading } = usePlan();

  if (loading) return null;

  const { used, limit, percent } = canUse(resource);

  if (limit === -1) {
    if (compact) return null;
    return (
      <span className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.03)' }}>
        ∞ {label}
      </span>
    );
  }

  const color = percent >= 90 ? 'var(--color-error)' : percent >= 75 ? 'var(--color-warning)' : 'var(--color-primary-light)';

  if (compact) {
    return (
      <span className="text-xs font-medium" style={{ color }}>
        {used}/{limit}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--color-text-secondary)' }}>{label ?? resource}</span>
        <span className="font-medium" style={{ color }}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: percent >= 90
              ? 'linear-gradient(90deg, var(--color-error), #f87171)'
              : percent >= 75
              ? 'linear-gradient(90deg, var(--color-warning), #fbbf24)'
              : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
          }}
        />
      </div>
    </div>
  );
}

// ── Limit Reached Banner ─────────────────────────────────

interface LimitReachedBannerProps {
  resource: string;
  label?: string;
}

/**
 * Shows a warning banner when a resource limit is reached or close to being reached.
 */
export function LimitReachedBanner({ resource, label }: LimitReachedBannerProps) {
  const { canUse, loading } = usePlan();

  if (loading) return null;

  const { allowed, used, limit, percent } = canUse(resource);

  if (limit === -1 || percent < 80) return null;

  const isReached = !allowed;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
      style={{
        background: isReached
          ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))',
        border: `1px solid ${isReached ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
      }}
    >
      <span className="text-lg">{isReached ? '🚫' : '⚠️'}</span>
      <div className="flex-1">
        <p className="font-medium" style={{ color: isReached ? 'var(--color-error)' : 'var(--color-warning)' }}>
          {isReached
            ? `Has alcanzado el límite de ${label ?? resource}`
            : `Estás cerca del límite de ${label ?? resource}`}
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {used}/{limit} utilizados ({percent}%).{' '}
          <a href="/dashboard/plans" className="underline" style={{ color: 'var(--color-primary-light)' }}>
            Actualiza tu plan
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Plan Badge (shown next to plan name) ─────────────────

export function PlanBadge() {
  const { planName, loading } = usePlan();

  if (loading) return null;

  const colors: Record<string, { bg: string; text: string; border: string }> = {
    starter: { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa', border: 'rgba(167,139,250,0.2)' },
    creator: { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4', border: 'rgba(6,182,212,0.2)' },
    pro: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  };

  const c = colors[planName] ?? { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa', border: 'rgba(167,139,250,0.2)' };

  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {planName}
    </span>
  );
}
