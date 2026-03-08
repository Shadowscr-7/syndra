'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ============================================================
// Partner Payouts Page (Feature #10)
// ============================================================

interface Payout {
  id: string;
  invoiceNumber: string | null;
  totalAmount: number;
  referralCount: number;
  status: string;
  method: string | null;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
  PENDING: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  CONFIRMED: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4' },
  PAID: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  VOIDED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

export default function PartnerPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => {
        if (r.status === 403) throw new Error('Solo disponible para colaboradores');
        return r.json();
      })
      .then((json) => setPayouts(json.data?.payouts ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm" style={{ color: '#ef4444' }}>❌ {error}</p>
      </div>
    );
  }

  const totalPaid = payouts.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPending = payouts.filter((p) => ['DRAFT', 'PENDING', 'CONFIRMED'].includes(p.status)).reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">💳 Historial de Pagos</h1>
            <p className="page-subtitle">Detalle completo de todos tus pagos como partner.</p>
          </div>
          <Link href="/dashboard/partner" className="btn-ghost text-sm">← Volver al panel</Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-4">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>💰 Total Cobrado</div>
          <div className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{fmt(totalPaid)}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>⏳ Pendiente</div>
          <div className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{fmt(totalPending)}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>📄 Total Payouts</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{payouts.length}</div>
        </div>
      </div>

      {/* Payout Policy */}
      <div className="glass-card p-5 animate-fade-in-delay-1" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(6,182,212,0.04))' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>📋 Política de Pagos</h3>
        <ul className="text-xs space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <li>• Los pagos se procesan <strong>mensualmente</strong>, el día 15 de cada mes.</li>
          <li>• Monto mínimo de payout: <strong>$50.00 USD</strong>.</li>
          <li>• Métodos disponibles: <strong>PayPal, transferencia bancaria</strong>.</li>
          <li>• Las comisiones se confirman tras <strong>30 días de refund window</strong>.</li>
          <li>• Referidos cancelados dentro de 30 días no generan comisión.</li>
        </ul>
      </div>

      {/* Payouts Table */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-2">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}>
          <h2 className="font-bold text-sm" style={{ color: '#a78bfa' }}>📋 Detalle de Pagos</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center">
            <span className="text-4xl animate-float inline-block mb-3">💳</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tienes pagos registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <th className="text-left py-2 px-4 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Factura</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Monto</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Referidos</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Método</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS['DRAFT'];
                  return (
                    <tr key={p.id} className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <td className="py-2.5 px-4 text-xs font-mono" style={{ color: 'var(--color-text)' }}>
                        {p.invoiceNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {fmt(p.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.referralCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.method || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('es') : new Date(p.createdAt).toLocaleDateString('es')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
