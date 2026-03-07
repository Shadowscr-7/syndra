import { prisma } from '@automatismos/db';
import { generateLicenseKeys } from '@/lib/actions';

export const dynamic = 'force-dynamic';

const STAT_GRADIENTS = ['stat-gradient-purple', 'stat-gradient-green', 'stat-gradient-amber', 'stat-gradient-cyan', 'stat-gradient-pink', 'stat-gradient-blue'];

export default async function AdminPage() {
  const [
    totalWorkspaces,
    activeSubs,
    totalPayments,
    revenueSum,
    availableKeys,
    activatedKeys,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.paymentLog.count(),
    prisma.paymentLog.aggregate({ _sum: { amount: true } }),
    prisma.licenseKey.count({ where: { status: 'AVAILABLE' } }),
    prisma.licenseKey.count({ where: { status: 'ACTIVATED' } }),
  ]);

  const revenue = revenueSum._sum.amount || 0;

  const recentPayments = await prisma.paymentLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  const workspaces = await prisma.workspace.findMany({
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true, editorialRuns: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const licenseKeys = await prisma.licenseKey.findMany({
    include: { plan: { select: { name: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const stats = [
    { label: 'Workspaces', value: totalWorkspaces, icon: '🏢' },
    { label: 'Suscripciones activas', value: activeSubs, icon: '✅' },
    { label: 'Revenue total', value: `$${(revenue / 100).toFixed(2)}`, icon: '💰' },
    { label: 'Pagos registrados', value: totalPayments, icon: '🧾' },
    { label: 'Keys disponibles', value: availableKeys, icon: '🔑' },
    { label: 'Keys activadas', value: activatedKeys, icon: '🎯' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🛡️ Admin Panel</h1>
        <p className="page-subtitle">Gestión de suscripciones, licencias y revenue</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in-delay-1">
        {stats.map((s, i) => (
          <div key={s.label} className={`glass-card p-4 ${STAT_GRADIENTS[i]}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg animate-float">{s.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
            </div>
            <div className="text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Generate License Keys Form */}
      <div className="glass-card p-6 space-y-4 animate-fade-in-delay-1">
        <h2 className="section-title">🔑 Generar License Keys</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Genera keys para vender por Gumroad, PayPal, transferencia o cualquier otro medio.
          El comprador las canjea en la página de activación.
        </p>
        <GenerateKeysForm />
      </div>

      {/* License Keys Table */}
      <div className="animate-fade-in-delay-2">
        <h2 className="section-title mb-4">🗝️ License Keys ({licenseKeys.length})</h2>
        <div className="glass-card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Plan</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Batch</th>
                <th>Comprador</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              {licenseKeys.map((lk) => (
                <tr key={lk.id}>
                  <td className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{lk.key}</td>
                  <td>{lk.plan.displayName}</td>
                  <td>{lk.durationDays}d</td>
                  <td><KeyStatusBadge status={lk.status} /></td>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lk.batchName || '—'}</td>
                  <td className="text-xs">{lk.buyerEmail || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lk.createdAt.toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
              {licenseKeys.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <span className="text-2xl animate-float inline-block">🔑</span>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay license keys aún. Genera algunas arriba.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workspaces Table */}
      <div className="animate-fade-in-delay-2">
        <h2 className="section-title mb-4">🏢 Workspaces ({workspaces.length})</h2>
        <div className="glass-card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Vence</th>
                <th>Miembros</th>
                <th>Runs</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td className="font-medium" style={{ color: 'var(--color-text)' }}>{ws.name}</td>
                  <td>{ws.subscription?.plan?.displayName || <span className="chip">Sin plan</span>}</td>
                  <td><SubStatusBadge status={ws.subscription?.status} /></td>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ws.subscription?.currentPeriodEnd ? ws.subscription.currentPeriodEnd.toLocaleDateString('es-ES') : '—'}</td>
                  <td>{ws._count.users}</td>
                  <td>{ws._count.editorialRuns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="animate-fade-in-delay-3">
        <h2 className="section-title mb-4">💳 Pagos recientes ({recentPayments.length})</h2>
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
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.createdAt.toLocaleDateString('es-ES')}</td>
                  <td className="font-bold" style={{ color: '#22c55e' }}>${(p.amount / 100).toFixed(2)} {p.currency}</td>
                  <td><span className="chip">{p.method}</span></td>
                  <td className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.reference || '—'}</td>
                  <td className="text-xs">{p.description || '—'}</td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <span className="text-2xl animate-float inline-block">💳</span>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay pagos registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────

function KeyStatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; dot: string; bg: string; color: string }> = {
    AVAILABLE: { text: 'Disponible', dot: '#22c55e', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    ACTIVATED: { text: 'Activada', dot: '#7c3aed', bg: 'rgba(124,58,237,0.1)', color: '#a78bfa' },
    EXPIRED: { text: 'Expirada', dot: '#64748b', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' },
    REVOKED: { text: 'Revocada', dot: '#ef4444', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  };
  const info = map[status] || { text: status, dot: '#64748b', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  return (
    <span className="badge" style={{ backgroundColor: info.bg, color: info.color }}>
      <span className="badge-dot" style={{ backgroundColor: info.dot }} />
      {info.text}
    </span>
  );
}

function SubStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="chip">Sin plan</span>;
  const map: Record<string, { text: string; dot: string; bg: string; color: string }> = {
    ACTIVE: { text: 'Activa', dot: '#22c55e', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    TRIALING: { text: 'Trial', dot: '#06b6d4', bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
    PAST_DUE: { text: 'Vencida', dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    CANCELED: { text: 'Cancelada', dot: '#ef4444', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    PAUSED: { text: 'Pausada', dot: '#64748b', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' },
  };
  const info = map[status] || { text: status, dot: '#64748b', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  return (
    <span className="badge" style={{ backgroundColor: info.bg, color: info.color }}>
      <span className="badge-dot" style={{ backgroundColor: info.dot }} />
      {info.text}
    </span>
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
