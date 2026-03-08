'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('✅ Email verificado correctamente. Ya puedes iniciar sesión.');
    }
    if (searchParams.get('error') === 'verification_failed') {
      setMessage('El enlace de verificación ha expirado o no es válido.');
    }
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('✅ Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setMessage('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: '#7c3aed', top: '-15%', left: '-10%', animation: 'float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: '#06b6d4', bottom: '-10%', right: '-5%', animation: 'float 10s ease-in-out infinite reverse' }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
          style={{ background: '#ec4899', top: '40%', left: '60%', animation: 'float 12s ease-in-out infinite' }}
        />
      </div>

      <div className="w-full max-w-md glass-card p-8 relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/logosyndra.png"
            alt="Syndra"
            width={200}
            height={56}
            className="mx-auto mb-4"
            priority
          />
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Ingresa tus credenciales para acceder al panel
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="input-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="password" className="input-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : (
              '🚀 Entrar'
            )}
          </button>
        </form>

        {message && (
          <div className="mt-4 text-sm text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {message}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 text-sm text-center p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            {successMessage}
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm" style={{ color: '#7c3aed' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <p className="mt-4 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#7c3aed' }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
