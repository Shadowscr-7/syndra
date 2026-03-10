'use client';

import { useState } from 'react';

const PROMOTIONAL_TYPES = new Set([
  'PRODUCT', 'SERVICE', 'OFFER', 'SEASONAL', 'ANNOUNCEMENT', 'TESTIMONIAL',
]);

const THEME_TYPE_OPTIONS = [
  { value: 'EVERGREEN', label: '🌱 Evergreen', desc: 'Contenido atemporal' },
  { value: 'TRENDING', label: '🔥 Trending', desc: 'Basado en tendencias' },
  { value: 'PRODUCT', label: '📦 Producto', desc: 'Promoción de producto' },
  { value: 'SERVICE', label: '🛠️ Servicio', desc: 'Promoción de servicio' },
  { value: 'OFFER', label: '🏷️ Oferta', desc: 'Descuentos y promociones' },
  { value: 'SEASONAL', label: '🎄 Temporada', desc: 'Contenido de temporada' },
  { value: 'ANNOUNCEMENT', label: '📢 Anuncio', desc: 'Lanzamientos y novedades' },
  { value: 'TESTIMONIAL', label: '⭐ Testimonio', desc: 'Casos de éxito' },
  { value: 'BEHIND_SCENES', label: '🎬 Detrás de escena', desc: 'Backstage del negocio' },
  { value: 'EDUCATIONAL', label: '📚 Educativo', desc: 'Contenido educativo del sector' },
];

export function ThemeFormFields() {
  const [themeType, setThemeType] = useState('EVERGREEN');
  const isPromotional = PROMOTIONAL_TYPES.has(themeType);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">Tipo</label>
          <select
            name="type"
            className="input-field"
            value={themeType}
            onChange={(e) => setThemeType(e.target.value)}
          >
            {THEME_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] mt-1 block" style={{ color: 'var(--color-text-muted)' }}>
            {THEME_TYPE_OPTIONS.find((o) => o.value === themeType)?.desc}
          </span>
        </div>
        <div>
          <label className="input-label">Prioridad (1-10)</label>
          <input type="number" name="priority" defaultValue={5} min={1} max={10} className="input-field" />
        </div>
      </div>

      {/* Product/Promotional fields — shown only for promotional theme types */}
      {isPromotional && (
        <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'rgba(124,58,237,0.3)', backgroundColor: 'rgba(124,58,237,0.05)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
            📦 Datos del producto / promoción
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nombre del producto</label>
              <input
                type="text"
                name="productName"
                placeholder="ej: Zapatillas Air Max 90"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Precio</label>
              <input
                type="text"
                name="productPrice"
                placeholder="ej: $29.99 o Desde $15"
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">URL de compra / landing</label>
              <input
                type="url"
                name="productUrl"
                placeholder="https://tienda.com/producto"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Texto de descuento</label>
              <input
                type="text"
                name="discountText"
                placeholder="ej: 20% OFF, 2x1, Envío gratis"
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="input-label">Descripción del producto</label>
            <textarea
              name="productDescription"
              placeholder="Breve descripción del producto o servicio..."
              className="input-field"
              rows={2}
            />
          </div>
          {(themeType === 'OFFER' || themeType === 'SEASONAL') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Inicio de promoción</label>
                <input type="date" name="promotionStart" className="input-field" />
              </div>
              <div>
                <label className="input-label">Fin de promoción</label>
                <input type="date" name="promotionEnd" className="input-field" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
