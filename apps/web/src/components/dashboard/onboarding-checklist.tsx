'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OnboardingStatus {
  completed: boolean;
  percent: number;
  steps: Record<string, boolean>;
}

const STEP_META: Record<string, { label: string; icon: string; href: string; description: string }> = {
  workspace: {
    label: 'Workspace configurado',
    icon: '🏠',
    href: '/dashboard/settings',
    description: 'Nombre y slug del workspace',
  },
  brand: {
    label: 'Identidad de marca',
    icon: '🎨',
    href: '/dashboard/settings',
    description: 'Voz, tono y estilo visual',
  },
  llmConfigured: {
    label: 'LLM / IA conectado',
    icon: '🤖',
    href: '/dashboard/credentials',
    description: 'API Key de OpenRouter, OpenAI o similar',
  },
  metaConnected: {
    label: 'Meta conectado',
    icon: '📱',
    href: '/dashboard/credentials',
    description: 'Instagram/Facebook vía OAuth',
  },
  telegramLinked: {
    label: 'Telegram vinculado',
    icon: '✈️',
    href: '/dashboard/credentials',
    description: 'Bot de aprobaciones vía QR',
  },
  sourcesAdded: {
    label: 'Fuentes de investigación',
    icon: '📡',
    href: '/dashboard/sources',
    description: 'RSS o fuentes para research',
  },
  themes: {
    label: 'Temas de contenido',
    icon: '💡',
    href: '/dashboard/themes',
    description: 'Al menos un tema creado',
  },
  personaCreated: {
    label: 'Persona IA',
    icon: '🧠',
    href: '/dashboard/profiles',
    description: 'Personalidad de la IA configurada',
  },
  profileCreated: {
    label: 'Perfil de contenido',
    icon: '📝',
    href: '/dashboard/profiles',
    description: 'Perfil con tono y audiencia',
  },
  plan: {
    label: 'Plan activado',
    icon: '💎',
    href: '/dashboard/plans',
    description: 'Suscripción o licencia activa',
  },
  channels: {
    label: 'Canales habilitados',
    icon: '📲',
    href: '/dashboard/credentials',
    description: 'Al menos una credencial social',
  },
};

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((json) => setStatus(json.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!status || status.percent === 100) return null;

  const steps = status.steps;
  const done = Object.values(steps).filter(Boolean).length;
  const total = Object.keys(steps).length;

  return (
    <div className="glass-card p-5 animate-fade-in-delay-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div className="text-left">
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              Configuración inicial
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {done}/{total} pasos completados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ width: 120, backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${status.percent}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>
              {status.percent}%
            </span>
          </div>
          <span
            className="text-xs transition-transform duration-200"
            style={{
              color: 'var(--color-text-muted)',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(steps).map(([key, completed]) => {
            const meta = STEP_META[key];
            if (!meta) return null;
            return (
              <Link
                key={key}
                href={meta.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group border"
                style={{
                  backgroundColor: completed ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                  borderColor: completed ? 'rgba(16,185,129,0.15)' : 'var(--color-border-subtle)',
                }}
              >
                <span className="text-base">{completed ? '✅' : meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{
                      color: completed ? '#10b981' : 'var(--color-text)',
                      textDecoration: completed ? 'line-through' : 'none',
                      opacity: completed ? 0.7 : 1,
                    }}
                  >
                    {meta.label}
                  </p>
                  {!completed && (
                    <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {meta.description}
                    </p>
                  )}
                </div>
                {!completed && (
                  <span
                    className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#7c3aed' }}
                  >
                    Configurar →
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
