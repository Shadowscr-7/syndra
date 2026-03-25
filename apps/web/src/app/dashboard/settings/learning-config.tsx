'use client';

import { useState, useEffect } from 'react';

interface LearningConfig {
  autoApply: boolean;
  dimensions: string[];
  minConfidence: number;
  dataWindowDays: number;
}

const ALL_DIMENSIONS = [
  { key: 'THEME', label: 'Temática', icon: '🎯' },
  { key: 'FORMAT', label: 'Formato', icon: '📐' },
  { key: 'TONE', label: 'Tono', icon: '🎭' },
  { key: 'CTA', label: 'CTA', icon: '📢' },
  { key: 'HOUR', label: 'Hora', icon: '🕐' },
  { key: 'DAY', label: 'Día', icon: '📅' },
  { key: 'HOOK_TYPE', label: 'Hook', icon: '🪝' },
  { key: 'LENGTH', label: 'Extensión', icon: '📏' },
];

export function LearningConfigSection() {
  const [config, setConfig] = useState<LearningConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/learning/config')
      .then(r => r.json())
      .then(json => { if (json?.data) setConfig(json.data); })
      .catch((err) => console.error('Learning config fetch error:', err));
  }, []);

  const save = async (patch: Partial<LearningConfig>) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/learning/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json?.data) {
        setConfig(json.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Save learning config error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDimension = (dim: string) => {
    if (!config) return;
    const dims = config.dimensions.includes(dim)
      ? config.dimensions.filter(d => d !== dim)
      : [...config.dimensions, dim];
    save({ dimensions: dims });
  };

  if (!config) {
    return (
      <div className="glass-card p-6">
        <h3 className="section-title">🧠 Aprendizaje Inteligente</h3>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Cargando configuración…
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">🧠 Aprendizaje Inteligente</h3>
        {saved && (
          <span className="text-xs font-medium" style={{ color: '#10b981' }}>
            ✅ Guardado
          </span>
        )}
      </div>

      {/* Auto-apply toggle */}
      <div className="flex items-center justify-between py-3 px-4 rounded-xl mb-4"
        style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Modo de aplicación
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {config.autoApply
              ? '⚡ Automático — Syndra aplicará los aprendizajes directamente en la estrategia'
              : '💡 Recomendación — Syndra mostrará sugerencias pero tú decides la estrategia'}
          </p>
        </div>
        <button
          onClick={() => save({ autoApply: !config.autoApply })}
          disabled={saving}
          className="relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
          style={{
            backgroundColor: config.autoApply ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
            style={{
              left: config.autoApply ? '24px' : '2px',
              backgroundColor: '#fff',
            }}
          />
        </button>
      </div>

      {/* Dimensions */}
      <div className="mb-4">
        <label className="input-label">Dimensiones activas</label>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Elige qué aspectos del contenido debe analizar Syndra
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_DIMENSIONS.map(d => {
            const active = config.dimensions.includes(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggleDimension(d.key)}
                disabled={saving}
                className="chip cursor-pointer transition-all"
                style={{
                  backgroundColor: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: active ? '#7c3aed' : 'transparent',
                  color: active ? '#a78bfa' : 'var(--color-text-muted)',
                }}
              >
                {d.icon} {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min confidence */}
      <div className="mb-4">
        <label className="input-label">Confianza mínima para aplicar ({Math.round(config.minConfidence * 100)}%)</label>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Umbral de confianza requerido para que un patrón sea considerado en la estrategia
        </p>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(config.minConfidence * 100)}
          onChange={(e) => save({ minConfidence: parseInt(e.target.value) / 100 })}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          <span>Más datos</span>
          <span>Más agresivo</span>
        </div>
      </div>

      {/* Data window */}
      <div>
        <label className="input-label">Ventana de datos</label>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Cantidad de días históricos que se analizan para calcular los patrones
        </p>
        <div className="flex gap-2">
          {[14, 30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => save({ dataWindowDays: days })}
              disabled={saving}
              className="chip cursor-pointer transition-all"
              style={{
                backgroundColor: config.dataWindowDays === days ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                borderColor: config.dataWindowDays === days ? '#7c3aed' : 'transparent',
                color: config.dataWindowDays === days ? '#a78bfa' : 'var(--color-text-muted)',
              }}
            >
              {days} días
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
