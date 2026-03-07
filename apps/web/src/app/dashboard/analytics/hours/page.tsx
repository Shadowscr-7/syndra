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

function HourBar({ label, value, maxValue, count, extra }: {
  label: string;
  value: number;
  maxValue: number;
  count: number;
  extra: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const isTop = pct >= 80;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-14 text-sm font-mono text-gray-600">{label}</div>
      <div className="flex-1">
        <div className="w-full bg-gray-100 rounded-full h-6 relative overflow-hidden">
          <div
            className={`h-6 rounded-full transition-all ${isTop ? 'bg-green-500' : 'bg-blue-400'}`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
          <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
            {value}% eng · {count} posts · {extra}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function HoursPage() {
  const data = await getTimeAnalytics();

  if (!data) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="text-4xl mb-4">⏰</div>
        <h3 className="text-lg font-semibold text-gray-700">Error cargando datos</h3>
      </div>
    );
  }

  const maxHourEng = Math.max(...data.hourData.map((h) => h.avgEngagement), 1);
  const maxDayEng = Math.max(...data.dayData.map((d) => d.avgEngagement), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⏰ Mejores Horas y Días</h1>
          <p className="text-gray-500 mt-1">
            Optimización de horario basada en {data.totalPublications} publicaciones
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          ← Volver a Analytics
        </Link>
      </div>

      {data.totalPublications === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="font-semibold text-yellow-800">Sin datos suficientes</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Publica contenido para ver qué horarios funcionan mejor.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {data.hourData.slice(0, 3).map((h, i) => (
              <div
                key={h.hour}
                className={`rounded-lg border p-5 text-center ${
                  i === 0
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white'
                }`}
              >
                <div className="text-3xl mb-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div className="text-2xl font-bold">{h.label}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {h.avgEngagement}% engagement promedio
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {h.count} publicaciones · ❤️ {h.avgLikes} · 👁️ {h.avgReach}
                </div>
              </div>
            ))}
          </div>

          {/* Hours Chart */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">📊 Engagement por Hora (ordenado)</h2>
            </div>
            <div className="p-4 space-y-1">
              {data.hourData.map((h) => (
                <HourBar
                  key={h.hour}
                  label={h.label}
                  value={h.avgEngagement}
                  maxValue={maxHourEng}
                  count={h.count}
                  extra={`❤️ ${h.avgLikes} · 👁️ ${h.avgReach}`}
                />
              ))}
            </div>
          </div>

          {/* Days Chart */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">📅 Engagement por Día de Semana</h2>
            </div>
            <div className="p-4 space-y-2">
              {data.dayData.map((d) => (
                <HourBar
                  key={d.day}
                  label={d.label}
                  value={d.avgEngagement}
                  maxValue={maxDayEng}
                  count={d.count}
                  extra={`❤️ ${d.avgLikes} · 👁️ ${d.avgReach}`}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>💡 Tip:</strong> El sistema usa estos datos para el scoring predictivo. Cuando
        programes una publicación, el pipeline asignará un score basándose en el horario, formato y
        tema elegidos.
      </div>
    </div>
  );
}
