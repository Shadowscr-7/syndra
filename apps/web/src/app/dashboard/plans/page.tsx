import { prisma } from '@automatismos/db';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  });

  // Try to get current workspace subscription (first workspace)
  const workspace = await prisma.workspace.findFirst({
    include: { subscription: { include: { plan: true } } },
  });

  const currentPlan = workspace?.subscription?.plan?.name || 'FREE';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Planes y Suscripción
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Elige el plan que mejor se adapte a tu negocio
        </p>
      </div>

      {/* Current Plan Badge */}
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-primary)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Tu plan actual
        </p>
        <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          {currentPlan}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          return (
            <div
              key={plan.id}
              className="rounded-xl border p-6 space-y-4"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: isCurrent
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
                borderWidth: isCurrent ? 2 : 1,
              }}
            >
              {/* Header */}
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {plan.displayName}
                </h2>
                {plan.description && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <span
                  className="text-3xl font-bold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {plan.monthlyPrice === 0
                    ? 'Gratis'
                    : `$${plan.monthlyPrice}`}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span
                    className="text-sm ml-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    /mes
                  </span>
                )}
                {plan.yearlyPrice > 0 && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ${plan.yearlyPrice}/año (ahorra{' '}
                    {Math.round(
                      (1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100,
                    )}
                    %)
                  </p>
                )}
              </div>

              {/* Limits */}
              <ul className="space-y-2 text-sm">
                <LimitItem
                  label="Publicaciones/mes"
                  value={plan.maxPublications}
                />
                <LimitItem label="Videos/mes" value={plan.maxVideos} />
                <LimitItem label="Fuentes de investigación" value={plan.maxSources} />
                <LimitItem label="Canales" value={plan.maxChannels} />
                <LimitItem label="Editores" value={plan.maxEditors} />
              </ul>

              {/* Features */}
              <ul className="space-y-2 text-sm">
                <FeatureItem
                  label="Analytics avanzado"
                  enabled={plan.analyticsEnabled}
                />
                <FeatureItem
                  label="AI Scoring"
                  enabled={plan.aiScoringEnabled}
                />
                <FeatureItem
                  label="Soporte prioritario"
                  enabled={plan.prioritySupport}
                />
                <FeatureItem
                  label="Branding personalizado"
                  enabled={plan.customBranding}
                />
              </ul>

              {/* Button */}
              <button
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isCurrent
                    ? 'var(--color-bg-tertiary)'
                    : 'var(--color-primary)',
                  color: isCurrent
                    ? 'var(--color-text-muted)'
                    : 'white',
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plan actual' : 'Seleccionar plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LimitItem({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}>
      <span>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
        {value === -1 ? '∞' : value}
      </span>
    </li>
  );
}

function FeatureItem({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <li
      className="flex items-center gap-2"
      style={{ color: enabled ? 'var(--color-text)' : 'var(--color-text-muted)' }}
    >
      <span>{enabled ? '✅' : '❌'}</span>
      <span>{label}</span>
    </li>
  );
}
