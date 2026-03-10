'use client';

import { useState } from 'react';

interface TemplatePreviewProps {
  productImageUrl: string;
  productName?: string;
  productPrice?: string;
  logoUrl?: string;
}

const TEMPLATES = [
  { id: 'product-showcase', label: '📦 Showcase' },
  { id: 'offer-banner', label: '🏷️ Oferta' },
  { id: 'minimal-product', label: '✨ Minimal' },
  { id: 'price-tag', label: '💰 Precio' },
  { id: 'announcement', label: '📢 Anuncio' },
  { id: 'carousel-product', label: '📱 Carrusel' },
];

/**
 * Client-side preview using the SVG templates from ImageComposer
 * (rendered inline via CSS since we can't run Sharp client-side).
 */
export function TemplatePreview({ productImageUrl, productName, productPrice, logoUrl }: TemplatePreviewProps) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState('product-showcase');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-500/10"
      >
        👁️ Preview
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a1a2e] rounded-xl border border-white/10 max-w-3xl w-full max-h-[90vh] overflow-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Vista previa de composición</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-white/50 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Template selector */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                template === t.id
                  ? 'bg-purple-500/30 border-purple-500 text-purple-300'
                  : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview canvas */}
        <div className="relative mx-auto" style={{ width: 480, height: 480 }}>
          <div
            className="w-full h-full rounded-lg overflow-hidden border border-white/10"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
              position: 'relative',
            }}
          >
            {/* Product image */}
            {productImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageUrl}
                  alt={productName || 'Product'}
                  className="max-w-[65%] max-h-[65%] object-contain drop-shadow-2xl"
                  style={{
                    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                  }}
                />
              </div>
            )}

            {/* Logo overlay */}
            {logoUrl && (
              <div className="absolute top-3 right-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-10 w-auto object-contain opacity-80"
                />
              </div>
            )}

            {/* Text overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5 pt-12">
              {template === 'offer-banner' && (
                <span className="inline-block bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded mb-2">
                  OFERTA ESPECIAL
                </span>
              )}
              <p className="text-white font-bold text-lg leading-tight mb-1">
                {productName || 'Nombre del producto'}
              </p>
              {productPrice && (
                <p className="text-amber-400 font-bold text-xl">{productPrice}</p>
              )}
              <p className="text-white/60 text-xs mt-2">
                {template === 'price-tag'
                  ? '💰 ¡Precio especial por tiempo limitado!'
                  : template === 'announcement'
                    ? '📢 ¡Nuevo lanzamiento disponible!'
                    : '🛒 Ver más detalles'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/30">
          Template: <span className="text-white/50 font-medium">{template}</span> — Vista previa
          aproximada. La composición final usa Sharp para producir la imagen.
        </p>
      </div>
    </div>
  );
}
