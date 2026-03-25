'use client';

import { useEffect, useState, useCallback } from 'react';

/* ── Types ────────────────────────────────────────────────── */

interface TrendSignal {
  id: string;
  themeLabel: string;
  normalizedTopic: string;
  sourceType: string;
  sourceUrl: string | null;
  headline: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  noveltyScore: number;
  momentumScore: number;
  brandFitScore: number;
  engagementPotentialScore: number;
  urgencyScore: number;
  finalScore: number;
  recommendedWindowHours: number;
  suggestedAngle: string | null;
  status: string;
  createdAt: string;
}

interface ResearchSource {
  id: string;
  name: string;
  type: string;
  url: string;
  isActive: boolean;
  lastFetched: string | null;
  createdAt: string;
}

type TabStatus = 'all' | 'NEW' | 'USED' | 'DISMISSED' | 'EXPIRED';

/* ── Page Component ───────────────────────────────────────── */

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);

  // Sources management
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', type: 'RSS' as string, url: '' });
  const [addingSource, setAddingSource] = useState(false);

  const toast = (type: 'ok' | 'err' | 'warn', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchTrends = useCallback(async () => {
    try {
      const url = activeTab === 'all'
        ? `/api/trends`
        : `/api/trends?status=${activeTab}`;
      const res = await fetch(url, { credentials: 'include' });
      const json = await res.json();
      setTrends(json?.data ?? []);
    } catch (err) {
      console.error('Error fetching trends:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/trends/sources', { credentials: 'include' });
      const json = await res.json();
      setSources(json?.data ?? []);
    } catch (err) { console.error('Error fetching sources:', err); }
  }, []);

  useEffect(() => { if (showSources) fetchSources(); }, [showSources, fetchSources]);

  // Load sources count on mount
  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleAddSource = async () => {
    if (!newSource.name.trim() || !newSource.url.trim()) return;
    setAddingSource(true);
    try {
      const res = await fetch('/api/trends/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSource),
      });
      if (res.ok) {
        setNewSource({ name: '', type: 'RSS', url: '' });
        toast('ok', '✅ Fuente agregada');
        fetchSources();
      } else {
        toast('err', '❌ Error al agregar fuente');
      }
    } catch { toast('err', '❌ Error de conexión'); }
    finally { setAddingSource(false); }
  };

  const handleToggleSource = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/trends/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchSources();
    } catch { toast('err', '❌ Error al actualizar fuente'); }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/trends/sources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      toast('ok', '🗑️ Fuente eliminada');
      fetchSources();
    } catch { toast('err', '❌ Error al eliminar fuente'); }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const res = await fetch(`/api/trends/detect`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      const count = json?.data?.trendsFound ?? 0;
      if (count > 0) {
        await fetchTrends();
      }
      toast(count > 0 ? 'ok' : 'warn', count > 0 ? `🔍 ${count} nuevas tendencias detectadas` : '🔍 No se encontraron nuevas tendencias');
    } catch (err) {
      console.error(err);
    } finally {
      setDetecting(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/trends/${id}/dismiss`, {
        method: 'PATCH', credentials: 'include',
      });
      await fetchTrends();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleCreateRun = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/trends/${id}/create-run`, {
        method: 'POST', credentials: 'include',
      });
      toast('ok', '✅ Run editorial creado desde la tendencia');
      await fetchTrends();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleAddToPlan = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/trends/${id}/add-to-plan`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (json?.data) {
        toast('ok', '✅ Tendencia agregada al plan estratégico activo');
      } else {
        toast('warn', '⚠️ No hay plan estratégico activo. Genera uno primero.');
      }
      await fetchTrends();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando tendencias...</div>
      </div>
    );
  }

  const tabs: { label: string; value: TabStatus; icon: string }[] = [
    { label: 'Todas', value: 'all', icon: '🌐' },
    { label: 'Nuevas', value: 'NEW', icon: '🆕' },
    { label: 'Usadas', value: 'USED', icon: '✅' },
    { label: 'Descartadas', value: 'DISMISSED', icon: '🗑️' },
    { label: 'Expiradas', value: 'EXPIRED', icon: '⏳' },
  ];

  const newTrends = trends.filter(t => t.status === 'NEW');
  const avgScore = trends.length > 0 ? trends.reduce((s, t) => s + t.finalScore, 0) / trends.length : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-8 space-y-8">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-sm animate-in slide-in-from-top-2 transition-all ${
          toastMsg.type === 'ok' ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : toastMsg.type === 'warn' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30'
        }`}>
          {toastMsg.text}
          <button onClick={() => setToastMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            📈 Trend Detection
          </h1>
          <p className="text-gray-400 mt-1">
            Tendencias emergentes detectadas automáticamente desde tus fuentes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSources(!showSources)}
            className="px-4 py-2.5 rounded-xl bg-[#1a1a2e] border border-gray-700 hover:border-purple-500/50 transition-all font-medium text-sm"
          >
            ⚙️ Fuentes ({sources.length || '…'})
          </button>
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transition-all font-medium disabled:opacity-50"
          >
            {detecting ? '⏳ Analizando...' : '🔍 Detectar Tendencias'}
          </button>
        </div>
      </div>

      {/* Sources Management Panel */}
      {showSources && (
        <div className="bg-[#1a1a2e] rounded-2xl border border-purple-500/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-purple-300">⚙️ Fuentes de Detección</h2>
            <button onClick={() => setShowSources(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>

          {/* Add source form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={newSource.type}
              onChange={e => setNewSource(s => ({ ...s, type: e.target.value }))}
              className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
            >
              <option value="RSS">📰 RSS Feed</option>
              <option value="BLOG">📝 Blog</option>
              <option value="REDDIT">🤖 Reddit</option>
              <option value="GOOGLE_ALERT">🔔 Google Alert</option>
            </select>
            <input
              value={newSource.name}
              onChange={e => setNewSource(s => ({ ...s, name: e.target.value }))}
              placeholder="Nombre (ej: TechCrunch)"
              className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
            />
            <input
              value={newSource.url}
              onChange={e => setNewSource(s => ({ ...s, url: e.target.value }))}
              placeholder={newSource.type === 'REDDIT' ? 'Subreddit (ej: marketing)' : 'URL del feed'}
              className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
            />
            <button
              onClick={handleAddSource}
              disabled={addingSource || !newSource.name.trim() || !newSource.url.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium transition-all disabled:opacity-50"
            >
              {addingSource ? '...' : '+ Agregar'}
            </button>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>📰 <strong>RSS/Blog:</strong> URL del feed RSS (ej: https://techcrunch.com/feed/)</p>
            <p>🤖 <strong>Reddit:</strong> Nombre del subreddit sin r/ (ej: marketing, socialmedia, entrepreneur)</p>
            <p>🔔 <strong>Google Alert:</strong> Crea una alerta en <a href="https://www.google.com/alerts" target="_blank" rel="noopener" className="text-purple-400 hover:underline">google.com/alerts</a>, selecciona &quot;Feed RSS&quot; como método de entrega, y pega la URL del feed aquí</p>
          </div>

          {/* Source list */}
          {sources.length > 0 ? (
            <div className="space-y-2">
              {sources.map(src => (
                <div key={src.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-4 py-3 border border-gray-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">
                      {src.type === 'REDDIT' ? '🤖' : src.type === 'GOOGLE_ALERT' ? '🔔' : src.type === 'BLOG' ? '📝' : '📰'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-white truncate">{src.name}</div>
                      <div className="text-xs text-gray-500 truncate">{src.type} · {src.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {src.lastFetched && (
                      <span className="text-xs text-gray-600 hidden md:inline">
                        Último: {new Date(src.lastFetched).toLocaleDateString('es')}
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleSource(src.id, src.isActive)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        src.isActive
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-700/30 text-gray-500 hover:bg-gray-700/50'
                      }`}
                    >
                      {src.isActive ? '✓ Activa' : '○ Inactiva'}
                    </button>
                    <button
                      onClick={() => handleDeleteSource(src.id)}
                      className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No hay fuentes configuradas. Agrega feeds RSS, subreddits o Google Alerts.</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tendencias" value={String(trends.length)} icon="📊" />
        <StatCard label="Nuevas" value={String(newTrends.length)} icon="🆕" color="orange" />
        <StatCard label="Score Promedio" value={`${(avgScore * 100).toFixed(0)}%`} icon="📈" color="green" />
        <StatCard label="Ventana Promedio" value={`${trends.length > 0 ? Math.round(trends.reduce((s, t) => s + t.recommendedWindowHours, 0) / trends.length) : 0}h`} icon="⏰" color="yellow" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setLoading(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.value
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Trends Grid */}
      {trends.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trends.map(trend => (
            <TrendCard
              key={trend.id}
              trend={trend}
              loading={actionLoading === trend.id}
              onDismiss={() => handleDismiss(trend.id)}
              onCreateRun={() => handleCreateRun(trend.id)}
              onAddToPlan={() => handleAddToPlan(trend.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-2">No hay tendencias {activeTab !== 'all' ? `con estado "${activeTab}"` : ''}</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {activeTab === 'all' || activeTab === 'NEW'
              ? 'Ejecuta una detección manual o espera al siguiente ciclo automático (cada 4 horas).'
              : 'Cambia de filtro para ver otras tendencias.'}
          </p>
          {(activeTab === 'all' || activeTab === 'NEW') && (
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 font-medium disabled:opacity-50"
            >
              {detecting ? '⏳ Analizando...' : '🚀 Detectar Ahora'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function StatCard({ label, value, icon, color = 'purple' }: {
  label: string; value: string; icon: string; color?: string;
}) {
  const colors: Record<string, string> = {
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] ?? colors.purple} border rounded-xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function TrendCard({ trend, loading, onDismiss, onCreateRun, onAddToPlan }: {
  trend: TrendSignal;
  loading: boolean;
  onDismiss: () => void;
  onCreateRun: () => void;
  onAddToPlan: () => void;
}) {
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const statusColors: Record<string, { bg: string; text: string }> = {
    NEW: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    USED: { bg: 'bg-green-500/20', text: 'text-green-400' },
    DISMISSED: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
    EXPIRED: { bg: 'bg-red-500/20', text: 'text-red-400' },
  };
  const sc = statusColors[trend.status] ?? statusColors.NEW;

  // Time remaining in window
  const createdMs = new Date(trend.createdAt).getTime();
  const windowEndMs = createdMs + trend.recommendedWindowHours * 60 * 60 * 1000;
  const hoursLeft = Math.max(0, Math.round((windowEndMs - Date.now()) / (60 * 60 * 1000)));
  const windowExpired = hoursLeft <= 0;

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 hover:border-orange-500/30 transition-all p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
            {trend.status}
          </span>
          {!windowExpired && trend.status === 'NEW' && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
              ⏰ {hoursLeft}h restantes
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ScoreRing value={trend.finalScore} label="Score" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold text-white mb-1">{trend.themeLabel}</h3>
      {trend.headline && (
        <p className="text-sm text-purple-300 mb-2">{trend.headline}</p>
      )}
      {trend.excerpt && (
        <p className="text-sm text-gray-400 leading-relaxed mb-3 line-clamp-3">{trend.excerpt}</p>
      )}

      {/* Suggested Angle */}
      {trend.suggestedAngle && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3">
          <p className="text-xs text-purple-400 font-medium mb-1">💡 Ángulo sugerido:</p>
          <p className="text-sm text-purple-200">{trend.suggestedAngle}</p>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="grid grid-cols-5 gap-1 mb-4">
        <ScorePill label="Novedad" value={trend.noveltyScore} />
        <ScorePill label="Momentum" value={trend.momentumScore} />
        <ScorePill label="Afinidad" value={trend.brandFitScore} />
        <ScorePill label="Engage" value={trend.engagementPotentialScore} />
        <ScorePill label="Urgencia" value={trend.urgencyScore} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>📰 {trend.sourceType}</span>
        <span>🕐 {new Date(trend.createdAt).toLocaleDateString('es')}</span>
        {trend.sourceUrl && (
          <a href={trend.sourceUrl} target="_blank" rel="noopener" className="text-purple-400 hover:underline truncate max-w-[120px]">
            🔗 Fuente
          </a>
        )}
      </div>

      {/* Actions */}
      {trend.status === 'NEW' && (
        <div className="flex gap-2">
          <button
            onClick={onCreateRun}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-orange-600/20 text-orange-300 border border-orange-500/30 hover:bg-orange-600/30 text-sm font-medium transition-all disabled:opacity-50"
          >
            🚀 Crear Run
          </button>
          <button
            onClick={onAddToPlan}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-sm font-medium transition-all disabled:opacity-50"
          >
            📋 Al Plan
          </button>
          <button
            onClick={onDismiss}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-gray-700/30 text-gray-400 border border-gray-600/30 hover:bg-gray-700/50 text-sm transition-all disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (value * circumference);
  const color = pct >= 70 ? '#f97316' : pct >= 50 ? '#eab308' : '#6b7280';

  return (
    <div className="relative flex items-center justify-center" title={`${label}: ${pct}%`}>
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r="18" stroke="#1f2937" strokeWidth="3" fill="none" />
        <circle
          cx="24" cy="24" r="18"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{pct}</span>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-xs font-bold ${color}`}>{pct}%</div>
      <div className="text-[10px] text-gray-500 truncate">{label}</div>
    </div>
  );
}
