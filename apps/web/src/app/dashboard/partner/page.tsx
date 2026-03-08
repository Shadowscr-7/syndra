'use client';

import { useEffect, useState } from 'react';

interface PartnerData {
  user: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
    memberSince: string;
  };
  stats: {
    totalReferrals: number;
    pendingCount: number;
    approvedCount: number;
    paidCount: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    totalRevenue: number;
    totalPayoutsPaid: number;
    commissionPercent: number;
  };
  referrals: {
    id: string;
    referredUser: { id: string; name: string; email: string; createdAt: string };
    planName: string | null;
    amountPaid: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }[];
  payouts: {
    id: string;
    invoiceNumber: string | null;
    totalAmount: number;
    referralCount: number;
    status: string;
    method: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  APPROVED: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  PAID: { bg: 'rgba(124,58,237,0.12)', text: '#7c3aed' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  DRAFT: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
  CONFIRMED: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4' },
  VOIDED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

export default function PartnerPage() {
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => {
        if (r.status === 403) throw new Error('Solo disponible para colaboradores');
        return r.json();
      })
      .then((json) => setData(json.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    if (data?.user.referralCode) {
      navigator.clipboard.writeText(data.user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  if (!data) return null;

  const { user, stats, referrals, payouts } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🤝 Panel de Afiliado</h1>
        <p className="page-subtitle">
          Tu centro de control como colaborador. Monitorea referidos, comisiones y pagos.
        </p>
      </div>

      {/* Referral Code */}
      <div className="glass-card p-5 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Tu código de referido</p>
            <div className="flex items-center gap-3">
              <span
                className="text-2xl font-black tracking-wider px-4 py-2 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))',
                  color: '#a78bfa',
                  border: '1px solid rgba(124,58,237,0.2)',
                  fontFamily: 'monospace',
                }}
              >
                {user.referralCode || '---'}
              </span>
              <button
                onClick={copyCode}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                {copied ? '✅ Copiado' : '📋 Copiar'}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Comisión</p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.commissionPercent}%</p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        <KpiCard label="Referidos totales" value={String(stats.totalReferrals)} icon="👥" />
        <KpiCard label="Pendientes" value={String(stats.pendingCount)} icon="⏳" subtext={fmt(stats.pendingAmount)} />
        <KpiCard label="Aprobadas" value={String(stats.approvedCount)} icon="✅" subtext={fmt(stats.approvedAmount)} />
        <KpiCard label="Total cobrado" value={fmt(stats.totalPayoutsPaid)} icon="💰" />
      </div>

      {/* Referrals Table */}
      <div className="glass-card p-6 animate-fade-in-delay-2">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          📊 Mis Referidos
        </h2>
        {referrals.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Aún no tienes referidos. Comparte tu código <strong>{user.referralCode}</strong> para empezar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Usuario</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Plan</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Pago</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Comisión</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS['PENDING'];
                  return (
                    <tr key={r.id} className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>
                          {r.referredUser.name || r.referredUser.email}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {r.planName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs" style={{ color: 'var(--color-text)' }}>
                        {fmt(r.amountPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold" style={{ color: '#10b981' }}>
                        {fmt(r.commissionAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('es')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payouts Table */}
      {payouts.length > 0 && (
        <div className="glass-card p-6 animate-fade-in-delay-3">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            💳 Historial de Pagos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Factura</th>
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
                      <td className="py-2.5 px-3 text-xs font-mono" style={{ color: 'var(--color-text)' }}>
                        {p.invoiceNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {fmt(p.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.referralCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.method || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('es')
                          : new Date(p.createdAt).toLocaleDateString('es')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, subtext }: { label: string; value: string; icon: string; subtext?: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
      {subtext && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtext}</p>
      )}
    </div>
  );
}
