'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>
            Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary inline-block px-6 py-2">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/login?reset=success');
      } else {
        setMessage(data.error || 'Error al restablecer la contraseña');
      }
    } catch {
      setMessage('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="input-label">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
            minLength={8}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="input-label">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="input-field"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Restablecer contraseña'}
        </button>
      </form>

      {message && (
        <div className="mt-4 text-sm text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message}
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: '#7c3aed', top: '-15%', left: '-10%', animation: 'float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: '#06b6d4', bottom: '-10%', right: '-5%', animation: 'float 10s ease-in-out infinite reverse' }}
        />
      </div>

      <div className="w-full max-w-md glass-card p-8 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <Image
            src="/images/logosyndra.png"
            alt="Syndra"
            width={200}
            height={56}
            className="mx-auto mb-4"
            priority
          />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Restablecer contraseña
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Ingresa tu nueva contraseña
          </p>
        </div>

        <Suspense fallback={<div className="text-center">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          <Link href="/login" className="font-semibold" style={{ color: '#7c3aed' }}>
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
