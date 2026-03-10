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
              ✨ El motor de contenido y promoción con IA para tu negocio
            </span>
          </div>

          <h1 className="animate-slide-up-d1 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Promociona tu negocio y automatiza tu contenido{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              con IA.
            </span>
          </h1>

          <p className="animate-slide-up-d2 mt-6 text-lg md:text-xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Syndra investiga tendencias, genera posts promocionales con tus productos y logo, crea imágenes y videos con IA, y publica automáticamente en tus redes sociales.
          </p>

          {/* Bullets */}
          <ul className="animate-slide-up-d3 mt-8 space-y-3">
            {[
              'Genera posts con tu logo, productos y precios reales',
              'Crea ofertas, catálogos y contenido promocional automáticamente',
              'Publica en Instagram, Facebook, Threads, Discord y más',
              'Próximamente: Twitter/X, LinkedIn, TikTok, YouTube, Pinterest, WhatsApp Status, Meta Ads, Google Ads, Mercado Libre',
              'Analytics con IA que optimizan tu contenido cada semana',
              '12 industrias preconfiguradas: ecommerce, restaurantes, fitness y más',
            ].map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓</span>
                {b}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="animate-slide-up-d4 mt-10 flex flex-wrap gap-4">
            <CTAButton href="/register" large>Empieza gratis →</CTAButton>
            <CTAButton href="#motor-promocion" variant="ghost" large>Ver motor de promoción</CTAButton>
          </div>
        </div>

        {/* Right — promotional mockup */}
        <div className="animate-slide-up-d3 relative">
          <div className="glass-card p-1 rounded-2xl overflow-hidden">
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--color-bg-secondary)' }}>
              <div className="absolute inset-0 flex flex-col p-4 gap-3">
                {/* Top bar */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
                  <div className="flex-1 h-6 rounded-md ml-2" style={{ background: 'rgba(124,58,237,0.08)' }} />
                </div>
                {/* Business dashboard */}
                <div className="flex-1 flex gap-3">
                  <div className="w-[140px] rounded-lg p-3 space-y-2" style={{ background: 'rgba(124,58,237,0.06)' }}>
                    {['⚡ Dashboard', '🏪 Mi Negocio', '📦 Productos', '🚀 Promociones', '📊 Analytics'].map((item) => (
                      <div key={item} className="text-[10px] px-2 py-1.5 rounded-md" style={{ color: 'var(--color-text-secondary)', background: item.includes('Negocio') ? 'rgba(124,58,237,0.15)' : 'transparent' }}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Ventas generadas', value: '$12.4K', color: '#10b981' },
                        { label: 'Engagement', value: '6.2%', color: '#7c3aed' },
                        { label: 'Posts activos', value: '84', color: '#06b6d4' },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="text-[9px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                          <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Product promo preview */}
                    <div className="rounded-lg p-3 flex gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-16 h-16 rounded-md flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))' }}>
                        👟
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>Air Max 90 — $89.99</div>
                        <div className="text-[9px] px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>30% OFF</div>
                        <div className="h-2 rounded-full w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    </div>
                    {/* Auto-publish badge */}
                    <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <span className="text-xs">🚀</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Promoción publicada en 4 canales</span>
                      <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓ Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    { icon: '�', title: 'Configura tu negocio', desc: 'Sube tu logo, productos y precios. Syndra aprende tu marca, industria y estilo de comunicación.' },
    { icon: '🧠', title: 'IA investiga y crea contenido', desc: 'Analiza tendencias o tus propios productos. Genera posts, ofertas, carruseles y videos automáticamente.' },
    { icon: '📱', title: 'Aprueba o deja en automático', desc: 'Recibe previews en Telegram, corrige con un toque o activa el piloto automático total.' },
    { icon: '🚀', title: 'Publica en todas tus redes', desc: 'Instagram, Facebook, Threads y Discord. Con tu logo, productos y precios reales.' },
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
    { icon: '🏪', title: 'Motor de promoción', desc: 'Carga tus productos, precios y ofertas. Syndra genera contenido promocional con tus datos reales — no genérico.' },
    { icon: '🖼️', title: 'Composición con Sharp', desc: 'Imágenes profesionales con tu logo, producto y precios superpuestos. 9 templates: showcase, oferta, testimonial y más.' },
    { icon: '🎬', title: 'Videos con avatar IA', desc: 'Genera reels y videos con avatares que hablan de tu producto. HeyGen, Pika, Luma o Edge TTS.' },
    { icon: '🔍', title: 'Investigación dual', desc: 'Usa tendencias RSS para contenido viral O tus propios briefs/productos para contenido promocional.' },
    { icon: '🧠', title: 'Estrategia IA semanal', desc: 'Syndra analiza qué funciona y planifica tu semana: qué publicar, cuándo, en qué formato y con qué tono.' },
    { icon: '📊', title: 'Analytics predictivos', desc: 'Predice engagement antes de publicar. Aprende patrones por formato, tono, horario y tipo de contenido.' },
    { icon: '📦', title: 'Catálogo de productos', desc: 'Biblioteca de productos con fotos, precios y SKU. Se integra directamente al pipeline de contenido.' },
    { icon: '🎯', title: 'Campañas con objetivo', desc: '11 objetivos: venta, lanzamiento, Black Friday, catálogo, awareness y más. Multicanal y multiformato.' },
    { icon: '🤖', title: 'Piloto automático total', desc: 'Syndra investiga, crea, compone imágenes, genera video y publica — sin intervención humana.' },
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
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionHeading tag="Ejemplo real" title="Dos tipos de contenido, una sola plataforma"
          subtitle="Syndra genera posts listos para publicar tanto para negocios como para creadores de contenido." />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: Business Promotion Post ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(124,58,237,0.3)' }}>Plan Pro</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Promoción de negocio</span>
            </div>
            <div className="glass-card p-6 md:p-8">
              {/* Post header */}
              <div className="flex gap-3 items-center mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--gradient-primary)' }}>👟</div>
                <div>
                  <div className="font-semibold text-sm">Zapatería El Paso</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Generado por Syndra • hace 5 min</div>
                </div>
              </div>

              {/* Copy */}
              <div className="mb-4">
                <p className="font-bold text-base mb-2">🔥 ¡OFERTA FLASH! Air Max 90 con 30% de descuento</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Solo por este fin de semana. De <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>$129.99</span>{' '}
                  a <span className="font-bold" style={{ color: '#10b981' }}>$89.99</span>. ¡Corre que se agotan! 🏃
                </p>
              </div>

              {/* Product image with Sharp composition overlays */}
              <div className="w-full rounded-xl mb-4 overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                <Image
                  src="/images/landing/sneakers-product.jpg"
                  alt="Nike Air Max 90 — foto de producto promocional"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
                {/* Dark gradient overlay for readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.65))' }} />

                {/* Product name + brand bar */}
                <div className="absolute left-0 right-0 bottom-0 px-4 py-3 flex items-end justify-between z-10">
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">Nike Air Max 90</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Zapatería El Paso</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] line-through" style={{ color: 'rgba(255,255,255,0.4)' }}>$129.99</span>
                    <span className="text-sm font-extrabold text-white">$89.99</span>
                  </div>
                </div>

                {/* Discount badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-lg z-10" style={{ background: '#EF4444', color: 'white' }}>
                  30% OFF
                </div>

                {/* Sharp composition badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[9px] font-semibold backdrop-blur-md flex items-center gap-1 z-10" style={{ background: 'rgba(124,58,237,0.7)', color: 'white' }}>
                  <span>🖼️</span> Sharp + Logo
                </div>

                {/* Logo watermark */}
                <div className="absolute z-10" style={{ bottom: '48px', right: '16px' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}>ZP</div>
                </div>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['#OfertaFlash', '#AirMax90', '#ZapateríaElPaso', '#30OFF', '#Sneakers'].map((h) => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary-light)' }}>{h}</span>
                ))}
              </div>

              {/* Published to */}
              <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Publicado en:</span>
                {['📸 Instagram', '📘 Facebook', '🧵 Threads', '💬 Discord'].map((p) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Creator / Influencer Post ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>Creator</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Contenido de creador</span>
            </div>
            <div className="glass-card p-6 md:p-8">
              {/* Post header */}
              <div className="flex gap-3 items-center mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>🎙️</div>
                <div>
                  <div className="font-semibold text-sm">TechPulse by María</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Generado por Syndra • hace 12 min</div>
                </div>
              </div>

              {/* Copy */}
              <div className="mb-4">
                <p className="font-bold text-base mb-2">🚀 Apple acaba de lanzar su chip M4 Ultra y es una bestia</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  El nuevo MacBook Pro con M4 Ultra alcanza 180B de parámetros en local.
                  Esto cambia todo para los desarrolladores de IA. Te explico por qué esto importa 🧵👇
                </p>
              </div>

              {/* Tech news cover with real photo */}
              <div className="w-full rounded-xl mb-4 overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                <Image
                  src="/images/landing/macbook-tech.jpg"
                  alt="MacBook Pro M4 Ultra — noticia tecnológica"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
                {/* Dark tinted overlay for readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 20%, rgba(0,0,0,0.55))' }} />

                {/* Headline over the image */}
                <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-14 z-10">
                  <div className="text-center">
                    <p className="text-white text-sm font-bold drop-shadow-lg">M4 Ultra — El chip que cambia las reglas</p>
                    <div className="flex gap-2 mt-2 justify-center">
                      {['180B params', '32-core GPU', '192GB RAM'].map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: 'rgba(6,182,212,0.2)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.4)', backdropFilter: 'blur(4px)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trending badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-lg flex items-center gap-1 z-10" style={{ background: '#06b6d4', color: 'white' }}>
                  📈 Trending
                </div>

                {/* Syndra generated badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[9px] font-semibold backdrop-blur-md flex items-center gap-1 z-10" style={{ background: 'rgba(6,182,212,0.5)', color: 'white' }}>
                  🤖 IA + Research
                </div>

                {/* Source attribution */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Fuente: Tavily + SerpAPI</span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Investigado hace 2h</span>
                  </div>
                </div>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['#M4Ultra', '#Apple', '#IA', '#MacBookPro', '#TechNews'].map((h) => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}>{h}</span>
                ))}
              </div>

              {/* Published to */}
              <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Publicado en:</span>
                {['📸 Instagram', '🧵 Threads', '💬 Discord'].map((p) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)' }}>{p}</span>
                ))}
              </div>
            </div>
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
    { icon: '�', title: 'Negocios y ecommerce', desc: 'Promociona tus productos con posts profesionales que incluyen tu logo, precios y ofertas reales.' },
    { icon: '🎬', title: 'Creadores de contenido', desc: 'Publica constantemente sin dedicar horas. IA adapta el tono a tu audiencia.' },
    { icon: '🍕', title: 'Restaurantes y comercios', desc: 'Publica tus platos, promociones del día y eventos sin necesitar diseñador.' },
    { icon: '🏢', title: 'Agencias de marketing', desc: 'Gestiona múltiples negocios con perfiles separados y publicación automatizada.' },
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

// ── 7B. MOTOR DE PROMOCIÓN (Pro) ────────────────────────
function PromotionEngine() {
  const steps = [
    { num: '01', title: 'Sube tu catálogo', desc: 'Agrega tus productos con fotos, precios, categorías y descripciones. Syndra los usa para crear promociones.', icon: '📦' },
    { num: '02', title: 'Elige qué promocionar', desc: 'Selecciona producto, tipo de campaña (oferta, lanzamiento, flash sale) y canales de publicación.', icon: '🎯' },
    { num: '03', title: 'IA compone la imagen', desc: 'Sharp superpone tu logo, producto, badge de descuento y precio sobre un fondo generado por IA. Sin Photoshop.', icon: '🖼️' },
    { num: '04', title: 'Publica donde quieras', desc: 'El post con copy + imagen se envía a Instagram, Facebook, Threads y Discord. Con aprobación o en autopilot.', icon: '🚀' },
  ];

  const templates = [
    { name: 'Showcase', desc: 'Presenta tu producto con estilo', color: '#7C3AED' },
    { name: 'Oferta', desc: 'Badge de descuento + precio tachado', color: '#EF4444' },
    { name: 'Flash Sale', desc: 'Urgencia con countdown visual', color: '#F59E0B' },
    { name: 'Nuevo lanzamiento', desc: 'Anuncia novedades con impacto', color: '#06B6D4' },
    { name: 'Comparación', desc: 'Antes vs después, tuyo vs competencia', color: '#10B981' },
    { name: 'Testimonial', desc: 'Reseña de cliente destacada', color: '#8B5CF6' },
  ];

  return (
    <section id="motor-promocion" className="relative py-28 px-6 overflow-hidden">
      {/* Background orbs */}
      <div className="hero-orb" style={{ width: 500, height: 500, top: '10%', right: '-5%', background: 'rgba(124,58,237,0.1)' }} />
      <div className="hero-orb" style={{ width: 350, height: 350, bottom: '5%', left: '5%', background: 'rgba(6,182,212,0.08)', animationDelay: '3s' }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(124,58,237,0.3)' }}>
            ⭐ Exclusivo Pro
          </span>
        </div>
        <SectionHeading tag="Motor de Promoción" title="Promociona tu negocio como una agencia profesional"
          subtitle="Sube tus productos → Elige la campaña → Syndra genera imágenes con tu logo y publica en todas tus redes. Sin diseñador." />

        {/* Flow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {steps.map((s) => (
            <div key={s.num} className="glass-card p-6 text-center relative">
              <div className="text-3xl mb-3">{s.icon}</div>
              <span className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-primary-light)' }}>{s.num}</span>
              <h3 className="text-base font-bold mb-2">{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Mockup: Product → Composed Image */}
        <div className="glass-card p-8 mb-16">
          <h3 className="text-lg font-bold text-center mb-8">Así se ve una promoción creada por Syndra</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Input: Product */}
            <div className="glass-card p-5 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <div className="text-4xl mb-3">👟</div>
              <p className="text-sm font-bold">Air Max 90</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>$120.00 → $84.00</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>-30% OFF</span>
            </div>
            {/* Arrow */}
            <div className="text-center">
              <div className="text-4xl" style={{ color: 'var(--color-primary-light)' }}>→</div>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Sharp compone logo + producto + badge + precio</p>
            </div>
            {/* Output: Composed Post */}
            <div className="glass-card p-5 relative overflow-hidden" style={{ border: '1px solid var(--color-primary)', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))' }}>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>-30%</div>
              <div className="text-center">
                <div className="text-3xl mb-2">🖼️</div>
                <p className="text-sm font-bold">¡Oferta Especial!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Air Max 90 · <s>$120</s> $84</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="w-5 h-5 rounded-full" style={{ background: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'white', fontWeight: 'bold' }}>S</span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Tu logo aquí</span>
                </div>
                <div className="flex justify-center gap-1 mt-3">
                  {['IG', 'FB', 'TH', 'DC'].map(p => (
                    <span key={p} className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--color-primary-light)' }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <h3 className="text-lg font-bold text-center mb-6">Templates de promoción disponibles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {templates.map((t) => (
            <div key={t.name} className="glass-card p-4 text-center group hover:scale-105 transition-transform">
              <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}>
                <div className="w-4 h-4 rounded" style={{ background: t.color }} />
              </div>
              <p className="text-xs font-bold mb-1">{t.name}</p>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <CTAButton href="/register" large>Probar Motor de Promoción →</CTAButton>
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
      tag: 'Para creadores',
      monthly: 39,
      yearly: 31,
      desc: 'Automatiza tu contenido con IA.',
      micro: 'Ideal para creadores activos y marcas personales.',
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
        'Generación de video (10/mes)',
        '3 personas IA',
        '5 perfiles de contenido',
        '2 usuarios por workspace',
        'Scheduler avanzado',
        '2GB de media',
      ],
      featured: false,
    },
    {
      name: 'Pro',
      tag: '🏪 Para negocios',
      monthly: 99,
      yearly: 79,
      desc: 'Motor completo de promoción con IA para tu negocio.',
      micro: 'Todo lo que necesitas para promocionar tu negocio a nivel global.',
      features: [
        'Todo lo de Creator, más:',
        'Publicaciones ilimitadas',
        'Redes sociales ilimitadas',
        '🏪 Perfil de negocio completo',
        '📦 Catálogo de productos con precios',
        '📋 Briefs promocionales',
        '🚀 Wizard "Crear Promoción"',
        '🖼️ Composición de imágenes con Sharp',
        '🎨 Logo + producto superpuesto en fotos',
        'Templates: showcase, oferta, testimonial y más',
        'Autopilot completo',
        'A/B testing ilimitado',
        'Memoria de marca',
        'Video avanzado (50/mes)',
        '5 usuarios por workspace',
        '10GB de media',
        'API access + cola prioritaria',
      ],
      featured: true,
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
    ['Composición con Sharp', '✖', '✖', '✔'],
    ['Generación de video', '✖', '10/mes', '50/mes'],
    ['Aprobación Telegram', '✔', '✔', '✔'],
    ['Autopilot', '✖', 'Parcial', 'Completo'],
    ['AI Strategist', '✖', '✔', '✔ Avanzado'],
    ['Trend detection', '✖', 'Básico', 'Completo'],
    ['Analytics', 'Básico', 'Completo', 'Avanzado'],
    ['A/B testing', '✖', 'Limitado', 'Ilimitado'],
    ['Media storage', '500MB', '2GB', '10GB'],
    ['─── NEGOCIO (Solo Pro) ───', '', '', ''],
    ['Perfil de negocio', '✖', '✖', '✔'],
    ['Catálogo de productos', '✖', '✖', 'Ilimitado'],
    ['Briefs promocionales', '✖', '✖', '✔'],
    ['Wizard Crear Promoción', '✖', '✖', '✔'],
    ['Templates promocionales', '✖', '✖', '9 templates'],
    ['Logo en imágenes', '✖', '✖', '✔'],
    ['Campañas con objetivo', '✖', '✖', '✔'],
    ['API access', '✖', '✖', '✔'],
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
                  <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Creator</th>
                  <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary-light)' }}>Pro ⭐</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, s, c, p]) => (
                  feature.startsWith('───') ? (
                    <tr key={feature} style={{ background: 'rgba(139,92,246,0.08)' }}>
                      <td colSpan={4} className="p-3 text-xs font-bold uppercase tracking-widest text-center" style={{ color: 'var(--color-primary-light)' }}>{feature.replace(/─/g, '').trim()}</td>
                    </tr>
                  ) : (
                  <tr key={feature} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{feature}</td>
                    {[s, c, p].map((val, i) => (
                      <td key={i} className="p-4 text-center font-medium" style={i === 2 ? { background: 'rgba(139,92,246,0.04)' } : undefined}>
                        {val === '✔' ? <span className="comparison-check text-base">✓</span> :
                         val === '✖' ? <span className="comparison-cross text-base">✗</span> :
                         <span style={{ color: i === 2 ? 'var(--color-primary-light)' : 'var(--color-text-secondary)' }}>{val}</span>}
                      </td>
                    ))}
                  </tr>
                  )
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
  // — Nuevos proveedores IA —
  Replicate: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="2" y="2" width="20" height="20" rx="4" fill="#1A1A2E"/><text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#E0D4FF" fontFamily="Arial">R</text></svg>
  ),
  'fal.ai': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="2" y="2" width="20" height="20" rx="4" fill="#6366F1"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="Arial">fal</text></svg>
  ),
  'D-ID': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="12" cy="12" r="10" fill="#1E40AF"/><circle cx="12" cy="10" r="4" fill="none" stroke="white" strokeWidth="1.5"/><path d="M6 19c0-3.314 2.686-6 6-6s6 2.686 6 6" fill="none" stroke="white" strokeWidth="1.5"/></svg>
  ),
  Hedra: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0D9488"/><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="Arial">H</text></svg>
  ),
  // — Social Networks (Próximamente) —
  'Twitter / X': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/></svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/></svg>
  ),
  TikTok: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="white"/></svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/></svg>
  ),
  Pinterest: (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" fill="#E60023"/></svg>
  ),
  // — Business Channels (Próximamente) —
  'WhatsApp Status': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/></svg>
  ),
  'Meta Ads': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#0081FB"/><path d="M6.39 12c0-1.248.273-2.23.71-2.87.517-.757 1.22-1.13 1.9-1.13.518 0 1.084.22 1.7.87.53.56 1.085 1.41 1.7 2.44.43.72.81 1.33 1.21 1.83.54.68 1.05 1.05 1.59 1.05.66 0 1.18-.42 1.56-1.15.35-.67.54-1.53.54-2.55 0-1.49-.36-2.66-.98-3.46-.63-.81-1.58-1.27-2.77-1.27-.37 0-.74.04-1.12.12l.65-1.85c.27-.03.5-.04.72-.04 1.7 0 3.14.66 4.1 1.82.91 1.1 1.4 2.63 1.4 4.55 0 1.57-.34 2.91-.98 3.87-.68 1.01-1.63 1.55-2.72 1.55-.68 0-1.31-.24-1.91-.76-.53-.46-1.04-1.11-1.56-2l-.89-1.52c-.45-.77-.85-1.33-1.2-1.71-.4-.43-.78-.62-1.2-.62-.49 0-.89.33-1.17.88-.25.5-.38 1.19-.38 2.05 0 .9.11 1.62.32 2.18l-1.55.63C6.55 14.24 6.39 13.15 6.39 12z" fill="white"/></svg>
  ),
  'Google Ads': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><path d="M15.58 12l-5.04 8.73c-.74 1.29-2.39 1.73-3.68.99s-1.73-2.39-.99-3.68L10.91 12l4.67 0z" fill="#FBBC04"/><path d="M8.42 12l5.04-8.73c.74-1.29 2.39-1.73 3.68-.99s1.73 2.39.99 3.68L13.09 12l-4.67 0z" fill="#4285F4"/><circle cx="6.21" cy="17.79" r="2.57" fill="#34A853"/></svg>
  ),
  'Mercado Libre': (
    <svg viewBox="0 0 24 24" className="w-8 h-8"><circle cx="12" cy="12" r="10" fill="#FFE600"/><path d="M7 11c0 0 2-3 5-3s5 3 5 3" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M7 14c0 0 2 3 5 3s5-3 5-3" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round"/><circle cx="9.5" cy="10" r="1" fill="#333"/><circle cx="14.5" cy="10" r="1" fill="#333"/></svg>
  ),

};

function IntegrationCard({ name, comingSoon }: { name: string; comingSoon?: boolean }) {
  return (
    <div className={`glass-card px-6 py-5 flex flex-col items-center gap-3 min-w-[110px] max-w-[130px] transition-transform hover:scale-105 relative ${comingSoon ? 'opacity-60' : ''}`}>
      {comingSoon && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>
          Pronto
        </span>
      )}
      <div className="w-10 h-10 flex items-center justify-center">{logos[name]}</div>
      <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
    </div>
  );
}

function IntegrationCategory({ label, names, comingSoon }: { label: string; names: string[]; comingSoon?: boolean }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-3 mb-5 justify-center">
        <div className="h-px flex-1 max-w-[80px]" style={{ background: 'var(--color-border-subtle)' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        {comingSoon && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Próximamente</span>}
        <div className="h-px flex-1 max-w-[80px]" style={{ background: 'var(--color-border-subtle)' }} />
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {names.map((n) => <IntegrationCard key={n} name={n} comingSoon={comingSoon} />)}
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
        <IntegrationCategory label="Generación de imágenes" names={['DALL·E', 'HuggingFace', 'Stability AI', 'Pollinations', 'Replicate']} />
        <IntegrationCategory label="Video & Voz" names={['HeyGen', 'ElevenLabs', 'D-ID', 'Hedra', 'fal.ai']} />
        <IntegrationCategory label="Investigación" names={['Tavily', 'SerpAPI']} />
        <IntegrationCategory label="Redes sociales" names={['Twitter / X', 'LinkedIn', 'TikTok', 'YouTube', 'Pinterest']} comingSoon />
        <IntegrationCategory label="Canales para negocios" names={['WhatsApp Status', 'Meta Ads', 'Google Ads', 'Mercado Libre']} comingSoon />
      </div>
    </section>
  );
}

// ── 12. FAQ ─────────────────────────────────────────────
function FAQ() {
  const faqs = [
    { q: '¿Necesito experiencia en marketing?', a: 'No. Syndra genera contenido listo para publicar. Solo necesitas definir tu marca y dejar que la IA trabaje por ti.' },
    { q: '¿Puedo subir mis productos y crear promociones?', a: 'Sí, con el plan Pro. Puedes cargar tu catálogo completo con fotos, precios y descripciones. Luego usas el wizard "Crear Promoción" para generar imágenes y copys listos para publicar con ofertas, descuentos y más.' },
    { q: '¿Syndra pone mi logo en las imágenes?', a: 'Sí. Con la composición Sharp del plan Pro, tu logo se superpone automáticamente sobre las imágenes generadas, junto con badges de descuento, precios y la foto de tu producto.' },
    { q: '¿Qué plantillas de promoción hay?', a: 'Hay 9 templates: showcase de producto, oferta con descuento, antes/después, testimonial, grid, comparación, nuevo lanzamiento, banner y flash sale. Todas se componen con Sharp en alta calidad.' },
    { q: '¿Syndra publica automáticamente?', a: 'Sí. Puedes elegir entre aprobación manual vía Telegram, modo asistido o piloto automático completo que investiga, crea y publica sin intervención.' },
    { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Puedes cancelar tu suscripción en cualquier momento desde tu panel. No hay contratos ni permanencia.' },
    { q: '¿Puedo usar mis propias API keys?', a: 'Sí. Puedes conectar tus propias claves de OpenAI, generadores de imagen o servicios externos si lo deseas.' },
    { q: '¿Cuál es la diferencia entre Creator y Pro?', a: 'Creator es ideal para creadores de contenido: genera posts, optimiza tono y publica. Pro añade todo el motor de negocio: catálogo de productos, briefs, composición de imágenes con Sharp, templates promocionales y el wizard de promociones.' },
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
          Tu negocio merece{' '}
          <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>crecer con IA.</span>
        </h2>
        <p className="mt-6 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          Sube tus productos, crea promociones y publica en todas tus redes.
          <br />Syndra automatiza tu marketing de principio a fin.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <CTAButton href="/register" large>Empieza con Pro →</CTAButton>
          <CTAButton href="#pricing" large variant="ghost">Ver planes</CTAButton>
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
        <PromotionEngine />
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
