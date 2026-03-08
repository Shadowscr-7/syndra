'use client';

import { useEffect, useState } from 'react';
import { getClientSession, getClientApiUrl } from '@/lib/client-session';

interface Playbook {
  id: string;
  name: string;
  description?: string;
  rules: Record<string, unknown>;
  formatMix: Array<{ format: string; percentage: number }>;
  preferredCTAs: string[];
  usageCount: number;
  isPublic: boolean;
  createdAt: string;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [publicPlaybooks, setPublicPlaybooks] = useState<Playbook[]>([]);
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const getHeaders = () => {
    const s = getClientSession();
    return {
      'Content-Type': 'application/json',
      'x-workspace-id': s.workspaceId,
      'x-user-id': s.userId,
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const apiUrl = getClientApiUrl();
      const headers = getHeaders();

      const [mineRes, pubRes] = await Promise.all([
        fetch(`${apiUrl}/api/playbooks`, { headers }),
        fetch(`${apiUrl}/api/playbooks/public`, { headers }),
      ]);

      if (mineRes.ok) setPlaybooks(await mineRes.json());
      if (pubRes.ok) setPublicPlaybooks(await pubRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const apiUrl = getClientApiUrl();
    await fetch(`${apiUrl}/api/playbooks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, isPublic }),
    });
    setName('');
    setDescription('');
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const apiUrl = getClientApiUrl();
    await fetch(`${apiUrl}/api/playbooks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    load();
  };

  const togglePublic = async (pb: Playbook) => {
    const apiUrl = getClientApiUrl();
    await fetch(`${apiUrl}/api/playbooks/${pb.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ isPublic: !pb.isPublic }),
    });
    load();
  };

  const displayed = tab === 'mine' ? playbooks : publicPlaybooks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Content Playbooks</h1>
          <p className="page-subtitle">Plantillas reutilizables de estrategia de contenido</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          + Nuevo Playbook
        </button>
      </div>

      {showCreate && (
        <div className="glass-card p-5 space-y-3 animate-fade-in">
          <input
            placeholder="Nombre del playbook"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Hacer público (compartir en marketplace)
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim()} className="btn-success text-sm" style={{ opacity: name.trim() ? 1 : 0.5 }}>
              Guardar
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {(['mine', 'public'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium transition-all"
            style={{
              color: tab === t ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {t === 'mine' ? 'Mis Playbooks' : 'Marketplace Público'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4 animate-float">📚</div>
          <p style={{ color: 'var(--color-text-muted)' }}>No hay playbooks aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((pb) => (
            <div key={pb.id} className="glass-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{pb.name}</h3>
                  {pb.description && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{pb.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {pb.isPublic && (
                    <span className="chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}>Public</span>
                  )}
                  <span className="chip" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)', borderColor: 'rgba(124,58,237,0.2)' }}>
                    {pb.usageCount}× usado
                  </span>
                </div>
              </div>

              {/* Format mix */}
              {pb.formatMix && pb.formatMix.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Format Mix</p>
                  <div className="flex gap-1 flex-wrap">
                    {pb.formatMix.map((f, i) => (
                      <span key={i} className="chip" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.2)' }}>
                        {f.format} {f.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rules */}
              {pb.rules && Object.keys(pb.rules).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Rules</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(pb.rules).slice(0, 5).map(([k, v]) => (
                      <span key={k} className="chip" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)', borderColor: 'rgba(124,58,237,0.2)' }}>
                        {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs */}
              {pb.preferredCTAs && pb.preferredCTAs.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>CTAs</p>
                  <div className="flex gap-1 flex-wrap">
                    {pb.preferredCTAs.map((c, i) => (
                      <span key={i} className="chip" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {tab === 'mine' && (
                <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <button onClick={() => togglePublic(pb)} className="btn-ghost text-xs">
                    {pb.isPublic ? '🔒 Hacer Privado' : '🌐 Compartir'}
                  </button>
                  <button onClick={() => handleDelete(pb.id)} className="btn-danger text-xs">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
