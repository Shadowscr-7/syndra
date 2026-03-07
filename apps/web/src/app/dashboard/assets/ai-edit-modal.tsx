'use client';

import { useState, useRef, useEffect } from 'react';

interface AiEditModalProps {
  assetId: string;
  assetType: string;
  currentPrompt?: string | null;
  currentUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AiEditModal({
  assetId,
  assetType,
  currentPrompt,
  currentUrl,
  onClose,
  onSuccess,
}: AiEditModalProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isSlide = assetType === 'CAROUSEL_SLIDE';

  const suggestions = isSlide
    ? [
        'Hazlo más corto y directo',
        'Cambia el tono a más informal',
        'Añade emojis al título',
        'Hazlo más provocador',
        'Tradúcelo al inglés',
      ]
    : [
        'Más colorido y vibrante',
        'Estilo minimalista',
        'Fondo oscuro profesional',
        'Añade elementos tecnológicos',
        'Más cálido y humano',
      ];

  async function handleSubmit() {
    if (!instruction.trim()) return;

    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/media/asset/${assetId}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error ${res.status}`);
      }

      const data = await res.json();
      setPreviewUrl(data.updatedUrl);
    } catch (err: any) {
      setError(err.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg glass-card p-0 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
              Editar con IA
            </h3>
            <span className="chip text-[10px]">{isSlide ? 'Slide SVG' : 'Imagen'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-lg opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text)' }}
          >
            ✕
          </button>
        </div>

        {/* Preview area */}
        <div className="p-5">
          <div className="flex gap-4">
            {/* Current */}
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Actual
              </p>
              <div
                className="aspect-square rounded-xl overflow-hidden flex items-center justify-center"
                style={{ border: '1px solid var(--color-border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {currentUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={currentUrl} alt="Actual" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-30">📎</span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <span className="text-xl" style={{ color: 'var(--color-text-muted)' }}>→</span>
            </div>

            {/* Preview result */}
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {loading ? 'Generando...' : previewUrl ? 'Resultado' : 'Nuevo'}
              </p>
              <div
                className="aspect-square rounded-xl overflow-hidden flex items-center justify-center"
                style={{
                  border: previewUrl
                    ? '2px solid var(--color-primary)'
                    : '1px dashed var(--color-border-subtle)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Procesando...</span>
                  </div>
                ) : previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={previewUrl} alt="Resultado" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-20">✨</span>
                )}
              </div>
            </div>
          </div>

          {/* Current prompt info */}
          {currentPrompt && (
            <div className="mt-3 p-2.5 rounded-lg text-[11px]" style={{ backgroundColor: 'rgba(124,58,237,0.06)', color: 'var(--color-text-muted)' }}>
              <span className="font-semibold">Prompt actual:</span> {currentPrompt.substring(0, 120)}{currentPrompt.length > 120 ? '...' : ''}
            </div>
          )}
        </div>

        {/* Instruction input */}
        <div className="px-5 pb-3">
          <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            ¿Qué quieres cambiar?
          </label>
          <textarea
            ref={inputRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isSlide ? 'Ej: "Hazlo más corto y agrega un emoji al título"' : 'Ej: "Que el fondo sea más oscuro y profesional"'}
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInstruction(s)}
                className="text-[10px] px-2.5 py-1 rounded-full transition-all hover:brightness-125"
                style={{
                  backgroundColor: 'rgba(124,58,237,0.1)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 p-5 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }}
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            {previewUrl && (
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                ✓ Aceptar
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || !instruction.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {loading ? '⏳ Generando...' : previewUrl ? '🔄 Regenerar' : '✨ Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
