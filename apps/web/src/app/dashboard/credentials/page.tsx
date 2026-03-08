'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

// ── Provider metadata ────────────────────────────────────────

interface ProviderMeta {
  key: string;
  label: string;
  icon: string;
  category: 'ai' | 'social' | 'storage' | 'video';
  gradient: string;
  fields: { name: string; label: string; type: string; placeholder: string; required: boolean }[];
  helpText?: string;
}

const PROVIDERS: Record<string, ProviderMeta> = {
  LLM: {
    key: 'LLM',
    label: 'LLM Provider',
    icon: '🤖',
    category: 'ai',
    gradient: 'from-emerald-500/20 to-cyan-500/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-... o tu clave de OpenRouter', required: true },
      { name: 'provider', label: 'Proveedor', type: 'select:openrouter,openai,anthropic', placeholder: '', required: false },
    ],
    helpText: 'OpenRouter recomendado (acceso a múltiples modelos)',
  },
  IMAGE_GEN: {
    key: 'IMAGE_GEN',
    label: 'Generación de Imágenes',
    icon: '🖼️',
    category: 'ai',
    gradient: 'from-pink-500/20 to-rose-500/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'hf_... o sk-...', required: true },
      { name: 'provider', label: 'Proveedor', type: 'select:huggingface,openai,stability', placeholder: '', required: false },
    ],
  },
  RESEARCH: {
    key: 'RESEARCH',
    label: 'Investigación Web',
    icon: '🔍',
    category: 'ai',
    gradient: 'from-indigo-500/20 to-blue-500/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'tvly-... o serpapi key', required: true },
      { name: 'provider', label: 'Proveedor', type: 'select:tavily,serpapi', placeholder: '', required: false },
    ],
    helpText: 'Tavily o SerpAPI para investigación automatizada',
  },
  DISCORD: {
    key: 'DISCORD',
    label: 'Discord Webhook',
    icon: '💬',
    category: 'social',
    gradient: 'from-violet-500/20 to-indigo-500/20',
    fields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://discord.com/api/webhooks/...', required: true },
    ],
  },
  CLOUDINARY: {
    key: 'CLOUDINARY',
    label: 'Cloudinary',
    icon: '☁️',
    category: 'storage',
    gradient: 'from-amber-500/20 to-orange-500/20',
    fields: [
      { name: 'cloudName', label: 'Cloud Name', type: 'text', placeholder: 'my-cloud', required: true },
      { name: 'apiKey', label: 'API Key', type: 'text', placeholder: '123456789012345', required: true },
      { name: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'AbCdEf...', required: true },
    ],
  },
  GOOGLE_DRIVE: {
    key: 'GOOGLE_DRIVE',
    label: 'Google Drive',
    icon: '📁',
    category: 'storage',
    gradient: 'from-green-500/20 to-emerald-500/20',
    fields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'ya29.a0...', required: true },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '1//0...', required: false },
      { name: 'folderId', label: 'Folder ID', type: 'text', placeholder: '1BxiMVs0XRA...', required: false },
    ],
  },
  AWS_S3: {
    key: 'AWS_S3',
    label: 'Amazon S3',
    icon: '🪣',
    category: 'storage',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    fields: [
      { name: 'bucket', label: 'Bucket', type: 'text', placeholder: 'my-bucket', required: true },
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'wJalr...', required: true },
      { name: 'region', label: 'Región', type: 'text', placeholder: 'us-east-1', required: false },
    ],
  },
  HEYGEN: {
    key: 'HEYGEN',
    label: 'HeyGen (Video/Avatar)',
    icon: '🎬',
    category: 'video',
    gradient: 'from-violet-500/20 to-fuchsia-500/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'hg-...', required: true },
    ],
  },
};

const CATEGORIES = [
  { key: 'ai', label: '🧠 Servicios de IA', providers: ['LLM', 'IMAGE_GEN', 'RESEARCH'] },
  { key: 'social', label: '📲 Redes Sociales', specialCards: ['META', 'DISCORD', 'TELEGRAM'] },
  { key: 'storage', label: '💾 Almacenamiento', providers: ['CLOUDINARY', 'GOOGLE_DRIVE', 'AWS_S3'] },
  { key: 'video', label: '🎥 Video', providers: ['HEYGEN'] },
];

// ── Types ────────────────────────────────────────────────────

interface CredentialSummary {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  maskedKey: string;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MetaOAuthStatus {
  connected: boolean;
  igUsername?: string;
  fbPageName?: string;
  threadsUsername?: string;
  connectedAt?: string;
  scopes?: string[];
}

interface TelegramLinkStatus {
  linked: boolean;
  username?: string;
  firstName?: string;
  chatId?: string;
  linkedAt?: string;
}

interface PairData {
  token: string;
  deepLink: string;
  botUsername: string;
  expiresInSeconds: number;
}

// ── Meta Toast (URL param notifications) ─────────────────────

function MetaToastInner() {
  const params = useSearchParams();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const success = params.get('meta_success');
    const error = params.get('meta_error');
    if (success) setToast({ type: 'success', message: success });
    else if (error) setToast({ type: 'error', message: error });
  }, [params]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (params.get('meta_success') || params.get('meta_error')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('meta_success');
      url.searchParams.delete('meta_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [params]);

  if (!toast) return null;
  const ok = toast.type === 'success';

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-md animate-fade-in"
      style={{
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: ok ? '#10b981' : '#ef4444',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{ok ? '✅' : '❌'}</span>
        <div>
          <p className="text-sm font-medium">{ok ? 'Meta conectado' : 'Error al conectar'}</p>
          <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
        </div>
        <button onClick={() => setToast(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Fetch credentials ──
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials');
      const json = await res.json();
      setCredentials(json.data ?? []);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  // ── Toast helper ──
  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Save credential ──
  const handleSave = async (provider: string, form: Record<string, string>, label: string) => {
    setSaving(provider);
    try {
      const res = await fetch(`/api/credentials/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: form, label: label || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al guardar');
      toast('ok', `${PROVIDERS[provider]?.label ?? provider}: Credencial guardada`);
      setOpenProvider(null);
      await fetchCredentials();
    } catch (e: any) {
      toast('err', e.message);
    } finally {
      setSaving(null);
    }
  };

  // ── Delete credential ──
  const handleDelete = async (provider: string) => {
    if (!confirm('¿Eliminar esta credencial? Esta acción no se puede deshacer.')) return;
    setDeleting(provider);
    try {
      const res = await fetch(`/api/credentials/${provider}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Error'); }
      toast('ok', 'Credencial eliminada');
      await fetchCredentials();
    } catch (e: any) {
      toast('err', e.message);
    } finally {
      setDeleting(null);
    }
  };

  // ── Test connection ──
  const handleTest = async (provider: string) => {
    setTesting(provider);
    try {
      const res = await fetch(`/api/credentials/${provider}/test`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        toast('ok', `✅ ${json.message}`);
      } else {
        toast('err', `❌ ${json.message}`);
      }
      await fetchCredentials();
    } catch (e: any) {
      toast('err', e.message);
    } finally {
      setTesting(null);
    }
  };

  // ── Toggle active ──
  const handleToggle = async (provider: string) => {
    try {
      const res = await fetch(`/api/credentials/${provider}/toggle`, { method: 'PUT' });
      if (!res.ok) throw new Error('Error al cambiar estado');
      await fetchCredentials();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Render ────────────────────────────────────────────

  const credMap = new Map<string, CredentialSummary>();
  credentials.forEach((c) => credMap.set(c.provider, c));

  const configuredCount = credentials.length;
  const activeCount = credentials.filter((c) => c.isActive).length;
  const testedOk = credentials.filter((c) => c.lastTestResult === 'ok').length;

  return (
    <div className="space-y-8">
      {/* Meta Toast (OAuth redirect notifications) */}
      <Suspense fallback={null}>
        <MetaToastInner />
      </Suspense>

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-fade-in ${
          toastMsg.type === 'ok'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🔑 Credenciales</h1>
        <p className="page-subtitle">
          Gestiona tus API keys, tokens y configuraciones de servicios externos.
          Todos los secretos se cifran con AES-256-GCM.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{configuredCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Configuradas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Activas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{testedOk}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Verificadas ✓</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* ── AI Services ── */}
          <section className="animate-fade-in-delay-1">
            <h2 className="section-title mb-4">🧠 Servicios de IA</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {['LLM', 'IMAGE_GEN', 'RESEARCH'].map((pKey) => {
                const meta = PROVIDERS[pKey];
                if (!meta) return null;
                const cred = credMap.get(pKey);
                const isOpen = openProvider === pKey;
                return (
                  <ProviderCard
                    key={pKey}
                    meta={meta}
                    cred={cred ?? null}
                    isOpen={isOpen}
                    isSaving={saving === pKey}
                    isTesting={testing === pKey}
                    isDeleting={deleting === pKey}
                    onToggleOpen={() => setOpenProvider(isOpen ? null : pKey)}
                    onSave={(form, label) => handleSave(pKey, form, label)}
                    onDelete={() => handleDelete(pKey)}
                    onTest={() => handleTest(pKey)}
                    onToggleActive={() => handleToggle(pKey)}
                  />
                );
              })}
            </div>
          </section>

          {/* ── Social Networks (special cards) ── */}
          <section className="animate-fade-in-delay-2">
            <h2 className="section-title mb-4">📲 Redes Sociales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Meta — OAuth Card */}
              <MetaOAuthCard onToast={toast} />

              {/* Discord — Manual Webhook */}
              {(() => {
                const meta = PROVIDERS['DISCORD'];
                const cred = credMap.get('DISCORD');
                const isOpen = openProvider === 'DISCORD';
                return (
                  <ProviderCard
                    key="DISCORD"
                    meta={meta}
                    cred={cred ?? null}
                    isOpen={isOpen}
                    isSaving={saving === 'DISCORD'}
                    isTesting={testing === 'DISCORD'}
                    isDeleting={deleting === 'DISCORD'}
                    onToggleOpen={() => setOpenProvider(isOpen ? null : 'DISCORD')}
                    onSave={(form, label) => handleSave('DISCORD', form, label)}
                    onDelete={() => handleDelete('DISCORD')}
                    onTest={() => handleTest('DISCORD')}
                    onToggleActive={() => handleToggle('DISCORD')}
                  />
                );
              })()}

              {/* Telegram — QR Pairing Card */}
              <TelegramPairCard onToast={toast} />
            </div>
          </section>

          {/* ── Storage ── */}
          <section className="animate-fade-in-delay-3">
            <h2 className="section-title mb-4">💾 Almacenamiento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {['CLOUDINARY', 'GOOGLE_DRIVE', 'AWS_S3'].map((pKey) => {
                const meta = PROVIDERS[pKey];
                if (!meta) return null;
                const cred = credMap.get(pKey);
                const isOpen = openProvider === pKey;
                return (
                  <ProviderCard
                    key={pKey}
                    meta={meta}
                    cred={cred ?? null}
                    isOpen={isOpen}
                    isSaving={saving === pKey}
                    isTesting={testing === pKey}
                    isDeleting={deleting === pKey}
                    onToggleOpen={() => setOpenProvider(isOpen ? null : pKey)}
                    onSave={(form, label) => handleSave(pKey, form, label)}
                    onDelete={() => handleDelete(pKey)}
                    onTest={() => handleTest(pKey)}
                    onToggleActive={() => handleToggle(pKey)}
                  />
                );
              })}
            </div>
          </section>

          {/* ── Video ── */}
          <section className="animate-fade-in-delay-3">
            <h2 className="section-title mb-4">🎥 Video</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {['HEYGEN'].map((pKey) => {
                const meta = PROVIDERS[pKey];
                if (!meta) return null;
                const cred = credMap.get(pKey);
                const isOpen = openProvider === pKey;
                return (
                  <ProviderCard
                    key={pKey}
                    meta={meta}
                    cred={cred ?? null}
                    isOpen={isOpen}
                    isSaving={saving === pKey}
                    isTesting={testing === pKey}
                    isDeleting={deleting === pKey}
                    onToggleOpen={() => setOpenProvider(isOpen ? null : pKey)}
                    onSave={(form, label) => handleSave(pKey, form, label)}
                    onDelete={() => handleDelete(pKey)}
                    onTest={() => handleTest(pKey)}
                    onToggleActive={() => handleToggle(pKey)}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Meta OAuth Card ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function MetaOAuthCard({ onToast }: { onToast: (t: 'ok' | 'err', msg: string) => void }) {
  const [status, setStatus] = useState<MetaOAuthStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials/meta/oauth-status');
      const data: any = await res.json();
      // Flatten accountInfo into top-level for component access
      const flat: MetaOAuthStatus = {
        connected: data.connected ?? false,
        igUsername: data.accountInfo?.igUsername ?? data.igUsername,
        fbPageName: data.accountInfo?.fbPageName ?? data.fbPageName,
        threadsUsername: data.accountInfo?.threadsUsername ?? data.threadsUsername,
        connectedAt: data.accountInfo?.connectedAt ?? data.connectedAt,
        scopes: data.scopes,
      };
      setStatus(flat);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Listen for OAuth popup completion via message or polling
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'meta-oauth-complete') {
        setConnecting(false);
        if (event.data.success) {
          onToast('ok', event.data.message || 'Meta conectado correctamente');
        } else {
          onToast('err', event.data.message || 'Error al conectar Meta');
        }
        await fetchStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchStatus, onToast]);

  // Open Meta OAuth in a popup window
  const handleConnect = () => {
    setConnecting(true);
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      '/api/auth/meta?from=credentials&popup=1',
      'meta_oauth_popup',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    popupRef.current = popup;
    // Poll for popup close (fallback if postMessage doesn't fire)
    const pollTimer = setInterval(async () => {
      if (!popup || popup.closed) {
        clearInterval(pollTimer);
        setConnecting(false);
        popupRef.current = null;
        // Re-fetch status after popup closes
        await fetchStatus();
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/credentials/meta/oauth-status', { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al desconectar');
      onToast('ok', 'Meta desconectado correctamente');
      setShowConfirm(false);
      await fetchStatus();
    } catch (e: any) {
      onToast('err', e.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status?.connected ?? false;

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl opacity-40 pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
              Meta (Instagram/Facebook)
            </h3>
          </div>
          {loadingStatus ? (
            <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
              Cargando...
            </span>
          ) : isConnected ? (
            <span
              className="badge"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
              Conectado
            </span>
          ) : (
            <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
              Sin configurar
            </span>
          )}
        </div>

        {loadingStatus ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : isConnected && status ? (
          /* ── Connected state ── */
          <div className="space-y-3">
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                  style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}
                >
                  📸
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {status.igUsername ? `@${status.igUsername}` : 'Instagram conectado'}
                  </p>
                  {status.fbPageName && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      📘 Página: {status.fbPageName}
                    </p>
                  )}
                  {status.threadsUsername && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      🧵 Threads: @{status.threadsUsername}
                    </p>
                  )}
                </div>
              </div>
              {status.connectedAt && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  🕐 {new Date(status.connectedAt).toLocaleDateString('es', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(124,58,237,0.2)' }}
              >
                {connecting ? '⏳ Conectando...' : '🔄 Reconectar'}
              </button>
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  🔌 Desconectar
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>¿Seguro?</span>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                  >
                    {disconnecting ? '...' : 'Sí'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Disconnected state ── */
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Conectá tu cuenta de Facebook para publicar automáticamente en Instagram y Facebook.
              Se solicitarán los permisos necesarios via OAuth.
            </p>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #1877F2 0%, #42b72a 100%)',
                color: '#fff',
                boxShadow: '0 4px 15px rgba(24,119,242,0.3)',
                opacity: connecting ? 0.7 : 1,
              }}
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                  Conectando...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Conectar con Facebook
                </>
              )}
            </button>

            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', color: 'var(--color-text-muted)' }}
            >
              <span>💡</span>
              <span>Se obtendrá un token de larga duración (60 días). Se descubren automáticamente tus páginas de Facebook y cuentas de Instagram Business.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Telegram QR Pairing Card ─────────────────────────────────
// ══════════════════════════════════════════════════════════════

function TelegramPairCard({ onToast }: { onToast: (t: 'ok' | 'err', msg: string) => void }) {
  const [linkStatus, setLinkStatus] = useState<TelegramLinkStatus | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current link status
  const fetchLinkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials/telegram/link');
      const data: any = await res.json();
      // Backend returns { linked, link: { chatId, username, firstName, linkedAt } }
      // Flatten to match TelegramLinkStatus interface
      if (data.linked && data.link) {
        setLinkStatus({
          linked: true,
          username: data.link.username,
          firstName: data.link.firstName,
          chatId: data.link.chatId,
          linkedAt: data.link.linkedAt,
        });
      } else {
        setLinkStatus({ linked: false });
      }
    } catch {
      setLinkStatus({ linked: false });
    } finally {
      setLoadingLink(false);
    }
  }, []);

  useEffect(() => { fetchLinkStatus(); }, [fetchLinkStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Start pairing — generate token + show QR
  const startPairing = async () => {
    setPairing(true);
    try {
      const res = await fetch('/api/credentials/telegram/pair', { method: 'POST' });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al generar enlace');
      setPairData(data);
      // Generate QR code as data URL
      try {
        const dataUrl = await QRCode.toDataURL(data.deepLink, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(dataUrl);
      } catch {
        setQrDataUrl(null);
      }
      // Start polling for pair status
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/credentials/telegram/pair-status?token=${data.token}`);
          const s: any = await r.json();
          if (s.status === 'linked') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPairData(null);
            onToast('ok', `Telegram vinculado: @${s.username || 'usuario'}`);
            await fetchLinkStatus();
          } else if (s.status === 'expired' || s.status === 'not_found') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPairData(null);
            onToast('err', 'El enlace expiró. Intentá de nuevo.');
          }
        } catch { /* ignore poll errors */ }
      }, 3000);
    } catch (e: any) {
      onToast('err', e.message);
    } finally {
      setPairing(false);
    }
  };

  const cancelPairing = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPairData(null);
    setQrDataUrl(null);
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch('/api/credentials/telegram/link', { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al desvincular');
      onToast('ok', 'Telegram desvinculado');
      setShowConfirm(false);
      await fetchLinkStatus();
    } catch (e: any) {
      onToast('err', e.message);
    } finally {
      setUnlinking(false);
    }
  };

  const isLinked = linkStatus?.linked ?? false;

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-blue-600/20 rounded-2xl opacity-40 pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
              Telegram
            </h3>
          </div>
          {loadingLink ? (
            <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
              Cargando...
            </span>
          ) : isLinked ? (
            <span
              className="badge"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
              Vinculado
            </span>
          ) : (
            <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
              Sin vincular
            </span>
          )}
        </div>

        {loadingLink ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : isLinked && linkStatus ? (
          /* ── Linked state ── */
          <div className="space-y-3">
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                  style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}
                >
                  ✈️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {linkStatus.username ? `@${linkStatus.username}` : linkStatus.firstName || 'Telegram vinculado'}
                  </p>
                  {linkStatus.firstName && linkStatus.username && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {linkStatus.firstName}
                    </p>
                  )}
                </div>
              </div>
              {linkStatus.linkedAt && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  🕐 Vinculado: {new Date(linkStatus.linkedAt).toLocaleDateString('es', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Unlink actions */}
            <div className="flex items-center gap-2">
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  🔌 Desvincular
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>¿Seguro?</span>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                  >
                    {unlinking ? '...' : 'Sí'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : pairData ? (
          /* ── QR Pairing in progress ── */
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Escaneá el QR o hacé click en el enlace para vincular tu cuenta de Telegram:
            </p>

            <div className="flex flex-col items-center gap-3 py-2">
              {/* QR Code — generated locally */}
              <div
                className="rounded-xl p-2"
                style={{ backgroundColor: '#fff' }}
              >
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt="QR Telegram"
                    width={180}
                    height={180}
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="flex items-center justify-center" style={{ width: 180, height: 180 }}>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </div>

              <a
                href={pairData.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-4 py-2 rounded-lg font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,136,204,0.3)',
                }}
              >
                Abrir en Telegram →
              </a>

              <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                @{pairData.botUsername} · Esperando vinculación...
              </p>

              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Expira en {pairData.expiresInSeconds}s</span>
              </div>
            </div>

            <button
              onClick={cancelPairing}
              className="btn-ghost text-xs w-full"
            >
              Cancelar
            </button>
          </div>
        ) : (
          /* ── Not linked — show pair button ── */
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Vinculá tu cuenta de Telegram al bot compartido para recibir notificaciones y aprobar contenido directamente desde Telegram.
            </p>

            <button
              onClick={startPairing}
              disabled={pairing}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)',
                color: '#fff',
                boxShadow: '0 4px 15px rgba(0,136,204,0.3)',
              }}
            >
              {pairing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                  Generando enlace...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Vincular Telegram
                </>
              )}
            </button>

            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)', color: 'var(--color-text-muted)' }}
            >
              <span>💡</span>
              <span>Se generará un código QR para vincular tu cuenta al bot compartido. No necesitás crear un bot propio.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Generic Provider Card Component ──────────────────────────
// ══════════════════════════════════════════════════════════════

function ProviderCard({
  meta,
  cred,
  isOpen,
  isSaving,
  isTesting,
  isDeleting,
  onToggleOpen,
  onSave,
  onDelete,
  onTest,
  onToggleActive,
}: {
  meta: ProviderMeta;
  cred: CredentialSummary | null;
  isOpen: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isDeleting: boolean;
  onToggleOpen: () => void;
  onSave: (form: Record<string, string>, label: string) => void;
  onDelete: () => void;
  onTest: () => void;
  onToggleActive: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [label, setLabel] = useState(cred?.label ?? '');

  const setField = (name: string, value: string) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, label);
  };

  const testResult = cred?.lastTestResult;
  const testOk = testResult === 'ok';
  const testFailed = testResult && testResult !== 'ok';

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} rounded-2xl opacity-40 pointer-events-none`} />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
              {meta.label}
            </h3>
          </div>
          {cred ? (
            <span
              className="badge cursor-pointer"
              style={{
                backgroundColor: cred.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                color: cred.isActive ? '#22c55e' : '#eab308',
              }}
              onClick={onToggleActive}
              title="Click para activar/desactivar"
            >
              <span className="badge-dot" style={{ backgroundColor: cred.isActive ? '#22c55e' : '#eab308' }} />
              {cred.isActive ? 'Activa' : 'Inactiva'}
            </span>
          ) : (
            <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
              Sin configurar
            </span>
          )}
        </div>

        {/* Credential info */}
        {cred && (
          <div className="mb-3 space-y-1">
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {cred.maskedKey}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {cred.label && (
                <span className="chip text-xs">{cred.label}</span>
              )}
              {testOk && (
                <span className="text-xs text-green-400">✅ Verificada</span>
              )}
              {testFailed && (
                <span className="text-xs text-red-400" title={testResult}>
                  ❌ {testResult.replace('error: ', '').slice(0, 40)}
                </span>
              )}
              {cred.lastTestedAt && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  · {new Date(cred.lastTestedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={onToggleOpen}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {cred ? '🔄 Actualizar' : '⚙️ Configurar'}
          </button>
          {cred && (
            <>
              <button
                onClick={onTest}
                disabled={isTesting}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                {isTesting ? '⏳ Probando...' : '🔌 Test'}
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="btn-danger text-xs px-3 py-1.5"
              >
                {isDeleting ? '...' : '🗑️'}
              </button>
            </>
          )}
        </div>

        {/* Expandable form */}
        {isOpen && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            {/* Label */}
            <div>
              <label className="input-label">Etiqueta (opcional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: Mi cuenta principal"
                className="input-field text-sm"
              />
            </div>

            {/* Provider-specific fields */}
            {meta.fields.map((field) => {
              if (field.type.startsWith('select:')) {
                const options = field.type.replace('select:', '').split(',');
                return (
                  <div key={field.name}>
                    <label className="input-label">{field.label}</label>
                    <select
                      value={formData[field.name] ?? options[0]}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className="input-field text-sm"
                    >
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={field.name}>
                  <label className="input-label">{field.label}</label>
                  <input
                    type={field.type}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="input-field text-sm font-mono"
                    autoComplete="off"
                  />
                </div>
              );
            })}

            {meta.helpText && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                💡 {meta.helpText}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary text-sm"
              >
                {isSaving ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="btn-ghost text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
