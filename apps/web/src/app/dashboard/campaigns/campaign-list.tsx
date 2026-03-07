'use client';

import { useState, useTransition } from 'react';
import { deleteCampaign, updateCampaign } from '@/lib/actions';

const OBJECTIVE_ICONS: Record<string, string> = {
  ENGAGEMENT: '💬',
  AUTHORITY: '👑',
  TRAFFIC: '🚀',
  LEAD_CAPTURE: '🎯',
  SALE: '💰',
  COMMUNITY: '🤝',
};

const OBJECTIVES = [
  { value: 'ENGAGEMENT', label: '💬 Engagement' },
  { value: 'AUTHORITY', label: '👑 Autoridad' },
  { value: 'TRAFFIC', label: '🚀 Tráfico' },
  { value: 'LEAD_CAPTURE', label: '🎯 Captura de Leads' },
  { value: 'SALE', label: '💰 Venta' },
  { value: 'COMMUNITY', label: '🤝 Comunidad' },
];

interface Campaign {
  id: string;
  name: string;
  objective: string;
  offer: string | null;
  landingUrl: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  kpiTarget: string | null;
}

function toDateInput(d: string | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (campaigns.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-3xl animate-float inline-block mb-3">📢</span>
        <p style={{ color: 'var(--color-text-muted)' }}>
          No hay campañas creadas. Crea tu primera campaña para empezar.
        </p>
      </div>
    );
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(() => deleteCampaign(id));
  };

  const handleUpdate = (id: string, formData: FormData) => {
    startTransition(() => updateCampaign(id, formData));
    setEditingId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {campaigns.map((campaign, i) => (
        <div
          key={campaign.id}
          className={`glass-card p-6 ${i < 2 ? 'animate-fade-in-delay-1' : 'animate-fade-in-delay-2'}`}
        >
          {editingId === campaign.id ? (
            /* ── Edit mode ── */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate(campaign.id, new FormData(e.currentTarget));
              }}
              className="space-y-3"
            >
              <div>
                <label className="input-label">Nombre *</label>
                <input type="text" name="name" required defaultValue={campaign.name} className="input-field" />
              </div>
              <div>
                <label className="input-label">Objetivo</label>
                <select name="objective" defaultValue={campaign.objective} className="input-field">
                  {OBJECTIVES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Oferta</label>
                  <input type="text" name="offer" defaultValue={campaign.offer ?? ''} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Landing URL</label>
                  <input type="url" name="landingUrl" defaultValue={campaign.landingUrl ?? ''} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Fecha inicio</label>
                  <input type="date" name="startDate" defaultValue={toDateInput(campaign.startDate)} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Fecha fin</label>
                  <input type="date" name="endDate" defaultValue={toDateInput(campaign.endDate)} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">KPI Target</label>
                  <input type="text" name="kpiTarget" defaultValue={campaign.kpiTarget ?? ''} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Estado</label>
                  <select name="isActive" defaultValue={campaign.isActive ? 'true' : 'false'} className="input-field">
                    <option value="true">✅ Activa</option>
                    <option value="false">⏸️ Inactiva</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isPending} className="btn-primary text-xs flex-1">
                  {isPending ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            /* ── View mode ── */
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                  {OBJECTIVE_ICONS[campaign.objective] ?? '📋'} {campaign.name}
                </h3>
                {campaign.isActive ? (
                  <span className="badge" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    <span className="badge-dot" style={{ backgroundColor: '#22c55e' }} /> Activa
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Inactiva
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="chip">{campaign.objective}</span>
              </div>
              {campaign.kpiTarget && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  🎯 KPI: {campaign.kpiTarget}
                </p>
              )}
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                📅 {new Date(campaign.startDate).toLocaleDateString('es-MX')}
                {campaign.endDate && ` → ${new Date(campaign.endDate).toLocaleDateString('es-MX')}`}
              </div>
              <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setEditingId(campaign.id)}
                  className="btn-secondary text-xs flex-1"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(campaign.id, campaign.name)}
                  disabled={isPending}
                  className="text-xs flex-1 px-3 py-2 rounded-lg font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {isPending ? '⏳...' : '🗑️ Eliminar'}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
