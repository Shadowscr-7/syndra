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
}

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
        return (
          <div
            key={theme.id}
            className={`glass-card p-6 ${i < 3 ? 'animate-fade-in-delay-1' : 'animate-fade-in-delay-2'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{theme.name}</h3>
              {theme.type === 'TRENDING' ? (
                <span className="badge" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  🔥 Trending
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                  🌱 Evergreen
                </span>
              )}
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              👥 {theme.audience || 'Sin audiencia definida'}
            </p>

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
