'use client';

interface Theme {
  id: string;
  name: string;
  keywords: string[];
  audience: string;
  priority: number;
  preferredFormats: string[];
  type: string;
  isActive: boolean;
  productName?: string | null;
  productPrice?: string | null;
  discountText?: string | null;
}

const THEME_TYPE_LABELS: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  TRENDING: { icon: '🔥', label: 'Trending', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  EVERGREEN: { icon: '🌱', label: 'Evergreen', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  PRODUCT: { icon: '📦', label: 'Producto', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  SERVICE: { icon: '🛠️', label: 'Servicio', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  OFFER: { icon: '🏷️', label: 'Oferta', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  SEASONAL: { icon: '🎄', label: 'Temporada', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  ANNOUNCEMENT: { icon: '📢', label: 'Anuncio', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  TESTIMONIAL: { icon: '⭐', label: 'Testimonio', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  BEHIND_SCENES: { icon: '🎬', label: 'Backstage', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  EDUCATIONAL: { icon: '📚', label: 'Educativo', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
};

export function ThemeList({ themes }: { themes: Theme[] }) {
  if (themes.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-3xl animate-float inline-block mb-3">🎨</span>
        <p style={{ color: 'var(--color-text-muted)' }}>
          No hay temas creados. Crea tu primer tema para definir tu línea editorial.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {themes.map((theme, i) => {
        const priorityPercent = (theme.priority / 10) * 100;
        const typeMeta = THEME_TYPE_LABELS[theme.type] ?? THEME_TYPE_LABELS['EVERGREEN']!;
        return (
          <div
            key={theme.id}
            className={`glass-card p-6 ${i < 3 ? 'animate-fade-in-delay-1' : 'animate-fade-in-delay-2'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{theme.name}</h3>
              <span className="badge" style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}>
                {typeMeta.icon} {typeMeta.label}
              </span>
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              👥 {theme.audience || 'Sin audiencia definida'}
            </p>

            {/* Product metadata for promotional themes */}
            {theme.productName && (
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                📦 {theme.productName}
                {theme.productPrice ? ` — ${theme.productPrice}` : ''}
              </p>
            )}
            {theme.discountText && (
              <p className="text-xs mb-3 font-semibold" style={{ color: '#ef4444' }}>
                🏷️ {theme.discountText}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 mb-4">
              {theme.keywords.slice(0, 4).map((kw) => (
                <span key={kw} className="chip">{kw}</span>
              ))}
              {theme.keywords.length > 4 && (
                <span className="chip">+{theme.keywords.length - 4}</span>
              )}
            </div>

            {/* Priority bar */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>Prioridad</span>
                <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{theme.priority}/10</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${priorityPercent}%`, background: 'var(--gradient-primary)' }} />
              </div>
            </div>

            {theme.preferredFormats.length > 0 && (
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                📐 {theme.preferredFormats.join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
