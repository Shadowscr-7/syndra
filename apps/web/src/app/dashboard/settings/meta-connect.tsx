'use client';

import { useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MetaAccountInfo {
  igUsername?: string;
  fbPageName?: string;
  connectedAt?: string;
  connectedVia?: string;
}

interface MetaConnectProps {
  isConnected: boolean;
  accountInfo: MetaAccountInfo | null;
  credentialScopes?: string[];
  onDisconnect: () => Promise<void>;
}

function MetaToast() {
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

export function MetaConnect({ isConnected, accountInfo, credentialScopes, onDisconnect }: MetaConnectProps) {
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisconnect = () => {
    startTransition(async () => {
      await onDisconnect();
      setShowConfirm(false);
    });
  };

  return (
    <>
      <Suspense fallback={null}>
        <MetaToast />
      </Suspense>

      {isConnected && accountInfo ? (
        /* ── Connected state ── */
        <div className="space-y-4">
          {/* Account info card */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}
              >
                📸
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {accountInfo.igUsername ? `@${accountInfo.igUsername}` : 'Instagram conectado'}
                </p>
                {accountInfo.fbPageName && (
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    📘 Página: {accountInfo.fbPageName}
                  </p>
                )}
              </div>
              <span
                className="badge text-xs"
                style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
                Conectado
              </span>
            </div>

            {accountInfo.connectedAt && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                🕐 Conectado: {new Date(accountInfo.connectedAt).toLocaleDateString('es', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
                {accountInfo.connectedVia === 'oauth' && ' via OAuth'}
              </p>
            )}

            {credentialScopes && credentialScopes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {credentialScopes.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/api/auth/meta"
              className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{
                backgroundColor: 'rgba(124,58,237,0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              🔄 Reconectar
            </a>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                🔌 Desconectar
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>¿Seguro?</span>
                <button
                  onClick={handleDisconnect}
                  disabled={pending}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                >
                  {pending ? '...' : 'Sí, desconectar'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Disconnected state ── */
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Conectá tu cuenta de Facebook para publicar automáticamente en Instagram y Facebook.
            Se solicitarán los permisos necesarios via OAuth.
          </p>

          <a
            href="/api/auth/meta"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #1877F2 0%, #42b72a 100%)',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(24,119,242,0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Conectar con Facebook
          </a>

          <div
            className="flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', color: 'var(--color-text-muted)' }}
          >
            <span>💡</span>
            <span>
              Se obtendrá un token de larga duración (60 días). Se descubrirán automáticamente tus páginas de Facebook
              y cuentas de Instagram Business vinculadas.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
