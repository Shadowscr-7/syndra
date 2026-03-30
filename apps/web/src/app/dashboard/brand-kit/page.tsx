'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────

interface VisualStyleProfile {
  id: string;
  name: string;
  style: string;
  colorPalette: string[];
  primaryFont: string | null;
  secondaryFont: string | null;
  logoUrl: string | null;
  customPromptPrefix: string | null;
  preferredImageProvider: string;
  contentProfileId?: string | null;
}

interface MediaFile {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  isLogo: boolean;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────

const POPULAR_FONTS = [
  { label: 'Sistema (predeterminado)', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
  { label: 'Work Sans', value: 'Work Sans' },
  { label: 'Josefin Sans', value: 'Josefin Sans' },
  { label: 'Bebas Neue', value: 'Bebas Neue' },
  { label: 'Oswald', value: 'Oswald' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
  { label: 'Libre Baskerville', value: 'Libre Baskerville' },
  { label: 'Fira Sans', value: 'Fira Sans' },
];

const STYLE_OPTIONS = [
  { value: 'MINIMALIST', label: 'Minimalista', desc: 'Limpio, espacios en blanco, elegante' },
  { value: 'BOLD', label: 'Bold', desc: 'Impactante, tipografía grande, contrastes' },
  { value: 'ELEGANT', label: 'Elegante', desc: 'Sofisticado, serif, dorados' },
  { value: 'PLAYFUL', label: 'Juguetón', desc: 'Colorido, redondeado, creativo' },
  { value: 'CORPORATE', label: 'Corporativo', desc: 'Profesional, estructurado, confiable' },
  { value: 'ORGANIC', label: 'Orgánico', desc: 'Natural, texturado, cálido' },
];

const ASSET_CATEGORIES = [
  { value: 'LOGO', label: 'Logos', icon: '🏷️' },
  { value: 'BRAND_ELEMENT', label: 'Elementos', icon: '✨' },
  { value: 'PRODUCT', label: 'Productos', icon: '📦' },
  { value: 'BACKGROUND', label: 'Fondos', icon: '🖼️' },
];

const DEFAULT_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b'];

// ── Helpers ────────────────────────────────────────────────────────

function ensureColors(palette: string[]): string[] {
  const base = [...palette];
  while (base.length < 3) base.push(DEFAULT_COLORS[base.length] ?? '#888888');
  return base;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadGoogleFont(font: string) {
  if (!font) return;
  const id = `gfont-${font.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

// ── Live Preview ──────────────────────────────────────────────────

function PostPreview({
  colors,
  primaryFont,
  logoUrl,
  style,
}: {
  colors: string[];
  primaryFont: string | null;
  logoUrl: string | null;
  style: string;
}) {
  const [primary, secondary, accent] = ensureColors(colors);
  const fontFamily = primaryFont ? `'${primaryFont}', sans-serif` : 'inherit';
  const isBold = style === 'BOLD';
  const isElegant = style === 'ELEGANT';
  const isPlayful = style === 'PLAYFUL';

  return (
    <div
      className="w-full aspect-square rounded-2xl overflow-hidden relative flex flex-col"
      style={{
        background: `linear-gradient(145deg, ${secondary}18, ${primary}10)`,
        border: `1px solid ${primary}30`,
        fontFamily,
      }}
    >
      {/* Top bar */}
      <div
        className="h-10 flex items-center px-4 gap-2"
        style={{ background: `${primary}CC` }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
        ) : (
          <div
            className="h-6 w-16 rounded flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: `${accent}99`, letterSpacing: '0.1em' }}
          >
            TU LOGO
          </div>
        )}
        <div
          className="ml-auto text-[9px] font-semibold text-white opacity-70"
          style={{ letterSpacing: isBold ? '0.08em' : '0.02em' }}
        >
          @tumarca
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-3">
        {/* Category tag */}
        <div
          className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
          style={{
            background: `${accent}25`,
            color: accent,
            border: `1px solid ${accent}40`,
          }}
        >
          Contenido
        </div>

        {/* Headline */}
        <div
          className="text-center leading-snug"
          style={{
            fontSize: isBold ? '17px' : isElegant ? '14px' : '15px',
            fontWeight: isBold ? 800 : isElegant ? 400 : 700,
            color: '#f0f0ff',
            fontStyle: isElegant ? 'italic' : 'normal',
            letterSpacing: isBold ? '-0.02em' : '0',
            lineHeight: 1.3,
          }}
        >
          Así se verá tu<br />
          contenido con<br />
          este brand kit
        </div>

        {/* Body text */}
        <p
          className="text-center leading-relaxed"
          style={{
            fontSize: '9px',
            color: 'rgba(240,240,255,0.6)',
            maxWidth: '140px',
          }}
        >
          Fuente, colores y estilo visual aplicados automáticamente a cada post.
        </p>

        {/* CTA */}
        <div
          className="px-5 py-2 rounded-full text-[9px] font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            borderRadius: isPlayful ? '999px' : '6px',
          }}
        >
          Ver más →
        </div>
      </div>

      {/* Color strip */}
      <div className="h-2 flex">
        {ensureColors(colors).map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function BrandKitPage() {
  const [profile, setProfile] = useState<VisualStyleProfile | null>(null);
  const [profiles, setProfiles] = useState<VisualStyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Local editable state
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);
  const [primaryFont, setPrimaryFont] = useState('');
  const [secondaryFont, setSecondaryFont] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [style, setStyle] = useState('MINIMALIST');
  const [profileName, setProfileName] = useState('Brand Kit Principal');
  const [promptPrefix, setPromptPrefix] = useState('');

  // Assets
  const [assetTab, setAssetTab] = useState('LOGO');
  const [assets, setAssets] = useState<Record<string, MediaFile[]>>({});
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load profiles ──────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-styles', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list: VisualStyleProfile[] = Array.isArray(data) ? data : data.data ?? [];
      setProfiles(list);
      const first = list[0] ?? null;
      setProfile(first);
      if (first) {
        setColors(ensureColors(first.colorPalette));
        setPrimaryFont(first.primaryFont ?? '');
        setSecondaryFont(first.secondaryFont ?? '');
        setLogoUrl(first.logoUrl ?? null);
        setStyle(first.style ?? 'MINIMALIST');
        setProfileName(first.name ?? 'Brand Kit Principal');
        setPromptPrefix(first.customPromptPrefix ?? '');
        if (first.primaryFont) loadGoogleFont(first.primaryFont);
        if (first.secondaryFont) loadGoogleFont(first.secondaryFont);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  // ── Load assets ────────────────────────────────────────────────

  const loadAssets = useCallback(async (category: string) => {
    if (assets[category]) return; // cached
    setAssetsLoading(true);
    try {
      const res = await fetch(`/api/user-media?category=${category}&limit=50`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const items: MediaFile[] = data.data ?? [];
      setAssets((prev) => ({ ...prev, [category]: items }));
    } catch {
      /* ignore */
    } finally {
      setAssetsLoading(false);
    }
  }, [assets]);

  useEffect(() => { loadAssets(assetTab); }, [assetTab, loadAssets]);

  // ── Save profile ───────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        name: profileName,
        style,
        colorPalette: colors,
        primaryFont: primaryFont || null,
        secondaryFont: secondaryFont || null,
        logoUrl,
        customPromptPrefix: promptPrefix || null,
      };

      if (profile) {
        const res = await fetch(`/api/visual-styles/${profile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Error al guardar');
        const data = await res.json();
        setProfile(data.data ?? data);
      } else {
        const res = await fetch('/api/visual-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...body, preferredImageProvider: 'huggingface' }),
        });
        if (!res.ok) throw new Error('Error al crear');
        const data = await res.json();
        const created = data.data ?? data;
        setProfile(created);
        setProfiles((prev) => [created, ...prev]);
      }

      setDirty(false);
      showToast('ok', 'Brand Kit guardado');
    } catch {
      showToast('err', 'Error al guardar el Brand Kit');
    } finally {
      setSaving(false);
    }
  };

  // ── Logo upload ────────────────────────────────────────────────

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'LOGO');

      const res = await fetch('/api/user-media/file', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const media: MediaFile = data.data ?? data;

      // Mark as logo
      await fetch(`/api/user-media/${media.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isLogo: true }),
      });

      setLogoUrl(media.url);
      setDirty(true);

      // Refresh logo assets
      setAssets((prev) => {
        const updated = [{ ...media, isLogo: true }, ...(prev['LOGO'] ?? [])];
        return { ...prev, LOGO: updated };
      });

      showToast('ok', 'Logo subido');
    } catch {
      showToast('err', 'Error al subir el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  // ── Asset upload ───────────────────────────────────────────────

  const handleAssetUpload = async (file: File, category: string) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);

      const res = await fetch('/api/user-media/file', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const media: MediaFile = data.data ?? data;

      setAssets((prev) => ({
        ...prev,
        [category]: [media, ...(prev[category] ?? [])],
      }));
      showToast('ok', 'Asset subido');
    } catch {
      showToast('err', 'Error al subir el asset');
    } finally {
      setUploading(false);
    }
  };

  // ── Color helpers ──────────────────────────────────────────────

  const updateColor = (index: number, value: string) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setDirty(true);
  };

  const addColor = () => {
    setColors((prev) => [...prev, '#888888']);
    setDirty(true);
  };

  const removeColor = (index: number) => {
    if (colors.length <= 1) return;
    setColors((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  // ── Font helpers ───────────────────────────────────────────────

  const handleFontChange = (value: string, isPrimary: boolean) => {
    if (value) loadGoogleFont(value);
    if (isPrimary) setPrimaryFont(value);
    else setSecondaryFont(value);
    setDirty(true);
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Cargando Brand Kit...</p>
        </div>
      </div>
    );
  }

  const colorLabels = ['Primario', 'Secundario', 'Acento'];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span>Brand Kit</span>
            {dirty && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                Sin guardar
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Configura la identidad visual de tu marca: logo, colores, tipografías y assets.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {profiles.length > 1 && (
            <select
              className="input-field text-sm"
              style={{ width: 'auto', paddingRight: '2rem' }}
              value={profile?.id ?? ''}
              onChange={(e) => {
                const p = profiles.find((x) => x.id === e.target.value) ?? null;
                if (!p) return;
                setProfile(p);
                setColors(ensureColors(p.colorPalette));
                setPrimaryFont(p.primaryFont ?? '');
                setSecondaryFont(p.secondaryFont ?? '');
                setLogoUrl(p.logoUrl ?? null);
                setStyle(p.style ?? 'MINIMALIST');
                setProfileName(p.name ?? '');
                setPromptPrefix(p.customPromptPrefix ?? '');
                setDirty(false);
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{ opacity: (!dirty || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Guardando...' : '💾 Guardar Brand Kit'}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left (settings) ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Profile name + style */}
          <div className="glass-card p-5 animate-fade-in-delay-1">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🎨</span> Perfil visual
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre del perfil</label>
                <input
                  type="text"
                  className="input-field"
                  value={profileName}
                  onChange={(e) => { setProfileName(e.target.value); setDirty(true); }}
                  placeholder="Ej: Brand Kit Principal"
                />
              </div>
              <div>
                <label className="input-label">Estilo visual</label>
                <select
                  className="input-field"
                  value={style}
                  onChange={(e) => { setStyle(e.target.value); setDirty(true); }}
                >
                  {STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="glass-card p-5 animate-fade-in-delay-1">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🏷️</span> Logo principal
            </h3>
            <div className="flex items-start gap-5">
              {/* Current logo preview */}
              <div
                className="w-28 h-28 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  background: 'rgba(124,58,237,0.08)',
                  border: logoUrl ? '2px solid rgba(124,58,237,0.3)' : '2px dashed rgba(124,58,237,0.2)',
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center px-3">
                    <div className="text-3xl mb-1">🏷️</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Sin logo</div>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-3">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Sube tu logo en PNG o SVG con fondo transparente para mejores resultados.
                  Se usará automáticamente en las composiciones de imagen.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    className="btn-primary text-sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? 'Subiendo...' : '⬆️ Subir logo'}
                  </button>
                  {logoUrl && (
                    <button
                      className="btn-ghost text-sm"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '0.75rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => { setLogoUrl(null); setDirty(true); }}
                    >
                      🗑️ Quitar
                    </button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  PNG, JPG, SVG, WEBP · Máx. 50 MB
                </p>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="glass-card p-5 animate-fade-in-delay-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span className="text-lg">🎨</span> Paleta de colores
              </h3>
              <button
                onClick={addColor}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(124,58,237,0.12)',
                  color: 'var(--color-primary-light)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  cursor: 'pointer',
                }}
              >
                + Añadir color
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {colors.map((color, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {colorLabels[index] ?? `Color ${index + 1}`}
                    </label>
                    {index >= 3 && (
                      <button
                        onClick={() => removeColor(index)}
                        className="text-xs"
                        style={{ color: 'rgba(239,68,68,0.7)', cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => updateColor(index, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                        style={{
                          background: 'transparent',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={color}
                      maxLength={7}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateColor(index, v);
                      }}
                      className="flex-1 min-w-0 rounded-lg text-xs font-mono px-3 py-2"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--color-text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {/* Color swatch */}
                  <div
                    className="h-8 w-full rounded-lg"
                    style={{
                      background: color,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="glass-card p-5 animate-fade-in-delay-2">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🔤</span> Tipografía
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary font */}
              <div className="space-y-3">
                <div>
                  <label className="input-label">Fuente principal (títulos)</label>
                  <select
                    className="input-field"
                    value={primaryFont}
                    onChange={(e) => handleFontChange(e.target.value, true)}
                  >
                    {POPULAR_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                {primaryFont && (
                  <div
                    className="p-3 rounded-xl text-center"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: `'${primaryFont}', sans-serif`,
                      color: 'var(--color-text)',
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>AaBbCc 123</div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>{primaryFont}</div>
                  </div>
                )}
              </div>

              {/* Secondary font */}
              <div className="space-y-3">
                <div>
                  <label className="input-label">Fuente secundaria (cuerpo)</label>
                  <select
                    className="input-field"
                    value={secondaryFont}
                    onChange={(e) => handleFontChange(e.target.value, false)}
                  >
                    {POPULAR_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                {secondaryFont && (
                  <div
                    className="p-3 rounded-xl text-center"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: `'${secondaryFont}', sans-serif`,
                      color: 'var(--color-text)',
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 400 }}>AaBbCc 123</div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>{secondaryFont}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom prompt prefix */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <label className="input-label flex items-center gap-2">
                <span>✨</span> Notas de estilo visual para IA
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}
                >
                  se inyecta en cada prompt de imagen
                </span>
              </label>
              <textarea
                className="input-field resize-none mt-1"
                rows={2}
                value={promptPrefix}
                placeholder="Ej: flat design illustration, pastel colors, minimalist vector art, no photorealism"
                onChange={(e) => { setPromptPrefix(e.target.value); setDirty(true); }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Describe en inglés el estilo visual que debe seguir el generador de imágenes.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right (preview) ── */}
        <div className="space-y-5">
          <div className="glass-card p-5 animate-fade-in-delay-1 sticky top-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">👁️</span> Preview en vivo
            </h3>
            <PostPreview
              colors={colors}
              primaryFont={primaryFont || null}
              logoUrl={logoUrl}
              style={style}
            />

            {/* Color strip legend */}
            <div className="mt-4 space-y-2">
              {colors.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-md flex-shrink-0"
                    style={{ background: c, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {colorLabels[i]}: <span className="font-mono">{c}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Style badge */}
            <div className="mt-4 flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(124,58,237,0.12)',
                  color: 'var(--color-primary-light)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                {STYLE_OPTIONS.find((o) => o.value === style)?.label ?? style}
              </span>
              {(primaryFont || secondaryFont) && (
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: 'rgba(6,182,212,0.08)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6,182,212,0.15)',
                  }}
                >
                  {primaryFont || secondaryFont}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset gallery ── */}
      <div className="glass-card p-5 animate-fade-in-delay-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <span className="text-lg">🗂️</span> Galería de assets de marca
          </h3>
          <button
            className="text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'var(--gradient-primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Subiendo...' : `⬆️ Subir a ${ASSET_CATEGORIES.find((c) => c.value === assetTab)?.label}`}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAssetUpload(file, assetTab);
              e.target.value = '';
            }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {ASSET_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setAssetTab(cat.value)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              style={{
                background: assetTab === cat.value
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))'
                  : 'rgba(255,255,255,0.03)',
                color: assetTab === cat.value ? '#e0d4ff' : 'var(--color-text-secondary)',
                border: assetTab === cat.value
                  ? '1px solid rgba(124,58,237,0.35)'
                  : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {(assets[cat.value]?.length ?? 0) > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(124,58,237,0.2)',
                    color: '#a78bfa',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {assets[cat.value]?.length ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        {assetsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (assets[assetTab]?.length ?? 0) === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed"
            style={{ borderColor: 'rgba(124,58,237,0.15)' }}
          >
            <div className="text-4xl mb-3">{ASSET_CATEGORIES.find((c) => c.value === assetTab)?.icon}</div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              No hay {ASSET_CATEGORIES.find((c) => c.value === assetTab)?.label.toLowerCase()} todavía
            </p>
            <button
              className="text-sm px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(124,58,237,0.12)',
                color: 'var(--color-primary-light)',
                border: '1px solid rgba(124,58,237,0.2)',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              ⬆️ Subir primer asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {(assets[assetTab] ?? []).map((asset) => (
              <div
                key={asset.id}
                className="group relative aspect-square rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: asset.isLogo && asset.url === logoUrl
                    ? '2px solid rgba(124,58,237,0.6)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt={asset.filename}
                  className="w-full h-full object-contain p-1"
                />
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2"
                  style={{ background: 'rgba(6,6,15,0.85)' }}
                >
                  <p className="text-[9px] text-center leading-tight font-medium" style={{ color: '#e0d4ff' }}>
                    {asset.filename.length > 18 ? asset.filename.slice(0, 15) + '…' : asset.filename}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {formatBytes(asset.sizeBytes)}
                  </p>
                  {assetTab === 'LOGO' && (
                    <button
                      className="text-[9px] px-2 py-1 rounded-md font-semibold"
                      style={{
                        background: asset.url === logoUrl ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)',
                        color: asset.url === logoUrl ? '#10b981' : '#a78bfa',
                        border: `1px solid ${asset.url === logoUrl ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.3)'}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setLogoUrl(asset.url === logoUrl ? null : asset.url);
                        setDirty(true);
                      }}
                    >
                      {asset.url === logoUrl ? '✓ Activo' : 'Usar'}
                    </button>
                  )}
                </div>

                {/* Active logo badge */}
                {assetTab === 'LOGO' && asset.url === logoUrl && (
                  <div
                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#10b981', fontSize: '8px' }}
                  >
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in"
          style={{
            background: toast.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: toast.type === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${toast.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast.type === 'ok' ? '✓' : '✕'} {toast.text}
        </div>
      )}
    </div>
  );
}
