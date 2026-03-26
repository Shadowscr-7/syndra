import { BUILTIN_TEMPLATES } from '@automatismos/media/templates';

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  educational: { emoji: '📚', label: 'Educativo' },
  news: { emoji: '🗞️', label: 'Noticias' },
  cta: { emoji: '🎯', label: 'CTA / Venta' },
  authority: { emoji: '🏆', label: 'Autoridad' },
  controversial: { emoji: '🔥', label: 'Polémico' },
  custom: { emoji: '✏️', label: 'Personalizado' },
};

export default function TemplatesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de Carrusel</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Plantillas predefinidas para generación de carruseles de Instagram.
          </p>
        </div>
        <button
          className="rounded-lg px-4 py-2.5 font-semibold text-white text-sm opacity-50 cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-primary)' }}
          disabled
          title="Disponible próximamente"
        >
          + Nueva plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BUILTIN_TEMPLATES.map((template) => {
          const cat = CATEGORY_LABELS[template.category] ?? { emoji: '📎', label: template.category };

          return (
            <div
              key={template.id}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Color header */}
              <div
                className="h-3"
                style={{ backgroundColor: template.defaultBranding.primaryColor ?? '#6C63FF' }}
              />

              <div className="p-5">
                {/* Category & Name */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${template.defaultBranding.primaryColor ?? '#6C63FF'}20`,
                      color: template.defaultBranding.primaryColor ?? '#6C63FF',
                    }}
                  >
                    {cat.label}
                  </span>
                </div>

                <h3 className="text-lg font-bold mb-1">{template.name}</h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {template.description}
                </p>

                {/* Structure preview */}
                <div className="mb-4">
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Estructura ({template.slideCount.min}–{template.slideCount.max} slides)
                  </div>
                  <div className="flex gap-1.5">
                    {template.structure.map((slot, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded px-2 py-1.5 text-center"
                        style={{
                          backgroundColor:
                            slot.type === 'cover'
                              ? `${template.defaultBranding.primaryColor ?? '#6C63FF'}30`
                              : slot.type === 'cta'
                                ? `${template.defaultBranding.primaryColor ?? '#6C63FF'}20`
                                : 'var(--color-bg)',
                          border: slot.required ? `1px solid ${template.defaultBranding.primaryColor ?? '#6C63FF'}40` : '1px solid var(--color-border)',
                        }}
                      >
                        <div className="text-xs font-medium">
                          {slot.type === 'cover' ? '📖' : slot.type === 'cta' ? '🎯' : '📄'}
                        </div>
                        <div
                          className="text-[10px] truncate"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {slot.placeholderTitle ?? slot.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Branding colors */}
                <div className="flex items-center gap-2">
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Colores:
                  </div>
                  {[
                    template.defaultBranding.primaryColor,
                    template.defaultBranding.secondaryColor,
                    template.defaultBranding.backgroundColor,
                    template.defaultBranding.textColor,
                  ]
                    .filter(Boolean)
                    .map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border"
                        title={color}
                        style={{
                          backgroundColor: color,
                          borderColor: 'var(--color-border)',
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div
        className="mt-8 rounded-xl border p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h3 className="font-bold mb-2">💡 ¿Cómo funcionan las plantillas?</h3>
        <ul
          className="text-sm space-y-1.5 list-disc list-inside"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <li>Cuando el pipeline genera un carrusel, selecciona la plantilla según el tono del contenido.</li>
          <li>El motor SVG renderiza cada slide aplicando el branding de tu marca sobre la plantilla.</li>
          <li>Puedes previsualizar los slides en Telegram antes de aprobar.</li>
          <li>En próximas versiones podrás crear y editar plantillas personalizadas.</li>
        </ul>
      </div>
    </div>
  );
}
