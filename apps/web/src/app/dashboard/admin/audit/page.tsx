'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface AuditEntry {
  id: string;
  action: string;
  category: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  performer?: { id: string; name: string; email: string; role: string };
}

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'USER_MGMT', label: 'Usuarios' },
  { value: 'COMMISSION', label: 'Comisiones' },
  { value: 'SUBSCRIPTION', label: 'Suscripciones' },
  { value: 'LICENSE', label: 'Licencias' },
  { value: 'SYSTEM', label: 'Sistema' },
];

const CATEGORY_STYLES: Record<string, { text: string; bg: string; color: string }> = {
  USER_MGMT: { text: 'Usuarios', bg: 'rgba(124,58,237,0.1)', color: '#a78bfa' },
  COMMISSION: { text: 'Comisiones', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  SUBSCRIPTION: { text: 'Suscripción', bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
  LICENSE: { text: 'Licencias', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  SYSTEM: { text: 'Sistema', bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' },
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (actionSearch) params.set('action', actionSearch);
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(page * PAGE_SIZE));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setLogs(json.data.logs);
      setTotal(json.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [category, actionSearch, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="page-title">📋 Registro de Auditoría</h1>
          <p className="page-subtitle">Historial completo de acciones administrativas</p>
        </div>
        <Link href="/dashboard/admin" className="btn-ghost text-sm">← Dashboard</Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-end gap-4 animate-fade-in-delay-1">
        <div>
          <label className="input-label">Categoría</label>
          <select className="input-field" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="input-label">Buscar acción</label>
          <input
            className="input-field"
            placeholder="Ej: user.block, payout.generate..."
            value={actionSearch}
            onChange={(e) => { setActionSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {total} registro{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card p-0 overflow-x-auto animate-fade-in-delay-1">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-3xl animate-float mb-2">📋</div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando registros...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Categoría</th>
                <th>Realizado por</th>
                <th>Objetivo</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{log.action}</span>
                  </td>
                  <td>
                    <CategoryBadge category={log.category} />
                  </td>
                  <td className="text-xs">
                    {log.performer ? (
                      <div>
                        <span style={{ color: 'var(--color-text)' }}>{log.performer.name}</span>
                        <br />
                        <span style={{ color: 'var(--color-text-muted)' }}>{log.performer.email}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {log.targetType ? (
                      <span>{log.targetType}<br />{log.targetId?.slice(0, 12)}…</span>
                    ) : '—'}
                  </td>
                  <td className="text-xs max-w-[200px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="text-3xl animate-float mb-2">📋</div>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {category || actionSearch ? 'Sin resultados para los filtros aplicados' : 'No hay registros de auditoría aún'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between animate-fade-in-delay-2">
          <button
            className="btn-ghost text-sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Anterior
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="btn-ghost text-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const info = CATEGORY_STYLES[category] || { text: category, bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  return (
    <span className="badge" style={{ backgroundColor: info.bg, color: info.color }}>{info.text}</span>
  );
}
