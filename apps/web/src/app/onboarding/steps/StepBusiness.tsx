'use client';

import { inputStyle, labelStyle, mutedStyle } from './types';

interface Industry {
  id: string;
  name: string;
  icon: string;
}

interface Props {
  workspaceName: string;
  slug: string;
  industry: string;
  industries: Industry[];
  onChange: (field: string, value: string) => void;
}

export default function StepBusiness({ workspaceName, slug, industry, industries, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
          Nombre del negocio *
        </label>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => onChange('workspaceName', e.target.value)}
          placeholder="Mi Empresa"
          className="w-full px-4 py-3 rounded-lg border text-sm"
          style={inputStyle}
        />
        {slug && (
          <p className="text-xs mt-1" style={mutedStyle}>URL: syndra.app/{slug}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-3" style={labelStyle}>Industria *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {industries.map((ind) => (
            <button
              key={ind.id}
              type="button"
              onClick={() => onChange('industry', ind.id)}
              className="flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors"
              style={{
                backgroundColor: industry === ind.id ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                borderColor: industry === ind.id ? 'var(--color-primary)' : 'var(--color-border)',
                color: industry === ind.id ? 'white' : 'var(--color-text)',
              }}
            >
              <span className="text-lg">{ind.icon}</span>
              {ind.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
