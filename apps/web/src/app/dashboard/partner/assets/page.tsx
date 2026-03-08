'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ============================================================
// Partner Assets Page — Kit promocional + UTM Generator (Feature #10)
// ============================================================

export default function PartnerAssetsPage() {
  const [referralCode, setReferralCode] = useState('');
  const [utmSource, setUtmSource] = useState('partner');
  const [utmMedium, setUtmMedium] = useState('referral');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.user?.referralCode) {
          setReferralCode(json.data.user.referralCode);
          setUtmCampaign(json.data.user.referralCode.toLowerCase());
        }
      })
      .catch(() => {});
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://syndra.app';
  const utmUrl = `${baseUrl}/register?ref=${referralCode}&utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const promotionalCopys = [
    {
      title: '🚀 Post de lanzamiento',
      text: `¿Cansado de crear contenido manualmente? Syndra usa IA para investigar, generar y publicar contenido automáticamente. Pruébalo gratis → ${utmUrl}`,
    },
    {
      title: '💡 Post educativo',
      text: `Descubrí Syndra y cambió mi forma de crear contenido. Investiga fuentes, genera posts con IA, los publica y hasta aprende de las métricas. Todo automático. Regístrate con mi link → ${utmUrl}`,
    },
    {
      title: '🎯 Post de CTA directo',
      text: `¿Publicás contenido para tu negocio? Con Syndra automatizás todo el proceso con IA: desde research hasta publicación. Usá mi código ${referralCode} para empezar → ${utmUrl}`,
    },
    {
      title: '📊 Post de resultados',
      text: `Desde que uso Syndra, publico 4x más contenido y mi engagement subió 35%. La IA se encarga de todo el pipeline editorial. Probalo vos también → ${utmUrl}`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">🎨 Kit Promocional</h1>
            <p className="page-subtitle">Copys, banners y URLs con UTM para promocionar Syndra.</p>
          </div>
          <Link href="/dashboard/partner" className="btn-ghost text-sm">← Volver al panel</Link>
        </div>
      </div>

      {/* UTM Generator */}
      <div className="glass-card p-6 animate-fade-in-delay-1">
        <h3 className="section-title">🔗 Generador de URLs con UTM</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="input-label">UTM Source</label>
            <input className="input-field text-sm" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
          </div>
          <div>
            <label className="input-label">UTM Medium</label>
            <input className="input-field text-sm" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
          </div>
          <div>
            <label className="input-label">UTM Campaign</label>
            <input className="input-field text-sm" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>URL generada</p>
          <div className="flex items-center gap-3">
            <code className="text-xs flex-1 break-all" style={{ color: '#a78bfa' }}>{utmUrl}</code>
            <button
              onClick={() => copyToClipboard(utmUrl, 'utm')}
              className="btn-ghost text-xs px-3 py-1.5 shrink-0"
            >
              {copied === 'utm' ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* Promotional Copys */}
      <div className="glass-card p-6 animate-fade-in-delay-2">
        <h3 className="section-title">✍️ Copys Promocionales Sugeridos</h3>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Usa estos copys en tus redes sociales. Ya incluyen tu link de referido con UTM.
        </p>
        <div className="space-y-4">
          {promotionalCopys.map((copy, i) => (
            <div
              key={i}
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border-subtle)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{copy.title}</span>
                <button
                  onClick={() => copyToClipboard(copy.text, `copy-${i}`)}
                  className="btn-ghost text-[10px] px-2 py-1"
                >
                  {copied === `copy-${i}` ? '✅' : '📋 Copiar'}
                </button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {copy.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Banners / Visual Assets */}
      <div className="glass-card p-6 animate-fade-in-delay-2">
        <h3 className="section-title">🖼️ Assets Visuales</h3>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Banners y gráficos para usar en tus publicaciones.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Banner Instagram Story', size: '1080x1920', color: '#7c3aed' },
            { name: 'Banner Post Feed', size: '1080x1080', color: '#06b6d4' },
            { name: 'Banner Twitter/X Header', size: '1500x500', color: '#10b981' },
            { name: 'Banner LinkedIn', size: '1200x627', color: '#f59e0b' },
          ].map((asset) => (
            <div
              key={asset.name}
              className="rounded-xl p-6 text-center"
              style={{
                background: `linear-gradient(135deg, ${asset.color}15, ${asset.color}08)`,
                border: `1px solid ${asset.color}25`,
              }}
            >
              <div className="text-3xl mb-2">🎨</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{asset.name}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{asset.size}px</p>
              <p className="text-[10px] mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}>
                📧 Solicita al admin
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="glass-card p-5 animate-fade-in-delay-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>📋 Referencia Rápida</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Tu código:</span>{' '}
            <span className="font-mono font-bold" style={{ color: '#a78bfa' }}>{referralCode || '...'}</span>
          </div>
          <div>
            <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Landing:</span>{' '}
            <span>{baseUrl}/register?ref={referralCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
