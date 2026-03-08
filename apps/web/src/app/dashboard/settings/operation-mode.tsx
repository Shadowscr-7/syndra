'use client';

import { useState } from 'react';

const MODES = [
  {
    value: 'APPROVAL_REQUIRED',
    label: '⏳ Semi-automático',
    description: 'Genera contenido automáticamente y pausa para tu aprobación vía Telegram antes de publicar.',
    badge: 'Recomendado',
    badgeColor: '#7c3aed',
  },
  {
    value: 'FULLY_AUTOMATIC',
    label: '🚀 Totalmente automático',
    description: 'Pipeline completo sin intervención: investiga, genera, y publica directamente.',
    badge: 'Sin revisión',
    badgeColor: '#f59e0b',
  },
  {
    value: 'MANUAL',
    label: '✋ Manual',
    description: 'Solo genera contenido cuando lo solicitas. No hay crons ni ejecuciones automáticas.',
    badge: 'Bajo demanda',
    badgeColor: '#64748b',
  },
] as const;

export function OperationModeSelector({ currentMode }: { currentMode: string }) {
  const [selected, setSelected] = useState(currentMode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChange = async (mode: string) => {
    if (mode === selected) return;
    setSelected(mode);
    setSaving(true);
    try {
      const res = await fetch('/api/workspaces/operation-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setToast({ type: 'ok', text: 'Modo de operación actualizado' });
    } catch (e: any) {
      setToast({ type: 'err', text: e.message });
      setSelected(currentMode); // revert
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="section-title">🎛️ Modo de operación</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Controla el nivel de automatización del pipeline editorial.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-xs font-medium ${
            toast.type === 'ok'
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="space-y-3">
        {MODES.map((mode) => {
          const isActive = selected === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => handleChange(mode.value)}
              disabled={saving}
              className="w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 border"
              style={{
                backgroundColor: isActive ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                borderColor: isActive ? 'rgba(124,58,237,0.3)' : 'var(--color-border-subtle)',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isActive ? '#7c3aed' : 'rgba(160,160,192,0.3)',
                    }}
                  >
                    {isActive && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
                    )}
                  </div>
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                    {mode.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${mode.badgeColor}15`,
                    color: mode.badgeColor,
                  }}
                >
                  {mode.badge}
                </span>
              </div>
              <p className="text-xs mt-1.5 ml-7" style={{ color: 'var(--color-text-muted)' }}>
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
