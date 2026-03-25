'use client';

import { inputStyle, labelStyle, mutedStyle } from './types';

const CREATOR_CATEGORIES = [
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
  { id: 'tech', name: 'Tech & Gaming', icon: '🎮' },
  { id: 'fitness', name: 'Fitness & Salud', icon: '💪' },
  { id: 'food', name: 'Cocina & Recetas', icon: '🍳' },
  { id: 'education', name: 'Educación', icon: '📚' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬' },
  { id: 'travel', name: 'Viajes', icon: '✈️' },
  { id: 'art', name: 'Arte & Diseño', icon: '🎨' },
  { id: 'finance', name: 'Finanzas', icon: '💰' },
  { id: 'music', name: 'Música', icon: '🎵' },
  { id: 'other', name: 'Otro', icon: '🌟' },
];

interface Props {
  creatorName: string;
  slug: string;
  creatorCategory: string;
  onChange: (field: string, value: string) => void;
}

export default function StepCreatorProfile({ creatorName, slug, creatorCategory, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>
          Tu nombre o nombre de creador *
        </label>
        <input
          type="text"
          value={creatorName}
          onChange={(e) => onChange('creatorName', e.target.value)}
          placeholder="Tu nombre artístico o personal"
          className="w-full px-4 py-3 rounded-lg border text-sm"
          style={inputStyle}
        />
        {slug && <p className="text-xs mt-1" style={mutedStyle}>URL: syndra.app/{slug}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-3" style={labelStyle}>Categoría principal *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CREATOR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange('creatorCategory', cat.id)}
              className="flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors"
              style={{
                backgroundColor: creatorCategory === cat.id ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                borderColor: creatorCategory === cat.id ? 'var(--color-primary)' : 'var(--color-border)',
                color: creatorCategory === cat.id ? 'white' : 'var(--color-text)',
              }}
            >
              <span className="text-lg">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
