'use client';

import type { PersonaData } from './types';
import { inputStyle, labelStyle, mutedStyle } from './types';

const TONE_SUGGESTIONS = ['didáctico', 'técnico', 'aspiracional', 'cercano', 'polémico', 'sarcástico', 'premium', 'directo', 'informal', 'formal'];

interface Props {
  persona: PersonaData;
  onChange: (persona: PersonaData) => void;
}

export default function StepPersona({ persona, onChange }: Props) {
  const update = (field: keyof PersonaData, value: string) => {
    onChange({ ...persona, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>🎭 AI Persona Builder</h3>
        <p className="text-xs" style={mutedStyle}>
          Define la personalidad de tu marca para que la IA genere contenido con tu voz única.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre de marca *</label>
          <input
            type="text"
            value={persona.brandName}
            onChange={(e) => update('brandName', e.target.value)}
            placeholder="Mi Marca Tech"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Audiencia objetivo</label>
          <input
            type="text"
            value={persona.targetAudience}
            onChange={(e) => update('targetAudience', e.target.value)}
            placeholder="Emprendedores tech, 25-40 años"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Descripción de marca</label>
        <textarea
          value={persona.brandDescription}
          onChange={(e) => update('brandDescription', e.target.value)}
          placeholder="Somos una marca de educación tecnológica enfocada en emprendedores..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={inputStyle}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Tonos (separar por comas)</label>
          <input
            type="text"
            value={persona.tone}
            onChange={(e) => update('tone', e.target.value)}
            placeholder="didáctico, cercano, experto"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {TONE_SUGGESTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const current = persona.tone.split(',').map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(t)) update('tone', [...current, t].join(', '));
                }}
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Expertise (separar por comas)</label>
          <input
            type="text"
            value={persona.expertise}
            onChange={(e) => update('expertise', e.target.value)}
            placeholder="IA, programación, startups"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Estilo de lenguaje</label>
          <input
            type="text"
            value={persona.languageStyle}
            onChange={(e) => update('languageStyle', e.target.value)}
            placeholder="Tuteo, informal, con humor sutil"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Estilo visual</label>
          <input
            type="text"
            value={persona.visualStyle}
            onChange={(e) => update('visualStyle', e.target.value)}
            placeholder="Minimalista tech, tonos fríos"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Temas a evitar (separar por comas)</label>
          <input
            type="text"
            value={persona.avoidTopics}
            onChange={(e) => update('avoidTopics', e.target.value)}
            placeholder="política, religión"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Frases ejemplo (separar por comas)</label>
          <input
            type="text"
            value={persona.examplePhrases}
            onChange={(e) => update('examplePhrases', e.target.value)}
            placeholder="El futuro es ahora, Automatiza o muere"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
