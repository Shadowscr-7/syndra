'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { generateLicenseKeys } from '@/lib/actions';

// ── Types ────────────────────────────────────────────

interface DashboardData {
  users: {
    total: number;
    admins: number;
    collaborators: number;
    regular: number;
    blocked: number;
    newThisMonth: number;
    newPrevMonth: number;
    growthPercent: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    prevMonth: number;
    growthPercent: number;
    totalPayments: number;
  };
  subscriptions: {
    active: number;
    conversionRate: number;
    planDistribution: { planName: string; planSlug: string; count: number }[];
  };
  content: {
    totalRuns: number;
    runsThisMonth: number;
    runsByStatus: Record<string, number>;
    totalPublications: number;
    publicationsThisMonth: number;
  };
  commissions: {
    totalReferrals: number;
    pendingAmount: number;
    paidAmount: number;
  };
  licenses: {
    total: number;
    activated: number;
    available: number;
  };
  workspaces: {
    total: number;
  };
  recentPayments: { id: string; amount: number; currency: string; method: string; reference?: string; description?: string; createdAt: string }[];
  recentAudit: { id: string; action: string; category: string; performer?: { name: string; email: string }; targetType?: string; targetId?: string; createdAt: string }[];
}

// ── Page ─────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard/enhanced');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al cargar dashboard');
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-float mb-4">📊</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p style={{ color: 'var(--color-danger)' }}>{error || 'Error desconocido'}</p>
        <button onClick={() => { setLoading(true); setError(''); fetchDashboard(); }} className="btn-primary mt-4">
          Reintentar
        </button>
      </div>
    );
  }

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="page-title">🛡️ Panel de Administración</h1>
          <p className="page-subtitle">Métricas globales, licencias y actividad</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/users" className="btn-ghost text-sm">🧑‍💼 Usuarios</Link>
          <Link href="/dashboard/admin/commissions" className="btn-ghost text-sm">💰 Comisiones</Link>
          <Link href="/dashboard/admin/audit" className="btn-ghost text-sm">📋 Auditoría</Link>
        </div>
      </div>

      {/* ── Main KPI Row ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        <KpiCard icon="👥" label="Usuarios totales" value={data.users.total}
          sub={`+${data.users.newThisMonth} este mes`}
          trend={data.users.growthPercent} gradient="stat-gradient-purple" />
        <KpiCard icon="💰" label="Revenue total" value={fmt(data.revenue.total)}
          sub={`${fmt(data.revenue.thisMonth)} este mes`}
          trend={data.revenue.growthPercent} gradient="stat-gradient-green" />
        <KpiCard icon="📊" label="Suscripciones activas" value={data.subscriptions.active}
          sub={`${data.subscriptions.conversionRate}% conversión`}
          gradient="stat-gradient-cyan" />
        <KpiCard icon="🏢" label="Workspaces" value={data.workspaces.total}
          gradient="stat-gradient-amber" />
      </div>

      {/* ── Second row: Content + Commissions + Licenses ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in-delay-1">
        <MiniStat icon="🚀" label="Runs editoriales" value={data.content.totalRuns} sub={`${data.content.runsThisMonth} este mes`} />
        <MiniStat icon="📤" label="Publicaciones" value={data.content.totalPublications} sub={`${data.content.publicationsThisMonth} este mes`} />
        <MiniStat icon="🤝" label="Referidos" value={data.commissions.totalReferrals} />
        <MiniStat icon="⏳" label="Comisiones pend." value={fmt(data.commissions.pendingAmount)} />
        <MiniStat icon="🔑" label="Keys disponibles" value={data.licenses.available} />
        <MiniStat icon="🎯" label="Keys activadas" value={data.licenses.activated} />
      </div>

      {/* ── Row 3: Plan Distribution + User breakdown + Runs status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-delay-2">
        {/* Plan distribution */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">📋 Distribución por plan</h3>
          {data.subscriptions.planDistribution.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin suscripciones activas</p>
          ) : (
            <div className="space-y-3">
              {data.subscriptions.planDistribution.map((pd) => {
                const total = data.subscriptions.active || 1;
                const pct = Math.round((pd.count / total) * 100);
                return (
                  <div key={pd.planSlug}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{pd.planName}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pd.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User breakdown */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">👥 Usuarios por rol</h3>
          <div className="space-y-3">
            <RoleRow label="Usuarios" count={data.users.regular} total={data.users.total} color="#7c3aed" />
            <RoleRow label="Colaboradores" count={data.users.collaborators} total={data.users.total} color="#06b6d4" />
            <RoleRow label="Admins" count={data.users.admins} total={data.users.total} color="#f59e0b" />
            <RoleRow label="Bloqueados" count={data.users.blocked} total={data.users.total} color="#ef4444" />
          </div>
        </div>

        {/* Editorial Runs by status */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">🚀 Runs por estado</h3>
          {Object.keys(data.content.runsByStatus).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin runs aún</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.content.runsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="chip">{status}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── License Key Generator ──────────────────── */}
      <div className="glass-card p-6 space-y-4 animate-fade-in-delay-2">
        <h2 className="section-title">🔑 Generar License Keys</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Genera keys para vender por Gumroad, PayPal, transferencia o cualquier otro medio.
        </p>
        <GenerateKeysForm />
      </div>

      {/* ── Recent Payments ───────────────────────────── */}
      <div className="animate-fade-in-delay-3">
        <h2 className="section-title mb-4">💳 Pagos recientes</h2>
        <div className="glass-card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(p.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="font-bold" style={{ color: '#22c55e' }}>{fmt(p.amount)} {p.currency}</td>
                  <td><span className="chip">{p.method}</span></td>
                  <td className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.reference || '—'}</td>
                  <td className="text-xs">{p.description || '—'}</td>
                </tr>
              ))}
              {data.recentPayments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8"><span className="text-2xl animate-float inline-block">💳</span><p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay pagos</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Audit Trail ─────────────────────────── */}
      <div className="animate-fade-in-delay-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">📋 Actividad reciente</h2>
          <Link href="/dashboard/admin/audit" className="btn-ghost text-xs">Ver todo →</Link>
        </div>
        <div className="glass-card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Categoría</th>
                <th>Realizado por</th>
                <th>Objetivo</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAudit.map((a) => (
                <tr key={a.id}>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(a.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{a.action}</td>
                  <td><CategoryBadge category={a.category} /></td>
                  <td className="text-xs">{a.performer?.name || a.performer?.email || '—'}</td>
                  <td className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{a.targetType ? `${a.targetType}:${a.targetId?.slice(0, 8)}…` : '—'}</td>
                </tr>
              ))}
              {data.recentAudit.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8"><span className="text-2xl animate-float inline-block">📋</span><p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin actividad registrada</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function KpiCard({ icon, label, value, sub, trend, gradient }: {
  icon: string; label: string; value: string | number; sub?: string; trend?: number; gradient?: string;
}) {
  return (
    <div className={`glass-card p-5 ${gradient || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl animate-float">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>{value}</div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</span>}
          {trend !== undefined && trend !== 0 && (
            <span className="text-xs font-bold" style={{ color: trend > 0 ? '#22c55e' : '#ef4444' }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>{value}</div>
      {sub && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</span>}
    </div>
  );
}

function RoleRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm" style={{ color: 'var(--color-text)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{count} <span style={{ color: 'var(--color-text-muted)' }}>({pct}%)</span></span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { text: string; bg: string; color: string }> = {
    USER_MGMT: { text: 'Usuarios', bg: 'rgba(124,58,237,0.1)', color: '#a78bfa' },
    COMMISSION: { text: 'Comisiones', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    SUBSCRIPTION: { text: 'Suscripción', bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
    LICENSE: { text: 'Licencias', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    SYSTEM: { text: 'Sistema', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' },
  };
  const info = map[category] || { text: category, bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  return (
    <span className="badge" style={{ backgroundColor: info.bg, color: info.color }}>{info.text}</span>
  );
}

function GenerateKeysForm() {
  return (
    <form action={generateLicenseKeys} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="input-label">Plan</label>
        <select name="planName" className="input-field">
          <option value="PRO">Profesional ($29/mes)</option>
          <option value="ENTERPRISE">Empresa ($99/mes)</option>
        </select>
      </div>
      <div>
        <label className="input-label">Cantidad</label>
        <input type="number" name="count" defaultValue={5} min={1} max={100} className="input-field" />
      </div>
      <div>
        <label className="input-label">Duración (días)</label>
        <select name="durationDays" className="input-field">
          <option value="30">30 días (mensual)</option>
          <option value="90">90 días (trimestral)</option>
          <option value="365">365 días (anual)</option>
        </select>
      </div>
      <div>
        <label className="input-label">Nombre del batch</label>
        <input type="text" name="batchName" placeholder="Gumroad Marzo 2026" className="input-field" />
      </div>
      <div>
        <label className="input-label">Email comprador (opcional)</label>
        <input type="email" name="buyerEmail" placeholder="comprador@email.com" className="input-field" />
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full">🔑 Generar Keys</button>
      </div>
    </form>
  );
}
