'use client';

import { useState, useTransition } from 'react';
import { deleteCampaign, updateCampaign } from '@/lib/actions';
import { ChannelFormatsPicker } from '@/components/ui/channel-formats-picker';

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

const CHANNEL_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  threads: '🧵',
  discord: '💜',
};

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
  contentProfileId: string | null;
  userPersonaId: string | null;
  targetChannels: string[];
  channelFormats: Record<string, string[]> | null;
  contentProfile: { id: string; name: string } | null;
  userPersona: { id: string; brandName: string } | null;
  campaignThemes: { theme: { id: string; name: string } }[];
}

interface Persona { id: string; brandName: string; isActive: boolean }
interface Profile { id: string; name: string; isDefault: boolean }
interface Theme { id: string; name: string }

function toDateInput(d: string | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0] ?? '';
}

export function CampaignList({
  campaigns,
  personas,
  profiles,
  themes,
}: {
  campaigns: Campaign[];
  personas: Persona[];
  profiles: Profile[];
  themes: Theme[];
}) {
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
                  <label className="input-label">Persona</label>
                  <select name="userPersonaId" defaultValue={campaign.userPersonaId ?? ''} className="input-field">
                    <option value="">— Persona activa —</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.brandName}{p.isActive ? ' ✓' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Perfil</label>
                  <select name="contentProfileId" defaultValue={campaign.contentProfileId ?? ''} className="input-field">
                    <option value="">— Perfil default —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' ✓' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Channels + Formats */}
              <ChannelFormatsPicker
                defaultChannels={campaign.targetChannels}
                defaultChannelFormats={(campaign.channelFormats as Record<string, string[]>) ?? {}}
              />
              {/* Themes */}
              <div>
                <label className="input-label">Temas</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {themes.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1.5 rounded-md hover:bg-white/5" style={{ color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <input
                        type="checkbox"
                        name="themeIds"
                        value={t.id}
                        defaultChecked={campaign.campaignThemes.some((ct) => ct.theme.id === t.id)}
                        className="accent-purple-500"
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
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

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="chip">{campaign.objective}</span>
                {campaign.targetChannels.map((ch) => {
                  const formats = (campaign.channelFormats as Record<string, string[]> | null)?.[ch];
                  const formatLabel = formats?.length ? ` (${formats.join(', ')})` : '';
                  return (
                    <span key={ch} className="chip" style={{ fontSize: '0.7rem' }}>
                      {CHANNEL_ICONS[ch] ?? '📡'} {ch}{formatLabel}
                    </span>
                  );
                })}
              </div>

              {/* Persona + Profile */}
              {(campaign.userPersona || campaign.contentProfile) && (
                <div className="flex gap-3 mb-2 flex-wrap">
                  {campaign.userPersona && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                      🎭 {campaign.userPersona.brandName}
                    </span>
                  )}
                  {campaign.contentProfile && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}>
                      📝 {campaign.contentProfile.name}
                    </span>
                  )}
                </div>
              )}

              {/* Themes */}
              {campaign.campaignThemes.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {campaign.campaignThemes.map((ct) => (
                    <span key={ct.theme.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                      🏷️ {ct.theme.name}
                    </span>
                  ))}
                </div>
              )}

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
