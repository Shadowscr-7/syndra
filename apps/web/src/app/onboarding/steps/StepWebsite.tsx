'use client';

import { useState, useCallback } from 'react';
import { inputStyle, labelStyle, mutedStyle, secondaryStyle } from './types';

interface Props {
  websiteUrl: string;
  onChange: (field: string, value: string) => void;
  onExtracted: (profile: Record<string, string>) => void;
}

export default function StepWebsite({ websiteUrl, onChange, onExtracted }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleExtract = useCallback(async () => {
    if (!websiteUrl.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      let url = websiteUrl.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      const res = await fetch('/api/business-profile/extract-from-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls: [url] }),
      });
      if (res.ok) {
        const json = await res.json();
        const profile = json.data?.profile;
        if (profile) {
          onExtracted(profile);
          setResult('✅ Se extrajeron datos de tu sitio web');
        } else {
          setResult('⚠️ No se pudieron extraer datos del sitio');
        }
      } else {
        setResult('⚠️ Error al analizar el sitio web');
      }
    } catch {
      setResult('⚠️ Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [websiteUrl, onExtracted]);

  return (
    <div className="space-y-6">
      <p className="text-sm" style={secondaryStyle}>
        Si tenés un sitio web, podemos analizar automáticamente tu negocio para crear un perfil y briefs de contenido.
      </p>
      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>URL de tu sitio web</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => onChange('websiteUrl', e.target.value)}
            placeholder="https://miempresa.com"
            className="flex-1 px-4 py-3 rounded-lg border text-sm"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={!websiteUrl.trim() || loading}
            className="px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{
              backgroundColor: websiteUrl.trim() && !loading ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
              color: websiteUrl.trim() && !loading ? 'white' : 'var(--color-text-muted)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Analizando...' : '🔍 Analizar'}
          </button>
        </div>
        {result && <p className="text-sm mt-2" style={secondaryStyle}>{result}</p>}
      </div>
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <p className="text-xs" style={mutedStyle}>
          💡 Syndra analizará tu sitio web para extraer información del negocio, productos y servicios.
          Podés omitir este paso y configurarlo después desde <strong>Mi Negocio</strong>.
        </p>
      </div>
    </div>
  );
}
