'use client';

import type { ContentProfileData } from './types';
import { inputStyle, labelStyle, mutedStyle } from './types';

interface Props {
  profile: ContentProfileData;
  onChange: (profile: ContentProfileData) => void;
}

const TONES = ['didáctico', 'cercano', 'técnico', 'aspiracional', 'informal', 'formal', 'directo', 'premium', 'polémico', 'sarcástico'];

export default function StepContentProfile({ profile, onChange }: Props) {
  const update = (field: keyof ContentProfileData, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>📄 Perfil de Contenido</h3>
        <p className="text-xs" style={mutedStyle}>
          Configura perfiles por canal o tipo de contenido con tono, extensión y audiencia específica.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre del perfil *</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Canal educativo IA"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Tono</label>
          <select
            value={profile.tone}
            onChange={(e) => update('tone', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          >
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Extensión de contenido</label>
          <select
            value={profile.contentLength}
            onChange={(e) => update('contentLength', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          >
            <option value="SHORT">Corto (50-150 palabras)</option>
            <option value="MEDIUM">Medio (150-300 palabras)</option>
            <option value="LONG">Largo (300-500 palabras)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Idioma</label>
          <select
            value={profile.language}
            onChange={(e) => update('language', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Portugués</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Audiencia</label>
          <input
            type="text"
            value={profile.audience}
            onChange={(e) => update('audience', e.target.value)}
            placeholder="Emprendedores tech, 25-40"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Objetivo de publicación</label>
          <input
            type="text"
            value={profile.postingGoal}
            onChange={(e) => update('postingGoal', e.target.value)}
            placeholder="Educación + generación de leads"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Hashtags (separar por comas)</label>
        <input
          type="text"
          value={profile.hashtags}
          onChange={(e) => update('hashtags', e.target.value)}
          placeholder="#IA, #Tech, #Automatización"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={inputStyle}
        />
      </div>
    </div>
  );
}
