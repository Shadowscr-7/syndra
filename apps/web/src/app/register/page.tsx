'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxPublications: number;
  maxVideos: number;
  maxSources: number;
  maxChannels: number;
  maxEditors: number;
  analyticsEnabled: boolean;
  aiScoringEnabled: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

// ── Plan Card Component ────────────────────────────────
function PlanCard({
  plan,
  selected,
  onSelect,
  billingCycle,
  discount,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  billingCycle: 'MONTHLY' | 'YEARLY';
  discount: number;
}) {
  const isPopular = plan.name === 'creator';
  const rawPrice = billingCycle === 'YEARLY'
    ? plan.yearlyPrice / 12
    : plan.monthlyPrice;
  const price = discount > 0 ? rawPrice * (1 - discount / 100) : rawPrice;
  const displayPrice = (price / 100).toFixed(0);
  const originalPrice = discount > 0 ? (rawPrice / 100).toFixed(0) : null;

  const features = [
    `${plan.maxPublications >= 9999 ? 'Ilimitados' : plan.maxPublications} posts/mes`,
    `${plan.maxChannels >= 99 ? 'Ilimitadas' : plan.maxChannels} ${plan.maxChannels === 1 ? 'red social' : 'redes sociales'}`,
    `${plan.maxEditors} ${plan.maxEditors === 1 ? 'editor' : 'editores'}`,
    plan.maxVideos > 0 ? `${plan.maxVideos} videos/mes` : null,
    plan.analyticsEnabled ? 'Analytics avanzado' : null,
    plan.aiScoringEnabled ? 'IA Scoring' : null,
    plan.prioritySupport ? 'Soporte prioritario' : null,
    plan.customBranding ? 'Branding personalizado' : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all duration-300 text-left w-full ${
        selected
          ? 'border-purple-500 shadow-lg shadow-purple-500/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))'
          : 'rgba(255,255,255,0.03)',
      }}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
          Popular
        </span>
      )}

      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-lg font-bold text-white">{plan.displayName}</h3>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'border-purple-500 bg-purple-500' : 'border-white/30'
        }`}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        {originalPrice && (
          <span className="text-sm line-through" style={{ color: 'var(--color-text-muted)' }}>
            ${originalPrice}
          </span>
        )}
        <span className="text-3xl font-black text-white">${displayPrice}</span>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/mes</span>
        {discount > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 ml-1">
            -{discount}%
          </span>
        )}
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {plan.description}
      </p>

      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ── Main Register Form (uses useSearchParams) ──────────
function RegisterForm() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setShowReferral(true);
    }
  }, [searchParams]);

  // Fetch plans on mount
  useEffect(() => {
    fetch('/api/auth/plans')
      .then((r) => r.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        // Pre-select Creator (popular)
        const creator = (Array.isArray(data) ? data : []).find((p: Plan) => p.name === 'creator');
        if (creator) setSelectedPlan(creator.id);
      })
      .catch(() => setMessage('Error al cargar los planes'))
      .finally(() => setPlansLoading(false));
  }, []);

  const discount = referralCode.trim() ? 20 : 0;

  const validateStep1 = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage('Todos los campos son requeridos');
      return false;
    }
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      return false;
    }
    setMessage('');
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    if (!selectedPlan) {
      setMessage('Selecciona un plan para continuar');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          planId: selectedPlan,
          billingCycle,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Error al crear cuenta');
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
    <div className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden">
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

      <div className={`w-full ${step === 2 ? 'max-w-3xl' : 'max-w-md'} glass-card p-8 relative z-10 animate-fade-in transition-all duration-500`}>
        {/* Logo */}
        <div className="text-center mb-6">
          <Image
            src="/images/logosyndra.png"
            alt="Syndra"
            width={180}
            height={50}
            className="mx-auto mb-3"
            priority
          />
          <h1 className="text-2xl font-extrabold tracking-tight page-title">
            {step === 1 ? 'Crear Cuenta' : 'Elige tu Plan'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {step === 1
              ? 'Comienza a automatizar tu contenido'
              : 'Selecciona el plan que mejor se adapte a ti'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-purple-400' : 'text-white/30'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/30'}`}>1</span>
            Datos
          </div>
          <div className={`w-8 h-px ${step >= 2 ? 'bg-purple-500' : 'bg-white/10'}`} />
          <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-purple-400' : 'text-white/30'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/30'}`}>2</span>
            Plan
          </div>
        </div>

        {/* ── STEP 1: Personal data ──────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="input-label">Nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                required
                autoFocus
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && goToStep2()}
              />
            </div>
            <div>
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && goToStep2()}
              />
            </div>
            <div>
              <label htmlFor="password" className="input-label">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && goToStep2()}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="input-label">Confirmar contraseña</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
                minLength={8}
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && goToStep2()}
              />
            </div>
            <button
              type="button"
              onClick={goToStep2}
              className="btn-primary w-full py-3"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 2: Plan selection ─────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Billing cycle toggle */}
            <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/5 w-fit mx-auto">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-purple-500 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  billingCycle === 'YEARLY'
                    ? 'bg-purple-500 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Anual
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  -20%
                </span>
              </button>
            </div>

            {/* Plan cards */}
            {plansLoading ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => setSelectedPlan(plan.id)}
                    billingCycle={billingCycle}
                    discount={discount}
                  />
                ))}
              </div>
            )}

            {/* Referral code */}
            <div className="border-t border-white/5 pt-4">
              {!showReferral ? (
                <button
                  type="button"
                  onClick={() => setShowReferral(true)}
                  className="text-sm font-medium w-full text-center transition-colors"
                  style={{ color: '#7c3aed' }}
                >
                  🎁 Tengo un código de referido
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="input-label flex items-center gap-2">
                    🎁 Código de referido
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      -20% descuento
                    </span>
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Ej: JULI3A4F"
                    className="input-field text-center uppercase tracking-widest font-mono"
                    maxLength={12}
                  />
                  {referralCode && (
                    <p className="text-xs text-center text-green-400">
                      Se aplicará un 20% de descuento al registrarte
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setMessage(''); }}
                className="px-5 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-white/20 transition-all"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading || !selectedPlan}
                className="btn-primary flex-1 py-3 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  '🚀 Crear cuenta'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {message && (
          <div className="mt-4 text-sm text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {message}
          </div>
        )}

        <p className="mt-5 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#7c3aed' }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense ─────────────────────────
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
