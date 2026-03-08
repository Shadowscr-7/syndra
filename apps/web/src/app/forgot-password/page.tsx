'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setMessage(data.error || 'Error al enviar el enlace');
      }
    } catch {
      setMessage('Error de conexión. Inténtalo de nuevo.');
    } finally {
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
            Recuperar contraseña
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-sm" style={{ color: '#22c55e' }}>
                ✅ Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Revisa tu bandeja de entrada y carpeta de spam.
            </p>
            <Link href="/login" className="btn-primary inline-block px-6 py-2 mt-4">
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-4 text-sm text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {message}
          </div>
        )}

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          <Link href="/login" className="font-semibold" style={{ color: '#7c3aed' }}>
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
