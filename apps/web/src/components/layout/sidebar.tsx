'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';

const sections = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '⚡' },
      { name: 'Cola Editorial', href: '/dashboard/editorial', icon: '📋' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { name: 'Campañas', href: '/dashboard/campaigns', icon: '🎯' },
      { name: 'Temas', href: '/dashboard/themes', icon: '💡' },
      { name: 'Assets', href: '/dashboard/assets', icon: '🖼️' },
    ],
  },
  {
    label: 'Datos',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
      { name: 'Fuentes RSS', href: '/dashboard/sources', icon: '📡' },
    ],
  },
  {
    label: 'Config',
    items: [
      { name: 'Brand Profile', href: '/dashboard/brand', icon: '🎨' },
      { name: 'Credenciales', href: '/dashboard/credentials', icon: '🔑' },
      { name: 'Configuración', href: '/dashboard/settings', icon: '⚙️' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Equipo', href: '/dashboard/team', icon: '👥' },
      { name: 'Planes', href: '/dashboard/plans', icon: '💎' },
      { name: 'Admin', href: '/dashboard/admin', icon: '🛡️' },
    ],
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

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
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.35)',
              letterSpacing: '-0.05em',
            }}
          >
            S
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: '#f0f0ff' }}>
              Syndra
            </h1>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'rgba(167, 139, 250, 0.6)' }}>
              AI Content Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Separator ────────────── */}
      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }} />

      {/* ── Navigation ───────────── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="section-title px-3 mb-1">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href));
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
        ))}
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
            <p className="text-xs truncate font-medium" style={{ color: 'rgba(224,212,255,0.7)' }}>
              {userEmail}
            </p>
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
