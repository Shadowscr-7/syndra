'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────
interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  paidReferrals: number;
  cancelledReferrals: number;
  totalCommissionPending: number;
  totalCommissionApproved: number;
  totalCommissionPaid: number;
  totalCollaborators: number;
  totalPayouts: number;
  firstPurchaseCount: number;
  recurringCount: number;
  recurringPendingAmount: number;
  recurringApprovedAmount: number;
  recurringPaidAmount: number;
  recurringThreshold: number;
}

interface CollaboratorStats {
  totalReferrals: number;
  activeReferredUsers: number;
  recurringEligible: boolean;
  recurringThreshold: number;
  recurringEntriesCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalRevenue: number;
}

interface PayoutSummary {
  id: string;
  status: string;
  totalAmount: number;
  paidAt: string | null;
}

interface Collaborator {
  id: string;
  email: string;
  name: string | null;
  referralCode: string | null;
  isBlocked: boolean;
  createdAt: string;
  stats: CollaboratorStats;
  payouts: PayoutSummary[];
}

interface ReferralDetail {
  id: string;
  referralCode: string;
  planName: string | null;
  amountPaid: number;
  commissionPercent: number;
  commissionAmount: number;
  commissionType: 'FIRST_PURCHASE' | 'RECURRING';
  periodStart: string | null;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  referredUser: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    workspaces: Array<{
      workspace: {
        subscription?: {
          status: string;
          plan: { displayName: string };
        } | null;
      };
    }>;
  };
  payout: {
    id: string;
    invoiceNumber: string | null;
    status: string;
    paidAt: string | null;
  } | null;
}

interface Payout {
  id: string;
  collaboratorId: string;
  totalAmount: number;
  currency: string;
  referralCount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
  collaborator: { id: string; name: string | null; email: string; referralCode: string | null };
  _count: { referrals: number };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendiente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  APPROVED:  { label: 'Aprobado',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  PAID:      { label: 'Pagado',     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  CANCELLED: { label: 'Cancelado',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  DRAFT:     { label: 'Borrador',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  CONFIRMED: { label: 'Confirmado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  VOIDED:    { label: 'Anulado',    color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

function cents(amount: number) {
  return `$${(amount / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Error');
  return data;
}

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function CommissionsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [activeTab, setActiveTab] = useState<'collaborators' | 'payouts'>('collaborators');
  const [expandedCollab, setExpandedCollab] = useState<string | null>(null);
  const [collabDetail, setCollabDetail] = useState<{ collaborator: any; referrals: ReferralDetail[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [payModal, setPayModal] = useState<Payout | null>(null);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, p] = await Promise.all([
        apiFetch('/api/admin/commissions/stats'),
        apiFetch('/api/admin/commissions/collaborators'),
        apiFetch('/api/admin/commissions/payouts'),
      ]);
      setStats(s.data);
      setCollaborators(c.data || []);
      setPayouts(p.data || []);
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadCollabDetail = async (id: string) => {
    if (expandedCollab === id) {
      setExpandedCollab(null);
      setCollabDetail(null);
      setSelectedRefs(new Set());
      return;
    }
    setExpandedCollab(id);
    setDetailLoading(true);
    setSelectedRefs(new Set());
    try {
      const data = await apiFetch(`/api/admin/commissions/collaborators/${id}`);
      setCollabDetail(data.data);
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (selectedRefs.size === 0) return;
    try {
      await apiFetch('/api/admin/commissions/referrals/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralIds: Array.from(selectedRefs) }),
      });
      notify(`${selectedRefs.size} referido(s) aprobado(s)`);
      setSelectedRefs(new Set());
      if (expandedCollab) await loadCollabDetail(expandedCollab).then(() => setExpandedCollab(expandedCollab));
      fetchAll();
      // reload detail
      if (expandedCollab) {
        const data = await apiFetch(`/api/admin/commissions/collaborators/${expandedCollab}`);
        setCollabDetail(data.data);
      }
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const handleCancel = async () => {
    if (selectedRefs.size === 0) return;
    try {
      await apiFetch('/api/admin/commissions/referrals/cancel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralIds: Array.from(selectedRefs) }),
      });
      notify(`${selectedRefs.size} referido(s) cancelado(s)`);
      setSelectedRefs(new Set());
      fetchAll();
      if (expandedCollab) {
        const data = await apiFetch(`/api/admin/commissions/collaborators/${expandedCollab}`);
        setCollabDetail(data.data);
      }
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const handleGeneratePayout = async (collaboratorId: string) => {
    try {
      const data = await apiFetch('/api/admin/commissions/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId }),
      });
      notify(`Factura ${data.data.invoiceNumber} generada por ${cents(data.data.totalAmount)}`);
      fetchAll();
      if (expandedCollab) {
        const detail = await apiFetch(`/api/admin/commissions/collaborators/${expandedCollab}`);
        setCollabDetail(detail.data);
      }
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const handlePayPayout = async (payoutId: string, method: string, reference: string) => {
    try {
      await apiFetch(`/api/admin/commissions/payouts/${payoutId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, reference }),
      });
      notify('Payout marcado como pagado');
      setPayModal(null);
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const handleVoidPayout = async (payoutId: string) => {
    if (!confirm('¿Seguro que quieres anular este payout? Los referidos volverán a estado Aprobado.')) return;
    try {
      await apiFetch(`/api/admin/commissions/payouts/${payoutId}/void`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      notify('Payout anulado');
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const handleGenerateRecurring = async () => {
    if (!confirm('¿Generar comisiones recurrentes del mes actual para colaboradores con 20+ referidos activos?')) return;
    setGeneratingRecurring(true);
    try {
      const res = await apiFetch('/api/admin/commissions/generate-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = res.data;
      if (d.totalEntriesCreated === 0) {
        notify('No hay comisiones recurrentes nuevas para generar este mes', 'ok');
      } else {
        notify(`🔄 ${d.totalEntriesCreated} comisiones recurrentes generadas (${cents(d.totalCommissionAmount)}) — Período: ${d.period}`);
      }
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setGeneratingRecurring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando comisiones...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl animate-fade-in backdrop-blur-xl"
          style={{
            background: toast.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: toast.type === 'ok' ? '#34d399' : '#f87171',
            border: `1px solid ${toast.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {toast.type === 'ok' ? '✓' : '✕'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-in">
        <div className="page-header flex items-start justify-between" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">Comisiones de Colaboradores</h1>
            <p className="page-subtitle">Gestión de referidos, comisiones y pagos a colaboradores</p>
          </div>
          <button
            onClick={handleGenerateRecurring}
            disabled={generatingRecurring}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {generatingRecurring ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Generando...
              </>
            ) : (
              <>🔄 Generar Recurrentes</>
            )}
          </button>
        </div>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-delay-1">
          {[
            { label: 'Colaboradores', val: stats.totalCollaborators, icon: '🤝', grad: 'stat-gradient-purple' },
            { label: 'Referidos', val: stats.totalReferrals, icon: '👥', grad: 'stat-gradient-cyan', sub: `${stats.firstPurchaseCount} compra · ${stats.recurringCount} recurrentes` },
            { label: 'Pendiente', val: cents(stats.totalCommissionPending), icon: '⏳', grad: 'stat-gradient-amber', sub: `${stats.pendingReferrals} ref.` },
            { label: 'Por pagar', val: cents(stats.totalCommissionApproved), icon: '📋', grad: 'stat-gradient-pink', sub: `${stats.approvedReferrals} ref.` },
            { label: 'Pagado', val: cents(stats.totalCommissionPaid), icon: '✅', grad: 'stat-gradient-purple', sub: `${stats.paidReferrals} ref.` },
          ].map((s) => (
            <div key={s.label} className={`glass-card p-3 flex items-center gap-3 ${s.grad}`} style={{ transform: 'none' }}>
              <span className="text-xl">{s.icon}</span>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                <div className="text-lg font-extrabold truncate" style={{ color: 'var(--color-text)' }}>{s.val}</div>
                {s.sub && <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl overflow-hidden border animate-fade-in-delay-1" style={{ borderColor: 'var(--color-border)', width: 'fit-content' }}>
        {[
          { label: '🤝 Colaboradores', val: 'collaborators' as const },
          { label: '📄 Historial de Pagos', val: 'payouts' as const },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setActiveTab(tab.val)}
            className="px-4 py-2.5 text-xs font-medium transition-all"
            style={{
              background: activeTab === tab.val ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: activeTab === tab.val ? '#a78bfa' : 'var(--color-text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'collaborators' ? (
        <div className="space-y-2 animate-fade-in-delay-2">
          {collaborators.length === 0 ? (
            <div className="glass-card p-12 text-center" style={{ transform: 'none' }}>
              <div className="text-3xl mb-3">🤝</div>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No hay colaboradores aún</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Crea uno desde la sección de Usuarios
              </p>
            </div>
          ) : (
            collaborators.map((collab) => (
              <CollaboratorCard
                key={collab.id}
                collab={collab}
                isExpanded={expandedCollab === collab.id}
                onToggle={() => loadCollabDetail(collab.id)}
                detailLoading={detailLoading && expandedCollab === collab.id}
                detail={expandedCollab === collab.id ? collabDetail : null}
                selectedRefs={selectedRefs}
                onSelectRef={(id) => {
                  const next = new Set(selectedRefs);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  setSelectedRefs(next);
                }}
                onSelectAll={(ids) => {
                  const allSelected = ids.every((id) => selectedRefs.has(id));
                  if (allSelected) setSelectedRefs(new Set());
                  else setSelectedRefs(new Set(ids));
                }}
                onApprove={handleApprove}
                onCancel={handleCancel}
                onGeneratePayout={() => handleGeneratePayout(collab.id)}
              />
            ))
          )}
        </div>
      ) : (
        <PayoutsTab
          payouts={payouts}
          onPay={(p) => setPayModal(p)}
          onVoid={handleVoidPayout}
        />
      )}

      {/* Pay Modal */}
      {payModal && (
        <PayPayoutModal
          payout={payModal}
          onClose={() => setPayModal(null)}
          onPay={handlePayPayout}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Collaborator Card (expandable)
// ═══════════════════════════════════════════════════
function CollaboratorCard({
  collab,
  isExpanded,
  onToggle,
  detailLoading,
  detail,
  selectedRefs,
  onSelectRef,
  onSelectAll,
  onApprove,
  onCancel,
  onGeneratePayout,
}: {
  collab: Collaborator;
  isExpanded: boolean;
  onToggle: () => void;
  detailLoading: boolean;
  detail: { collaborator: any; referrals: ReferralDetail[] } | null;
  selectedRefs: Set<string>;
  onSelectRef: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onApprove: () => void;
  onCancel: () => void;
  onGeneratePayout: () => void;
}) {
  const s = collab.stats;
  const hasPendingOrApproved = s.pendingCount > 0 || s.approvedCount > 0;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: isExpanded ? 'rgba(124,58,237,0.35)' : 'var(--color-border)',
      }}
    >
      {/* Header row */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 px-4 py-4 cursor-pointer transition-all group"
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = 'rgba(124,58,237,0.03)';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(192,132,252,0.1), rgba(192,132,252,0.25))',
            color: '#c084fc',
            border: '1px solid rgba(192,132,252,0.25)',
          }}
        >
          {(collab.name || collab.email).charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
              {collab.name || 'Sin nombre'}
            </span>
            {collab.referralCode && (
              <code className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md tracking-wider" style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>
                {collab.referralCode}
              </code>
            )}
            {collab.isBlocked && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                BLOQUEADO
              </span>
            )}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{collab.email}</div>
        </div>

        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <QuickStat label="Referidos" value={s.totalReferrals} />
          <QuickStat label="Activos" value={`${s.activeReferredUsers}/${s.recurringThreshold}`} highlight={s.recurringEligible} warn={!s.recurringEligible && s.activeReferredUsers > 0} />
          <QuickStat label="Pendiente" value={cents(s.pendingAmount)} warn={s.pendingCount > 0} />
          <QuickStat label="Por pagar" value={cents(s.approvedAmount)} highlight={s.approvedCount > 0} />
          <QuickStat label="Pagado" value={cents(s.paidAmount)} success />
        </div>

        {/* Expand arrow */}
        <span
          className="text-sm transition-transform duration-200 shrink-0"
          style={{
            color: 'var(--color-text-muted)',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          →
        </span>
      </div>

      {/* Mobile stats row */}
      {!isExpanded && (
        <div className="flex md:hidden items-center gap-3 px-4 pb-3">
          <QuickStat label="Ref" value={s.totalReferrals} />
          <QuickStat label="Activos" value={`${s.activeReferredUsers}/${s.recurringThreshold}`} highlight={s.recurringEligible} />
          <QuickStat label="Pend" value={cents(s.pendingAmount)} warn={s.pendingCount > 0} />
          <QuickStat label="Pagado" value={cents(s.paidAmount)} success />
        </div>
      )}

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--color-border)', background: 'rgba(124,58,237,0.02)' }}>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cargando detalle...
              </div>
            </div>
          ) : detail && detail.referrals.length > 0 ? (
            <>
              {/* Recurring eligibility banner */}
              <div
                className="rounded-lg px-4 py-3 flex items-center gap-3 border"
                style={{
                  background: s.recurringEligible ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.06)',
                  borderColor: s.recurringEligible ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.15)',
                }}
              >
                <span className="text-lg">{s.recurringEligible ? '🔄' : '📈'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: s.recurringEligible ? '#10b981' : '#fbbf24' }}>
                      {s.recurringEligible ? 'Comisiones recurrentes ACTIVAS' : `${s.activeReferredUsers}/${s.recurringThreshold} referidos activos`}
                    </span>
                    {s.recurringEligible && s.recurringEntriesCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        {s.recurringEntriesCount} entradas recurrentes
                      </span>
                    )}
                  </div>
                  {/* Threshold progress bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (s.activeReferredUsers / s.recurringThreshold) * 100)}%`,
                        background: s.recurringEligible
                          ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                          : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {s.recurringEligible
                      ? `Gana 20% mensual sobre los ${s.activeReferredUsers} usuarios activos`
                      : `Necesita ${s.recurringThreshold - s.activeReferredUsers} referidos activos más para desbloquear comisiones recurrentes`}
                  </p>
                </div>
              </div>

              {/* Stats summary cards */}
              <div className="grid grid-cols-4 gap-2">
                <MiniStat label="Revenue generado" value={cents(s.totalRevenue)} icon="💰" />
                <MiniStat label="Comisión pendiente" value={cents(s.pendingAmount)} icon="⏳" count={s.pendingCount} />
                <MiniStat label="Comisión aprobada" value={cents(s.approvedAmount)} icon="📋" count={s.approvedCount} />
                <MiniStat label="Comisión pagada" value={cents(s.paidAmount)} icon="✅" count={s.paidCount} />
              </div>

              {/* Bulk actions */}
              {hasPendingOrApproved && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRefs.size > 0 && (
                    <>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedRefs.size} seleccionado(s)
                      </span>
                      <button onClick={onApprove} className="btn-primary text-xs px-3 py-1.5">
                        ✓ Aprobar
                      </button>
                      <button onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5" style={{ color: '#f87171' }}>
                        ✕ Cancelar
                      </button>
                    </>
                  )}
                  {s.approvedCount > 0 && (
                    <button onClick={onGeneratePayout} className="btn-primary text-xs px-3 py-1.5 ml-auto flex items-center gap-1.5">
                      📄 Generar Factura ({s.approvedCount} aprobados · {cents(s.approvedAmount)})
                    </button>
                  )}
                </div>
              )}

              {/* Referral table */}
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(124,58,237,0.05)' }}>
                      <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>
                        <input
                          type="checkbox"
                          checked={
                            detail.referrals.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED').length > 0 &&
                            detail.referrals
                              .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED')
                              .every((r) => selectedRefs.has(r.id))
                          }
                          onChange={() =>
                            onSelectAll(
                              detail.referrals
                                .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED')
                                .map((r) => r.id),
                            )
                          }
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Usuario referido</th>
                      <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--color-text-muted)' }}>Tipo</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Plan</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-text-muted)' }}>Pagó</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-text-muted)' }}>Comisión</th>
                      <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
                      <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--color-text-muted)' }}>Factura</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.referrals.map((ref, i) => {
                      const sm = STATUS_META[ref.status] ?? STATUS_META['PENDING']!;
                      const canSelect = ref.status === 'PENDING' || ref.status === 'APPROVED';
                      return (
                        <tr
                          key={ref.id}
                          className="transition-colors"
                          style={{
                            borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                            background: selectedRefs.has(ref.id) ? 'rgba(124,58,237,0.06)' : 'transparent',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = selectedRefs.has(ref.id) ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = selectedRefs.has(ref.id) ? 'rgba(124,58,237,0.06)' : 'transparent'; }}
                        >
                          <td className="px-3 py-2.5">
                            {canSelect ? (
                              <input
                                type="checkbox"
                                checked={selectedRefs.has(ref.id)}
                                onChange={() => onSelectRef(ref.id)}
                                className="rounded"
                              />
                            ) : (
                              <span className="w-4" />
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {ref.referredUser.name || 'Sin nombre'}
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>{ref.referredUser.email}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                              style={{
                                background: ref.commissionType === 'RECURRING' ? 'rgba(6,182,212,0.12)' : 'rgba(124,58,237,0.1)',
                                color: ref.commissionType === 'RECURRING' ? '#06b6d4' : '#a78bfa',
                              }}
                            >
                              {ref.commissionType === 'RECURRING' ? '🔄 Recurrente' : '🛒 1ª Compra'}
                            </span>
                            {ref.periodStart && (
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>
                                {new Date(ref.periodStart).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                              {ref.planName || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                            {cents(ref.amountPaid)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono font-bold" style={{ color: '#a78bfa' }}>
                              {cents(ref.commissionAmount)}
                            </span>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>{ref.commissionPercent}%</div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className="inline-block text-[10px] font-bold px-2 py-1 rounded-md"
                              style={{ background: sm.bg, color: sm.color }}
                            >
                              {sm.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {ref.payout ? (
                              <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                                {ref.payout.invoiceNumber}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ color: 'var(--color-text-muted)' }}>
                            {shortDate(ref.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <span className="text-2xl">📭</span>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Este colaborador aún no tiene referidos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, warn, highlight, success }: { label: string; value: string | number; warn?: boolean; highlight?: boolean; success?: boolean }) {
  let color = 'var(--color-text-secondary)';
  if (warn) color = '#fbbf24';
  if (highlight) color = '#60a5fa';
  if (success) color = '#34d399';
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, icon, count }: { label: string; value: string; icon: string; count?: number }) {
  return (
    <div className="glass-card p-2.5 text-center" style={{ transform: 'none' }}>
      <span className="text-base">{icon}</span>
      <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label} {count !== undefined && `(${count})`}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Payouts Tab
// ═══════════════════════════════════════════════════
function PayoutsTab({ payouts, onPay, onVoid }: { payouts: Payout[]; onPay: (p: Payout) => void; onVoid: (id: string) => void }) {
  if (payouts.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in-delay-2" style={{ transform: 'none' }}>
        <div className="text-3xl mb-3">📄</div>
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No hay facturas generadas aún</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Aprueba referidos de un colaborador y genera una factura para pagarle
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in-delay-2">
      {payouts.map((p) => {
        const sm = STATUS_META[p.status] ?? STATUS_META['DRAFT']!;
        return (
          <div
            key={p.id}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            {/* Invoice icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{
                background: sm.bg,
                border: `1px solid ${sm.color}33`,
              }}
            >
              📄
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                  {p.invoiceNumber || 'Sin número'}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: sm.bg, color: sm.color }}
                >
                  {sm.label}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {p.collaborator.name || p.collaborator.email} · {p.referralCount} referido(s) · {shortDate(p.createdAt)}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              <div className="text-base font-bold font-mono" style={{ color: '#a78bfa' }}>
                {cents(p.totalAmount)}
              </div>
              {p.method && (
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>vía {p.method}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {p.status === 'CONFIRMED' && (
                <button
                  onClick={() => onPay(p)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  💳 Pagar
                </button>
              )}
              {(p.status === 'CONFIRMED' || p.status === 'DRAFT') && (
                <button
                  onClick={() => onVoid(p.id)}
                  className="btn-ghost text-xs px-2 py-1.5"
                  style={{ color: '#f87171' }}
                >
                  ✕
                </button>
              )}
              {p.status === 'PAID' && p.paidAt && (
                <span className="text-[10px]" style={{ color: '#34d399' }}>
                  Pagado {shortDate(p.paidAt)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Pay Payout Modal
// ═══════════════════════════════════════════════════
function PayPayoutModal({
  payout,
  onClose,
  onPay,
}: {
  payout: Payout;
  onClose: () => void;
  onPay: (payoutId: string, method: string, reference: string) => void;
}) {
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!method) return;
    setLoading(true);
    await onPay(payout.id, method, reference);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="glass-card p-6 w-full max-w-md relative z-10 animate-fade-in space-y-5"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-bg-card)', transform: 'none' }}
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            💳 Registrar Pago
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Confirma el pago de la factura {payout.invoiceNumber}
          </p>
        </div>

        {/* Summary */}
        <div className="glass-card p-4 space-y-2" style={{ background: 'rgba(124,58,237,0.05)', transform: 'none' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Colaborador</span>
            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{payout.collaborator.name || payout.collaborator.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Referidos incluidos</span>
            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{payout.referralCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Total a pagar</span>
            <span className="font-bold text-lg font-mono" style={{ color: '#a78bfa' }}>{cents(payout.totalAmount)}</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="input-label">Método de pago *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              <option value="paypal">PayPal</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="crypto">Crypto</option>
              <option value="cash">Efectivo</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label className="input-label">Referencia / Comprobante</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Nro. de transferencia, ID de transacción..."
              className="input-field font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={handlePay}
            disabled={!method || loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : `Confirmar pago de ${cents(payout.totalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
