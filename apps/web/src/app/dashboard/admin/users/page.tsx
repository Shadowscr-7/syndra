'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────
interface UserWorkspace {
  role: string;
  isDefault: boolean;
  workspace: {
    id: string;
    name: string;
    subscription?: {
      status: string;
      discountPercent: number;
      plan: { displayName: string };
    } | null;
  };
}

interface User {
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
  workspaces: UserWorkspace[];
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ADMIN: { label: 'Admin', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  COLLABORATOR: { label: 'Colaborador', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)' },
  USER: { label: 'Usuario', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)' },
};

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Error');
  return data;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterRole) p.set('role', filterRole);
      const data = await apiFetch(`/api/admin/users?${p.toString()}`);
      setUsers(data.data || []);
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const total = users.length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;
  const collabs = users.filter((u) => u.role === 'COLLABORATOR').length;
  const blocked = users.filter((u) => u.isBlocked).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra cuentas, roles y códigos de referido</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2">
          <span className="text-base">➕</span> Nuevo Colaborador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 animate-fade-in-delay-1">
        {[
          { label: 'Total', val: total, icon: '👥', grad: 'stat-gradient-purple' },
          { label: 'Admins', val: admins, icon: '🛡️', grad: 'stat-gradient-amber' },
          { label: 'Colaboradores', val: collabs, icon: '🤝', grad: 'stat-gradient-cyan' },
          { label: 'Bloqueados', val: blocked, icon: '🔒', grad: 'stat-gradient-pink' },
        ].map((s) => (
          <div key={s.label} className={`glass-card p-3 flex items-center gap-3 ${s.grad}`} style={{ transform: 'none' }}>
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
              <div className="text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 animate-fade-in-delay-1">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { label: 'Todos', val: '' },
            { label: 'Admin', val: 'ADMIN' },
            { label: 'Colaborador', val: 'COLLABORATOR' },
            { label: 'Usuario', val: 'USER' },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setFilterRole(opt.val)}
              className="px-3.5 py-2 text-xs font-medium transition-all"
              style={{
                background: filterRole === opt.val ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: filterRole === opt.val ? '#a78bfa' : 'var(--color-text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-1.5 animate-fade-in-delay-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando usuarios...
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="glass-card p-12 text-center" style={{ transform: 'none' }}>
            <div className="text-3xl mb-3">🔍</div>
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No se encontraron usuarios</p>
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateCollaboratorModal
          onClose={() => setShowCreate(false)}
          onCreated={(msg) => { setShowCreate(false); fetchUsers(); notify(msg); }}
          onError={(m) => notify(m, 'err')}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// User Card — clickable row leading to detail
// ═══════════════════════════════════════════════════
function UserCard({ user, onClick }: { user: User; onClick: () => void }) {
  const meta = ROLE_META[user.role] ?? ROLE_META['USER']!;
  const defaultWs = user.workspaces.find((w) => w.isDefault) || user.workspaces[0];
  const plan = defaultWs?.workspace?.subscription?.plan?.displayName;
  const discount = defaultWs?.workspace?.subscription?.discountPercent;

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200"
      style={{
        background: user.isBlocked ? 'rgba(239,68,68,0.03)' : 'var(--color-bg-card)',
        borderColor: user.isBlocked ? 'rgba(239,68,68,0.15)' : 'var(--color-border)',
        opacity: user.isBlocked ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)';
        e.currentTarget.style.background = user.isBlocked ? 'rgba(239,68,68,0.05)' : 'rgba(124,58,237,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = user.isBlocked ? 'rgba(239,68,68,0.15)' : 'var(--color-border)';
        e.currentTarget.style.background = user.isBlocked ? 'rgba(239,68,68,0.03)' : 'var(--color-bg-card)';
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: `linear-gradient(135deg, ${meta.bg}, ${meta.border})`,
          color: meta.color,
          border: `1px solid ${meta.border}`,
        }}
      >
        {(user.name || user.email).charAt(0).toUpperCase()}
      </div>

      {/* Name + Email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
            {user.name || 'Sin nombre'}
          </span>
          {user.isBlocked && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              BLOQUEADO
            </span>
          )}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</div>
      </div>

      {/* Role Badge */}
      <span
        className="badge text-xs shrink-0"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
      >
        <span className="badge-dot" style={{ background: meta.color }} />
        {meta.label}
      </span>

      {/* Plan */}
      <div className="w-20 shrink-0 text-right">
        {plan ? (
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{plan}</span>
            {discount && discount > 0 ? (
              <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                -{discount}%
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
        )}
      </div>

      {/* Referral */}
      <div className="w-24 shrink-0 text-center">
        {user.referralCode ? (
          <code className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>
            {user.referralCode}
          </code>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Sin código</span>
        )}
      </div>

      {/* Last login */}
      <div className="w-16 shrink-0 text-right text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })
          : 'Nunca'}
      </div>

      {/* Arrow */}
      <span className="text-sm opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
        →
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Create Collaborator Modal
// ═══════════════════════════════════════════════════
function CreateCollaboratorModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ referralCode: string; email: string } | null>(null);

  const handleCreate = async () => {
    if (!name || !email || !password) return onError('Todos los campos son requeridos');
    if (password.length < 8) return onError('La contraseña debe tener al menos 8 caracteres');

    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      setResult(data.data);
    } catch (e: any) {
      onError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="glass-card p-6 w-full max-w-md relative z-10 animate-fade-in space-y-5"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-bg-card)', transform: 'none' }}
      >
        {!result ? (
          <>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                🤝 Nuevo Colaborador
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Recibirá un código de referido automático. Sus clientes obtienen 20% de descuento.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="input-field" autoFocus />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" className="input-field" />
              </div>
              <div>
                <label className="input-label">Contraseña</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="input-field font-mono" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-5">
            <div className="text-4xl">✅</div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Colaborador Creado</h2>
            <div className="glass-card p-4 space-y-3" style={{ background: 'rgba(124,58,237,0.05)', transform: 'none' }}>
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Código de Referido</div>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-black px-5 py-2 rounded-xl tracking-[0.2em]" style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}>
                  {result.referralCode}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(result.referralCode)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-all text-sm"
                  title="Copiar"
                >
                  📋
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {result.email} · 20% de descuento para sus referidos
              </p>
            </div>
            <button onClick={() => onCreated(`Colaborador ${result.email} creado`)} className="btn-primary px-8">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}
