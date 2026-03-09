'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ──────────────────────────────────────────────────────────
   Syndra Landing Page — Dark glassmorphism, conversion-first
   ────────────────────────────────────────────────────────── */

// ── Shared atoms ────────────────────────────────────────
function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
      style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(124,58,237,0.2)' }}>
      {children}
    </span>
  );
}

function SectionHeading({ tag, title, subtitle }: { tag?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      {tag && <div className="mb-4"><SectionTag>{tag}</SectionTag></div>}
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight"
        style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
    </div>
  );
}

function CTAButton({ href, children, variant = 'primary', large }: { href: string; children: React.ReactNode; variant?: 'primary' | 'ghost'; large?: boolean }) {
  const base = large ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm';
  if (variant === 'ghost') {
    return <Link href={href} className={`btn-ghost rounded-xl font-semibold ${base} inline-flex items-center gap-2`}>{children}</Link>;
  }
  return <Link href={href} className={`btn-primary rounded-xl font-semibold ${base} inline-flex items-center gap-2`}>{children}</Link>;
}

// ── 1. HERO ─────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Orbs */}
      <div className="hero-orb" style={{ width: 500, height: 500, top: '-10%', left: '-5%', background: 'rgba(124,58,237,0.2)' }} />
      <div className="hero-orb" style={{ width: 400, height: 400, bottom: '-8%', right: '-3%', background: 'rgba(6,182,212,0.15)', animationDelay: '3s' }} />
      <div className="landing-grid-bg" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <div>
          <div className="animate-slide-up mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--color-primary-light)' }}>
              ✨ Diseñado para automatizar contenido en redes con IA
            </span>
          </div>

          <h1 className="animate-slide-up-d1 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Automatiza tu contenido para redes sociales{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              con IA.
            </span>
          </h1>

          <p className="animate-slide-up-d2 mt-6 text-lg md:text-xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Syndra investiga tendencias, genera contenido, crea imágenes o videos, envía un preview a Telegram y publica automáticamente en tus redes.
          </p>

          {/* Bullets */}
          <ul className="animate-slide-up-d3 mt-8 space-y-3">
            {[
              'Encuentra temas relevantes automáticamente',
              'Genera posts e imágenes con IA',
              'Aprueba desde Telegram en segundos',
              'Publica en Instagram, Facebook, Threads o Discord',
            ].map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓</span>
                {b}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="animate-slide-up-d4 mt-10 flex flex-wrap gap-4">
            <CTAButton href="/register" large>Empieza con Creator →</CTAButton>
            <CTAButton href="#como-funciona" variant="ghost" large>Ver cómo funciona</CTAButton>
          </div>
        </div>

        {/* Right — mockup */}
        <div className="animate-slide-up-d3 relative">
          <div className="glass-card p-1 rounded-2xl overflow-hidden">
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--color-bg-secondary)' }}>
              {/* Dashboard mockup */}
              <div className="absolute inset-0 flex flex-col p-4 gap-3">
                {/* Top bar */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
                  <div className="flex-1 h-6 rounded-md ml-2" style={{ background: 'rgba(124,58,237,0.08)' }} />
                </div>
                {/* Sidebar + content */}
                <div className="flex-1 flex gap-3">
                  <div className="w-[140px] rounded-lg p-3 space-y-2" style={{ background: 'rgba(124,58,237,0.06)' }}>
                    {['⚡ Dashboard', '📋 Cola Editorial', '🧠 Estratega IA', '📊 Analytics', '📂 Media'].map((item) => (
                      <div key={item} className="text-[10px] px-2 py-1.5 rounded-md" style={{ color: 'var(--color-text-secondary)', background: item.includes('Dashboard') ? 'rgba(124,58,237,0.15)' : 'transparent' }}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Publicaciones', value: '127', color: '#7c3aed' },
                        { label: 'Engagement', value: '4.8%', color: '#06b6d4' },
                        { label: 'Crecimiento', value: '+23%', color: '#10b981' },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="text-[9px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                          <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Content preview */}
                    <div className="rounded-lg p-3 flex gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-16 h-16 rounded-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))' }} />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <div className="h-2 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-2 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                    </div>
                    {/* Telegram approve */}
                    <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <span className="text-xs">📱</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Preview enviado a Telegram</span>
                      <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓ Aprobado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Floating glow */}
          <div className="absolute -bottom-6 -right-6 w-40 h-40 rounded-full animate-pulse-glow"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)' }} />
        </div>
      </div>
    </section>
  );
}

// ── 2. CÓMO FUNCIONA ────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: '🎨', title: 'Configura tu marca', desc: 'Define tu estilo, tono y temas. Syndra aprende cómo debe comunicar tu marca.' },
    { icon: '🔍', title: 'Syndra investiga y crea contenido', desc: 'Analiza fuentes, detecta tendencias y genera posts completos con IA. Incluye texto, imágenes o video.' },
    { icon: '📱', title: 'Recibe el preview', desc: 'Syndra te envía el contenido a Telegram para revisarlo. Puedes aprobar, corregir o regenerar.' },
    { icon: '🚀', title: 'Publicación automática', desc: 'Una vez aprobado, Syndra publica en tus redes. Instagram, Facebook, Threads, Discord.' },
  ];

  return (
    <section id="como-funciona" className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Cómo funciona" title="Tu sistema de contenido en piloto automático"
          subtitle="En 4 pasos simples, Syndra se encarga de todo tu contenido." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="glass-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="step-number">{i + 1}</div>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 3. FEATURES ─────────────────────────────────────────
function Features() {
  const features = [
    { icon: '🔍', title: 'Investigación automática', desc: 'Syndra analiza fuentes, noticias y tendencias para encontrar temas relevantes para tu audiencia.' },
    { icon: '✍️', title: 'Generación de contenido con IA', desc: 'Genera posts, captions, hashtags y guiones automáticamente con inteligencia artificial avanzada.' },
    { icon: '🖼️', title: 'Generación de imágenes y video', desc: 'Crea visuales adaptados a tu estilo y marca. Imágenes, carruseles y videos cortos.' },
    { icon: '🧠', title: 'Estrategia de contenido', desc: 'Syndra recomienda qué publicar, cuándo y con qué formato para maximizar engagement.' },
    { icon: '📅', title: 'Automatización de publicación', desc: 'Programa contenido o activa el modo autopilot. Syndra publica por ti.' },
    { icon: '📊', title: 'Analytics y optimización', desc: 'Analiza resultados y mejora futuras publicaciones automáticamente con IA.' },
  ];

  return (
    <section className="relative py-24 px-6" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Features" title="Un sistema completo de contenido para redes"
          subtitle="Todo lo que necesitas para crear, optimizar y publicar contenido automáticamente." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6 flex flex-col gap-4">
              <div className="feature-icon-box">{f.icon}</div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 4. EJEMPLO REAL ─────────────────────────────────────
function RealExample() {
  return (
    <section className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <SectionHeading tag="Ejemplo real" title="Contenido generado en segundos"
          subtitle="Así se ve un post creado completamente por Syndra." />

        <div className="glass-card p-8 md:p-10 max-w-2xl mx-auto">
          {/* Post preview */}
          <div className="flex gap-3 items-center mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--gradient-primary)' }}>S</div>
            <div>
              <div className="font-semibold text-sm">Tu Marca</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Generado por Syndra • hace 2 min</div>
            </div>
          </div>

          {/* Hook */}
          <div className="mb-4">
            <p className="font-bold text-base mb-2" style={{ color: 'var(--color-text)' }}>
              🚀 ¿Sabías que el 80% del contenido viral sigue un patrón predecible?
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Hoy te cuento los 3 elementos que toda publicación necesita para alcanzar más personas.
              Tu audiencia quiere contenido que conecte, no que simplemente exista.
              Aplica estas reglas y verás la diferencia.
            </p>
          </div>

          {/* AI-generated image */}
          <div className="w-full rounded-xl mb-4 overflow-hidden relative" style={{ aspectRatio: '1/1', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))', border: '1px solid rgba(124,58,237,0.1)' }}>
            <Image
              src="https://image.pollinations.ai/prompt/Modern%20social%20media%20marketing%20infographic%20showing%20viral%20content%20patterns%2C%20growth%20charts%2C%20engagement%20metrics%2C%20purple%20and%20cyan%20neon%20gradient%2C%20dark%20background%2C%20professional%20minimal%20design%2C%20no%20text?width=1024&height=1024&seed=42&nologo=true"
              alt="Contenido generado con IA por Syndra"
              fill
              className="object-cover rounded-xl"
              sizes="(max-width: 768px) 100vw, 600px"
            />
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-semibold backdrop-blur-sm"
              style={{ background: 'rgba(124,58,237,0.6)', color: 'white' }}>
              🤖 Generado con IA
            </div>
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['#ContentCreator', '#MarketingDigital', '#IA', '#Automatización', '#Redes'].map((h) => (
              <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>{h}</span>
            ))}
          </div>

          {/* Published to */}
          <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Publicado en:</span>
            {['📸 Instagram', '📘 Facebook', '💬 Discord'].map((p) => (
              <span key={p} className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)' }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 5. AI GROWTH ENGINE ─────────────────────────────────
function AIGrowthEngine() {
  const optimizations = [
    { icon: '📐', label: 'Formatos', pct: 78 },
    { icon: '🎯', label: 'Tono', pct: 85 },
    { icon: '⏰', label: 'Horario de publicación', pct: 92 },
    { icon: '💡', label: 'CTAs', pct: 67 },
    { icon: '🔥', label: 'Temas', pct: 88 },
  ];

  return (
    <section className="relative py-24 px-6" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left — visual */}
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🧬</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-primary-light)' }}>AI Growth Engine</div>
          </div>
          <div className="space-y-3">
            {optimizations.map((o) => (
              <div key={o.label} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.08)' }}>
                <span className="text-lg">{o.icon}</span>
                <span className="text-sm font-medium flex-1">{o.label}</span>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(124,58,237,0.1)', width: 120 }}>
                  <div className="h-full rounded-full" style={{ width: `${o.pct}%`, background: 'var(--gradient-primary)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — copy */}
        <div>
          <SectionTag>AI Growth Engine</SectionTag>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Syndra aprende qué funciona para tu audiencia
          </h2>
          <p className="mt-6 text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Syndra analiza el rendimiento de tus publicaciones y detecta patrones.
            Después optimiza automáticamente formatos, tono, horario de publicación, CTAs y temas.
          </p>
          <p className="mt-4 text-base font-semibold" style={{ color: 'var(--color-primary-light)' }}>
            Tu contenido mejora con el tiempo. Automáticamente.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── 6. MODOS DE USO ─────────────────────────────────────
function AutomationModes() {
  const modes = [
    { icon: '✋', title: 'Modo manual', desc: 'Crea contenido cuando lo necesites. Control total.', tag: 'Starter' },
    { icon: '💡', title: 'Modo asistido', desc: 'Syndra propone ideas y contenido listo para publicar.', tag: 'Creator' },
    { icon: '📱', title: 'Modo aprobación', desc: 'Syndra genera contenido y lo envía a Telegram para aprobar.', tag: 'Creator' },
    { icon: '🤖', title: 'Piloto automático', desc: 'Syndra crea y publica contenido automáticamente. Sin intervención.', tag: 'Pro' },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Automatización" title="Elige cómo quieres trabajar"
          subtitle="Desde control total hasta piloto automático completo." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modes.map((m) => (
            <div key={m.title} className="glass-card p-6 flex flex-col gap-4 text-center">
              <div className="text-4xl">{m.icon}</div>
              <h3 className="text-base font-bold">{m.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{m.desc}</p>
              <span className="mt-auto text-xs font-semibold px-3 py-1 rounded-full self-center"
                style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>
                Desde {m.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 7. PARA QUIÉN ES ────────────────────────────────────
function TargetAudience() {
  const targets = [
    { icon: '🎬', title: 'Creadores de contenido', desc: 'Publica constantemente sin dedicar horas cada semana.' },
    { icon: '👤', title: 'Marcas personales', desc: 'Construye autoridad en tu nicho con contenido consistente.' },
    { icon: '🏪', title: 'Negocios locales', desc: 'Mantén tus redes activas sin esfuerzo ni equipo de marketing.' },
    { icon: '🏢', title: 'Agencias de marketing', desc: 'Gestiona múltiples cuentas desde un solo lugar con IA.' },
  ];

  return (
    <section className="relative py-24 px-6" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Para quién" title="Hecho para creadores y negocios"
          subtitle="Syndra se adapta a tu flujo de trabajo." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {targets.map((t) => (
            <div key={t.title} className="glass-card p-6 text-center flex flex-col items-center gap-4">
              <div className="text-4xl">{t.icon}</div>
              <h3 className="text-base font-bold">{t.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 8. PRICING ──────────────────────────────────────────
function Pricing() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Starter',
      tag: 'Para empezar',
      monthly: 15,
      yearly: 12,
      desc: 'Genera contenido y publícalo fácilmente.',
      features: [
        '40 publicaciones al mes',
        '2 redes sociales',
        '3 fuentes de investigación',
        'Generación de texto e imágenes',
        'Preview por Telegram',
        'Analytics básicos',
        '1 perfil de contenido',
        '1 persona IA',
        'Scheduler básico',
        '500MB de media',
      ],
      featured: false,
    },
    {
      name: 'Creator',
      tag: 'Más popular',
      monthly: 39,
      yearly: 31,
      desc: 'Automatiza tu contenido con IA.',
      micro: 'El plan que usan la mayoría de creadores.',
      features: [
        'Todo lo de Starter, más:',
        '150 publicaciones al mes',
        'Hasta 4 redes sociales',
        '10 fuentes de investigación',
        'Estrategia automática de contenido',
        'Detección de tendencias',
        'Optimización de tono y formato',
        'Analytics completos',
        'Predicción de engagement',
        'Generación de video',
        '3 personas IA',
        '5 perfiles de contenido',
        '2 usuarios por workspace',
        'Scheduler avanzado',
        '2GB de media',
      ],
      featured: true,
    },
    {
      name: 'Pro',
      tag: 'Para equipos y agencias',
      monthly: 99,
      yearly: 79,
      desc: 'El motor completo de crecimiento con IA.',
      features: [
        'Todo lo de Creator, más:',
        'Publicaciones ilimitadas',
        'Redes sociales ilimitadas',
        'Autopilot completo',
        'Detección avanzada de tendencias',
        'Estrategia automática semanal',
        'Optimización automática de contenido',
        'A/B testing ilimitado',
        'Memoria de marca',
        '5 usuarios por workspace',
        'Analytics avanzados',
        'Alertas inteligentes',
        '10GB de media',
      ],
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Planes" title="Automatiza tu contenido. Syndra se encarga del resto."
          subtitle="Empieza a publicar desde el primer día." />

        {/* ── Toggle mensual / anual ── */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-semibold transition-colors ${!annual ? 'text-white' : ''}`}
            style={{ color: annual ? 'var(--color-text-muted)' : undefined }}>Mensual</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none"
            style={{ background: annual ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)' }}
            aria-label="Cambiar entre facturación mensual y anual">
            <span className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ transform: annual ? 'translateX(28px)' : 'translateX(0)' }} />
          </button>
          <span className={`text-sm font-semibold transition-colors ${annual ? 'text-white' : ''}`}
            style={{ color: !annual ? 'var(--color-text-muted)' : undefined }}>Anual</span>
          {annual && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
              Ahorra 2 meses
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-4 items-start">
          {plans.map((plan) => {
            const price = annual ? plan.yearly : plan.monthly;
            const totalYear = annual ? plan.yearly * 12 : null;
            return (
              <div key={plan.name}
                className={`glass-card p-8 flex flex-col ${plan.featured ? 'pricing-card-featured' : ''}`}>
                {/* Badge */}
                <div className="mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${plan.featured ? 'text-white' : ''}`}
                    style={{
                      background: plan.featured ? 'var(--gradient-primary)' : 'rgba(124,58,237,0.1)',
                      color: plan.featured ? 'white' : 'var(--color-primary-light)',
                    }}>
                    {plan.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold mb-1">{plan.name}</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${price}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/ mes</span>
                </div>
                {annual && totalYear !== null ? (
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    ${totalYear}/año &middot; <span style={{ color: '#34D399' }}>Ahorras ${plan.monthly * 12 - totalYear}/año</span>
                  </p>
                ) : plan.micro ? (
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{plan.micro}</p>
                ) : (
                  <div className="mb-4" />
                )}

                <Link href="/register"
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                  Elegir {plan.name}
                </Link>

                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {f.startsWith('Todo lo de') ? (
                        <span className="text-xs mt-0.5" style={{ color: 'var(--color-primary-light)' }}>↑</span>
                      ) : (
                        <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }}>✓</span>
                      )}
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── 9. COMPARACIÓN ──────────────────────────────────────
function Comparison() {
  const rows: [string, string, string, string][] = [
    ['Publicaciones', '40', '150', 'Ilimitado'],
    ['Redes sociales', '2', '4', 'Ilimitado'],
    ['Usuarios', '1', '2', '5'],
    ['Personas IA', '1', '3', 'Ilimitadas'],
    ['Perfiles de contenido', '1', '5', 'Ilimitados'],
    ['Fuentes de investigación', '3', '10', 'Ilimitadas'],
    ['Generación de imágenes', '✔', '✔', '✔'],
    ['Generación de video', '✖', '10/mes', '50/mes'],
    ['Aprobación Telegram', '✔', '✔', '✔'],
    ['Autopilot', '✖', 'Parcial', 'Completo'],
    ['AI Strategist', '✖', '✔', '✔ Avanzado'],
    ['Trend detection', '✖', 'Básico', 'Completo'],
    ['Analytics', 'Básico', 'Completo', 'Avanzado'],
    ['A/B testing', '✖', 'Limitado', 'Ilimitado'],
    ['Media storage', '500MB', '2GB', '10GB'],
  ];

  return (
    <section className="relative py-24 px-6" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="relative z-10 max-w-4xl mx-auto">
        <SectionHeading tag="Comparación" title="Comparación detallada de features" />

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Feature</th>
                  <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Starter</th>
                  <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary-light)' }}>Creator</th>
                  <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, s, c, p]) => (
                  <tr key={feature} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{feature}</td>
                    {[s, c, p].map((val, i) => (
                      <td key={i} className="p-4 text-center font-medium">
                        {val === '✔' ? <span className="comparison-check text-base">✓</span> :
                         val === '✖' ? <span className="comparison-cross text-base">✗</span> :
                         <span style={{ color: i === 1 ? 'var(--color-primary-light)' : 'var(--color-text-secondary)' }}>{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 10. AHORRO DE TIEMPO ────────────────────────────────
function TimeSavings() {
  const tasks = [
    { task: 'Investigar temas', hours: '3h' },
    { task: 'Escribir contenido', hours: '2h' },
    { task: 'Diseñar imágenes', hours: '2h' },
    { task: 'Publicar', hours: '1h' },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <SectionHeading tag="Ahorro de tiempo" title="Cuánto tiempo puedes ahorrar"
          subtitle="Un creador promedio gasta por semana:" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left — breakdown */}
          <div className="space-y-4">
            {tasks.map((t) => (
              <div key={t.task} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                <span className="text-lg font-bold" style={{ color: '#ef4444', minWidth: 40 }}>{t.hours}</span>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.task}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <span className="text-lg font-extrabold" style={{ color: '#ef4444', minWidth: 40 }}>8h</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Total por semana</span>
            </div>
          </div>

          {/* Right — Syndra time */}
          <div className="glass-card p-10 text-center">
            <div className="text-6xl font-extrabold mb-2"
              style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              &lt;1h
            </div>
            <p className="text-lg font-semibold mb-2">Con Syndra</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Syndra puede ahorrarte <span className="font-bold" style={{ color: 'var(--color-success)' }}>30 horas al mes</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 11. INTEGRACIONES ───────────────────────────────────

/* SVG logo components for each integration */
const logos: Record<string, React.ReactNode> = {
  // — Publishing —
  Instagram: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
      <defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#feda75"/><stop offset="25%" stopColor="#fa7e1e"/><stop offset="50%" stopColor="#d62976"/><stop offset="75%" stopColor="#962fbf"/><stop offset="100%" stopColor="#4f5bd5"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/><circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig)"/>
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/></svg>
  ),
  Threads: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12.186 24h-.007C5.461 23.962.057 18.532 0 11.81v-.006C.057 5.03 5.46-.03 12.179 0h.014c3.17.015 5.884 1.104 8.074 3.238l-2.39 2.66c-1.53-1.478-3.504-2.27-5.7-2.283-4.68.065-8.46 3.88-8.49 8.577v.004c.03 4.696 3.81 8.512 8.49 8.577 3.286-.023 5.607-1.46 6.766-4.19-1.028.515-2.21.8-3.5.828-3.643-.072-6.478-3.09-6.32-6.733a6.345 6.345 0 0 1 6.508-6.088c1.694.034 3.16.698 4.243 1.863.568.612.99 1.343 1.27 2.143l-2.875.936a3.06 3.06 0 0 0-.615-1.034c-.541-.582-1.3-.896-2.09-.912-1.88.037-3.376 1.58-3.34 3.44.037 1.825 1.495 3.27 3.32 3.307.898-.018 1.67-.243 2.275-.632l.002-.001c.48-.31.843-.72 1.091-1.2H12.62v-2.777h7.103c.128.591.194 1.21.194 1.855 0 3.563-1.459 6.478-4.059 8.13-1.184.754-2.523 1.16-3.935 1.216H12.186z" fill="white"/></svg>
  ),
  Discord: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" fill="#5865F2"/></svg>
  ),
  Telegram: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.97 9.347c-.146.658-.537.818-1.084.508l-3-2.211-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.833.875z" fill="#26A5E4"/></svg>
  ),
  // — LLMs —
  OpenAI: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071.005l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm17.327 4.028l-5.842-3.37 2.02-1.166a.076.076 0 0 1 .071-.005l4.83 2.786a4.494 4.494 0 0 1-.693 8.084v-5.686a.79.79 0 0 0-.386-.643zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L10.14 9.41V7.077a.08.08 0 0 1 .033-.062l4.83-2.787a4.5 4.5 0 0 1 6.674 4.673zM8.958 12.745l-2.02-1.168a.075.075 0 0 1-.038-.052V5.942a4.498 4.498 0 0 1 7.375-3.453l-.142.08L9.34 5.33a.795.795 0 0 0-.393.681l-.003 6.734zm1.097-2.365l2.602-1.5 2.602 1.5v3.001l-2.6 1.5-2.6-1.5z" fill="white"/></svg>
  ),
  Anthropic: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.503-4.076H5.248L3.741 20.48H0L6.569 3.52zm1.04 3.781L5.372 13.618h4.476L7.61 7.301z" fill="#D4A27F"/></svg>
  ),
  OpenRouter: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="12" cy="12" r="10" fill="none" stroke="#7C3AED" strokeWidth="1.5"/><path d="M7 12h10M12 7v10" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="3" fill="#7C3AED"/></svg>
  ),
  // — Image Generation —
  'DALL·E': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="2" y="2" width="20" height="20" rx="4" fill="#10A37F"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="Arial">D·E</text></svg>
  ),
  HuggingFace: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#FFD21E"/><circle cx="8.5" cy="10" r="1.5" fill="#1A1A2E"/><circle cx="15.5" cy="10" r="1.5" fill="#1A1A2E"/><path d="M8 14.5c0 0 1.5 2.5 4 2.5s4-2.5 4-2.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
  ),
  'Stability AI': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="none" stroke="#A855F7" strokeWidth="1.5"/><path d="M12 7L7 9.5v5L12 17l5-2.5v-5L12 7z" fill="#A855F7"/></svg>
  ),
  Pollinations: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="12" cy="12" r="3" fill="#34D399"/><circle cx="12" cy="5" r="2" fill="#34D399" opacity="0.7"/><circle cx="18" cy="8" r="2" fill="#34D399" opacity="0.6"/><circle cx="18" cy="16" r="2" fill="#34D399" opacity="0.5"/><circle cx="12" cy="19" r="2" fill="#34D399" opacity="0.7"/><circle cx="6" cy="16" r="2" fill="#34D399" opacity="0.6"/><circle cx="6" cy="8" r="2" fill="#34D399" opacity="0.5"/><line x1="12" y1="9" x2="12" y2="5" stroke="#34D399" strokeWidth="1"/><line x1="14.6" y1="10.5" x2="18" y2="8" stroke="#34D399" strokeWidth="1"/><line x1="14.6" y1="13.5" x2="18" y2="16" stroke="#34D399" strokeWidth="1"/><line x1="12" y1="15" x2="12" y2="19" stroke="#34D399" strokeWidth="1"/><line x1="9.4" y1="13.5" x2="6" y2="16" stroke="#34D399" strokeWidth="1"/><line x1="9.4" y1="10.5" x2="6" y2="8" stroke="#34D399" strokeWidth="1"/></svg>
  ),
  // — Video & Voice —
  HeyGen: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="2" y="2" width="20" height="20" rx="4" fill="#6C5CE7"/><polygon points="10,7 18,12 10,17" fill="white"/></svg>
  ),
  ElevenLabs: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="8" y="3" width="3" height="18" rx="1.5" fill="white"/><rect x="13" y="3" width="3" height="18" rx="1.5" fill="white"/></svg>
  ),
  // — Research —
  Tavily: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="10" cy="10" r="7" fill="none" stroke="#06B6D4" strokeWidth="2"/><line x1="15" y1="15" x2="21" y2="21" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round"/><circle cx="10" cy="10" r="3" fill="#06B6D4" opacity="0.3"/></svg>
  ),
  SerpAPI: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="12" cy="12" r="10" fill="none" stroke="#F59E0B" strokeWidth="1.5"/><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#F59E0B" fontFamily="Arial">S</text></svg>
  ),

};

function IntegrationCard({ name }: { name: string }) {
  return (
    <div className="glass-card px-6 py-5 flex flex-col items-center gap-3 min-w-[110px] max-w-[130px] transition-transform hover:scale-105">
      <div className="w-10 h-10 flex items-center justify-center">{logos[name]}</div>
      <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
    </div>
  );
}

function IntegrationCategory({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-3 mb-5 justify-center">
        <div className="h-px flex-1 max-w-[80px]" style={{ background: 'var(--color-border-subtle)' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <div className="h-px flex-1 max-w-[80px]" style={{ background: 'var(--color-border-subtle)' }} />
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {names.map((n) => <IntegrationCard key={n} name={n} />)}
      </div>
    </div>
  );
}

function Integrations() {
  return (
    <section className="relative py-24 px-6" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="relative z-10 max-w-5xl mx-auto">
        <SectionHeading tag="Integraciones" title="Conecta con +20 plataformas y servicios"
          subtitle="Syndra integra los mejores modelos de IA, redes sociales y herramientas para tu contenido." />

        <IntegrationCategory label="Publicación en redes" names={['Instagram', 'Facebook', 'Threads', 'Discord', 'Telegram']} />
        <IntegrationCategory label="Modelos de lenguaje (LLM)" names={['OpenAI', 'Anthropic', 'OpenRouter']} />
        <IntegrationCategory label="Generación de imágenes" names={['DALL·E', 'HuggingFace', 'Stability AI', 'Pollinations']} />
        <IntegrationCategory label="Video & Voz" names={['HeyGen', 'ElevenLabs']} />
        <IntegrationCategory label="Investigación" names={['Tavily', 'SerpAPI']} />
      </div>
    </section>
  );
}

// ── 12. FAQ ─────────────────────────────────────────────
function FAQ() {
  const faqs = [
    { q: '¿Necesito experiencia en marketing?', a: 'No. Syndra genera contenido listo para publicar. Solo necesitas definir tu marca y dejar que la IA trabaje por ti.' },
    { q: '¿Puedo usar mis propias API keys?', a: 'Sí. Puedes conectar tus propias claves de OpenAI, generadores de imagen o servicios externos si lo deseas.' },
    { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Puedes cancelar tu suscripción en cualquier momento desde tu panel. No hay contratos ni permanencia.' },
    { q: '¿Syndra publica automáticamente?', a: 'Sí. Puedes elegir entre aprobación manual, modo asistido o piloto automático completo.' },
    { q: '¿Hay prueba gratuita?', a: 'No. Syndra está diseñado para generar contenido desde el primer día. Si quieres probarlo antes, puedes solicitar acceso como colaborador.' },
    { q: '¿Necesito conectar mis cuentas de redes sociales?', a: 'Sí. Syndra se conecta a Instagram, Facebook, Threads o Discord para publicar automáticamente.' },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="landing-grid-bg" />
      <div className="relative z-10 max-w-3xl mx-auto">
        <SectionHeading tag="FAQ" title="Preguntas frecuentes" />

        <div className="space-y-2">
          {faqs.map((faq) => (
            <details key={faq.q} className="glass-card faq-item">
              <summary>
                {faq.q}
                <span className="faq-chevron">▼</span>
              </summary>
              <div className="faq-answer">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 13. CTA FINAL ───────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative py-28 px-6 overflow-hidden">
      {/* Orb backgrounds */}
      <div className="hero-orb" style={{ width: 500, height: 500, top: '20%', left: '10%', background: 'rgba(124,58,237,0.12)' }} />
      <div className="hero-orb" style={{ width: 350, height: 350, bottom: '10%', right: '15%', background: 'rgba(6,182,212,0.1)', animationDelay: '2s' }} />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
          Empieza a automatizar tu contenido{' '}
          <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>hoy.</span>
        </h2>
        <p className="mt-6 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          Miles de creadores pasan horas cada semana creando contenido.
          <br />Syndra lo hace por ti.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <CTAButton href="/register" large>Empieza con Creator →</CTAButton>
        </div>
      </div>
    </section>
  );
}

// ── NAVBAR ──────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{ background: 'rgba(6,6,15,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logosyndra.png" alt="Syndra" width={120} height={34} priority />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--color-text-secondary)' }}>Cómo funciona</a>
          <a href="#pricing" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--color-text-secondary)' }}>Planes</a>
          <Link href="/login" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--color-text-secondary)' }}>Iniciar sesión</Link>
          <Link href="/register" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">Empieza gratis</Link>
        </div>

        {/* Mobile CTA */}
        <div className="md:hidden">
          <Link href="/register" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">Empieza</Link>
        </div>
      </div>
    </nav>
  );
}

// ── FOOTER ──────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative py-12 px-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Image src="/images/logosyndra.png" alt="Syndra" width={90} height={26} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>© 2026 Syndra. Todos los derechos reservados.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Iniciar sesión</Link>
          <Link href="/register" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Registro</Link>
          <a href="#pricing" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Planes</a>
        </div>
      </div>
    </footer>
  );
}

// ── ROOT PAGE ───────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Hero />
        <HowItWorks />
        <Features />
        <RealExample />
        <AIGrowthEngine />
        <AutomationModes />
        <TargetAudience />
        <Pricing />
        <Comparison />
        <TimeSavings />
        <Integrations />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
