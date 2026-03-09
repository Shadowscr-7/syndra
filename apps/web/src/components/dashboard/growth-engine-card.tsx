'use client';

import { usePlan } from '@/lib/plan-context';
import { UsageBadge, PlanBadge } from '@/components/plan/usage-badge';
import Link from 'next/link';

const PLAN_TIPS: Record<string, { title: string; tips: string[]; ctaText: string; ctaPlan: string }> = {
  starter: {
    title: 'Desbloquea tu potencial con Creator',
    tips: [
      'Agrega hasta 4 canales para expandir tu alcance',
      'Activa el Estratega IA para planificación automática',
      'Genera videos con el Video Pipeline',
      'Detecta tendencias en tiempo real',
    ],
    ctaText: 'Actualizar a Creator',
    ctaPlan: 'creator',
  },
  creator: {
    title: 'Lleva tu marca al máximo con Pro',
    tips: [
      'Desbloquea canales ilimitados',
      'Activa Memoria de Marca para consistencia total',
      'Usa cola prioritaria para entregas más rápidas',
      'Accede a la API para integraciones personalizadas',
    ],
    ctaText: 'Actualizar a Pro',
    ctaPlan: 'pro',
  },
  pro: {
    title: 'Estás al máximo',
    tips: [
      'Tienes acceso a todas las funciones',
      'Experimenta con A/B testing ilimitado',
      'La Memoria de Marca aprende de cada publicación',
      'El Autopilot completo maneja todo por ti',
    ],
    ctaText: '',
    ctaPlan: '',
  },
};

/**
 * AI Growth Engine Card — contextual tips + usage overview for dashboard
 */
export function GrowthEngineCard() {
  const { planInfo, planName, loading } = usePlan();

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse" style={{ minHeight: '200px' }}>
        <div className="h-5 w-48 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    );
  }

  const info = PLAN_TIPS[planName] ?? { title: '', tips: [] as string[], ctaText: '', ctaPlan: '' };
  const isPro = planName === 'pro';

  return (
    <div
      className="glass-card p-6 space-y-5"
      style={{
        background: isPro
          ? 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(124,58,237,0.04))'
          : 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(6,182,212,0.04))',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🚀</span>
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              AI Growth Engine
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {info.title}
          </p>
        </div>
        <PlanBadge />
      </div>

      {/* Usage overview */}
      {planInfo?.usage && (
        <div className="grid grid-cols-2 gap-3">
          <UsageBadge resource="publications" label="Publicaciones" />
          <UsageBadge resource="channels" label="Canales" />
          <UsageBadge resource="videos" label="Vídeos" />
          <UsageBadge resource="sources" label="Fuentes" />
        </div>
      )}

      {/* Tips */}
      <div className="space-y-2">
        {info.tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span style={{ color: isPro ? 'var(--color-accent)' : 'var(--color-primary-light)' }}>
              {isPro ? '✓' : '→'}
            </span>
            <span style={{ color: 'var(--color-text-secondary)' }}>{tip}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!isPro && (
        <Link
          href="/dashboard/plans"
          className="block w-full py-2.5 rounded-xl text-center text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          {info.ctaText} →
        </Link>
      )}
    </div>
  );
}
