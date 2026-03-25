'use client';

import type { OnboardingMode } from './types';

interface Props {
  mode: OnboardingMode;
  onSelect: (mode: OnboardingMode) => void;
}

export default function StepMode({ mode, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
        ¿Cómo vas a usar Syndra?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          { key: 'business' as const, icon: '🏢', title: 'Empresa / Negocio', desc: 'Gestiona la presencia digital de tu marca o empresa' },
          { key: 'creator' as const, icon: '🎨', title: 'Creador de contenido', desc: 'Crea y publica contenido para tu audiencia personal' },
        ]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelect(opt.key)}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all"
            style={{
              backgroundColor: mode === opt.key ? 'rgba(124,58,237,0.12)' : 'var(--color-bg-tertiary)',
              borderColor: mode === opt.key ? 'var(--color-primary)' : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <span className="text-4xl">{opt.icon}</span>
            <span className="text-lg font-semibold">{opt.title}</span>
            <span className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
