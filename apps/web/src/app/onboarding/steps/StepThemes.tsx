'use client';

import { useState } from 'react';
import type { ThemeEntry } from './types';
import { THEME_TYPES, inputStyle, labelStyle, mutedStyle } from './types';

const FORMAT_OPTIONS = ['post', 'carousel', 'reel', 'historia'];

interface Props {
  themes: ThemeEntry[];
  onChange: (themes: ThemeEntry[]) => void;
}

const emptyTheme = (): ThemeEntry => ({
  name: '', keywords: '', audience: '', priority: 5, type: 'EVERGREEN', formats: ['post', 'carousel'],
});

export default function StepThemes({ themes, onChange }: Props) {
  const [draft, setDraft] = useState<ThemeEntry>(emptyTheme());
  const [showForm, setShowForm] = useState(themes.length === 0);

  const addTheme = () => {
    if (!draft.name.trim()) return;
    onChange([...themes, { ...draft }]);
    setDraft(emptyTheme());
    setShowForm(false);
  };

  const removeTheme = (idx: number) => {
    onChange(themes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>📋 Temas de Contenido</h3>
        <p className="text-xs" style={mutedStyle}>
          Configura las temáticas para tu línea editorial. Podrás agregar más después.
        </p>
      </div>

      {/* Existing themes */}
      {themes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border text-sm"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    {THEME_TYPES.find((tt) => tt.value === t.type)?.label || t.type}
                  </span>
                  <button type="button" onClick={() => removeTheme(i)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>✕</button>
                </div>
              </div>
              {t.audience && <p className="text-xs" style={mutedStyle}>👥 {t.audience}</p>}
              {t.keywords && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.keywords.split(',').map((k, j) => (
                    <span key={j} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                      {k.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-2 text-xs" style={mutedStyle}>
                <span>Prioridad: {t.priority}/10</span>
                <span>📄 {t.formats.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-3 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre *</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="ej: Marketing Digital"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Audiencia</label>
              <input
                type="text"
                value={draft.audience}
                onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                placeholder="ej: Emprendedores 25-40"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Keywords (separadas por coma)</label>
            <input
              type="text"
              value={draft.keywords}
              onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
              placeholder="ej: SEO, redes sociales, branding"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Tipo</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                {THEME_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Prioridad (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Formatos</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    const fmts = draft.formats.includes(f)
                      ? draft.formats.filter((x) => x !== f)
                      : [...draft.formats, f];
                    setDraft({ ...draft, formats: fmts });
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: draft.formats.includes(f) ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    borderColor: draft.formats.includes(f) ? 'var(--color-primary)' : 'var(--color-border)',
                    color: draft.formats.includes(f) ? 'white' : 'var(--color-text)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addTheme}
              disabled={!draft.name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: draft.name.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)' }}
            >
              ✅ Agregar tema
            </button>
            {themes.length > 0 && (
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
          + Agregar tema
        </button>
      )}
    </div>
  );
}
