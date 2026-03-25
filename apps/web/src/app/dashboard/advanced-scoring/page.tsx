'use client';

import { useState } from 'react';
import { getClientSession, getClientApiUrl } from '@/lib/client-session';

interface AdvancedScoreResult {
  overall: number;
  confidence: number;
  breakdown: Array<{ factor: string; impact: number; detail: string }>;
  channelScores: Record<string, number>;
  industryComparison: { yours: number; industry: number; percentile: string };
  seasonal: { currentEvents: string[]; seasonalBoost: number };
  recommendations: string[];
}

export default function AdvancedScoringPage() {
  const [format, setFormat] = useState('');
  const [tone, setTone] = useState('');
  const [channel, setChannel] = useState('');
  const [hour, setHour] = useState('');
  const [day, setDay] = useState('');
  const [industry, setIndustry] = useState('');
  const [result, setResult] = useState<AdvancedScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runScore = async () => {
    setLoading(true);
    try {
      const s = getClientSession();
      const apiUrl = getClientApiUrl();
      const params = new URLSearchParams({ workspaceId: s.workspaceId });
      if (format) params.set('format', format);
      if (tone) params.set('tone', tone);
      if (channel) params.set('channel', channel);
      if (hour) params.set('hour', hour);
      if (day) params.set('day', day);
      if (industry) params.set('industry', industry);

      const res = await fetch(`${apiUrl}/api/analytics/advanced-score?${params}`, {
        headers: { 'x-workspace-id': s.workspaceId, 'x-user-id': s.userId },
      });
      if (res.ok) setResult(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Advanced Scoring</h1>
        <p className="page-subtitle">
          Predice engagement con señales contextuales, breakdown por canal, estacionalidad y benchmarks de industria.
        </p>
      </div>

      {/* Input form */}
      <div className="glass-card p-5 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Formato</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field">
              <option value="">Cualquiera</option>
              {['POST', 'CAROUSEL', 'REEL', 'STORY', 'THREAD', 'ARTICLE', 'VIDEO'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Tono</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="input-field">
              <option value="">Cualquiera</option>
              {['professional', 'casual', 'humorous', 'educational', 'inspirational'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Canal</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input-field">
              <option value="">Cualquiera</option>
              {['instagram', 'facebook', 'threads', 'discord', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'meta_ads', 'google_ads', 'whatsapp', 'mercadolibre'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Hora (0-23)</label>
            <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(e.target.value)} className="input-field" placeholder="ej. 14" />
          </div>
          <div>
            <label className="input-label">Día</label>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="input-field">
              <option value="">Cualquiera</option>
              {['0-Dom', '1-Lun', '2-Mar', '3-Mié', '4-Jue', '5-Vie', '6-Sáb'].map((d) => (
                <option key={d} value={d.split('-')[0]}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Industria</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field">
              <option value="">Default</option>
              {['technology', 'ecommerce', 'education', 'health', 'finance', 'entertainment', 'food', 'travel'].map((i) => (
                <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={runScore} disabled={loading} className="btn-primary mt-4" style={{ opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Calculando...' : '⚡ Calcular Score'}
        </button>
      </div>

      {result && (
        <div className="space-y-5 animate-fade-in-delay-1">
          {/* Overall Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-5 text-center stat-gradient-purple">
              <div className="text-4xl font-bold" style={{ color: 'var(--color-primary-light)' }}>{result.overall}%</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Engagement Esperado</div>
            </div>
            <div className="glass-card p-5 text-center stat-gradient-cyan">
              <div className="text-3xl font-bold" style={{ color: 'var(--color-secondary)' }}>{Math.round(result.confidence * 100)}%</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Confianza</div>
            </div>
            <div className="glass-card p-5 text-center stat-gradient-green">
              <div className="text-xl font-bold" style={{ color: result.industryComparison.percentile.includes('top') ? '#10b981' : result.industryComparison.percentile.includes('below') || result.industryComparison.percentile.includes('bottom') ? '#ef4444' : 'var(--color-text)' }}>
                {result.industryComparison.percentile}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>vs Industria ({result.industryComparison.industry}%)</div>
            </div>
          </div>

          {/* Breakdown */}
          {result.breakdown.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Score Breakdown</h3>
              <div className="space-y-1">
                {result.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border-subtle)', padding: '0.5rem 0' }}>
                    <span className="text-sm font-medium w-24" style={{ color: 'var(--color-text-secondary)' }}>{b.factor}</span>
                    <span className="text-sm font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: b.impact > 10 ? '#10b981' : b.impact < -10 ? '#ef4444' : 'var(--color-text-secondary)' }}>
                      {b.impact > 0 ? '+' : ''}{b.impact}%
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{b.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channel Scores */}
          {Object.keys(result.channelScores).length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Scores por Canal</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.channelScores).sort((a, b) => b[1] - a[1]).map(([ch, val]) => (
                  <div key={ch} className="glass-card p-3 text-center" style={{ background: 'rgba(124,58,237,0.06)' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--color-primary-light)' }}>{val}%</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{ch}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal */}
          {result.seasonal.currentEvents.length > 0 && (
            <div className="glass-card p-4" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))', borderColor: 'rgba(245,158,11,0.2)' }}>
              <h3 className="font-semibold mb-2" style={{ color: '#f59e0b' }}>🗓️ Contexto Estacional</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Eventos activos: <strong style={{ color: 'var(--color-text)' }}>{result.seasonal.currentEvents.join(', ')}</strong> — boost estimado: <span style={{ color: '#10b981' }}>+{result.seasonal.seasonalBoost}%</span>
              </p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>💡 Recomendaciones</h3>
              <ul className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary-light)' }}>→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
