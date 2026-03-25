'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api-fetch';

interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: string;
  description: string;
  slogan: string;
  usp: string;
  targetMarket: string;
  products: string[];
  priceRange: string;
  websiteUrl: string;
  physicalAddress: string;
  phoneNumber: string;
  socialLinks: Record<string, string>;
  brandColors: string[];
  promotionStyle: string;
  contentGoals: string[];
}

const BUSINESS_TYPES = [
  'ecommerce', 'restaurant', 'fitness', 'salon', 'clinic',
  'real_estate', 'education', 'consulting', 'retail', 'services',
  'technology', 'food_delivery', 'fashion', 'automotive', 'other',
];

const PROMOTION_STYLES = [
  'profesional', 'cercano', 'premium', 'divertido', 'minimalista',
  'urgente', 'aspiracional', 'educativo',
];

const CONTENT_GOALS = [
  'Generar ventas', 'Aumentar seguidores', 'Generar leads',
  'Educar audiencia', 'Posicionar marca', 'Fidelizar clientes',
  'Lanzar productos', 'Promociones/ofertas',
];

const emptyProfile: Omit<BusinessProfile, 'id'> = {
  businessName: '',
  businessType: '',
  description: '',
  slogan: '',
  usp: '',
  targetMarket: '',
  products: [],
  priceRange: '',
  websiteUrl: '',
  physicalAddress: '',
  phoneNumber: '',
  socialLinks: {},
  brandColors: ['#6C63FF', '#F4F4FF', '#FF6B35'],
  promotionStyle: 'profesional',
  contentGoals: [],
};

export function BusinessProfileForm() {
  const [profile, setProfile] = useState<Partial<BusinessProfile>>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newProduct, setNewProduct] = useState('');

  // Web extraction state
  const [webUrls, setWebUrls] = useState<string[]>(['']);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{ briefsCount: number } | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/business-profile');
      const data = res?.data ?? res;
      if (data) setProfile(data);
    } catch {
      // No profile yet — use empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const { id, data: _d, ...body } = profile as any;
      const res = await apiFetch<any>('/business-profile', {
        method: 'PUT',
        body,
      });
      const saved = res?.data ?? res;
      if (saved) setProfile(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const addProduct = () => {
    if (!newProduct.trim()) return;
    setProfile(p => ({ ...p, products: [...(p.products ?? []), newProduct.trim()] }));
    setNewProduct('');
  };

  const removeProduct = (idx: number) => {
    setProfile(p => ({ ...p, products: (p.products ?? []).filter((_, i) => i !== idx) }));
  };

  const toggleGoal = (goal: string) => {
    setProfile(p => {
      const goals = p.contentGoals ?? [];
      return { ...p, contentGoals: goals.includes(goal) ? goals.filter(g => g !== goal) : [...goals, goal] };
    });
  };

  const updateColor = (idx: number, color: string) => {
    setProfile(p => {
      const colors = [...(p.brandColors ?? ['#6C63FF', '#F4F4FF', '#FF6B35'])];
      colors[idx] = color;
      return { ...p, brandColors: colors };
    });
  };

  const addWebUrl = () => {
    if (webUrls.length >= 5) return;
    setWebUrls(prev => [...prev, '']);
  };

  const removeWebUrl = (idx: number) => {
    setWebUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const updateWebUrl = (idx: number, value: string) => {
    setWebUrls(prev => prev.map((u, i) => i === idx ? value : u));
  };

  const handleExtractFromWeb = async () => {
    const validUrls = webUrls.filter(u => u.trim()).map(u => {
      const trimmed = u.trim();
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    });
    if (validUrls.length === 0) return;

    setExtracting(true);
    setExtractResult(null);
    setExtractError(null);
    try {
      const result = await apiFetch<{ data: { profile: Partial<BusinessProfile>; briefs: any[] } }>('/business-profile/extract-from-web', {
        method: 'POST',
        body: { urls: validUrls },
      });

      const extracted = (result as any).data ?? result;

      // Merge extracted profile into current profile (don't overwrite existing non-empty values)
      if (extracted.profile) {
        setProfile(prev => {
          const merged = { ...prev };
          for (const [key, value] of Object.entries(extracted.profile)) {
            if (value === null || value === undefined || value === '') continue;
            const currentVal = (prev as any)[key];
            // Only overwrite if current field is empty/default
            if (
              currentVal === '' ||
              currentVal === null ||
              currentVal === undefined ||
              (Array.isArray(currentVal) && currentVal.length === 0)
            ) {
              (merged as any)[key] = value;
            }
          }
          return merged;
        });
      }

      // Auto-create briefs if found
      if (extracted.briefs?.length > 0) {
        let created = 0;
        for (const brief of extracted.briefs) {
          try {
            await apiFetch('/business-briefs', {
              method: 'POST',
              body: brief,
            });
            created++;
          } catch {
            // Skip failed briefs
          }
        }
        setExtractResult({ briefsCount: created });
      } else {
        setExtractResult({ briefsCount: 0 });
      }

    } catch (e: any) {
      setExtractError(e.message || 'Error al extraer datos de la web');
    } finally {
      setExtracting(false);
    }
  };

  if (loading) {
    return <div className="glass-card p-8 text-center text-white/50">Cargando perfil de negocio...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Web Import */}
      <div className="glass-card p-6 space-y-4" style={{ borderColor: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.3)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🌐 Importar desde web
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            IA
          </span>
        </div>
        <p className="text-sm text-white/50">
          Ingresa la URL de tu sitio web y la IA analizará todo el contenido para completar automáticamente tu perfil de negocio, detectar productos y crear briefs.
          Si tienes Tavily o SerpAPI configurado en Credenciales, se usará para una extracción más profunda.
        </p>

        <div className="space-y-2">
          {webUrls.map((url, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="input-field flex-1"
                value={url}
                onChange={e => updateWebUrl(idx, e.target.value)}
                placeholder="https://tu-sitio-web.com"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleExtractFromWeb())}
              />
              {webUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWebUrl(idx)}
                  className="px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {webUrls.length < 5 && (
            <button
              type="button"
              onClick={addWebUrl}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              + Agregar otra URL
            </button>
          )}

          <button
            type="button"
            onClick={handleExtractFromWeb}
            disabled={extracting || webUrls.every(u => !u.trim())}
            className="btn-primary text-sm ml-auto"
          >
            {extracting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full" />
                Analizando sitio web...
              </span>
            ) : (
              '🔍 Analizar y completar'
            )}
          </button>
        </div>

        {extracting && (
          <div className="text-xs text-white/40 flex items-center gap-2 animate-pulse">
            <span>⏳</span>
            La IA está leyendo y analizando el contenido de tu web. Esto puede tardar unos segundos...
          </div>
        )}

        {extractResult && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 animate-fade-in">
            ✅ Datos extraídos correctamente. Se completaron los campos del perfil.
            {extractResult.briefsCount > 0 && (
              <span> Se crearon <strong>{extractResult.briefsCount}</strong> briefs de productos/servicios.</span>
            )}
            <span className="block text-xs text-emerald-400/70 mt-1">
              Revisa los campos completados y haz clic en &quot;Guardar&quot; para confirmar.
            </span>
          </div>
        )}

        {extractError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
            ❌ {extractError}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">🏪 Información básica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Nombre del negocio *</label>
            <input
              className="input-field w-full"
              value={profile.businessName ?? ''}
              onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))}
              placeholder="Ej: Mi Tienda Online"
            />
          </div>
          <div>
            <label className="input-label">Tipo de negocio *</label>
            <select
              className="input-field w-full"
              value={profile.businessType ?? ''}
              onChange={e => setProfile(p => ({ ...p, businessType: e.target.value }))}
            >
              <option value="">Selecciona...</option>
              {BUSINESS_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="input-label">Descripción</label>
          <textarea
            className="input-field w-full h-24 resize-none"
            value={profile.description ?? ''}
            onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe tu negocio en unas líneas..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Slogan</label>
            <input
              className="input-field w-full"
              value={profile.slogan ?? ''}
              onChange={e => setProfile(p => ({ ...p, slogan: e.target.value }))}
              placeholder='Ej: "Calidad que se nota"'
            />
          </div>
          <div>
            <label className="input-label">Propuesta Única de Valor (USP)</label>
            <input
              className="input-field w-full"
              value={profile.usp ?? ''}
              onChange={e => setProfile(p => ({ ...p, usp: e.target.value }))}
              placeholder="¿Qué te hace diferente?"
            />
          </div>
        </div>
      </div>

      {/* Target & Products */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">🎯 Mercado y productos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Mercado objetivo</label>
            <input
              className="input-field w-full"
              value={profile.targetMarket ?? ''}
              onChange={e => setProfile(p => ({ ...p, targetMarket: e.target.value }))}
              placeholder="Ej: Mujeres 25-45, profesionales urbanos"
            />
          </div>
          <div>
            <label className="input-label">Rango de precios</label>
            <input
              className="input-field w-full"
              value={profile.priceRange ?? ''}
              onChange={e => setProfile(p => ({ ...p, priceRange: e.target.value }))}
              placeholder="Ej: $50 - $500"
            />
          </div>
        </div>

        <div>
          <label className="input-label">Productos / Servicios principales</label>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              value={newProduct}
              onChange={e => setNewProduct(e.target.value)}
              placeholder="Agrega un producto o servicio..."
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProduct())}
            />
            <button type="button" className="btn-primary text-sm" onClick={addProduct}>
              Agregar
            </button>
          </div>
          {(profile.products?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.products?.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removeProduct(i)}
                    className="text-purple-400 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">📞 Contacto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Sitio web</label>
            <input
              className="input-field w-full"
              value={profile.websiteUrl ?? ''}
              onChange={e => setProfile(p => ({ ...p, websiteUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="input-label">Teléfono</label>
            <input
              className="input-field w-full"
              value={profile.phoneNumber ?? ''}
              onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="input-label">Dirección física</label>
            <input
              className="input-field w-full"
              value={profile.physicalAddress ?? ''}
              onChange={e => setProfile(p => ({ ...p, physicalAddress: e.target.value }))}
              placeholder="Calle, Ciudad, País"
            />
          </div>
        </div>
      </div>

      {/* Branding & Style */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">🎨 Estilo y marca</h2>
        <div>
          <label className="input-label">Colores de marca</label>
          <div className="flex gap-4 items-center">
            {['Primario', 'Secundario', 'Acento'].map((label, idx) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  className="w-10 h-10 rounded cursor-pointer border border-white/10"
                  value={(profile.brandColors ?? [])[idx] ?? '#6C63FF'}
                  onChange={e => updateColor(idx, e.target.value)}
                />
                <span className="text-xs text-white/50">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="input-label">Estilo de promoción</label>
          <div className="flex flex-wrap gap-2">
            {PROMOTION_STYLES.map(style => (
              <button
                type="button"
                key={style}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  profile.promotionStyle === style
                    ? 'bg-purple-500/30 border-purple-500 text-purple-200'
                    : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/30'
                }`}
                onClick={() => setProfile(p => ({ ...p, promotionStyle: style }))}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="input-label">Objetivos de contenido</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_GOALS.map(goal => (
              <button
                type="button"
                key={goal}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  (profile.contentGoals ?? []).includes(goal)
                    ? 'bg-emerald-500/30 border-emerald-500 text-emerald-200'
                    : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/30'
                }`}
                onClick={() => toggleGoal(goal)}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          className="btn-primary px-6 py-2.5"
          onClick={handleSave}
          disabled={saving || !profile.businessName}
        >
          {saving ? '⏳ Guardando...' : '💾 Guardar perfil de negocio'}
        </button>
        {success && (
          <span className="text-emerald-400 text-sm animate-fade-in">
            ✅ Perfil guardado correctamente
          </span>
        )}
      </div>
    </div>
  );
}
