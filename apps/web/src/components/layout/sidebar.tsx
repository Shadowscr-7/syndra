'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlan } from '@/lib/plan-context';
import { PlanBadge } from '@/components/plan/usage-badge';

interface SidebarItem {
  name: string;
  href: string;
  icon: string;
  minPlan?: string; // 'starter' | 'creator' | 'pro' — undefined = all plans
}

interface SidebarSection {
  label: string;
  roles?: string[]; // restrict section visibility (omit = everyone)
  items: SidebarItem[];
}

const allSections: SidebarSection[] = [
  // ── Core: lo que usas todos los días ──
  {
    label: 'Inicio',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '⚡' },
      { name: 'Cola Editorial', href: '/dashboard/editorial', icon: '📋' },
      { name: 'Alertas', href: '/dashboard/alerts', icon: '🔔' },
    ],
  },
  // ── Planificación e inteligencia ──
  {
    label: 'Estrategia',
    items: [
      { name: 'Estratega IA', href: '/dashboard/strategist', icon: '🧠', minPlan: 'creator' },
      { name: 'Historial', href: '/dashboard/strategist/history', icon: '📜', minPlan: 'creator' },
      { name: 'Campañas', href: '/dashboard/campaigns', icon: '🎯' },
      { name: 'Tendencias', href: '/dashboard/trends', icon: '📈', minPlan: 'creator' },
    ],
  },
  // ── Creación de contenido ──
  {
    label: 'Contenido',
    items: [
      { name: 'Temas', href: '/dashboard/themes', icon: '💡' },
      { name: 'Playbooks', href: '/dashboard/playbooks', icon: '📚' },
      { name: 'Perfiles IA', href: '/dashboard/profiles', icon: '🤖' },
      { name: 'Scheduler', href: '/dashboard/scheduler', icon: '📅' },
    ],
  },
  // ── Archivos y producción ──
  {
    label: 'Media',
    items: [
      { name: 'Biblioteca', href: '/dashboard/media', icon: '📂' },
      { name: 'Video Pipeline', href: '/dashboard/video-pipeline', icon: '🎬', minPlan: 'creator' },
      { name: 'Assets', href: '/dashboard/assets', icon: '🖼️' },
    ],
  },
  // ── Métricas e insights ──
  {
    label: 'Análisis',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
      { name: 'Benchmarking', href: '/dashboard/benchmark', icon: '🏆', minPlan: 'creator' },
      { name: 'Scoring', href: '/dashboard/advanced-scoring', icon: '⭐', minPlan: 'creator' },
      { name: 'Experimentos', href: '/dashboard/experiments', icon: '🧪', minPlan: 'pro' },
    ],
  },
  // ── Conocimiento y fuentes ──
  {
    label: 'Fuentes',
    items: [
      { name: 'Aprendizaje', href: '/dashboard/learning', icon: '🎓' },
      { name: 'Memoria Marca', href: '/dashboard/brand-memory', icon: '💾', minPlan: 'pro' },
      { name: 'Trust Fuentes', href: '/dashboard/source-trust', icon: '🛡️' },
      { name: 'Fuentes RSS', href: '/dashboard/sources', icon: '📡' },
    ],
  },
  // ── Ajustes ──
  {
    label: 'Config',
    items: [
      { name: 'Credenciales', href: '/dashboard/credentials', icon: '🔑' },
      { name: 'Configuración', href: '/dashboard/settings', icon: '⚙️' },
    ],
  },
  // ── Afiliados (solo collaborators) ──
  {
    label: 'Afiliados',
    roles: ['COLLABORATOR'],
    items: [
      { name: 'Mi Panel', href: '/dashboard/partner', icon: '🤝' },
      { name: 'Pagos', href: '/dashboard/partner/payouts', icon: '💳' },
      { name: 'Assets', href: '/dashboard/partner/assets', icon: '🎨' },
    ],
  },
  // ── Administración (solo admins) ──
  {
    label: 'Admin',
    roles: ['ADMIN'],
    items: [
      { name: 'Panel Admin', href: '/dashboard/admin', icon: '🏛️' },
      { name: 'Usuarios', href: '/dashboard/admin/users', icon: '👤' },
      { name: 'Equipo', href: '/dashboard/team', icon: '👥', minPlan: 'creator' },
      { name: 'Planes', href: '/dashboard/plans', icon: '💎' },
      { name: 'Comisiones', href: '/dashboard/admin/commissions', icon: '💰' },
      { name: 'Operaciones', href: '/dashboard/admin/operations', icon: '🔧' },
      { name: 'Playbooks', href: '/dashboard/admin/playbooks', icon: '📖' },
      { name: 'Auditoría', href: '/dashboard/admin/audit', icon: '📝' },
      { name: 'Riesgo Churn', href: '/dashboard/admin/churn', icon: '⚠️' },
    ],
  },
];

const STORAGE_KEY = 'syndra-sidebar-collapsed';

export function Sidebar({ userEmail, userRole = 'USER' }: { userEmail: string; userRole?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAtLeast, loading: planLoading, planName } = usePlan();

  const sections = useMemo(
    () => allSections.filter((s) => !s.roles || s.roles.includes(userRole)),
    [userRole],
  );

  // ── Collapsible state (persisted in localStorage) ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCollapsed(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Auto-expand the section that contains the active route
  useEffect(() => {
    for (const section of sections) {
      const hasActive = section.items.some(
        (item) => pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href)),
      );
      if (hasActive && collapsed[section.label]) {
        setCollapsed((prev) => {
          const next = { ...prev, [section.label]: false };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[260px] flex flex-col z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(10,10,20,0.95) 0%, rgba(15,15,30,0.98) 100%)',
        borderRight: '1px solid rgba(124, 58, 237, 0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Logo ─────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logosyndra.png"
            alt="Syndra"
            width={140}
            height={38}
            priority
          />
        </div>
      </div>

      {/* ── Separator ────────────── */}
      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }} />

      {/* ── Navigation ───────────── */}
      <nav className="flex-1 px-3 pt-3 pb-6 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' }}>
        {sections.map((section) => {
          const isOpen = !collapsed[section.label];
          const hasActive = section.items.some(
            (item) => pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href)),
          );

          return (
            <div key={section.label}>
              {/* ── Section header (clickable) ── */}
              <button
                onClick={() => toggle(section.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-200 group/header"
                style={{ color: hasActive ? 'rgba(167,139,250,0.9)' : 'rgba(130,130,160,0.6)' }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  {section.label}
                </span>
                <svg
                  className="w-3 h-3 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', opacity: 0.5 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ── Collapsible items ── */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{
                  maxHeight: isOpen ? `${section.items.length * 44 + 4}px` : '0px',
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="space-y-0.5 pt-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    const isLocked = !planLoading && item.minPlan && !isAtLeast(item.minPlan);

                    if (isLocked) {
                      return (
                        <Link
                          key={item.href}
                          href="/dashboard/plans"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 group relative opacity-40"
                          style={{
                            color: 'rgba(160,160,192,0.5)',
                            borderLeft: '2px solid transparent',
                          }}
                          title={`Requiere plan ${(item.minPlan ?? '').charAt(0).toUpperCase() + (item.minPlan ?? '').slice(1)}`}
                        >
                          <span className="text-base" style={{ filter: 'grayscale(1)' }}>{item.icon}</span>
                          <span>{item.name}</span>
                          <span className="absolute right-3 text-[10px]">🔒</span>
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 group relative',
                        )}
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(6,182,212,0.08))'
                            : 'transparent',
                          color: isActive ? '#e0d4ff' : 'rgba(160,160,192,0.8)',
                          borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                        }}
                      >
                        <span
                          className="text-base transition-transform duration-200 group-hover:scale-110"
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 4px rgba(124,58,237,0.5))' : 'none',
                          }}
                        >
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                        {isActive && (
                          <span
                            className="absolute right-3 w-1.5 h-1.5 rounded-full animate-pulse-glow"
                            style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 6px #7c3aed' }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Separator ────────────── */}
      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent)' }} />

      {/* ── User ─────────────────── */}
      <div className="px-4 py-4">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(124, 58, 237, 0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))',
              color: '#a78bfa',
            }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs truncate font-medium" style={{ color: 'rgba(224,212,255,0.7)' }}>
                {userEmail}
              </p>
            </div>
            <div className="mt-1">
              <PlanBadge />
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 text-xs w-full text-left px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{ color: 'rgba(160,160,192,0.5)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(160,160,192,0.5)')}
        >
          ← Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
