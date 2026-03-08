'use client';

import { useEffect, useState } from 'react';
import { getClientSession, getClientApiUrl } from '@/lib/client-session';

interface Credits {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  period: string;
}

interface RenderJob {
  id: string;
  tier: string;
  provider: string;
  inputType: string;
  status: string;
  outputUrl?: string;
  renderTimeMs?: number;
  costCredits?: number;
  createdAt: string;
}

interface ProviderInfo {
  provider: string;
  available: boolean;
  tier: string;
}

export default function VideoDashboardPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Render form
  const [script, setScript] = useState('');
  const [tier, setTier] = useState('MVP');
  const [provider, setProvider] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = () => {
    const s = getClientSession();
    return {
      'Content-Type': 'application/json',
      'x-workspace-id': s.workspaceId,
      'x-user-id': s.userId,
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const s = getClientSession();
      const apiUrl = getClientApiUrl();
      const h = getHeaders();

      const [credRes, jobRes, provRes] = await Promise.all([
        fetch(`${apiUrl}/api/videos/credits?workspaceId=${s.workspaceId}`, { headers: h }),
        fetch(`${apiUrl}/api/videos/render?workspaceId=${s.workspaceId}`, { headers: h }),
        fetch(`${apiUrl}/api/videos/providers`, { headers: h }),
      ]);

      if (credRes.ok) setCredits(await credRes.json());
      if (jobRes.ok) setJobs(await jobRes.json());
      if (provRes.ok) setProviders(await provRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitRender = async () => {
    setSubmitting(true);
    try {
      const s = getClientSession();
      const apiUrl = getClientApiUrl();
      await fetch(`${apiUrl}/api/videos/render`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          workspaceId: s.workspaceId,
          tier,
          provider: provider || undefined,
          script,
          inputType: 'SCRIPT',
          duration: 15,
        }),
      });
      setScript('');
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
    QUEUED:     { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
    RENDERING:  { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    COMPLETED:  { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
    FAILED:     { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  };

  const tierStyles: Record<string, { bg: string; color: string; border: string }> = {
    MVP:      { bg: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)', border: 'rgba(124,58,237,0.2)' },
    SELFHOST: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
    PREMIUM:  { bg: 'rgba(236,72,153,0.1)', color: '#ec4899', border: 'rgba(236,72,153,0.2)' },
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Video Pipeline</h1>
        <p className="page-subtitle">Genera videos con IA — créditos, proveedores y render jobs</p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>
      ) : (
        <>
          {/* Credits overview */}
          {credits && (
            <div className="grid grid-cols-3 gap-4 animate-fade-in">
              <div className="glass-card p-5 text-center stat-gradient-cyan">
                <div className="text-3xl font-bold" style={{ color: 'var(--color-secondary)' }}>{credits.remainingCredits}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Créditos Restantes</div>
              </div>
              <div className="glass-card p-5 text-center stat-gradient-purple">
                <div className="text-3xl font-bold" style={{ color: 'var(--color-primary-light)' }}>{credits.usedCredits}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Usados Este Período</div>
              </div>
              <div className="glass-card p-5 text-center stat-gradient-blue">
                <div className="text-3xl font-bold" style={{ color: '#60a5fa' }}>{credits.totalCredits}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Total ({credits.period})</div>
              </div>
            </div>
          )}

          {/* Available providers */}
          <div className="glass-card p-5 animate-fade-in-delay-1">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Proveedores Disponibles</h3>
            <div className="flex gap-2 flex-wrap">
              {providers.map((p) => {
                const ts = tierStyles[p.tier] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
                return (
                  <span key={p.provider} className="chip" style={{ background: ts.bg, color: ts.color, borderColor: ts.border }}>
                    {p.provider} ({p.tier})
                  </span>
                );
              })}
            </div>
          </div>

          {/* New render form */}
          <div className="glass-card p-5 space-y-3 animate-fade-in-delay-2">
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Crear Video Render</h3>
            <textarea
              placeholder="Script del video..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="input-field"
              rows={3}
            />
            <div className="flex gap-4">
              <div>
                <label className="input-label">Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className="input-field">
                  <option value="MVP">MVP (1 crédito)</option>
                  <option value="SELFHOST">Self-hosted (gratis)</option>
                  <option value="PREMIUM">Premium (5 créditos)</option>
                </select>
              </div>
              <div>
                <label className="input-label">Provider (opcional)</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field">
                  <option value="">Auto</option>
                  {providers.map((p) => (
                    <option key={p.provider} value={p.provider}>{p.provider}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={submitRender}
              disabled={!script.trim() || submitting}
              className="btn-primary"
              style={{ opacity: (!script.trim() || submitting) ? 0.5 : 1 }}
            >
              {submitting ? 'Enviando...' : '🎬 Iniciar Render'}
            </button>
          </div>

          {/* Render jobs */}
          <div className="glass-card p-5 animate-fade-in-delay-3">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Render Jobs</h3>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 animate-float">🎬</div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay render jobs todavía.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.map((j) => {
                  const ss = statusStyles[j.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
                  const ts = tierStyles[j.tier] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
                  return (
                    <div key={j.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <div className="flex items-center gap-2">
                        <span className="chip" style={{ background: ts.bg, color: ts.color, borderColor: ts.border }}>{j.tier}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{j.provider}</span>
                        <span className="chip" style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}>{j.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {j.renderTimeMs && <span>{(j.renderTimeMs / 1000).toFixed(1)}s</span>}
                        <span>{new Date(j.createdAt).toLocaleString()}</span>
                        {j.outputUrl && (
                          <a href={j.outputUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)' }}>
                            Ver ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
