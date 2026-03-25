'use client';

import { useState } from 'react';
import type { CampaignEntry } from './types';
import { CAMPAIGN_OBJECTIVES, ALL_CHANNELS, CONTENT_FORMATS, inputStyle, labelStyle, mutedStyle } from './types';

interface Props {
  campaigns: CampaignEntry[];
  onChange: (campaigns: CampaignEntry[]) => void;
}

const emptyCampaign = (): CampaignEntry => ({
  name: '', objective: 'ENGAGEMENT', targetChannels: ['instagram'], channelFormats: { instagram: ['Publicación', 'Carousel', 'Reel', 'Historia'] },
  startDate: new Date().toISOString().split('T')[0]!, endDate: '', offer: '', landingUrl: '', kpiTarget: '',
  musicEnabled: false, musicStyle: 'upbeat', musicPrompt: '',
});

export default function StepCampaigns({ campaigns, onChange }: Props) {
  const [draft, setDraft] = useState<CampaignEntry>(emptyCampaign());
  const [showForm, setShowForm] = useState(campaigns.length === 0);

  const addCampaign = () => {
    if (!draft.name.trim()) return;
    onChange([...campaigns, { ...draft }]);
    setDraft(emptyCampaign());
    setShowForm(false);
  };

  const removeCampaign = (idx: number) => onChange(campaigns.filter((_, i) => i !== idx));

  const toggleChannel = (ch: string) => {
    const channels = draft.targetChannels.includes(ch)
      ? draft.targetChannels.filter((c) => c !== ch)
      : [...draft.targetChannels, ch];
    const formats = { ...draft.channelFormats };
    if (!channels.includes(ch)) delete formats[ch];
    else if (!formats[ch]) formats[ch] = ['Publicación'];
    setDraft({ ...draft, targetChannels: channels, channelFormats: formats });
  };

  const toggleFormat = (channel: string, format: string) => {
    const formats = { ...draft.channelFormats };
    const current = formats[channel] || [];
    formats[channel] = current.includes(format) ? current.filter((f) => f !== format) : [...current, format];
    setDraft({ ...draft, channelFormats: formats });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>🎯 Campañas</h3>
        <p className="text-xs" style={mutedStyle}>
          Gestiona tus campañas y sus objetivos de contenido. Podés crear más de una.
        </p>
      </div>

      {/* Existing campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          {campaigns.map((c, i) => (
            <div key={i} className="p-3 rounded-lg border flex items-center justify-between"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                  {CAMPAIGN_OBJECTIVES.find((o) => o.value === c.objective)?.label} · {c.targetChannels.join(', ')}
                </span>
              </div>
              <button type="button" onClick={() => removeCampaign(i)} className="text-xs" style={{ color: '#ef4444' }}>Eliminar</button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-4 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre *</label>
              <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="ej: Crecimiento Q1 2026" className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Objetivo</label>
              <select value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
                {CAMPAIGN_OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-xs font-medium mb-2" style={labelStyle}>Canales de publicación</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((ch) => (
                <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: draft.targetChannels.includes(ch.id) ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    borderColor: draft.targetChannels.includes(ch.id) ? 'var(--color-primary)' : 'var(--color-border)',
                    color: draft.targetChannels.includes(ch.id) ? 'white' : 'var(--color-text)',
                  }}>
                  {ch.icon} {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formats per channel */}
          {draft.targetChannels.length > 0 && (
            <div className="space-y-2">
              {draft.targetChannels.map((ch) => (
                <div key={ch} className="flex items-center gap-2 text-xs">
                  <span className="w-20 font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>{ch}:</span>
                  <div className="flex gap-1">
                    {CONTENT_FORMATS.map((fmt) => (
                      <button key={fmt} type="button" onClick={() => toggleFormat(ch, fmt)}
                        className="px-2 py-1 rounded border transition-colors"
                        style={{
                          backgroundColor: (draft.channelFormats[ch] || []).includes(fmt) ? 'var(--color-primary)' : 'transparent',
                          borderColor: (draft.channelFormats[ch] || []).includes(fmt) ? 'var(--color-primary)' : 'var(--color-border)',
                          color: (draft.channelFormats[ch] || []).includes(fmt) ? 'white' : 'var(--color-text-muted)',
                        }}>
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Fecha inicio *</label>
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Fecha fin</label>
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>KPI Target</label>
              <input type="text" value={draft.kpiTarget} onChange={(e) => setDraft({ ...draft, kpiTarget: e.target.value })}
                placeholder="ej: 10K interacciones" className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Oferta (opcional)</label>
              <input type="text" value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })}
                placeholder="ej: 20% descuento" className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Landing URL (opcional)</label>
              <input type="url" value={draft.landingUrl} onChange={(e) => setDraft({ ...draft, landingUrl: e.target.value })}
                placeholder="https://..." className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
          </div>

          {/* Music */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={draft.musicEnabled} onChange={(e) => setDraft({ ...draft, musicEnabled: e.target.checked })} />
              🎵 Activar música de fondo
            </label>
            {draft.musicEnabled && (
              <select value={draft.musicStyle} onChange={(e) => setDraft({ ...draft, musicStyle: e.target.value })}
                className="text-xs px-2 py-1 rounded border" style={inputStyle}>
                <option value="upbeat">🎵 Upbeat</option>
                <option value="calm">🎶 Calm</option>
                <option value="corporate">🏢 Corporate</option>
                <option value="energetic">⚡ Energetic</option>
                <option value="cinematic">🎬 Cinematic</option>
                <option value="custom">✏️ Custom</option>
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={addCampaign} disabled={!draft.name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: draft.name.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)' }}>
              ✅ Crear campaña
            </button>
            {campaigns.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text)' }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium border border-dashed transition-colors"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}>
          + Agregar campaña
        </button>
      )}
    </div>
  );
}
