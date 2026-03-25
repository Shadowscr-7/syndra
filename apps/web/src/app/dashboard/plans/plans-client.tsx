'use client';

import { useState } from 'react';
import { usePlan } from '@/lib/plan-context';
import { UsageBadge } from '@/components/plan/usage-badge';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxPublications: number;
  maxVideos: number;
  maxSources: number;
  maxChannels: number;
  maxEditors: number;
  maxPersonas: number;
  maxContentProfiles: number;
  maxVisualStyles: number;
  maxStorageMb: number;
  maxScheduleSlots: number;
  maxExperiments: number;
  analyticsEnabled: boolean;
  aiScoringEnabled: boolean;
  trendDetectionEnabled: boolean;
  aiStrategistEnabled: boolean;
  videoEnabled: boolean;
  brandMemoryEnabled: boolean;
  teamEnabled: boolean;
  priorityQueue: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  analyticsLevel: string;
  learningLoopLevel: string;
  autopilotLevel: string;
  [key: string]: any;
}

const PLAN_COLORS: Record<string, { accent: string; gradient: string; glow: string }> = {
  starter: {
    accent: '#a78bfa',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))',
    glow: '0 0 30px rgba(167,139,250,0.1)',
  },
  creator: {
    accent: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
    glow: '0 0 30px rgba(6,182,212,0.1)',
  },
  pro: {
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
    glow: '0 0 30px rgba(245,158,11,0.1)',
  },
};

const LIMIT_ROWS: { key: string; label: string }[] = [
  { key: 'maxPublications', label: 'Publicaciones/mes' },
  { key: 'maxVideos', label: 'Vídeos/mes' },
  { key: 'maxChannels', label: 'Canales conectados' },
  { key: 'maxSources', label: 'Fuentes de investigación' },
  { key: 'maxEditors', label: 'Editores/colaboradores' },
  { key: 'maxPersonas', label: 'Personas IA' },
  { key: 'maxContentProfiles', label: 'Perfiles de contenido' },
  { key: 'maxVisualStyles', label: 'Estilos visuales' },
  { key: 'maxStorageMb', label: 'Almacenamiento (MB)' },
  { key: 'maxScheduleSlots', label: 'Slots de programación' },
  { key: 'maxExperiments', label: 'Experimentos A/B' },
];

const FEATURE_ROWS: { key: string; label: string }[] = [
  { key: 'analyticsEnabled', label: 'Analytics' },
  { key: 'aiScoringEnabled', label: 'Scoring con IA' },
  { key: 'trendDetectionEnabled', label: 'Detección de tendencias' },
  { key: 'aiStrategistEnabled', label: 'Estratega IA' },
  { key: 'videoEnabled', label: 'Video Pipeline' },
  { key: 'brandMemoryEnabled', label: 'Memoria de marca' },
  { key: 'teamEnabled', label: 'Equipo y colaboración' },
  { key: 'priorityQueue', label: 'Cola prioritaria' },
  { key: 'apiAccess', label: 'Acceso API' },
  { key: 'prioritySupport', label: 'Soporte prioritario' },
  { key: 'customBranding', label: 'Branding personalizado' },
];

const LEVEL_ROWS: { key: string; label: string; labels: Record<string, string> }[] = [
  {
    key: 'analyticsLevel',
    label: 'Nivel de analytics',
    labels: { basic: 'Básico', complete: 'Completo', ai: 'IA avanzado' },
  },
  {
    key: 'learningLoopLevel',
    label: 'Learning Loop',
    labels: { none: 'No', basic: 'Básico', medium: 'Medio', full: 'Completo' },
  },
  {
    key: 'autopilotLevel',
    label: 'Autopilot',
    labels: { manual: 'Manual', approval: 'Con aprobación', assisted: 'Asistido', full: 'Completo' },
  },
];

export function PlansPageClient({
  plans,
  currentPlan,
  currentPlanId,
  subscriptionStatus,
  billingCycle: currentBillingCycle,
  currentPeriodEnd,
  paypalSubscriptionId,
  cancelAtPeriodEnd,
}: {
  plans: Plan[];
  currentPlan: string;
  currentPlanId: string;
  subscriptionStatus: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  paypalSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { refresh } = usePlan();

  const isPaid = subscriptionStatus === 'ACTIVE' && !!paypalSubscriptionId;
  const isTrialing = subscriptionStatus === 'TRIALING' || (!paypalSubscriptionId && subscriptionStatus === 'ACTIVE');

  const handleSubscribe = async (planId: string, planName: string) => {
    if (planName === currentPlan && isPaid) return;
    setLoading(planName);

    try {
      // Use PayPal checkout flow
      const res = await fetch('/api/paypal/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          billingCycle: billing === 'monthly' ? 'MONTHLY' : 'YEARLY',
        }),
      });

      const data = await res.json();

      if (data.approvalUrl) {
        // Redirect to PayPal for payment
        window.location.href = data.approvalUrl;
      } else {
        console.error('PayPal subscribe error:', data);
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Mantendrás el acceso hasta el fin del período actual.')) return;
    setCancelling(true);

    try {
      const res = await fetch('/api/paypal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });

      if (res.ok) {
        await refresh();
        window.location.reload();
      }
    } catch {
      // handle error silently
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Planes y Facturación</h1>
        <p className="page-subtitle">
          Elige el plan perfecto para tu estrategia de contenido
        </p>
      </div>

      {/* Subscription Status Banner */}
      {isTrialing && (
        <div
          className="rounded-xl border p-4 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}
        >
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold" style={{ color: '#f59e0b' }}>
              Tu cuenta está en período de prueba
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Activa tu suscripción con PayPal para mantener el acceso a todas las funcionalidades de tu plan.
            </p>
          </div>
        </div>
      )}

      {cancelAtPeriodEnd && currentPeriodEnd && (
        <div
          className="rounded-xl border p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <span className="text-2xl">🔴</span>
          <div>
            <p className="font-semibold" style={{ color: '#ef4444' }}>
              Suscripción cancelada
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Tu acceso al plan actual finaliza el{' '}
              {new Date(currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
          </div>
        </div>
      )}

      {isPaid && !cancelAtPeriodEnd && currentPeriodEnd && (
        <div
          className="rounded-xl border p-4 flex items-center justify-between"
          style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold" style={{ color: '#10b981' }}>
                Suscripción activa — {plans.find(p => p.name === currentPlan)?.displayName} ({currentBillingCycle === 'YEARLY' ? 'Anual' : 'Mensual'})
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Próxima renovación:{' '}
                {new Date(currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-red-500/10"
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
          >
            {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
          </button>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className="text-sm font-medium cursor-pointer transition-colors"
          style={{ color: billing === 'monthly' ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          onClick={() => setBilling('monthly')}
        >
          Mensual
        </span>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{ background: billing === 'yearly' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)' }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ left: billing === 'yearly' ? '28px' : '4px' }}
          />
        </button>
        <span
          className="text-sm font-medium cursor-pointer transition-colors"
          style={{ color: billing === 'yearly' ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          onClick={() => setBilling('yearly')}
        >
          Anual
        </span>
        {billing === 'yearly' && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
          >
            Ahorra ~17%
          </span>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.starter!;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const priceLabel = billing === 'monthly' ? '/mes' : '/año';

          return (
            <div
              key={plan.id}
              className="rounded-2xl border p-6 space-y-5 relative overflow-hidden transition-all duration-300"
              style={{
                background: colors.gradient,
                borderColor: isCurrent ? colors.accent : 'var(--color-border)',
                borderWidth: isCurrent ? 2 : 1,
                boxShadow: isCurrent ? colors.glow : 'none',
              }}
            >
              {isCurrent && (
                <div
                  className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${colors.accent}20`, color: colors.accent, border: `1px solid ${colors.accent}30` }}
                >
                  Plan actual
                </div>
              )}

              {plan.name === 'creator' && !isCurrent && (
                <div
                  className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
                >
                  Más popular
                </div>
              )}

              {/* Name + Description */}
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.accent }}>
                  {plan.displayName}
                </h2>
                {plan.description && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <span className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                  ${Math.round(price / 100)}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--color-text-muted)' }}>
                  {priceLabel}
                </span>
              </div>

              {/* Key limits */}
              <ul className="space-y-2.5 text-sm">
                <LimitRow label="Publicaciones" value={plan.maxPublications} accent={colors.accent} />
                <LimitRow label="Vídeos" value={plan.maxVideos} accent={colors.accent} />
                <LimitRow label="Canales" value={plan.maxChannels} accent={colors.accent} />
                <LimitRow label="Fuentes" value={plan.maxSources} accent={colors.accent} />
                <LimitRow label="Almacenamiento" value={plan.maxStorageMb} suffix=" MB" accent={colors.accent} />
              </ul>

              {/* Key features */}
              <ul className="space-y-2 text-sm">
                <FeatureRow label="Estratega IA" enabled={plan.aiStrategistEnabled} />
                <FeatureRow label="Video Pipeline" enabled={plan.videoEnabled} />
                <FeatureRow label="Memoria de marca" enabled={plan.brandMemoryEnabled} />
                <FeatureRow label="Equipo" enabled={plan.teamEnabled} />
                <FeatureRow label="Scoring IA" enabled={plan.aiScoringEnabled} />
              </ul>

              {/* Level features */}
              <div className="space-y-1.5">
                {LEVEL_ROWS.map((row) => (
                  <div key={row.key} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {row.labels[plan[row.key]] ?? plan[row.key]}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id, plan.name)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: (isCurrent && isPaid) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                  color: (isCurrent && isPaid) ? 'var(--color-text-muted)' : 'white',
                  cursor: (isCurrent && isPaid) ? 'default' : 'pointer',
                  boxShadow: (isCurrent && isPaid) ? 'none' : `0 4px 16px ${colors.accent}25`,
                }}
                disabled={(isCurrent && isPaid) || loading === plan.name}
              >
                {loading === plan.name
                  ? '⏳ Redirigiendo a PayPal...'
                  : isCurrent && isPaid
                    ? '✓ Plan actual'
                    : isCurrent && isTrialing
                      ? `Activar ${plan.displayName} con PayPal`
                      : `Cambiar a ${plan.displayName}`
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Current Usage */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Tu uso actual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UsageBadge resource="publications" label="Publicaciones" />
          <UsageBadge resource="videos" label="Vídeos" />
          <UsageBadge resource="channels" label="Canales" />
          <UsageBadge resource="sources" label="Fuentes" />
          <UsageBadge resource="editors" label="Editores" />
          <UsageBadge resource="storageMb" label="Almacenamiento" />
          <UsageBadge resource="personas" label="Personas" />
          <UsageBadge resource="contentProfiles" label="Perfiles" />
          <UsageBadge resource="scheduleSlots" label="Slots" />
        </div>
      </div>

      {/* Full comparison table */}
      <div className="glass-card p-6 space-y-4 overflow-x-auto">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Comparación completa
        </h3>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4" style={{ color: 'var(--color-text-muted)' }}>Característica</th>
              {plans.map((p) => (
                <th key={p.id} className="text-center py-2 px-4" style={{ color: PLAN_COLORS[p.name]?.accent ?? '#a78bfa' }}>
                  {p.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Limits section */}
            <tr>
              <td colSpan={4} className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary-light)' }}>
                Límites
              </td>
            </tr>
            {LIMIT_ROWS.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td className="py-2 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</td>
                {plans.map((p) => (
                  <td key={p.id} className="text-center py-2 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                    {(p as any)[row.key] === -1 ? '∞' : (p as any)[row.key] === 0 ? '—' : (p as any)[row.key]}
                  </td>
                ))}
              </tr>
            ))}

            {/* Features section */}
            <tr>
              <td colSpan={4} className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary-light)' }}>
                Funciones
              </td>
            </tr>
            {FEATURE_ROWS.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td className="py-2 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</td>
                {plans.map((p) => (
                  <td key={p.id} className="text-center py-2 px-4">
                    {(p as any)[row.key] ? (
                      <span style={{ color: '#10b981' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Levels section */}
            <tr>
              <td colSpan={4} className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary-light)' }}>
                Niveles
              </td>
            </tr>
            {LEVEL_ROWS.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td className="py-2 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</td>
                {plans.map((p) => (
                  <td key={p.id} className="text-center py-2 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                    {row.labels[(p as any)[row.key]] ?? (p as any)[row.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LimitRow({ label, value, suffix = '', accent }: { label: string; value: number; suffix?: string; accent: string }) {
  return (
    <li className="flex items-center gap-2">
      <span style={{ color: accent }}>•</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}:</span>
      <span className="font-semibold ml-auto" style={{ color: 'var(--color-text)' }}>
        {value === -1 ? '∞' : value === 0 ? '—' : `${value}${suffix}`}
      </span>
    </li>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span>{enabled ? '✅' : '❌'}</span>
      <span style={{ color: enabled ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{label}</span>
    </li>
  );
}
