import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';

// ============================================================
// Brand Memory & Fatigue Dashboard (Feature #7)
// ============================================================

async function getBrandMemoryData(workspaceId: string) {
  try {
    const [memory, fatigueScores, highFatigue] = await Promise.all([
      prisma.brandMemory.findUnique({ where: { workspaceId } }),
      prisma.contentFatigueScore.findMany({
        where: { workspaceId },
        orderBy: { fatigueScore: 'desc' },
        take: 50,
      }),
      prisma.contentFatigueScore.findMany({
        where: { workspaceId, fatigueScore: { gte: 50 } },
        orderBy: { fatigueScore: 'desc' },
      }),
    ]);

    return { memory, fatigueScores, highFatigue };
  } catch {
    return null;
  }
}

const DIMENSION_LABELS: Record<string, { label: string; icon: string }> = {
  THEME: { label: 'Tema', icon: '💡' },
  FORMAT: { label: 'Formato', icon: '📐' },
  TONE: { label: 'Tono', icon: '🗣️' },
  CTA: { label: 'CTA', icon: '🎯' },
  HOUR: { label: 'Hora', icon: '⏰' },
  DAY: { label: 'Día', icon: '📅' },
  VISUAL_STYLE: { label: 'Estilo Visual', icon: '🎨' },
  HOOK_TYPE: { label: 'Tipo de Hook', icon: '🪝' },
  LENGTH: { label: 'Longitud', icon: '📏' },
};

function fatigueColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#eab308';
  return '#10b981';
}

function fatigueLabel(score: number): string {
  if (score >= 70) return 'Saturado';
  if (score >= 50) return 'Alto';
  if (score >= 30) return 'Moderado';
  return 'Bajo';
}

export default async function BrandMemoryPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  const data = await getBrandMemoryData(wsId);

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-4xl animate-float inline-block mb-4">🔁</span>
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Memoria de marca no disponible</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Error al conectar con la base de datos</p>
      </div>
    );
  }

  const memory = data.memory;
  const frequentPhrases = (memory?.frequentPhrases as any[] | null) ?? [];
  const usedCTAs = (memory?.usedCTAs as any[] | null) ?? [];
  const overusedWords = (memory?.overusedWords as any[] | null) ?? [];
  const exploitedThemes = (memory?.exploitedThemes as any[] | null) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🔁 Memoria de Marca & Fatiga</h1>
        <p className="page-subtitle">
          Syndra detecta repetición excesiva en tu contenido y sugiere cooldowns para mantener frescura.
        </p>
      </div>

      {/* High Fatigue Alerts */}
      {data.highFatigue.length > 0 && (
        <div className="glass-card p-5 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.05))' }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: '#ef4444' }}>⚠️ Items en Cooldown / Alta Fatiga</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.highFatigue.map((item) => {
              const dimInfo = DIMENSION_LABELS[item.dimensionType] ?? { label: item.dimensionType, icon: '📊' };
              return (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3"
                  style={{
                    border: `1px solid ${fatigueColor(item.fatigueScore)}30`,
                    background: `${fatigueColor(item.fatigueScore)}08`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {dimInfo.icon} {dimInfo.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${fatigueColor(item.fatigueScore)}18`, color: fatigueColor(item.fatigueScore) }}
                    >
                      {fatigueLabel(item.fatigueScore)} ({item.fatigueScore.toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>
                    {item.dimensionValue}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Usado {item.recentUsageCount}x · Cooldown: {item.suggestedCooldownDays}d
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fatigue Scores Overview */}
      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-1">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}>
          <h2 className="font-bold text-sm" style={{ color: '#a78bfa' }}>📊 Scores de Fatiga por Dimensión</h2>
        </div>

        {data.fatigueScores.length === 0 ? (
          <div className="p-10 text-center">
            <span className="text-4xl animate-float inline-block mb-3">📊</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Sin datos de fatiga aún. Se calcula automáticamente cada día a las 3:00 AM o vía{' '}
              <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}>POST /api/brand-memory/analyze</code>
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="space-y-2">
              {data.fatigueScores.map((fs) => {
                const dimInfo = DIMENSION_LABELS[fs.dimensionType] ?? { label: fs.dimensionType, icon: '📊' };
                return (
                  <div key={fs.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-sm w-6 text-center">{dimInfo.icon}</span>
                    <span className="text-xs font-medium w-20" style={{ color: 'var(--color-text-secondary)' }}>
                      {dimInfo.label}
                    </span>
                    <span className="text-xs w-32 truncate" style={{ color: 'var(--color-text)' }}>
                      {fs.dimensionValue}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, fs.fatigueScore)}%`,
                          backgroundColor: fatigueColor(fs.fatigueScore),
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold w-12 text-right" style={{ color: fatigueColor(fs.fatigueScore) }}>
                      {fs.fatigueScore.toFixed(0)}%
                    </span>
                    <span className="text-[10px] w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {fs.recentUsageCount}x
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Brand Memory Details */}
      {memory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-delay-2">
          {/* Frequent Phrases */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
              💬 Frases Frecuentes
            </h3>
            {frequentPhrases.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-2">
                {frequentPhrases.slice(0, 10).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>"{p.phrase || p}"</span>
                    <span className="font-semibold ml-2" style={{ color: '#f59e0b' }}>{p.count ?? '—'}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Used CTAs */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
              🎯 CTAs Usados
            </h3>
            {usedCTAs.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {usedCTAs.slice(0, 15).map((cta: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}
                  >
                    {typeof cta === 'string' ? cta : cta.cta || cta.value || JSON.stringify(cta)}
                    {cta.count != null && <span className="ml-1 opacity-60">({cta.count}x)</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Overused Words */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
              🔤 Palabras Sobreusadas
            </h3>
            {overusedWords.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overusedWords.slice(0, 20).map((w: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-lg text-[10px]"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                  >
                    {typeof w === 'string' ? w : w.word || JSON.stringify(w)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Exploited Themes */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
              💡 Temas Explotados
            </h3>
            {exploitedThemes.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-2">
                {exploitedThemes.slice(0, 10).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{typeof t === 'string' ? t : t.theme || t.name || JSON.stringify(t)}</span>
                    <span className="font-semibold" style={{ color: '#eab308' }}>{t.count ?? '—'}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass-card p-4 text-sm animate-fade-in-delay-3" style={{ color: 'var(--color-text-muted)' }}>
        <strong style={{ color: 'var(--color-text-secondary)' }}>ℹ️ Info:</strong> La memoria de marca se actualiza
        automáticamente cada día a las 3:00 AM. Los scores de fatiga penalizan automáticamente la selección en la
        estrategia IA. Items con fatiga {'>'}70 entran en cooldown de 7 días, {'>'}50 en cooldown de 3 días.
      </div>
    </div>
  );
}
