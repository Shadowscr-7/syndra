'use client';

import { useState } from 'react';

export default function ActivatePage() {
  const [key, setKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [planInfo, setPlanInfo] = useState<{
    planName: string;
    durationDays: number;
    expiresAt: string;
  } | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    setPlanInfo(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/admin/licenses/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
        },
        body: JSON.stringify({ key: key.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al canjear la licencia');
      }

      setStatus('success');
      setMessage('¡Licencia activada exitosamente!');
      setPlanInfo({
        planName: data.subscription?.plan?.displayName || data.planName || 'Plan activado',
        durationDays: data.durationDays || 30,
        expiresAt: data.subscription?.currentPeriodEnd
          ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '',
      });
      setKey('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Error desconocido');
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--gradient-mesh)', backgroundAttachment: 'fixed' }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)',
            top: '-10%',
            right: '-10%',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.3), transparent 70%)',
            bottom: '-10%',
            left: '-10%',
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float 8s ease-in-out infinite reverse',
          }}
        />
      </div>

      <div className="glass-card max-w-md w-full p-8 space-y-6 relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto animate-float"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
          >
            🔑
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Activar Licencia
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Ingresa tu clave de licencia para activar tu suscripción
          </p>
        </div>

        {/* Success state */}
        {status === 'success' && planInfo && (
          <div
            className="rounded-xl p-6 text-center space-y-3 animate-fade-in"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="text-5xl animate-float">🎉</div>
            <p className="font-bold text-lg" style={{ color: '#22c55e' }}>
              {message}
            </p>
            <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p><strong>Plan:</strong> {planInfo.planName}</p>
              <p><strong>Duración:</strong> {planInfo.durationDays} días</p>
              {planInfo.expiresAt && <p><strong>Vence:</strong> {planInfo.expiresAt}</p>}
            </div>
            <a href="/dashboard" className="btn-primary inline-block mt-3">
              Ir al Dashboard →
            </a>
          </div>
        )}

        {/* Form */}
        {status !== 'success' && (
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label htmlFor="license-key" className="input-label">
                Clave de licencia
              </label>
              <input
                id="license-key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AUTO-PRO-XXXX-XXXX-XXXX"
                className="input-field text-center font-mono text-lg tracking-wider uppercase"
                style={status === 'error' ? { borderColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="workspace-id" className="input-label">
                Workspace ID{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>(opcional)</span>
              </label>
              <input
                id="workspace-id"
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="Se usa el workspace por defecto"
                className="input-field"
              />
            </div>

            {status === 'error' && (
              <div
                className="rounded-xl p-3 text-sm text-center"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                ❌ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !key.trim()}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Activando…
                </span>
              ) : (
                '🔑 Activar Licencia'
              )}
            </button>
          </form>
        )}

        {/* Info */}
        <div
          className="rounded-xl p-4 space-y-2 text-xs"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(6,182,212,0.03))',
            border: '1px solid rgba(124,58,237,0.1)',
            color: 'var(--color-text-muted)',
          }}
        >
          <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            ¿Cómo funciona?
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Compra tu licencia en nuestra tienda o a un revendedor</li>
            <li>Recibe tu clave por email (formato AUTO-XXX-XXXX-XXXX-XXXX)</li>
            <li>Pega la clave aquí y actívala</li>
            <li>Tu plan se activa inmediatamente</li>
          </ol>
          <p className="mt-2">
            Si ya tienes una suscripción activa, el tiempo se suma al periodo existente.
          </p>
        </div>

        {/* Footer link */}
        <div className="text-center">
          <a
            href="/dashboard"
            className="text-sm transition-colors hover:brightness-125"
            style={{ color: 'var(--color-primary)' }}
          >
            ← Volver al Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
