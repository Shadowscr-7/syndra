'use client';

import { inputStyle, labelStyle } from './types';

interface Props {
  brandName: string;
  brandDescription: string;
  brandVoice: string;
  onChange: (field: string, value: string) => void;
}

export default function StepBrand({ brandName, brandDescription, brandVoice, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>Nombre de marca</label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => onChange('brandName', e.target.value)}
          placeholder="Nombre visible de tu marca"
          className="w-full px-4 py-3 rounded-lg border text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>Descripción</label>
        <textarea
          value={brandDescription}
          onChange={(e) => onChange('brandDescription', e.target.value)}
          placeholder="¿A qué se dedica tu marca?"
          rows={3}
          className="w-full px-4 py-3 rounded-lg border text-sm resize-none"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>Tono de voz</label>
        <select
          value={brandVoice}
          onChange={(e) => onChange('brandVoice', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border text-sm"
          style={inputStyle}
        >
          <option>Profesional</option>
          <option>Casual</option>
          <option>Divertido</option>
          <option>Inspiracional</option>
          <option>Educativo</option>
          <option>Motivacional</option>
        </select>
      </div>
    </div>
  );
}
