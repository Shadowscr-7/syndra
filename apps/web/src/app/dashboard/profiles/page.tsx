'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ────────────────────────────────────────────

interface Persona {
  id: string;
  brandName: string;
  brandDescription: string;
  tone: string[];
  expertise: string[];
  visualStyle: string;
  targetAudience: string;
  avoidTopics: string[];
  languageStyle: string;
  examplePhrases: string[];
  isActive: boolean;
  createdAt: string;
}

interface ContentProfile {
  id: string;
  name: string;
  tone: string;
  contentLength: string;
  audience: string;
  language: string;
  hashtags: string[];
  postingGoal: string;
  linkedSocialAccounts: string[];
  isDefault: boolean;
  visualStyleProfiles: VisualStyle[];
  createdAt: string;
}

interface VisualStyle {
  id: string;
  name: string;
  contentProfileId: string | null;
  style: string;
  colorPalette: string[];
  primaryFont: string | null;
  secondaryFont: string | null;
  logoUrl: string | null;
  preferredImageProvider: string;
  customPromptPrefix: string | null;
  contentProfile?: { id: string; name: string } | null;
  createdAt: string;
}

// ── Constants ────────────────────────────────────────

const TONE_OPTIONS = ['didáctico', 'técnico', 'aspiracional', 'cercano', 'polémico', 'sarcástico', 'premium', 'directo', 'informal', 'formal'];
const LENGTH_OPTIONS = [
  { value: 'SHORT', label: 'Corto (< 150 palabras)' },
  { value: 'MEDIUM', label: 'Medio (150-300 palabras)' },
  { value: 'LONG', label: 'Largo (300+ palabras)' },
];
const STYLE_OPTIONS = [
  { value: 'MINIMALIST', label: 'Minimalista', icon: '◻️' },
  { value: 'FUTURISTIC', label: 'Futurista', icon: '🚀' },
  { value: 'REALISTIC', label: 'Realista', icon: '📷' },
  { value: 'CARTOON', label: 'Cartoon', icon: '🎨' },
  { value: 'ABSTRACT', label: 'Abstracto', icon: '🌀' },
  { value: 'PHOTOGRAPHY', label: 'Fotografía', icon: '📸' },
  { value: 'NEON', label: 'Neón', icon: '💜' },
  { value: 'VINTAGE', label: 'Vintage', icon: '📻' },
];
const PROVIDER_OPTIONS = [
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'openai', label: 'DALL-E (OpenAI)' },
  { value: 'stability', label: 'Stability AI' },
];

const TABS = [
  { key: 'persona', label: 'AI Persona', icon: '🧠' },
  { key: 'profiles', label: 'Perfiles de Contenido', icon: '📝' },
  { key: 'visual', label: 'Estilos Visuales', icon: '🎨' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Main Page ────────────────────────────────────────

export default function ProfilesPage() {
  const [tab, setTab] = useState<TabKey>('persona');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [profiles, setProfiles] = useState<ContentProfile[]>([]);
  const [visuals, setVisuals] = useState<VisualStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, vRes] = await Promise.all([
        fetch('/api/personas'),
        fetch('/api/profiles'),
        fetch('/api/visual-styles'),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      const vData = await vRes.json();
      setPersonas(pData.data ?? []);
      setProfiles(cData.data ?? []);
      setVisuals(vData.data ?? []);
    } catch {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Perfiles IA</h1>
        <p className="page-subtitle">
          Configura la personalidad de tu IA, define perfiles de contenido por canal y establece estilos visuales.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200"
            style={{
              background: tab === t.key
                ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))'
                : 'transparent',
              color: tab === t.key ? '#e0d4ff' : 'rgba(160,160,192,0.7)',
              borderBottom: tab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
            }}
          >
            <span className="mr-2">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="glass-card p-12 text-center text-white/40">Cargando...</div>
      ) : (
        <>
          {tab === 'persona' && (
            <PersonaTab personas={personas} onRefresh={loadAll} />
          )}
          {tab === 'profiles' && (
            <ProfilesTab profiles={profiles} onRefresh={loadAll} />
          )}
          {tab === 'visual' && (
            <VisualTab visuals={visuals} profiles={profiles} onRefresh={loadAll} />
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  TAB 1: AI Persona
// ══════════════════════════════════════════════════════

function PersonaTab({ personas, onRefresh }: { personas: Persona[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<Persona | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    brandName: '',
    brandDescription: '',
    tone: [] as string[],
    expertise: [] as string[],
    visualStyle: '',
    targetAudience: '',
    avoidTopics: [] as string[],
    languageStyle: '',
    examplePhrases: [] as string[],
  });

  const resetForm = () => {
    setForm({
      brandName: '', brandDescription: '', tone: [], expertise: [],
      visualStyle: '', targetAudience: '', avoidTopics: [],
      languageStyle: '', examplePhrases: [],
    });
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (p: Persona) => {
    setEditing(p);
    setCreating(false);
    setForm({
      brandName: p.brandName,
      brandDescription: p.brandDescription,
      tone: p.tone,
      expertise: p.expertise,
      visualStyle: p.visualStyle,
      targetAudience: p.targetAudience,
      avoidTopics: p.avoidTopics,
      languageStyle: p.languageStyle,
      examplePhrases: p.examplePhrases,
    });
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editing ? `/api/personas/${editing.id}` : '/api/personas';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Error al guardar la persona');
        // Still go back to list so user sees something happened
        resetForm();
        onRefresh();
        return;
      }
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    await fetch(`/api/personas/${id}/activate`, { method: 'PUT' });
    onRefresh();
  };

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/personas/${id}/deactivate`, { method: 'PUT' });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta persona?')) return;
    await fetch(`/api/personas/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              🧠 AI Persona Builder
            </h2>
            <p className="text-sm text-white/50 mt-1">
              Define la personalidad de tu marca para que la IA genere contenido con tu voz única.
            </p>
          </div>
          {!showForm && (
            <button onClick={() => { setCreating(true); resetForm(); setCreating(true); }} className="btn-primary text-sm">
              + Nueva Persona
            </button>
          )}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="glass-card p-4 mb-3 border border-red-500/30 bg-red-500/10 flex items-center justify-between animate-fade-in">
            <p className="text-sm text-red-300">⚠️ {errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 text-xs ml-4">✕</button>
          </div>
        )}

        {/* Existing personas list */}
        {!showForm && personas.length === 0 && (
          <div className="text-center py-10 text-white/30">
            <div className="text-4xl mb-3">🧠</div>
            <p>No tienes personas creadas. Crea tu primera AI Persona.</p>
          </div>
        )}

        {!showForm && personas.map((p) => (
          <div key={p.id} className="glass-card p-4 mb-3" style={{
            border: p.isActive ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.05)',
          }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{p.brandName || 'Sin nombre'}</span>
                  {p.isActive && (
                    <span className="badge" style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', fontSize: '11px' }}>
                      ACTIVA
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-1 line-clamp-2">{p.brandDescription}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.tone.map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                  {p.expertise.map((e) => (
                    <span key={e} className="chip" style={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9' }}>{e}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {!p.isActive ? (
                  <button onClick={() => handleActivate(p.id)} className="btn-ghost text-xs">Activar</button>
                ) : (
                  <button onClick={() => handleDeactivate(p.id)} className="btn-ghost text-xs">Desactivar</button>
                )}
                <button onClick={() => startEdit(p)} className="btn-ghost text-xs">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="btn-danger text-xs">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-white font-semibold mb-4">
            {editing ? 'Editar Persona' : 'Nueva AI Persona'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Nombre de marca</label>
              <input className="input-field w-full" value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                placeholder="Mi Marca Tech" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Audiencia objetivo</label>
              <input className="input-field w-full" value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="Emprendedores tech, 25-40 años" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/50 mb-1">Descripción de marca</label>
              <textarea className="input-field w-full" rows={3} value={form.brandDescription}
                onChange={(e) => setForm({ ...form, brandDescription: e.target.value })}
                placeholder="Somos una marca de educación tecnológica enfocada en emprendedores..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Tonos (separar por comas)</label>
              <input className="input-field w-full"
                value={form.tone.join(', ')}
                onChange={(e) => setForm({ ...form, tone: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="didáctico, cercano, experto" />
              <div className="flex flex-wrap gap-1 mt-1">
                {TONE_OPTIONS.map((t) => (
                  <button key={t} type="button"
                    className="chip text-[10px] cursor-pointer hover:opacity-80"
                    style={{ opacity: form.tone.includes(t) ? 1 : 0.4 }}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        tone: prev.tone.includes(t) ? prev.tone.filter(x => x !== t) : [...prev.tone, t],
                      }));
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Expertise (separar por comas)</label>
              <input className="input-field w-full"
                value={form.expertise.join(', ')}
                onChange={(e) => setForm({ ...form, expertise: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="IA, programación, startups" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Estilo de lenguaje</label>
              <input className="input-field w-full" value={form.languageStyle}
                onChange={(e) => setForm({ ...form, languageStyle: e.target.value })}
                placeholder="Tuteo, informal, con humor sutil" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Estilo visual</label>
              <input className="input-field w-full" value={form.visualStyle}
                onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
                placeholder="Minimalista tech, tonos fríos" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Temas a evitar (separar por comas)</label>
              <input className="input-field w-full"
                value={form.avoidTopics.join(', ')}
                onChange={(e) => setForm({ ...form, avoidTopics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="política, religión" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Frases ejemplo (separar por comas)</label>
              <input className="input-field w-full"
                value={form.examplePhrases.join(', ')}
                onChange={(e) => setForm({ ...form, examplePhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="El futuro es ahora, Automatiza o muere" />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSubmit} disabled={saving || !form.brandName} className="btn-primary text-sm">
              {saving ? 'Guardando...' : editing ? 'Actualizar Persona' : 'Crear Persona'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  TAB 2: Content Profiles
// ══════════════════════════════════════════════════════

function ProfilesTab({ profiles, onRefresh }: { profiles: ContentProfile[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<ContentProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    tone: 'didáctico',
    contentLength: 'MEDIUM',
    audience: '',
    language: 'es',
    hashtags: [] as string[],
    postingGoal: '',
    isDefault: false,
  });

  const resetForm = () => {
    setForm({ name: '', tone: 'didáctico', contentLength: 'MEDIUM', audience: '', language: 'es', hashtags: [], postingGoal: '', isDefault: false });
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (p: ContentProfile) => {
    setEditing(p);
    setCreating(false);
    setForm({
      name: p.name,
      tone: p.tone,
      contentLength: p.contentLength,
      audience: p.audience,
      language: p.language,
      hashtags: p.hashtags,
      postingGoal: p.postingGoal,
      isDefault: p.isDefault,
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editing ? `/api/profiles/${editing.id}` : '/api/profiles';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Error al guardar el perfil');
        resetForm();
        onRefresh();
        return;
      }
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este perfil de contenido?')) return;
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">📝 Perfiles de Contenido</h2>
            <p className="text-sm text-white/50 mt-1">
              Configura perfiles por canal o tipo de contenido con tono, extensión y audiencia específica.
            </p>
          </div>
          {!showForm && (
            <button onClick={() => { setCreating(true); resetForm(); setCreating(true); }} className="btn-primary text-sm">
              + Nuevo Perfil
            </button>
          )}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="glass-card p-4 mb-3 border border-red-500/30 bg-red-500/10 flex items-center justify-between animate-fade-in">
            <p className="text-sm text-red-300">⚠️ {errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 text-xs ml-4">✕</button>
          </div>
        )}

        {!showForm && profiles.length === 0 && (
          <div className="text-center py-10 text-white/30">
            <div className="text-4xl mb-3">📝</div>
            <p>Sin perfiles de contenido. Crea tu primero para personalizar la generación.</p>
          </div>
        )}

        {!showForm && profiles.map((p) => (
          <div key={p.id} className="glass-card p-4 mb-3" style={{
            border: p.isDefault ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.05)',
          }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{p.name}</span>
                  {p.isDefault && (
                    <span className="badge" style={{ background: 'rgba(6,182,212,0.2)', color: '#67e8f9', fontSize: '11px' }}>DEFAULT</span>
                  )}
                  <span className="chip text-[11px]">{p.tone}</span>
                  <span className="chip text-[11px]" style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd' }}>{p.contentLength}</span>
                </div>
                <p className="text-sm text-white/40 mt-1">
                  {p.audience && `Audiencia: ${p.audience} · `}
                  Idioma: {p.language}
                  {p.postingGoal && ` · Meta: ${p.postingGoal}`}
                </p>
                {p.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.hashtags.map((h) => (
                      <span key={h} className="text-[11px] text-cyan-300/60">{h}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => startEdit(p)} className="btn-ghost text-xs">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="btn-danger text-xs">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-white font-semibold mb-4">
            {editing ? 'Editar Perfil' : 'Nuevo Perfil de Contenido'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Nombre del perfil</label>
              <input className="input-field w-full" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Canal educativo IA" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Tono</label>
              <select className="input-field w-full" value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Extensión de contenido</label>
              <select className="input-field w-full" value={form.contentLength}
                onChange={(e) => setForm({ ...form, contentLength: e.target.value })}>
                {LENGTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Idioma</label>
              <select className="input-field w-full" value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Audiencia</label>
              <input className="input-field w-full" value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Emprendedores tech, 25-40" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Objetivo de publicación</label>
              <input className="input-field w-full" value={form.postingGoal}
                onChange={(e) => setForm({ ...form, postingGoal: e.target.value })}
                placeholder="Educación + generación de leads" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/50 mb-1">Hashtags (separar por comas)</label>
              <input className="input-field w-full"
                value={form.hashtags.join(', ')}
                onChange={(e) => setForm({ ...form, hashtags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="#IA, #Tech, #Automatización" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded" />
                Perfil por defecto
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSubmit} disabled={saving || !form.name} className="btn-primary text-sm">
              {saving ? 'Guardando...' : editing ? 'Actualizar Perfil' : 'Crear Perfil'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  TAB 3: Visual Styles
// ══════════════════════════════════════════════════════

function VisualTab({
  visuals,
  profiles,
  onRefresh,
}: {
  visuals: VisualStyle[];
  profiles: ContentProfile[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<VisualStyle | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    contentProfileId: '',
    style: 'MINIMALIST',
    colorPalette: [] as string[],
    primaryFont: '',
    secondaryFont: '',
    logoUrl: '',
    preferredImageProvider: 'huggingface',
    customPromptPrefix: '',
  });

  const resetForm = () => {
    setForm({
      name: '', contentProfileId: '', style: 'MINIMALIST', colorPalette: [],
      primaryFont: '', secondaryFont: '', logoUrl: '',
      preferredImageProvider: 'huggingface', customPromptPrefix: '',
    });
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (v: VisualStyle) => {
    setEditing(v);
    setCreating(false);
    setForm({
      name: v.name,
      contentProfileId: v.contentProfileId ?? '',
      style: v.style,
      colorPalette: v.colorPalette,
      primaryFont: v.primaryFont ?? '',
      secondaryFont: v.secondaryFont ?? '',
      logoUrl: v.logoUrl ?? '',
      preferredImageProvider: v.preferredImageProvider,
      customPromptPrefix: v.customPromptPrefix ?? '',
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editing ? `/api/visual-styles/${editing.id}` : '/api/visual-styles';
      const method = editing ? 'PUT' : 'POST';
      const payload = {
        ...form,
        contentProfileId: form.contentProfileId || null,
        primaryFont: form.primaryFont || null,
        secondaryFont: form.secondaryFont || null,
        logoUrl: form.logoUrl || null,
        customPromptPrefix: form.customPromptPrefix || null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Error al guardar el estilo visual');
        resetForm();
        onRefresh();
        return;
      }
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estilo visual?')) return;
    await fetch(`/api/visual-styles/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">🎨 Estilos Visuales</h2>
            <p className="text-sm text-white/50 mt-1">
              Define estilos para la generación automática de imágenes: colores, tipografía y estilo artístico.
            </p>
          </div>
          {!showForm && (
            <button onClick={() => { setCreating(true); resetForm(); setCreating(true); }} className="btn-primary text-sm">
              + Nuevo Estilo
            </button>
          )}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="glass-card p-4 mb-3 border border-red-500/30 bg-red-500/10 flex items-center justify-between animate-fade-in">
            <p className="text-sm text-red-300">⚠️ {errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 text-xs ml-4">✕</button>
          </div>
        )}

        {!showForm && visuals.length === 0 && (
          <div className="text-center py-10 text-white/30">
            <div className="text-4xl mb-3">🎨</div>
            <p>Sin estilos visuales. Crea uno para personalizar las imágenes generadas.</p>
          </div>
        )}

        {!showForm && visuals.map((v) => (
          <div key={v.id} className="glass-card p-4 mb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{v.name}</span>
                  <span className="chip text-[11px]">
                    {STYLE_OPTIONS.find(s => s.value === v.style)?.icon ?? '🎨'} {STYLE_OPTIONS.find(s => s.value === v.style)?.label ?? v.style}
                  </span>
                  {v.contentProfile && (
                    <span className="chip text-[11px]" style={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9' }}>
                      📝 {v.contentProfile.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {v.colorPalette.length > 0 && (
                    <div className="flex gap-1">
                      {v.colorPalette.map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: c }} title={c} />
                      ))}
                    </div>
                  )}
                  {v.primaryFont && <span className="text-[11px] text-white/40">Font: {v.primaryFont}</span>}
                  <span className="text-[11px] text-white/40">Provider: {v.preferredImageProvider}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => startEdit(v)} className="btn-ghost text-xs">Editar</button>
                <button onClick={() => handleDelete(v.id)} className="btn-danger text-xs">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-white font-semibold mb-4">
            {editing ? 'Editar Estilo Visual' : 'Nuevo Estilo Visual'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Nombre del estilo</label>
              <input className="input-field w-full" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Futurista tech" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Perfil de contenido (opcional)</label>
              <select className="input-field w-full" value={form.contentProfileId}
                onChange={(e) => setForm({ ...form, contentProfileId: e.target.value })}>
                <option value="">Sin vincular</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/50 mb-2">Estilo artístico</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLE_OPTIONS.map((s) => (
                  <button key={s.value} type="button"
                    className="glass-card p-3 text-center transition-all cursor-pointer"
                    style={{
                      border: form.style === s.value ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.05)',
                      background: form.style === s.value ? 'rgba(124,58,237,0.1)' : undefined,
                    }}
                    onClick={() => setForm({ ...form, style: s.value })}>
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xs text-white/70">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Paleta de colores (hex, separados por comas)</label>
              <input className="input-field w-full"
                value={form.colorPalette.join(', ')}
                onChange={(e) => setForm({ ...form, colorPalette: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="#7c3aed, #06b6d4, #0f172a" />
              {form.colorPalette.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {form.colorPalette.map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ background: c }} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Proveedor de imágenes</label>
              <select className="input-field w-full" value={form.preferredImageProvider}
                onChange={(e) => setForm({ ...form, preferredImageProvider: e.target.value })}>
                {PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Fuente primaria</label>
              <input className="input-field w-full" value={form.primaryFont}
                onChange={(e) => setForm({ ...form, primaryFont: e.target.value })}
                placeholder="Inter, Montserrat..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Fuente secundaria</label>
              <input className="input-field w-full" value={form.secondaryFont}
                onChange={(e) => setForm({ ...form, secondaryFont: e.target.value })}
                placeholder="JetBrains Mono, Fira Code..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">URL del logo (opcional)</label>
              <input className="input-field w-full" value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Prefijo de prompt (opcional)</label>
              <input className="input-field w-full" value={form.customPromptPrefix}
                onChange={(e) => setForm({ ...form, customPromptPrefix: e.target.value })}
                placeholder="cyberpunk style, neon glow..." />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSubmit} disabled={saving || !form.name} className="btn-primary text-sm">
              {saving ? 'Guardando...' : editing ? 'Actualizar Estilo' : 'Crear Estilo'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
