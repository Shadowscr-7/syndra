'use client';

import { useState, useEffect } from 'react';

interface Playbook {
  id: string;
  industry: string;
  displayName: string;
  description: string | null;
}

export function PlaybookResetSection({ currentIndustry }: { currentIndustry: string | null }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/playbooks')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const pbs = Array.isArray(data) ? data : data?.data ?? [];
        setPlaybooks(pbs);
        if (currentIndustry) setSelected(currentIndustry);
      })
      .catch(() => {});
  }, [currentIndustry]);

  const handleApply = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const res = await fetch(`/api/onboarding/presets/${encodeURIComponent(selected)}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al aplicar playbook');
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="section-title">📚 Reset desde Playbook de Industria</h3>
      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Aplica una plantilla de industria para re-configurar temas, persona, estilo visual, horarios y CTAs.
        Esto sobreescribe la configuración actual.
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="input-label">Playbook de industria</label>
          <select
            className="input-field text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Selecciona una industria...</option>
            {playbooks.map((pb) => (
              <option key={pb.id} value={pb.industry}>
                {pb.displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleApply}
          disabled={!selected || loading}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          {loading ? '⏳ Aplicando...' : '🔄 Aplicar Playbook'}
        </button>
      </div>

      {applied && (
        <div className="mt-3 px-4 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
          ✅ Playbook aplicado correctamente. Recarga la página para ver los cambios.
        </div>
      )}
      {error && (
        <div className="mt-3 px-4 py-2 rounded-xl text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          ❌ {error}
        </div>
      )}

      {currentIndustry && (
        <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Industria actual: <strong style={{ color: 'var(--color-text-secondary)' }}>{currentIndustry}</strong>
        </p>
      )}
    </div>
  );
}
