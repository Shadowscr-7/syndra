'use client';

import { useEffect, useState } from 'react';

// ============================================================
// Source Trust — Whitelist/Blacklist + Claims (Feature #9)
// ============================================================

interface SourceProfile {
  id: string;
  domain: string;
  trustScore: number;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
  totalArticles: number;
  accuracyRate: number | null;
  notes: string | null;
  lastEvaluatedAt: string | null;
  updatedAt: string;
}

interface ComplianceRule {
  id: string;
  ruleType: string;
  condition: any;
  action: string;
  isActive: boolean;
  createdAt: string;
}

interface Stats {
  totalProfiles: number;
  whitelisted: number;
  blacklisted: number;
  lowTrust: number;
  totalClaims: number;
  verifiedClaims: number;
  totalRules: number;
}

function trustColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const RULE_TYPES = [
  { value: 'BLOCK_DOMAIN', label: 'Bloquear dominio' },
  { value: 'SENSITIVE_TOPIC', label: 'Tema sensible' },
  { value: 'REQUIRE_SOURCE_TRUST', label: 'Requiere trust mínimo' },
];

const ACTIONS = [
  { value: 'BLOCK', label: 'Bloquear' },
  { value: 'REQUIRE_APPROVAL', label: 'Requiere aprobación' },
  { value: 'FLAG', label: 'Marcar' },
];

export default function SourceTrustPage() {
  const [profiles, setProfiles] = useState<SourceProfile[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profiles' | 'rules'>('profiles');

  // New profile form
  const [newDomain, setNewDomain] = useState('');
  const [newScore, setNewScore] = useState(50);
  const [newWhitelist, setNewWhitelist] = useState(false);
  const [newBlacklist, setNewBlacklist] = useState(false);

  // New rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleType, setRuleType] = useState('BLOCK_DOMAIN');
  const [ruleCondition, setRuleCondition] = useState('');
  const [ruleAction, setRuleAction] = useState('BLOCK');

  const fetchAll = async () => {
    try {
      const [profilesRes, rulesRes, statsRes] = await Promise.all([
        fetch('/api/source-trust/profiles'),
        fetch('/api/source-trust/rules'),
        fetch('/api/source-trust/stats'),
      ]);
      if (profilesRes.ok) setProfiles(await profilesRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const addProfile = async () => {
    if (!newDomain.trim()) return;
    await fetch('/api/source-trust/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: newDomain.trim(),
        trustScore: newScore,
        isWhitelisted: newWhitelist,
        isBlacklisted: newBlacklist,
      }),
    });
    setNewDomain('');
    setNewScore(50);
    setNewWhitelist(false);
    setNewBlacklist(false);
    fetchAll();
  };

  const deleteProfile = async (domain: string) => {
    await fetch(`/api/source-trust/profiles/${encodeURIComponent(domain)}`, { method: 'DELETE' });
    fetchAll();
  };

  const addRule = async () => {
    if (!ruleCondition.trim()) return;
    let condition: any = {};
    if (ruleType === 'BLOCK_DOMAIN') condition = { domain: ruleCondition.trim() };
    else if (ruleType === 'SENSITIVE_TOPIC') condition = { topics: ruleCondition.split(',').map((t) => t.trim()) };
    else if (ruleType === 'REQUIRE_SOURCE_TRUST') condition = { minScore: parseInt(ruleCondition) || 50 };

    await fetch('/api/source-trust/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleType, condition, action: ruleAction }),
    });
    setShowRuleForm(false);
    setRuleCondition('');
    fetchAll();
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await fetch(`/api/source-trust/rules/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchAll();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/source-trust/rules/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🛡️ Trust de Fuentes & Compliance</h1>
        <p className="page-subtitle">
          Controla la calidad de tus fuentes, gestiona whitelist/blacklist y define reglas de compliance.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-fade-in-delay-1">
          {[
            { label: 'Fuentes', value: stats.totalProfiles, icon: '🌐' },
            { label: 'Whitelist', value: stats.whitelisted, icon: '✅' },
            { label: 'Blacklist', value: stats.blacklisted, icon: '🚫' },
            { label: 'Baja confianza', value: stats.lowTrust, icon: '⚠️' },
            { label: 'Claims', value: stats.totalClaims, icon: '📝' },
            { label: 'Verificados', value: stats.verifiedClaims, icon: '✔️' },
            { label: 'Reglas', value: stats.totalRules, icon: '📋' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</div>
              <div className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 animate-fade-in-delay-1">
        <button
          onClick={() => setTab('profiles')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: tab === 'profiles' ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(6,182,212,0.08))' : 'transparent',
            color: tab === 'profiles' ? '#e0d4ff' : 'var(--color-text-muted)',
            border: tab === 'profiles' ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--color-border-subtle)',
          }}
        >
          🌐 Fuentes ({profiles.length})
        </button>
        <button
          onClick={() => setTab('rules')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: tab === 'rules' ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(6,182,212,0.08))' : 'transparent',
            color: tab === 'rules' ? '#e0d4ff' : 'var(--color-text-muted)',
            border: tab === 'rules' ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--color-border-subtle)',
          }}
        >
          📋 Reglas ({rules.length})
        </button>
      </div>

      {/* Profiles Tab */}
      {tab === 'profiles' && (
        <div className="space-y-4 animate-fade-in">
          {/* Add Profile Form */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>➕ Agregar Fuente</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="input-label">Dominio</label>
                <input
                  className="input-field text-sm"
                  placeholder="ejemplo.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">Trust Score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-field text-sm w-20"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={newWhitelist} onChange={(e) => { setNewWhitelist(e.target.checked); if (e.target.checked) setNewBlacklist(false); }} className="accent-green-500" />
                ✅ Whitelist
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={newBlacklist} onChange={(e) => { setNewBlacklist(e.target.checked); if (e.target.checked) setNewWhitelist(false); }} className="accent-red-500" />
                🚫 Blacklist
              </label>
              <button onClick={addProfile} className="btn-primary text-xs px-4 py-2">Agregar</button>
            </div>
          </div>

          {/* Profiles List */}
          <div className="glass-card p-0 overflow-hidden">
            <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))' }}>
              <h3 className="text-sm font-bold" style={{ color: '#10b981' }}>🌐 Fuentes Registradas</h3>
            </div>
            {profiles.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay fuentes registradas aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <th className="text-left py-2 px-4 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Dominio</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Trust</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Artículos</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Precisión</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{p.domain}</span>
                          {p.notes && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{p.notes}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-bold" style={{ color: trustColor(p.trustScore) }}>
                            {p.trustScore.toFixed(0)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.isWhitelisted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                              Whitelist
                            </span>
                          )}
                          {p.isBlacklisted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                              Blacklist
                            </span>
                          )}
                          {!p.isWhitelisted && !p.isBlacklisted && (
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Neutral</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {p.totalArticles}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {p.accuracyRate != null ? `${p.accuracyRate.toFixed(0)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => deleteProfile(p.domain)}
                            className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                            style={{ color: '#ef4444' }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="space-y-4 animate-fade-in">
          {/* Add Rule */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>📋 Reglas de Compliance</h3>
              <button onClick={() => setShowRuleForm(!showRuleForm)} className="btn-ghost text-xs">
                {showRuleForm ? '✕ Cerrar' : '➕ Nueva Regla'}
              </button>
            </div>

            {showRuleForm && (
              <div className="flex flex-wrap gap-3 items-end mt-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border-subtle)' }}>
                <div>
                  <label className="input-label">Tipo</label>
                  <select className="input-field text-sm" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
                    {RULE_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">
                    {ruleType === 'BLOCK_DOMAIN' ? 'Dominio' : ruleType === 'SENSITIVE_TOPIC' ? 'Topics (sep. por coma)' : 'Score mínimo'}
                  </label>
                  <input
                    className="input-field text-sm"
                    placeholder={ruleType === 'BLOCK_DOMAIN' ? 'spam.com' : ruleType === 'SENSITIVE_TOPIC' ? 'política, religión' : '50'}
                    value={ruleCondition}
                    onChange={(e) => setRuleCondition(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">Acción</label>
                  <select className="input-field text-sm" value={ruleAction} onChange={(e) => setRuleAction(e.target.value)}>
                    {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <button onClick={addRule} className="btn-primary text-xs px-4 py-2">Crear Regla</button>
              </div>
            )}
          </div>

          {/* Rules List */}
          <div className="glass-card p-0 overflow-hidden">
            <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))' }}>
              <h3 className="text-sm font-bold" style={{ color: '#f59e0b' }}>⚖️ Reglas Activas</h3>
            </div>
            {rules.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay reglas de compliance aún.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {rules.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                          {RULE_TYPES.find((rt) => rt.value === r.ruleType)?.label ?? r.ruleType}
                        </span>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {JSON.stringify(r.condition)} → {r.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRule(r.id, r.isActive)}
                        className="text-[10px] px-2 py-1 rounded"
                        style={{ color: r.isActive ? '#f59e0b' : '#10b981' }}
                      >
                        {r.isActive ? '⏸ Pausar' : '▶ Activar'}
                      </button>
                      <button
                        onClick={() => deleteRule(r.id)}
                        className="text-[10px] px-2 py-1 rounded"
                        style={{ color: '#ef4444' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass-card p-4 text-sm animate-fade-in-delay-3" style={{ color: 'var(--color-text-muted)' }}>
        <strong style={{ color: 'var(--color-text-secondary)' }}>ℹ️ Info:</strong> Los trust scores se re-evalúan
        semanalmente basado en la precisión de claims verificados. Fuentes con score {'<'}30 requieren aprobación
        humana. Fuentes en blacklist se bloquean completamente en el autopilot.
      </div>
    </div>
  );
}
