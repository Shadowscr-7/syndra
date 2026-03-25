'use client';

import { useState, useEffect } from 'react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

interface SubscriptionInfo {
  planName: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paypalSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  discountPercent: number;
}

interface BillingData {
  payments: Payment[];
  subscription: SubscriptionInfo | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activa', color: '#10b981' },
  TRIALING: { label: 'Período de prueba', color: '#f59e0b' },
  PAST_DUE: { label: 'Pago pendiente', color: '#ef4444' },
  CANCELED: { label: 'Cancelada', color: '#ef4444' },
  PAUSED: { label: 'Pausada', color: '#6b7280' },
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/paypal/billing', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Facturación</h1>
        </div>
        <div className="glass-card p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Cargando...
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const payments = data?.payments ?? [];
  const statusInfo = STATUS_LABELS[sub?.status ?? ''] ?? { label: sub?.status ?? 'Desconocido', color: '#6b7280' };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Facturación</h1>
        <p className="page-subtitle">
          Gestiona tu suscripción y consulta tu historial de pagos
        </p>
      </div>

      {/* Subscription Card */}
      {sub && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Suscripción actual
            </h2>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background: `${statusInfo.color}15`,
                color: statusInfo.color,
                border: `1px solid ${statusInfo.color}30`,
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Plan</p>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{sub.planName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Ciclo</p>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {sub.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Período actual</p>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {new Date(sub.currentPeriodStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                {' — '}
                {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {sub.discountPercent > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Descuento</p>
                <p className="font-semibold" style={{ color: '#10b981' }}>
                  {sub.discountPercent}% (referido)
                </p>
              </div>
            )}
          </div>

          {sub.cancelAtPeriodEnd && (
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
            >
              Tu suscripción se cancelará al final del período actual ({new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}).
            </div>
          )}

          {sub.paypalSubscriptionId && (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ID de suscripción PayPal: {sub.paypalSubscriptionId}
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Historial de pagos
        </h2>

        {payments.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-4xl mb-2">📋</p>
            <p>Aún no hay pagos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left py-3 pr-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Descripción</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Método</th>
                  <th className="text-right py-3 pl-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(p.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--color-text)' }}>
                      {p.description || 'Pago'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}
                      >
                        {p.method === 'paypal' ? 'PayPal' : p.method}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold" style={{ color: '#10b981' }}>
                      ${(p.amount / 100).toFixed(2)} {p.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
