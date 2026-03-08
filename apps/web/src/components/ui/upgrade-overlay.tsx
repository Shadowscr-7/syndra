'use client';

import { useState } from 'react';

interface UpgradeOverlayProps {
  /** Whether the overlay is visible */
  show: boolean;
  /** Called when user dismisses the overlay */
  onClose: () => void;
  /** The feature name that triggered the overlay */
  feature?: string;
  /** Custom message to show */
  message?: string;
  /** Current plan name */
  currentPlan?: string;
}

const PLANS = [
  {
    name: 'PRO',
    displayName: 'Profesional',
    price: '$29/mes',
    features: [
      '300 publicaciones/mes',
      '50 vídeos/mes',
      '10 canales conectados',
      'Analíticas avanzadas',
      'Branding personalizado',
      '1 persona de contenido',
      '7 slots de programación',
      '1 GB almacenamiento',
    ],
    recommended: true,
  },
  {
    name: 'ENTERPRISE',
    displayName: 'Empresa',
    price: '$99/mes',
    features: [
      'Publicaciones ilimitadas',
      'Vídeos ilimitados',
      'Canales ilimitados',
      'Analíticas avanzadas',
      'Branding personalizado',
      'Personas ilimitadas',
      'Slots ilimitados',
      '10 GB almacenamiento',
      'Soporte prioritario',
    ],
    recommended: false,
  },
];

export default function UpgradeOverlay({
  show,
  onClose,
  feature,
  message,
  currentPlan,
}: UpgradeOverlayProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!show) return null;

  const handleUpgrade = async (planName: string) => {
    setLoading(planName);
    try {
      // First check if PayPal is configured
      const statusRes = await fetch('/api/paypal/status');
      const status = await statusRes.json();

      if (!status.configured) {
        // PayPal not configured — show contact message
        alert('El sistema de pagos no está configurado. Contacta al administrador.');
        setLoading(null);
        return;
      }

      const res = await fetch('/api/paypal/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planName === 'PRO' ? 'plan_pro' : 'plan_enterprise',
          billingCycle: 'MONTHLY',
        }),
      });

      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        alert(data.error || 'Error al procesar el pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="glass-card p-8 max-w-2xl w-full relative animate-fade-in"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🚀</div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Actualiza tu plan
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {message ||
              (feature
                ? `La función "${feature}" requiere un plan superior.`
                : 'Has alcanzado el límite de tu plan actual.')}
          </p>
          {currentPlan && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Plan actual: <span className="font-semibold">{currentPlan}</span>
            </p>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLANS.filter((p) => {
            // Only show plans higher than current
            if (!currentPlan) return true;
            if (currentPlan === 'ENTERPRISE') return false;
            if (currentPlan === 'PRO') return p.name === 'ENTERPRISE';
            return true;
          }).map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 relative"
              style={{
                background: plan.recommended
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))'
                  : 'var(--color-bg-secondary)',
                border: plan.recommended
                  ? '2px solid rgba(124,58,237,0.5)'
                  : '1px solid var(--color-border)',
              }}
            >
              {plan.recommended && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    color: 'white',
                  }}
                >
                  Recomendado
                </div>
              )}

              <div className="text-center mb-4">
                <h3
                  className="text-lg font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {plan.displayName}
                </h3>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ color: '#7c3aed' }}
                >
                  {plan.price}
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span style={{ color: '#22c55e' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={!!loading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.recommended ? 'btn-primary' : 'btn-ghost'
                } disabled:opacity-50`}
              >
                {loading === plan.name ? 'Procesando...' : 'Seleccionar plan'}
              </button>
            </div>
          ))}
        </div>

        <p
          className="text-xs text-center mt-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Puedes cancelar en cualquier momento. Sin compromisos.
        </p>
      </div>
    </div>
  );
}
