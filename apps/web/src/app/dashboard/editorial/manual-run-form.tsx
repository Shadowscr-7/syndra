'use client';

import { useState } from 'react';
import { createEditorialRun } from '@/lib/actions';

interface Campaign {
  id: string;
  name: string;
  targetChannels: string[];
}

const CHANNEL_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  threads: '🧵',
  discord: '💜',
};

export function ManualRunForm({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const hasCampaign = !!selectedCampaign;

  return (
    <details>
      <summary className="btn-primary cursor-pointer list-none text-sm w-fit select-none">
        🚀 Nueva corrida manual
      </summary>
      <form
        action={createEditorialRun}
        className="glass-card p-6 mt-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campaign select */}
          <div>
            <label className="input-label">Campaña (opcional)</label>
            <select
              name="campaignId"
              className="input-field"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
            >
              <option value="">Sin campaña</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority — hidden when campaign selected (uses campaign's default) */}
          {!hasCampaign && (
            <div>
              <label className="input-label">Prioridad (1-10)</label>
              <input type="number" name="priority" defaultValue={5} min={1} max={10} className="input-field" />
            </div>
          )}

          {/* Channels — hidden when campaign selected (uses campaign's channels) */}
          {!hasCampaign ? (
            <div>
              <label className="input-label">Canales</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" name="channels" value="instagram" defaultChecked className="accent-purple-500" /> 📸 Instagram
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" name="channels" value="facebook" className="accent-purple-500" /> 📘 Facebook
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" name="channels" value="threads" className="accent-purple-500" /> 🧵 Threads
                </label>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="input-label">Configuración de campaña</label>
              <div className="flex items-center gap-3 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Canales:</span>
                <div className="flex gap-2">
                  {selectedCampaign.targetChannels.map((ch) => (
                    <span key={ch} className="chip text-xs" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                      {CHANNEL_ICONS[ch] ?? '📡'} {ch}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                  Heredado de la campaña
                </span>
              </div>
            </div>
          )}
        </div>
        <button type="submit" className="btn-primary w-full text-sm">
          🚀 Crear corrida
        </button>
      </form>
    </details>
  );
}
