import Link from 'next/link';
import { prisma } from '@automatismos/db';

// ============================================================
// Analytics — Mejores Horas y Días de Publicación
// ============================================================

async function getTimeAnalytics() {
  try {
    const publications = await prisma.publication.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      select: {
        publishedAt: true,
        engagementRate: true,
        likes: true,
        comments: true,
        reach: true,
      },
    });

    // By hour
    const hours = new Map<number, { count: number; engagement: number; likes: number; reach: number }>();
    // By day of week
    const days = new Map<number, { count: number; engagement: number; likes: number; reach: number }>();

    for (const pub of publications) {
      if (!pub.publishedAt) continue;
      const hour = pub.publishedAt.getHours();
      const day = pub.publishedAt.getDay();

      const h = hours.get(hour) ?? { count: 0, engagement: 0, likes: 0, reach: 0 };
      h.count++;
      h.engagement += pub.engagementRate ?? 0;
      h.likes += pub.likes;
      h.reach += pub.reach;
      hours.set(hour, h);

      const d = days.get(day) ?? { count: 0, engagement: 0, likes: 0, reach: 0 };
      d.count++;
      d.engagement += pub.engagementRate ?? 0;
      d.likes += pub.likes;
      d.reach += pub.reach;
      days.set(day, d);
    }

    const hourData = Array.from(hours.entries())
      .map(([hour, data]) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        count: data.count,
        avgEngagement: Number((data.engagement / data.count).toFixed(2)),
        avgLikes: Math.round(data.likes / data.count),
        avgReach: Math.round(data.reach / data.count),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayData = Array.from(days.entries())
      .map(([day, data]) => ({
        day,
        label: dayNames[day] ?? 'Desconocido',
        count: data.count,
        avgEngagement: Number((data.engagement / data.count).toFixed(2)),
        avgLikes: Math.round(data.likes / data.count),
        avgReach: Math.round(data.reach / data.count),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    return { hourData, dayData, totalPublications: publications.length };
  } catch {
    return null;
  }
}

function TimeBar({ label, value, maxValue, count, likes, reach, rank }: {
  label: string;
  value: number;
  maxValue: number;
  count: number;
  likes: number;
  reach: number;
  rank: number;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const isTop = rank < 3;

  const barGradient = isTop
    ? 'linear-gradient(90deg, #10b981, #34d399)'
    : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))';

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div
        className="w-16 text-sm font-mono font-semibold text-right shrink-0"
        style={{ color: isTop ? '#10b981' : 'var(--color-text-secondary)' }}
      >
        {label}
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(pct, 3)}%`, background: barGradient }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
          <span style={{ color: isTop ? '#10b981' : 'var(--color-primary-light)' }} className="font-semibold min-w-[36px] text-right">
            {value}%
          </span>
          <span>❤️ {likes}</span>
          <span>👁️ {reach}</span>
          <span className="opacity-60">{count} pub</span>
        </div>
      </div>
    </div>
  );
}

export default async function HoursPage() {
  const data = await getTimeAnalytics();

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <span className="text-4xl animate-float inline-block mb-4">⏰</span>
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Error cargando datos</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>No se pudieron obtener los datos temporales.</p>
      </div>
    );
  }

  const maxHourEng = Math.max(...data.hourData.map((h) => h.avgEngagement), 1);
  const maxDayEng = Math.max(...data.dayData.map((d) => d.avgEngagement), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">⏰ Mejores Horas y Días</h1>
          <p className="page-subtitle">
            Optimización de horario basada en {data.totalPublications} publicaciones
          </p>
        </div>
        <Link href="/dashboard/analytics" className="btn-ghost text-sm">
          ← Volver a Analytics
        </Link>
      </div>

      {data.totalPublications === 0 ? (
        <div className="glass-card p-8 text-center animate-fade-in-delay-1" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
          <span className="text-5xl animate-float inline-block mb-4">📭</span>
          <h3 className="font-bold" style={{ color: '#f59e0b' }}>Sin datos suficientes</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Publica contenido para ver qué horarios funcionan mejor.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-delay-1">
            {data.hourData.slice(0, 3).map((h, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const colors = [
                { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#10b981' },
                { bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.2)', text: 'var(--color-primary-light)' },
                { bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.2)', text: '#06b6d4' },
              ];
              const c = colors[i];
              return (
                <div
                  key={h.hour}
                  className="glass-card p-5 text-center"
                  style={{ background: c.bg, borderColor: c.border }}
                >
                  <div className="text-3xl mb-2">{medals[i]}</div>
                  <div className="text-3xl font-black tracking-tight" style={{ color: c.text }}>
                    {h.label}
                  </div>
                  <div className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="font-bold" style={{ color: c.text }}>{h.avgEngagement}%</span> engagement promedio
                  </div>
                  <div className="text-xs mt-1.5 flex items-center justify-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{h.count} publicaciones</span>
                    <span>·</span>
                    <span>❤️ {h.avgLikes}</span>
                    <span>·</span>
                    <span>👁️ {h.avgReach}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hours Chart */}
          <div className="glass-card overflow-hidden animate-fade-in-delay-2">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg">📊</span>
              <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Engagement por Hora</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>
                {data.hourData.length} horas
              </span>
            </div>
            <div className="p-5 space-y-0.5">
              {data.hourData.map((h, i) => (
                <TimeBar
                  key={h.hour}
                  label={h.label}
                  value={h.avgEngagement}
                  maxValue={maxHourEng}
                  count={h.count}
                  likes={h.avgLikes}
                  reach={h.avgReach}
                  rank={i}
                />
              ))}
            </div>
          </div>

          {/* Days Chart */}
          <div className="glass-card overflow-hidden animate-fade-in-delay-1">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg">📅</span>
              <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Engagement por Día de Semana</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>
                {data.dayData.length} días
              </span>
            </div>
            <div className="p-5 space-y-0.5">
              {data.dayData.map((d, i) => (
                <TimeBar
                  key={d.day}
                  label={d.label}
                  value={d.avgEngagement}
                  maxValue={maxDayEng}
                  count={d.count}
                  likes={d.avgLikes}
                  reach={d.avgReach}
                  rank={i}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tip */}
      <div
        className="glass-card px-5 py-4 text-sm animate-fade-in-delay-2"
        style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.04)' }}
      >
        <span style={{ color: 'var(--color-primary-light)' }}>
          <strong>💡 Tip:</strong>
        </span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {' '}El sistema usa estos datos para el scoring predictivo. Cuando
          programes una publicación, el pipeline asignará un score basándose en el horario, formato y
          tema elegidos.
        </span>
      </div>
    </div>
  );
}
