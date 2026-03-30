'use client';

import React, { useEffect, useState, useCallback } from 'react';



interface PatternScore {
  id: string;
  dimensionType: string;
  dimensionValue: string;
  sampleSize: number;
  avgEngagement: number;
  avgReach: number;
  avgSaves: number;
  avgComments: number;
  weightedScore: number;
  trendDirection: string;
  confidenceScore: number;
}

interface LearningProfile {
  id: string;
  status: string;
  confidenceScore: number;
  lastCalculatedAt: string | null;
  dataWindowDays: number;
}

interface LearningConfig {
  autoApply: boolean;
  dimensions: string[];
  minConfidence: number;
  dataWindowDays: number;
}

interface Decision {
  id: string;
  decisionType: string;
  applied: boolean;
  reasonSummary: string;
  beforeValue: string | null;
  afterValue: string | null;
  impactPrediction: string | null;
  createdAt: string;
}

type CopyType = 'AD_PAID' | 'ORGANIC' | 'EMAIL' | 'CAPTION' | 'STORY' | 'OTHER';

interface CopyAnalysisResult {
  tone: string;
  hookType: string;
  cta: string;
  lengthClass: string;
  topPhrases: string[];
  keywords: string[];
}

interface ReferenceCopy {
  id: string;
  title: string | null;
  body: string;
  type: CopyType;
  platform: string | null;
  tags: string[];
  notes: string | null;
  analyzed: boolean;
  analysisResult: CopyAnalysisResult | null;
  createdAt: string;
}

interface BrandMemoryData {
  frequentPhrases: Array<{ phrase: string; count: number }>;
  usedCTAs: Array<{ cta: string; count: number }>;
}

const DIMENSION_LABELS: Record<string, { label: string; icon: string }> = {
  THEME: { label: 'Temática', icon: '🎯' },
  FORMAT: { label: 'Formato', icon: '📐' },
  TONE: { label: 'Tono', icon: '🎭' },
  CTA: { label: 'CTA', icon: '📢' },
  HOUR: { label: 'Hora', icon: '🕐' },
  DAY: { label: 'Día', icon: '📅' },
  HOOK_TYPE: { label: 'Hook', icon: '🪝' },
  LENGTH: { label: 'Extensión', icon: '📏' },
  VISUAL_STYLE: { label: 'Estilo Visual', icon: '🎨' },
};

const TREND_ICONS: Record<string, string> = {
  UP: '📈',
  DOWN: '📉',
  FLAT: '→',
};

const DECISION_LABELS: Record<string, string> = {
  CHOOSE_TONE: 'Tono',
  CHOOSE_FORMAT: 'Formato',
  CHOOSE_HOUR: 'Hora',
  CHOOSE_THEME: 'Temática',
  CHOOSE_CTA: 'CTA',
  CHOOSE_HOOK: 'Hook',
  AVOID_FATIGUE: 'Anti-fatiga',
  BOOST_ENGAGEMENT: 'Boost',
};

const COPY_TYPE_LABELS: Record<CopyType, string> = {
  AD_PAID: 'Publicidad Pagada',
  ORGANIC: 'Orgánico',
  EMAIL: 'Email',
  CAPTION: 'Caption',
  STORY: 'Story',
  OTHER: 'Otro',
};

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'email', 'twitter', 'youtube'];

export default function LearningPage() {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, PatternScore[]>>({});
  const [config, setConfig] = useState<LearningConfig | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'patterns' | 'decisions' | 'copies'>('patterns');

  // Copies state
  const [copies, setCopies] = useState<ReferenceCopy[]>([]);
  const [brandMemory, setBrandMemory] = useState<BrandMemoryData | null>(null);
  const [showCopyForm, setShowCopyForm] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [copyForm, setCopyForm] = useState({
    title: '',
    body: '',
    type: 'AD_PAID' as CopyType,
    platform: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, decisionsRes] = await Promise.all([
        fetch(`/api/learning/profile`, { credentials: 'include' }),
        fetch(`/api/learning/decisions?limit=30`, { credentials: 'include' }),
      ]);
      const profileJson = await profileRes.json();
      const decisionsJson = await decisionsRes.json();

      const d = profileJson?.data;
      if (d) {
        setProfile(d.profile ?? null);
        setDimensions(d.dimensions ?? {});
        setConfig(d.config ?? null);
      }

      const decs = decisionsJson?.data;
      setDecisions(Array.isArray(decs) ? decs : []);
    } catch (err) {
      console.error('Error fetching learning data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCopies = useCallback(async () => {
    try {
      const [copiesRes, memoryRes] = await Promise.all([
        fetch('/api/reference-copy', { credentials: 'include' }),
        fetch('/api/brand-memory', { credentials: 'include' }),
      ]);
      const copiesJson = await copiesRes.json();
      const memoryJson = await memoryRes.json();
      setCopies(Array.isArray(copiesJson?.data) ? copiesJson.data : []);
      setBrandMemory(memoryJson?.data ?? null);
    } catch (err) {
      console.error('Error fetching copies:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCopies();
  }, [fetchData, fetchCopies]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await fetch(`/api/learning/recalculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchData();
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggleAutoApply = async () => {
    if (!config) return;
    try {
      const res = await fetch(`/api/learning/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApply: !config.autoApply }),
      });
      const json = await res.json();
      if (json?.data) setConfig(json.data);
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleCreateCopy = async () => {
    if (!copyForm.body.trim()) return;
    setSavingCopy(true);
    try {
      await fetch('/api/reference-copy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...copyForm,
          title: copyForm.title.trim() || null,
          platform: copyForm.platform || null,
          notes: copyForm.notes.trim() || null,
        }),
      });
      setCopyForm({ title: '', body: '', type: 'AD_PAID', platform: '', notes: '' });
      setShowCopyForm(false);
      await fetchCopies();
    } catch (err) {
      console.error('Error creating copy:', err);
    } finally {
      setSavingCopy(false);
    }
  };

  const handleDeleteCopy = async (id: string) => {
    await fetch(`/api/reference-copy/${id}`, { method: 'DELETE', credentials: 'include' });
    await fetchCopies();
  };

  const handleAnalyzeOne = async (id: string) => {
    setAnalyzingId(id);
    try {
      await fetch(`/api/reference-copy/${id}/analyze`, {
        method: 'POST',
        credentials: 'include',
      });
      await fetchCopies();
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    try {
      await fetch('/api/reference-copy/analyze-all', {
        method: 'POST',
        credentials: 'include',
      });
      await fetchCopies();
    } catch (err) {
      console.error('Batch analysis error:', err);
    } finally {
      setAnalyzingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-float">🧠</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Cargando aprendizaje…</p>
        </div>
      </div>
    );
  }

  const confidencePct = profile ? Math.round(profile.confidenceScore * 100) : 0;
  const statusLabel =
    profile?.status === 'ACTIVE' ? '✅ Activo' :
    profile?.status === 'LOW_DATA' ? '📊 Datos insuficientes' :
    profile?.status === 'DISABLED' ? '⏸️ Desactivado' : '—';

  const allPatterns = Object.values(dimensions).flat();
  const topPatterns = [...allPatterns].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 5);
  const weakPatterns = [...allPatterns].sort((a, b) => a.weightedScore - b.weightedScore).filter(p => p.weightedScore < 45).slice(0, 5);

  const pendingCopies = copies.filter(c => !c.analyzed);

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(124,58,237,0.4)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--color-text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🧠 Aprendizaje Inteligente</h1>
        <p className="page-subtitle">
          Syndra aprende de tu audiencia y optimiza automáticamente tus estrategias de contenido
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-5 stat-gradient-purple">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Confianza</div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{confidencePct}%</div>
          <div className="w-full h-2 rounded-full mt-2" style={{ background: 'rgba(124,58,237,0.2)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${confidencePct}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
            />
          </div>
        </div>

        <div className="glass-card p-5 stat-gradient-cyan">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Estado</div>
          <div className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{statusLabel}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Ventana: {profile?.dataWindowDays ?? 30} días
          </div>
        </div>

        <div className="glass-card p-5 stat-gradient-green">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Patrones</div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{allPatterns.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {Object.keys(dimensions).length} dimensiones analizadas
          </div>
        </div>

        <div className="glass-card p-5 stat-gradient-amber">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Modo</div>
          <div className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>
            {config?.autoApply ? '⚡ Automático' : '💡 Recomendación'}
          </div>
          <button
            onClick={handleToggleAutoApply}
            className="text-xs mt-2 underline cursor-pointer"
            style={{ color: 'var(--color-primary)' }}
          >
            {config?.autoApply ? 'Cambiar a recomendación' : 'Activar modo automático'}
          </button>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between animate-fade-in-delay-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('patterns')}
            className={activeTab === 'patterns' ? 'btn-primary' : 'btn-ghost'}
          >
            📊 Patrones
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={activeTab === 'decisions' ? 'btn-primary' : 'btn-ghost'}
          >
            📋 Decisiones ({decisions.length})
          </button>
          <button
            onClick={() => setActiveTab('copies')}
            className={activeTab === 'copies' ? 'btn-primary' : 'btn-ghost'}
          >
            📝 Mis Copies ({copies.length})
          </button>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="btn-ghost"
        >
          {recalculating ? '⏳ Recalculando…' : '🔄 Recalcular ahora'}
        </button>
      </div>

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top performers */}
          {topPatterns.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                ⭐ Lo que mejor funciona
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topPatterns.map((p) => {
                  const dimInfo = DIMENSION_LABELS[p.dimensionType] ?? { label: p.dimensionType, icon: '📊' };
                  return (
                    <div key={p.id} className="glass-card p-4" style={{ border: '1px solid rgba(124,58,237,0.3)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="chip">{dimInfo.icon} {dimInfo.label}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {TREND_ICONS[p.trendDirection] ?? '→'} n={p.sampleSize}
                        </span>
                      </div>
                      <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                        {p.dimensionValue}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(124,58,237,0.15)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(p.weightedScore, 100)}%`,
                              background: p.weightedScore >= 60
                                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                                : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {p.weightedScore.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak patterns */}
          {weakPatterns.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                ⚠️ Áreas de mejora
              </h2>
              <div className="space-y-2">
                {weakPatterns.map((p) => {
                  const dimInfo = DIMENSION_LABELS[p.dimensionType] ?? { label: p.dimensionType, icon: '📊' };
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <span className="chip">{dimInfo.icon} {dimInfo.label}</span>
                      <span className="font-medium flex-1" style={{ color: 'var(--color-text)' }}>
                        {p.dimensionValue}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {TREND_ICONS[p.trendDirection]} Score: {p.weightedScore.toFixed(0)} · n={p.sampleSize}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Patterns by dimension */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(dimensions).map(([dim, scores]) => {
              const dimInfo = DIMENSION_LABELS[dim] ?? { label: dim, icon: '📊' };
              const sorted = [...scores].sort((a, b) => b.weightedScore - a.weightedScore);
              return (
                <div key={dim} className="glass-card p-5">
                  <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
                    {dimInfo.icon} {dimInfo.label}
                  </h3>
                  <div className="space-y-2">
                    {sorted.slice(0, 6).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--color-text-muted)' }}>
                          {i + 1}
                        </span>
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                          {s.dimensionValue}
                        </span>
                        <div className="w-24 h-1.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(s.weightedScore, 100)}%`,
                              background: s.weightedScore >= 60
                                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                                : s.weightedScore >= 40
                                  ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                                  : 'linear-gradient(90deg, #ef4444, #f97316)',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
                          {s.weightedScore.toFixed(0)}
                        </span>
                        <span className="text-xs" title={`Tendencia: ${s.trendDirection}`}>
                          {TREND_ICONS[s.trendDirection] ?? '→'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {sorted.length > 6 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      +{sorted.length - 6} más
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {allPatterns.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">🔬</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Aún no hay datos suficientes
              </h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Syndra necesita al menos 3 publicaciones con métricas para comenzar a aprender.
                Sigue publicando contenido y las recomendaciones aparecerán automáticamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div className="space-y-3 animate-fade-in">
          {decisions.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Sin decisiones registradas
              </h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Las decisiones de aprendizaje se registran cuando el pipeline editorial se ejecuta
                con datos de aprendizaje disponibles.
              </p>
            </div>
          ) : (
            decisions.map((d) => (
              <div key={d.id} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`badge ${d.applied ? '' : ''}`}
                    style={{
                      background: d.applied ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                      color: d.applied ? '#10b981' : '#a78bfa',
                    }}
                  >
                    <span className="badge-dot" style={{ background: d.applied ? '#10b981' : '#a78bfa' }} />
                    {d.applied ? 'Auto-aplicado' : 'Recomendación'}
                  </span>
                  <span className="chip">
                    {DECISION_LABELS[d.decisionType] ?? d.decisionType}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(d.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {d.reasonSummary}
                </p>
                {(d.beforeValue || d.afterValue) && (
                  <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {d.beforeValue && <span>Antes: <strong>{d.beforeValue}</strong></span>}
                    {d.afterValue && <span>Después: <strong>{d.afterValue}</strong></span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Mis Copies Tab */}
      {activeTab === 'copies' && (
        <div className="space-y-6 animate-fade-in">

          {/* BrandMemory summary */}
          {brandMemory && (brandMemory.usedCTAs?.length > 0 || brandMemory.frequentPhrases?.length > 0) && (
            <div className="glass-card p-5" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
              <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>
                🧠 Lo que Syndra ya aprendió de tu estilo creativo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brandMemory.usedCTAs?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      CTAs detectados
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {brandMemory.usedCTAs.slice(0, 8).map((c, i) => (
                        <span key={i} className="chip text-xs">
                          {c.cta}
                          {c.count > 1 && <span style={{ opacity: 0.6 }}> ×{c.count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {brandMemory.frequentPhrases?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Frases frecuentes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {brandMemory.frequentPhrases.slice(0, 6).map((p, i) => (
                        <span key={i} className="chip text-xs truncate max-w-[200px]" title={p.phrase}>
                          {p.phrase.length > 40 ? `${p.phrase.substring(0, 40)}…` : p.phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setShowCopyForm(v => !v)}
              className="btn-primary"
            >
              {showCopyForm ? '✕ Cancelar' : '+ Agregar Copy'}
            </button>
            {pendingCopies.length > 0 && (
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzingAll}
                className="btn-ghost"
              >
                {analyzingAll
                  ? '⏳ Analizando…'
                  : `🔍 Analizar todo (${pendingCopies.length} pendiente${pendingCopies.length > 1 ? 's' : ''})`}
              </button>
            )}
          </div>

          {/* Add Copy Form */}
          {showCopyForm && (
            <div className="glass-card p-6 space-y-4" style={{ border: '1px solid rgba(124,58,237,0.3)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                Nuevo Copy de Referencia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Título <span style={{ opacity: 0.5 }}>(opcional)</span>
                  </label>
                  <input
                    style={fieldStyle}
                    placeholder="Ej: Ad verano 2024 — Instagram"
                    value={copyForm.title}
                    onChange={e => setCopyForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Tipo *
                  </label>
                  <select
                    style={fieldStyle}
                    value={copyForm.type}
                    onChange={e => setCopyForm(f => ({ ...f, type: e.target.value as CopyType }))}
                  >
                    {(Object.keys(COPY_TYPE_LABELS) as CopyType[]).map(t => (
                      <option key={t} value={t} style={{ background: '#1e1b2e', color: '#e2e0f0' }}>{COPY_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Texto del copy *
                </label>
                <textarea
                  style={{ ...fieldStyle, minHeight: '120px', resize: 'vertical' }}
                  placeholder="Pega aquí tu copy publicitario, caption, guión o contenido de referencia…"
                  value={copyForm.body}
                  onChange={e => setCopyForm(f => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Plataforma <span style={{ opacity: 0.5 }}>(opcional)</span>
                  </label>
                  <select
                    style={fieldStyle}
                    value={copyForm.platform}
                    onChange={e => setCopyForm(f => ({ ...f, platform: e.target.value }))}
                  >
                    <option value="" style={{ background: '#1e1b2e', color: '#e2e0f0' }}>— Sin especificar —</option>
                    {PLATFORMS.map(p => (
                      <option key={p} value={p} style={{ background: '#1e1b2e', color: '#e2e0f0' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Notas <span style={{ opacity: 0.5 }}>(opcional)</span>
                  </label>
                  <input
                    style={fieldStyle}
                    placeholder="Ej: Mejor conversión en Q4, campaña navidad"
                    value={copyForm.notes}
                    onChange={e => setCopyForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCopy}
                  disabled={savingCopy || !copyForm.body.trim()}
                  className="btn-primary"
                >
                  {savingCopy ? 'Guardando…' : 'Guardar Copy'}
                </button>
                <button onClick={() => setShowCopyForm(false)} className="btn-ghost">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Copies list */}
          {copies.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Sin copies de referencia aún
              </h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Agrega tus mejores copies y publicidades para que Syndra aprenda tu estilo creativo,
                tono favorito y las frases que mejor conectan con tu audiencia.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {copies.map(copy => (
                <div key={copy.id} className="glass-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="chip">{COPY_TYPE_LABELS[copy.type]}</span>
                        {copy.platform && (
                          <span className="chip" style={{ opacity: 0.7 }}>
                            {copy.platform.charAt(0).toUpperCase() + copy.platform.slice(1)}
                          </span>
                        )}
                        <span
                          className="badge"
                          style={{
                            background: copy.analyzed ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)',
                            color: copy.analyzed ? '#10b981' : '#a78bfa',
                          }}
                        >
                          <span
                            className="badge-dot"
                            style={{ background: copy.analyzed ? '#10b981' : '#a78bfa' }}
                          />
                          {copy.analyzed ? 'Analizado' : 'Sin analizar'}
                        </span>
                      </div>
                      {copy.title && (
                        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                          {copy.title}
                        </h3>
                      )}
                      <p
                        className="text-sm"
                        style={{
                          color: 'var(--color-text-muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {copy.body}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleAnalyzeOne(copy.id)}
                        disabled={analyzingId === copy.id}
                        className="btn-ghost text-xs whitespace-nowrap"
                      >
                        {analyzingId === copy.id ? '⏳ Analizando…' : '🔍 Analizar'}
                      </button>
                      <button
                        onClick={() => handleDeleteCopy(copy.id)}
                        className="btn-ghost text-xs"
                        style={{ color: '#ef4444' }}
                      >
                        🗑 Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Analysis result panel */}
                  {copy.analyzed && copy.analysisResult && (
                    <div
                      className="mt-4 pt-4"
                      style={{ borderTop: '1px solid rgba(124,58,237,0.15)' }}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Tono</span>
                          <p className="font-semibold mt-0.5 capitalize" style={{ color: 'var(--color-text)' }}>
                            {copy.analysisResult.tone || '—'}
                          </p>
                        </div>
                        <div>
                          <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Tipo de hook</span>
                          <p className="font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                            {copy.analysisResult.hookType || '—'}
                          </p>
                        </div>
                        <div>
                          <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Extensión</span>
                          <p className="font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                            {copy.analysisResult.lengthClass || '—'}
                          </p>
                        </div>
                        {copy.analysisResult.cta && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>CTA detectado</span>
                            <p className="font-semibold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                              &ldquo;{copy.analysisResult.cta}&rdquo;
                            </p>
                          </div>
                        )}
                        {copy.analysisResult.topPhrases?.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Frases clave</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {copy.analysisResult.topPhrases.map((ph, i) => (
                                <span key={i} className="chip text-xs">{ph}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {copy.analysisResult.keywords?.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Keywords</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {copy.analysisResult.keywords.map((kw, i) => (
                                <span key={i} className="chip text-xs" style={{ opacity: 0.75 }}>{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
