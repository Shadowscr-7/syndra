'use client';

import { useTransition, useState, useRef } from 'react';

interface CloudinaryConnectProps {
  isConnected: boolean;
  accountInfo: { cloudName?: string } | null;
  onDisconnect: () => Promise<void>;
  onSave: (formData: FormData) => Promise<void>;
  onTest: (formData: FormData) => Promise<{ ok: boolean; message: string }>;
}

export function CloudinaryConnect({ isConnected, accountInfo, onDisconnect, onSave, onTest }: CloudinaryConnectProps) {
  const [pending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(!isConnected);
  const formRef = useRef<HTMLFormElement>(null);

  const handleTest = async () => {
    if (!formRef.current) return;
    setTesting(true);
    setTestResult(null);
    try {
      const fd = new FormData(formRef.current);
      const result = await onTest(fd);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  };

  const handleSave = () => {
    if (!formRef.current) return;
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      await onSave(fd);
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      await onDisconnect();
      setShowConfirm(false);
      setShowForm(true);
    });
  };

  return (
    <div className="space-y-4">
      {isConnected && accountInfo ? (
        /* ── Connected state ── */
        <>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}
              >
                ☁️
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {accountInfo.cloudName || 'Cloudinary'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  CDN de media conectado
                </p>
              </div>
              <span
                className="badge text-xs"
                style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
                Conectado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{
                backgroundColor: 'rgba(124,58,237,0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              {showForm ? '✕ Cerrar' : '🔄 Actualizar credenciales'}
            </button>

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
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                >
                  {pending ? '...' : 'Sí'}
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
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Almacena y optimiza imágenes/video para redes sociales. Free tier: 25GB + 25K transformaciones/mes.
          Registrate en{' '}
          <a href="https://cloudinary.com/users/register_free" target="_blank" className="underline" style={{ color: 'var(--color-primary)' }}>
            cloudinary.com
          </a>
        </p>
      )}

      {/* ── Credentials form ── */}
      {showForm && (
        <form ref={formRef} className="space-y-4 animate-fade-in">
          <input type="hidden" name="provider" value="CLOUDINARY" />
          <input type="hidden" name="scopes" value="upload,transform" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="input-label">Cloud Name</label>
              <input name="cloudName" type="text" placeholder="dxxxxx" className="input-field font-mono text-sm" />
            </div>
            <div>
              <label className="input-label">API Key</label>
              <input name="apiKey" type="text" placeholder="123456..." className="input-field font-mono text-sm" />
            </div>
            <div>
              <label className="input-label">API Secret</label>
              <input name="cloudSecret" type="password" placeholder="abc123..." className="input-field font-mono text-sm" />
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-xs animate-fade-in"
              style={{
                backgroundColor: testResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: testResult.ok ? '#10b981' : '#ef4444',
              }}
            >
              <span>{testResult.ok ? '✅' : '❌'}</span>
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="text-xs px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              {testing ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Probando...
                </span>
              ) : (
                '🔍 Probar conexión'
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="btn-primary text-xs"
            >
              {pending ? 'Guardando...' : '☁️ Guardar y conectar'}
            </button>
          </div>

          <div
            className="flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', color: 'var(--color-text-muted)' }}
          >
            <span>💡</span>
            <span>
              Encontrá tus credenciales en el{' '}
              <a href="https://console.cloudinary.com/settings/api-keys" target="_blank" className="underline" style={{ color: 'var(--color-primary)' }}>
                Dashboard de Cloudinary
              </a>
              {' '}→ Settings → API Keys. Se validará la conexión antes de guardar.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
