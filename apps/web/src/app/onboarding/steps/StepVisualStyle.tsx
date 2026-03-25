'use client';

import type { VisualStyleData } from './types';
import { VISUAL_STYLES, inputStyle, labelStyle, mutedStyle } from './types';

interface Props {
  style: VisualStyleData;
  onChange: (style: VisualStyleData) => void;
}

export default function StepVisualStyle({ style, onChange }: Props) {
  const update = (field: keyof VisualStyleData, value: string) => {
    onChange({ ...style, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>🎨 Estilo Visual</h3>
        <p className="text-xs" style={mutedStyle}>
          Define estilos para la generación automática de imágenes: colores, tipografía y estilo artístico.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre del estilo *</label>
          <input
            type="text"
            value={style.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Futurista tech"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Proveedor de imágenes</label>
          <select
            value={style.preferredImageProvider}
            onChange={(e) => update('preferredImageProvider', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          >
            <option value="huggingface">HuggingFace</option>
            <option value="pollinations">Pollinations</option>
            <option value="replicate">Replicate</option>
            <option value="fal">FAL</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>Estilo artístico</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VISUAL_STYLES.map((vs) => (
            <button
              key={vs.value}
              type="button"
              onClick={() => update('style', vs.value)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors"
              style={{
                backgroundColor: style.style === vs.value ? 'rgba(124,58,237,0.15)' : 'var(--color-bg-tertiary)',
                borderColor: style.style === vs.value ? 'var(--color-primary)' : 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <span className="text-xl">{vs.icon}</span>
              <span className="text-xs">{vs.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Paleta de colores (hex, separados por comas)</label>
        <input
          type="text"
          value={style.colorPalette}
          onChange={(e) => update('colorPalette', e.target.value)}
          placeholder="#7c3aed, #06b6d4, #0f172a"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={inputStyle}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Fuente primaria</label>
          <input
            type="text"
            value={style.primaryFont}
            onChange={(e) => update('primaryFont', e.target.value)}
            placeholder="Inter, Montserrat..."
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Fuente secundaria</label>
          <input
            type="text"
            value={style.secondaryFont}
            onChange={(e) => update('secondaryFont', e.target.value)}
            placeholder="JetBrains Mono, Fira Code..."
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>URL del logo (opcional)</label>
          <input
            type="text"
            value={style.logoUrl}
            onChange={(e) => update('logoUrl', e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Prefijo de prompt (opcional)</label>
          <input
            type="text"
            value={style.customPromptPrefix}
            onChange={(e) => update('customPromptPrefix', e.target.value)}
            placeholder="cyberpunk style, neon glow..."
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
