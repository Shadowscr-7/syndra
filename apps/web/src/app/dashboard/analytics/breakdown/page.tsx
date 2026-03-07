import Link from 'next/link';
import { prisma } from '@automatismos/db';

// ============================================================
// Analytics Breakdown — Rendimiento por tema, formato y tono
// ============================================================

interface BreakdownRow {
  label: string;
  count: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  avgReach: number;
  avgEngagement: number;
}

async function getBreakdowns() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const publications = await prisma.publication.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
      include: {
        editorialRun: {
          include: { contentBrief: { include: { theme: true } } },
        },
      },
    });

    const computeBreakdown = (keyFn: (p: (typeof publications)[0]) => string): BreakdownRow[] => {
      const map = new Map<string, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number; engagement: number }>();
      for (const pub of publications) {
        const key = keyFn(pub);
        const existing = map.get(key) ?? { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, engagement: 0 };
        existing.count++;
        existing.likes += pub.likes;
        existing.comments += pub.comments;
        existing.shares += pub.shares;
        existing.saves += pub.saves;
        existing.reach += pub.reach;
        existing.engagement += pub.engagementRate ?? 0;
        map.set(key, existing);
      }

      return Array.from(map.entries())
        .map(([label, d]) => ({
          label,
          count: d.count,
          avgLikes: Math.round(d.likes / d.count),
          avgComments: Math.round(d.comments / d.count),
          avgShares: Math.round(d.shares / d.count),
          avgSaves: Math.round(d.saves / d.count),
          avgReach: Math.round(d.reach / d.count),
          avgEngagement: Number((d.engagement / d.count).toFixed(2)),
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);
    };

    return {
      byTheme: computeBreakdown((p) => p.editorialRun?.contentBrief?.theme?.name ?? 'Sin tema'),
      byFormat: computeBreakdown((p) => p.editorialRun?.contentBrief?.format ?? 'POST'),
      byTone: computeBreakdown((p) => p.editorialRun?.contentBrief?.tone ?? 'Sin tono'),
      byPlatform: computeBreakdown((p) => p.platform),
      byCta: computeBreakdown((p) => {
        const cta = p.editorialRun?.contentBrief?.cta;
        return cta && cta.length > 0 ? cta.slice(0, 40) : 'Sin CTA';
      }),
    };
  } catch {
    return null;
  }
}

function BreakdownTable({ title, icon, rows }: { title: string; icon: string; rows: BreakdownRow[] }) {
  const maxEng = Math.max(...rows.map((r) => r.avgEngagement), 1);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="font-bold text-gray-800">{icon} {title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-gray-400">Sin datos</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50">
                <th className="p-3 text-left">Categoría</th>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">❤️ Likes</th>
                <th className="p-3 text-right">💬 Cmts</th>
                <th className="p-3 text-right">🔄 Shares</th>
                <th className="p-3 text-right">📌 Saves</th>
                <th className="p-3 text-right">👁️ Reach</th>
                <th className="p-3 text-right">💫 Eng%</th>
                <th className="p-3 w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, i) => (
                <tr key={row.label} className={i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                  <td className="p-3 font-medium">
                    {i === 0 && <span className="mr-1">🏆</span>}
                    {row.label}
                  </td>
                  <td className="p-3 text-right text-gray-500">{row.count}</td>
                  <td className="p-3 text-right">{row.avgLikes}</td>
                  <td className="p-3 text-right">{row.avgComments}</td>
                  <td className="p-3 text-right">{row.avgShares}</td>
                  <td className="p-3 text-right">{row.avgSaves}</td>
                  <td className="p-3 text-right">{row.avgReach}</td>
                  <td className="p-3 text-right font-bold">{row.avgEngagement}%</td>
                  <td className="p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(row.avgEngagement / maxEng) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function BreakdownPage() {
  const data = await getBreakdowns();

  if (!data) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-700">Error cargando datos</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Desglose de Rendimiento</h1>
          <p className="text-gray-500 mt-1">
            Comparativa por tema, formato, tono, CTA y plataforma — últimos 30 días
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          ← Volver a Analytics
        </Link>
      </div>

      <BreakdownTable title="Por Temática" icon="💡" rows={data.byTheme} />
      <BreakdownTable title="Por Formato" icon="📐" rows={data.byFormat} />
      <BreakdownTable title="Por Tono" icon="🗣️" rows={data.byTone} />
      <BreakdownTable title="Por Plataforma" icon="📱" rows={data.byPlatform} />
      <BreakdownTable title="Por CTA" icon="🎯" rows={data.byCta} />
    </div>
  );
}
