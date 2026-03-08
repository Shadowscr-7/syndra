'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── Types ────────────────────────────────────────────────── */

interface ThemeMix { theme: string; percentage: number; reasoning: string }
interface FormatMix { format: string; percentage: number; reasoning: string }
interface ToneMix { tone: string; percentage: number; reasoning: string }
interface PostingWindow { day: string; hours: string[]; reasoning: string }

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priorityScore: number;
  confidenceScore: number;
  recommendedAction: string | null;
}

interface FrequencyRec {
  hasData: boolean;
  optimalPostsPerWeek: number;
  channelBreakdown: Array<{
    platform: string;
    currentPostsPerWeek: number;
    optimalPostsPerWeek: number;
    avgEngagement: number;
    bestDay: string;
    bestHour: string;
  }>;
  formatMixRecommendation: Array<{
    format: string;
    currentShare: number;
    recommendedShare: number;
    avgEngagement: number;
  }>;
  reasoning: string;
}

interface StrategyPlan {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  objective: string | null;
  summary: string | null;
  recommendedThemeMix: ThemeMix[] | null;
  recommendedFormatMix: FormatMix[] | null;
  recommendedToneMix: ToneMix[] | null;
  recommendedPostingWindows: PostingWindow[] | null;
  recommendedCTAs: string[] | null;
  trendReferences: Array<{ topic: string; score: number }> | null;
  weeklyPostTarget: number;
  status: string;
  createdBy: string;
  createdAt: string;
  recommendations: Recommendation[];
}

const TYPE_COLORS: Record<string, string> = {
  THEME: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  FORMAT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  TONE: 'bg-green-500/20 text-green-300 border-green-500/30',
  HOUR: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  CTA: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  TREND: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  CAMPAIGN: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  POST_COUNT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const TYPE_ICONS: Record<string, string> = {
  THEME: '🎯', FORMAT: '📐', TONE: '🎭', HOUR: '⏰',
  CTA: '📣', TREND: '📈', CAMPAIGN: '🎪', POST_COUNT: '📊',
};

/* ── Page Component ───────────────────────────────────────── */

export default function StrategistPage() {
  const [activePlan, setActivePlan] = useState<StrategyPlan | null>(null);
  const [history, setHistory] = useState<StrategyPlan[]>([]);
  const [frequencyRec, setFrequencyRec] = useState<FrequencyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [activeRes, historyRes, freqRes] = await Promise.all([
        fetch(`${API}/api/strategist/active`, { credentials: 'include' }),
        fetch(`${API}/api/strategist/plans?limit=10`, { credentials: 'include' }),
        fetch(`${API}/api/strategist/frequency`, { credentials: 'include' }),
      ]);
      const activeJson = await activeRes.json();
      const historyJson = await historyRes.json();
      const freqJson = await freqRes.json();
      setActivePlan(activeJson?.data ?? null);
      setHistory((historyJson?.data ?? []).filter((p: StrategyPlan) => p.status !== 'ACTIVE'));
      setFrequencyRec(freqJson?.data ?? null);
    } catch (err) {
      console.error('Error fetching strategist data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async (periodType: 'WEEKLY' | 'MONTHLY' = 'WEEKLY') => {
    setGenerating(true);
    try {
      await fetch(`${API}/api/strategist/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType }),
      });
      await fetchData();
    } catch (err) {
      console.error('Error generating plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateCampaign = async (planId: string) => {
    setActionLoading('campaign');
    try {
      await fetch(`${API}/api/strategist/plan/${planId}/create-campaign`, {
        method: 'POST', credentials: 'include',
      });
      toast('ok', '🎪 Campaña creada exitosamente');
    } catch (err) {
      console.error(err);
    } finally { setActionLoading(null); }
  };

  const handleGenerateRuns = async (planId: string) => {
    setActionLoading('runs');
    try {
      const res = await fetch(`${API}/api/strategist/plan/${planId}/generate-runs`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      const count = json?.data?.runs?.length ?? 0;
      toast('ok', `🚀 ${count} runs editoriales creados`);
    } catch (err) {
      console.error(err);
    } finally { setActionLoading(null); }
  };

  const handleArchive = async (planId: string) => {
    try {
      await fetch(`${API}/api/strategist/plan/${planId}/archive`, {
        method: 'PATCH', credentials: 'include',
      });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando estratega IA...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-8 space-y-8">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-sm transition-all ${
          toastMsg.type === 'ok' ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30'
        }`}>
          {toastMsg.text}
          <button onClick={() => setToastMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            🧠 AI Content Strategist
          </h1>
          <p className="text-gray-400 mt-1">
            Planes de contenido generados con IA basados en datos reales de tu audiencia
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleGenerate('WEEKLY')}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 transition-all font-medium disabled:opacity-50"
          >
            {generating ? '⏳ Generando...' : '📅 Generar Plan Semanal'}
          </button>
          <button
            onClick={() => handleGenerate('MONTHLY')}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-[#1a1a2e] border border-gray-700 hover:border-purple-500/50 transition-all font-medium disabled:opacity-50"
          >
            📆 Plan Mensual
          </button>
        </div>
      </div>

      {/* Active Plan */}
      {activePlan ? (
        <div className="space-y-6">
          {/* Plan Header Card */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm font-medium">
                  ✅ ACTIVO
                </span>
                <span className="text-sm text-gray-400">
                  {activePlan.periodType === 'WEEKLY' ? 'Semanal' : 'Mensual'} ·{' '}
                  {new Date(activePlan.startDate).toLocaleDateString('es')} — {new Date(activePlan.endDate).toLocaleDateString('es')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateCampaign(activePlan.id)}
                  disabled={actionLoading === 'campaign'}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 text-sm transition-all disabled:opacity-50"
                >
                  {actionLoading === 'campaign' ? '⏳' : '🎪'} Crear Campaña
                </button>
                <button
                  onClick={() => handleGenerateRuns(activePlan.id)}
                  disabled={actionLoading === 'runs'}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-sm transition-all disabled:opacity-50"
                >
                  {actionLoading === 'runs' ? '⏳' : '🚀'} Generar Runs
                </button>
                <button
                  onClick={() => handleArchive(activePlan.id)}
                  className="px-3 py-1.5 rounded-lg bg-gray-700/30 text-gray-400 border border-gray-600/30 hover:bg-gray-700/50 text-sm transition-all"
                >
                  📦 Archivar
                </button>
              </div>
            </div>

            {/* Summary */}
            <p className="text-gray-300 leading-relaxed text-lg">{activePlan.summary}</p>

            <div className="mt-4 flex gap-6 text-sm text-gray-400">
              <span>🎯 Objetivo: <strong className="text-white">{activePlan.objective ?? 'engagement'}</strong></span>
              <span>📝 Posts/semana: <strong className="text-white">{activePlan.weeklyPostTarget}</strong></span>
              <span>📊 Recomendaciones: <strong className="text-white">{activePlan.recommendations.length}</strong></span>
            </div>
          </div>

          {/* Mixes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Theme Mix */}
            <MixCard
              title="🎯 Temas"
              items={(activePlan.recommendedThemeMix ?? []).map(t => ({
                label: t.theme,
                percentage: t.percentage,
                sub: t.reasoning,
              }))}
              color="purple"
            />
            {/* Format Mix */}
            <MixCard
              title="📐 Formatos"
              items={(activePlan.recommendedFormatMix ?? []).map(f => ({
                label: f.format,
                percentage: f.percentage,
                sub: f.reasoning,
              }))}
              color="blue"
            />
            {/* Tone Mix */}
            <MixCard
              title="🎭 Tonos"
              items={(activePlan.recommendedToneMix ?? []).map(t => ({
                label: t.tone,
                percentage: t.percentage,
                sub: t.reasoning,
              }))}
              color="green"
            />
            {/* Posting Windows */}
            <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-yellow-400 mb-3">⏰ Horarios Óptimos</h3>
              <div className="space-y-2">
                {(activePlan.recommendedPostingWindows ?? []).map((w, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-white font-medium capitalize">{w.day}</span>
                    <span className="text-gray-400 ml-2">{w.hours.join(', ')}</span>
                    <p className="text-xs text-gray-500">{w.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          {activePlan.recommendedCTAs && activePlan.recommendedCTAs.length > 0 && (
            <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-pink-400 mb-3">📣 CTAs Recomendados</h3>
              <div className="flex flex-wrap gap-2">
                {activePlan.recommendedCTAs.map((cta, i) => (
                  <span key={i} className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-lg text-sm text-pink-300">
                    "{cta}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trend References */}
          {activePlan.trendReferences && activePlan.trendReferences.length > 0 && (
            <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-orange-400 mb-3">📈 Tendencias Integradas</h3>
              <div className="flex flex-wrap gap-2">
                {activePlan.trendReferences.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-300">
                    {t.topic} <span className="text-orange-500">({(t.score * 100).toFixed(0)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Frequency Recommendation */}
          {frequencyRec?.hasData && (
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#1a1a30] rounded-xl border border-indigo-500/20 p-5">
              <h3 className="text-sm font-semibold text-indigo-400 mb-3">📊 Recomendación de Frecuencia</h3>
              <p className="text-xs text-gray-400 mb-4">{frequencyRec.reasoning}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel breakdown */}
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Por Canal</h4>
                  <div className="space-y-2">
                    {frequencyRec.channelBreakdown.map((ch, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-black/20 rounded-lg px-3 py-2">
                        <span className="text-white font-medium capitalize">{ch.platform}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-400">Actual: {ch.currentPostsPerWeek}/sem</span>
                          <span className="text-indigo-400 font-medium">→ {ch.optimalPostsPerWeek}/sem</span>
                          <span className="text-green-400">{ch.avgEngagement}% eng</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Format mix */}
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Mix de Formatos</h4>
                  <div className="space-y-2">
                    {frequencyRec.formatMixRecommendation.map((f, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-white font-medium capitalize">{f.format}</span>
                          <span className="text-xs text-gray-400">{f.currentShare}% → <span className="text-indigo-400">{f.recommendedShare}%</span></span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 flex">
                          <div className="bg-gray-600 h-1.5 rounded-full" style={{ width: `${f.currentShare}%` }} />
                          <div className="bg-indigo-500 h-1.5 rounded-full -ml-px" style={{ width: `${Math.max(0, f.recommendedShare - f.currentShare)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="text-lg font-bold text-indigo-300">
                  {frequencyRec.optimalPostsPerWeek} posts/semana recomendados
                </span>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h2 className="text-xl font-bold mb-4">💡 Recomendaciones Estratégicas</h2>
            <div className="space-y-3">
              {activePlan.recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
              {activePlan.recommendations.length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay recomendaciones en este plan.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-12 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-bold mb-2">Sin plan estratégico activo</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Genera tu primer plan semanal basado en analytics, tendencias y aprendizaje de tu audiencia.
          </p>
          <button
            onClick={() => handleGenerate('WEEKLY')}
            disabled={generating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 transition-all font-medium disabled:opacity-50"
          >
            {generating ? '⏳ Generando plan...' : '🚀 Generar Mi Primer Plan'}
          </button>
        </div>
      )}

      {/* History Toggle */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showHistory ? '▼' : '▶'} Historial de planes ({history.length})
          </button>
          {showHistory && (
            <div className="mt-4 space-y-3">
              {history.map(plan => (
                <div key={plan.id} className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400'
                        : plan.status === 'ARCHIVED' ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {plan.status}
                      </span>
                      <span className="text-sm text-gray-400">
                        {plan.periodType} · {new Date(plan.startDate).toLocaleDateString('es')} — {new Date(plan.endDate).toLocaleDateString('es')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1 line-clamp-1">{plan.summary}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {plan.recommendations.length} recs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function MixCard({ title, items, color }: {
  title: string;
  items: Array<{ label: string; percentage: number; sub: string }>;
  color: string;
}) {
  const barColors: Record<string, string> = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-4">
      <h3 className={`text-sm font-semibold text-${color}-400 mb-3`}>{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-white font-medium capitalize">{item.label}</span>
              <span className="text-gray-400">{item.percentage}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`${barColors[color] ?? 'bg-purple-500'} h-2 rounded-full transition-all`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-500">Sin datos</p>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{TYPE_ICONS[rec.type] ?? '💡'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[rec.type] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
              {rec.type}
            </span>
            <h4 className="font-semibold text-white truncate">{rec.title}</h4>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{rec.description}</p>
          {rec.recommendedAction && (
            <p className="text-sm text-purple-400 mt-2 font-medium">
              → {rec.recommendedAction}
            </p>
          )}
          <div className="flex gap-4 mt-2">
            <ScoreBadge label="Prioridad" value={rec.priorityScore} />
            <ScoreBadge label="Confianza" value={rec.confidenceScore} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className="text-xs text-gray-500">
      {label}: <span className={color}>{pct}%</span>
    </span>
  );
}
