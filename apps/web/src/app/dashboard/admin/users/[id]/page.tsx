'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────
interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'COLLABORATOR' | 'USER';
  referralCode: string | null;
  referredByCode: string | null;
  isBlocked: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspaces: {
    role: string;
    isDefault: boolean;
    workspace: {
      id: string;
      name: string;
      slug: string;
      subscription?: {
        id: string;
        status: string;
        billingCycle: string;
        discountPercent: number;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        plan: { id: string; displayName: string; name: string; priceMonthly: number; priceYearly: number };
      } | null;
    };
  }[];
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
  ADMIN: { label: 'Admin', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', desc: 'Acceso total a la plataforma' },
  COLLABORATOR: { label: 'Colaborador', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)', desc: 'Puede crear contenido y referir clientes' },
  USER: { label: 'Usuario', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)', desc: 'Acceso estándar' },
};

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Error');
  return data;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [copied, setCopied] = useState(false);

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUser = async () => {
    try {
      const data = await apiFetch(`/api/admin/users/${userId}`);
      setUser(data.data);
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  // ── Actions ──
  const handleBlock = async (block: boolean) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/users/${userId}/${block ? 'block' : 'unblock'}`, { method: 'PATCH' });
      notify(block ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      fetchUser();
    } catch (e: any) { notify(e.message, 'err'); }
    finally { setActionLoading(false); }
  };

  const handleChangeRole = async (role: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      notify(`Rol cambiado a ${role}`);
      fetchUser();
    } catch (e: any) { notify(e.message, 'err'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`¿Eliminar a ${user.email}? Esta acción no se puede deshacer.`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      notify('Usuario eliminado');
      setTimeout(() => router.push('/dashboard/admin/users'), 500);
    } catch (e: any) { notify(e.message, 'err'); setActionLoading(false); }
  };

  const handleGenerateReferralCode = async () => {
    setActionLoading(true);
    try {
      const data = await apiFetch(`/api/admin/users/${userId}/referral-code`, { method: 'PATCH' });
      if (data.data.alreadyHad) {
        notify('Este usuario ya tenía un código de referido');
      } else {
        notify(`Código generado: ${data.data.referralCode}`);
      }
      fetchUser();
    } catch (e: any) { notify(e.message, 'err'); }
    finally { setActionLoading(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-24">
        <div className="text-4xl mb-4">😵</div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Usuario no encontrado</p>
        <Link href="/dashboard/admin/users" className="btn-ghost mt-4 inline-block">← Volver</Link>
      </div>
    );
  }

  const meta = ROLE_META[user.role] ?? ROLE_META['USER']!;
  const isAdmin = user.role === 'ADMIN';
  const defaultWs = user.workspaces.find((w) => w.isDefault) || user.workspaces[0];
  const sub = defaultWs?.workspace?.subscription;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {/* Back + Header */}
      <div className="animate-fade-in">
        <Link
          href="/dashboard/admin/users"
          className="text-sm font-medium transition-colors hover:brightness-125 inline-flex items-center gap-1 mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Usuarios
        </Link>

        <div className="flex items-start gap-5">
          {/* Big Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{
              background: `linear-gradient(135deg, ${meta.bg}, ${meta.border})`,
              color: meta.color,
              border: `2px solid ${meta.border}`,
            }}
          >
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>
                {user.name || 'Sin nombre'}
              </h1>
              <span
                className="badge text-xs"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              >
                <span className="badge-dot" style={{ background: meta.color }} />
                {meta.label}
              </span>
              {user.isBlocked && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  🔒 BLOQUEADO
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              ID: <span className="font-mono">{user.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ══ Main Grid ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-delay-1">

        {/* ── LEFT: Info Cards ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Overview */}
          <div className="glass-card p-5 space-y-4" style={{ transform: 'none' }}>
            <h2 className="section-title">📋 Información General</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoItem label="Email" value={user.email} />
              <InfoItem label="Nombre" value={user.name || '—'} />
              <InfoItem label="Rol" value={meta.label} color={meta.color} />
              <InfoItem label="Estado" value={user.isBlocked ? '🔒 Bloqueado' : '✅ Activo'} color={user.isBlocked ? '#f87171' : '#34d399'} />
              <InfoItem label="Email verificado" value={user.emailVerified ? 'Sí' : 'No'} />
              <InfoItem label="Último login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca'} />
              <InfoItem label="Creado" value={new Date(user.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoItem label="Referido por" value={user.referredByCode || '—'} mono={!!user.referredByCode} />
            </div>
          </div>

          {/* Workspace & Subscription */}
          {defaultWs && (
            <div className="glass-card p-5 space-y-4" style={{ transform: 'none' }}>
              <h2 className="section-title">🏢 Workspace & Suscripción</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoItem label="Workspace" value={defaultWs.workspace.name} />
                <InfoItem label="Rol en WS" value={defaultWs.role} />
                {sub ? (
                  <>
                    <InfoItem label="Plan" value={sub.plan.displayName} color="#a78bfa" />
                    <InfoItem label="Ciclo" value={sub.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual'} />
                    <InfoItem label="Estado sub." value={sub.status} color={sub.status === 'ACTIVE' ? '#34d399' : '#f59e0b'} />
                    <InfoItem label="Descuento" value={sub.discountPercent > 0 ? `${sub.discountPercent}%` : 'Sin descuento'} color={sub.discountPercent > 0 ? '#34d399' : undefined} />
                    <InfoItem label="Período inicio" value={new Date(sub.currentPeriodStart).toLocaleDateString('es')} />
                    <InfoItem label="Período fin" value={new Date(sub.currentPeriodEnd).toLocaleDateString('es')} />
                  </>
                ) : (
                  <div className="col-span-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin suscripción activa</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Actions Panel ── */}
        <div className="space-y-4">

          {/* Referral Code Card */}
          <div className="glass-card p-5 space-y-4" style={{ transform: 'none' }}>
            <h2 className="section-title">🎟️ Código de Referido</h2>
            {user.referralCode ? (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <code
                    className="text-xl font-mono font-black px-4 py-2.5 rounded-xl tracking-[0.15em]"
                    style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}
                  >
                    {user.referralCode}
                  </code>
                  <button
                    onClick={() => copyCode(user.referralCode!)}
                    className="p-2 rounded-lg transition-all text-sm"
                    style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'transparent' }}
                    title="Copiar"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Los clientes que usen este código obtienen 20% de descuento en su suscripción
                </p>
                <div
                  className="text-xs p-2 rounded-lg"
                  style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-text-muted)' }}
                >
                  Link de registro:<br />
                  <span className="font-mono text-[10px]" style={{ color: '#a78bfa' }}>
                    /register?ref={user.referralCode}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="text-3xl opacity-30">🎟️</div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Este usuario no tiene código de referido
                </p>
                <button
                  onClick={handleGenerateReferralCode}
                  disabled={actionLoading}
                  className="btn-primary text-sm w-full disabled:opacity-50"
                >
                  {actionLoading ? 'Generando...' : '✨ Generar Código'}
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {!isAdmin && (
            <div className="glass-card p-5 space-y-4" style={{ transform: 'none' }}>
              <h2 className="section-title">⚡ Acciones</h2>

              {/* Change Role */}
              <div>
                <label className="input-label">Cambiar rol</label>
                <select
                  value={user.role}
                  onChange={(e) => handleChangeRole(e.target.value)}
                  disabled={actionLoading}
                  className="input-field"
                >
                  <option value="USER">Usuario</option>
                  <option value="COLLABORATOR">Colaborador</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Block / Unblock */}
              <button
                onClick={() => handleBlock(!user.isBlocked)}
                disabled={actionLoading}
                className={user.isBlocked ? 'btn-success w-full text-sm' : 'btn-ghost w-full text-sm'}
              >
                {user.isBlocked ? '🔓 Desbloquear usuario' : '🔒 Bloquear usuario'}
              </button>

              {/* Delete */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn-danger w-full text-sm"
                >
                  🗑️ Eliminar usuario
                </button>
                <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Se eliminará el usuario, workspace y suscripción
                </p>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="glass-card p-5 text-center" style={{ transform: 'none' }}>
              <div className="text-2xl mb-2">🛡️</div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Las cuentas de administrador no se pueden bloquear ni eliminar desde aquí
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Info Item Component ──
function InfoItem({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-medium mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div
        className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: color || 'var(--color-text-secondary)' }}
      >
        {value}
      </div>
    </div>
  );
}
