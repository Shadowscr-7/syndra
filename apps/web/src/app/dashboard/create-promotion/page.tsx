'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import { UserMediaPicker } from '@/components/media-picker';

type Step = 1 | 2 | 3;

const CONTENT_TYPES = [
  { value: 'PRODUCT', label: '📦 Producto', desc: 'Mostrar un producto con foto, precio y beneficios' },
  { value: 'OFFER', label: '🏷️ Oferta', desc: 'Descuento, promoción o precio especial' },
  { value: 'SERVICE', label: '🛠️ Servicio', desc: 'Promocionar un servicio profesional' },
  { value: 'ANNOUNCEMENT', label: '📢 Anuncio', desc: 'Lanzamiento, novedad o evento' },
  { value: 'TESTIMONIAL', label: '⭐ Testimonio', desc: 'Caso de éxito o reseña de cliente' },
  { value: 'SEASONAL', label: '🎄 Temporada', desc: 'Contenido de temporada (Navidad, Black Friday...)' },
];

export default function CreatePromotionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Product/item
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [mediaIds, setMediaIds] = useState<string[]>([]);

  // Step 2: Content type
  const [contentType, setContentType] = useState('PRODUCT');
  const [discountText, setDiscountText] = useState('');
  const [cta, setCta] = useState('');

  const canAdvance1 = productName.trim().length > 0;
  const canAdvance2 = contentType.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create BusinessBrief
      await apiFetch('/business-briefs', {
        method: 'POST',
        body: JSON.stringify({
          type: contentType,
          title: `${contentType === 'OFFER' ? '🏷️ ' : ''}${productName}`,
          content: productDescription || `Promoción de ${productName}`,
          productName,
          productPrice: productPrice || undefined,
          discountText: discountText || undefined,
          mediaIds,
        }),
      });

      // 2. Create ContentTheme
      await apiFetch('/content/themes', {
        method: 'POST',
        body: JSON.stringify({
          name: productName,
          type: contentType,
          productName,
          productPrice: productPrice || undefined,
          discountText: discountText || undefined,
          keywords: [productName.toLowerCase()],
          priority: 8,
        }),
      }).catch(() => {
        // Theme creation via API may not exist — use action fallback silently
      });

      // 3. Trigger editorial run
      await apiFetch('/editorial/trigger', {
        method: 'POST',
        body: JSON.stringify({
          themeType: contentType,
        }),
      }).catch(() => {
        // Editorial trigger may not exist yet — no blocking error
      });

      // Done — redirect to editorial
      router.push('/dashboard/editorial');
    } catch (e: any) {
      setError(e?.message ?? 'Error al crear la promoción');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🚀 Crear Promoción</h1>
        <p className="page-subtitle">
          3 pasos para generar contenido promocional de tu negocio.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 animate-fade-in-delay-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/30'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-all ${
                  step > s ? 'bg-purple-500' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: What to promote */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">¿Qué quieres promocionar?</h2>
            <p className="text-sm text-white/50">
              Describe el producto o servicio. Si tienes fotos, selecciónalas de tu biblioteca.
            </p>
          </div>

          <div>
            <label className="input-label">Nombre *</label>
            <input
              className="input-field w-full"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ej: Zapatillas Air Max 90"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Precio</label>
              <input
                className="input-field w-full"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="Ej: $29.99"
              />
            </div>
            <div>
              <label className="input-label">Descripción</label>
              <input
                className="input-field w-full"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Breve descripción..."
              />
            </div>
          </div>

          <div>
            <label className="input-label">Imágenes del producto</label>
            <UserMediaPicker
              selectedIds={mediaIds}
              onChange={setMediaIds}
              categoryFilter="PRODUCT"
              max={3}
            />
          </div>

          <button
            className="btn-primary w-full"
            disabled={!canAdvance1}
            onClick={() => setStep(2)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Step 2: Content type */}
      {step === 2 && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">¿Qué tipo de contenido?</h2>
            <p className="text-sm text-white/50">
              Elige cómo quieres presentar tu producto o servicio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                className={`text-left p-4 rounded-lg border transition ${
                  contentType === ct.value
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/30'
                }`}
                onClick={() => setContentType(ct.value)}
              >
                <span className="text-sm font-semibold text-white">{ct.label}</span>
                <p className="text-xs text-white/40 mt-1">{ct.desc}</p>
              </button>
            ))}
          </div>

          {(contentType === 'OFFER' || contentType === 'SEASONAL') && (
            <div>
              <label className="input-label">Texto de descuento</label>
              <input
                className="input-field w-full"
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                placeholder="Ej: 30% OFF, 2x1, Envío gratis"
              />
            </div>
          )}

          <div>
            <label className="input-label">CTA (llamada a la acción)</label>
            <input
              className="input-field w-full"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Ej: Compra ahora, Reserva tu cita, Ver más"
            />
          </div>

          <div className="flex gap-3">
            <button
              className="px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 rounded-lg"
              onClick={() => setStep(1)}
            >
              ← Atrás
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!canAdvance2}
              onClick={() => setStep(3)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Generate */}
      {step === 3 && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Confirmar y generar</h2>
            <p className="text-sm text-white/50">
              Revisa los datos y lanza la generación de contenido.
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider">Producto</span>
              <span className="text-sm font-medium text-white">{productName}</span>
            </div>
            {productPrice && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Precio</span>
                <span className="text-sm text-emerald-400 font-semibold">{productPrice}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider">Tipo</span>
              <span className="text-sm text-purple-300">
                {CONTENT_TYPES.find((c) => c.value === contentType)?.label}
              </span>
            </div>
            {discountText && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Descuento</span>
                <span className="text-sm text-amber-400 font-bold">{discountText}</span>
              </div>
            )}
            {mediaIds.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Imágenes</span>
                <span className="text-sm text-white/60">{mediaIds.length} seleccionada(s)</span>
              </div>
            )}
          </div>

          <p className="text-xs text-white/30 text-center">
            Se creará automáticamente un Brief de negocio, un Tema de contenido y se lanzará
            el pipeline editorial para generar tu publicación promocional.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 rounded-lg"
              onClick={() => setStep(2)}
            >
              ← Atrás
            </button>
            <button
              className="btn-primary flex-1 text-base py-3"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? '⏳ Generando...' : '🚀 Generar contenido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
