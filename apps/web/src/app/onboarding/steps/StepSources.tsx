'use client';

import { useState } from 'react';
import type { SourceEntry } from './types';
import { SOURCE_TYPES, inputStyle, labelStyle, mutedStyle } from './types';

interface Props {
  sources: SourceEntry[];
  onChange: (sources: SourceEntry[]) => void;
}

const emptySource = (): SourceEntry => ({ name: '', type: 'RSS', url: '' });

export default function StepSources({ sources, onChange }: Props) {
  const [draft, setDraft] = useState<SourceEntry>(emptySource());
  const [showForm, setShowForm] = useState(sources.length === 0);

  const addSource = () => {
    if (!draft.name.trim() || !draft.url.trim()) return;
    onChange([...sources, { ...draft }]);
    setDraft(emptySource());
    setShowForm(false);
  };

  const removeSource = (idx: number) => {
    onChange(sources.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>🔍 Fuentes de Research</h3>
        <p className="text-xs" style={mutedStyle}>
          Feeds RSS, blogs y fuentes para el motor de research diario.
        </p>
      </div>

      {/* Existing sources table */}
      {sources.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left py-2 px-2 text-xs font-medium">NOMBRE</th>
                <th className="text-left py-2 px-2 text-xs font-medium">TIPO</th>
                <th className="text-left py-2 px-2 text-xs font-medium">URL</th>
                <th className="py-2 px-2 text-xs font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2 px-2 font-medium" style={{ color: 'var(--color-text)' }}>{s.name}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--color-text-secondary)' }}>{s.type}</td>
                  <td className="py-2 px-2 text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>{s.url}</td>
                  <td className="py-2 px-2">
                    <button type="button" onClick={() => removeSource(i)} className="text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-3 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre *</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Mi Blog"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Tipo</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>URL *</label>
              <input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addSource}
              disabled={!draft.name.trim() || !draft.url.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: draft.name.trim() && draft.url.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)' }}
            >
              ✅ Agregar fuente
            </button>
            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text)' }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium border border-dashed transition-colors"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
        >
          + Agregar fuente
        </button>
      )}
    </div>
  );
}
