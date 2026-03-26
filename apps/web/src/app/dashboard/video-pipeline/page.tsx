'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { UserMediaPicker } from '@/components/media-picker';

// ── Types ──

type Tab = 'compositor' | 'kie';
type AspectRatio = '9:16' | '16:9' | '1:1';
type SlideRole = 'slide' | 'logo' | 'product' | 'intro' | 'outro' | 'background';
type SlideAnimation = 'ken-burns-in' | 'ken-burns-out' | 'pan-left' | 'pan-right' | 'zoom-pulse' | 'none' | 'auto';

interface StoryboardSlideUI {
  mediaId: string;
  thumbnailUrl?: string;
  role: SlideRole;
  order: number;
  durationMs?: number;
  animation: SlideAnimation;
  caption: string;
}

interface Voice {
  id: string;
  label: string;
  gender: string;
}

interface RenderJob {
  id: string;
  tier: string;
  provider: string;
  inputType: string;
  status: string;
  outputUrl?: string;
  creditsUsed?: number;
  createdAt: string;
}

interface Credits {
  balance: number;
  unlimited: boolean;
  totalPurchased: number;
  totalConsumed: number;
}

interface VideoPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  slideRoles: Array<{ role: string; label: string; suggested?: boolean }>;
  defaultAnimation: string;
  musicStyle: string;
  subtitleStyle: string;
  narrationPlaceholder: string;
  narrationIntent: string;
  slideDurationsMs?: number[];
}

interface ImagePromptEntry {
  id: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  resultUrl?: string;
  userMediaId?: string;
}

// ── Status styles ──

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  QUEUED:     { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  RENDERING:  { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  COMPOSING:  { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'rgba(168,85,247,0.2)' },
  UPLOADING:  { bg: 'rgba(6,182,212,0.1)',  color: '#06b6d4', border: 'rgba(6,182,212,0.2)' },
  COMPLETED:  { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  FAILED:     { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  CANCELLED:  { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', border: 'rgba(107,114,128,0.2)' },
};

// ── Narration intent options ──
const NARRATION_INTENTS = [
  { id: 'vender', label: '🛒 Vender', desc: 'Persuasivo, destaca beneficios' },
  { id: 'educar', label: '📚 Educar', desc: 'Didáctico, explica conceptos' },
  { id: 'entretener', label: '🎭 Entretener', desc: 'Dinámico, con enganche' },
  { id: 'inspirar', label: '✨ Inspirar', desc: 'Motivacional, poderoso' },
  { id: 'informar', label: '📰 Informar', desc: 'Profesional, datos claros' },
  { id: 'storytelling', label: '📖 Storytelling', desc: 'Narrativo, cuenta historia' },
];

// ── Main Page ──

export default function VideoPipelinePage() {
  const [tab, setTab] = useState<Tab>('compositor');
  const [credits, setCredits] = useState<Credits | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Compositor state (Option 1) ──
  const [compImageIds, setCompImageIds] = useState<string[]>([]);
  const [compAspect, setCompAspect] = useState<AspectRatio>('9:16');
  const [compNarration, setCompNarration] = useState('');
  const [compVoiceId, setCompVoiceId] = useState('');
  const [compVoiceSpeed, setCompVoiceSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [compSubtitles, setCompSubtitles] = useState(true);
  const [compMusic, setCompMusic] = useState(false);
  const [compMusicStyle, setCompMusicStyle] = useState<'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic'>('upbeat');
  const [compVoiceEngine, setCompVoiceEngine] = useState<'edge' | 'piper'>('edge');
  const [compMode, setCompMode] = useState<'general' | 'product'>('general');
  const [compLogoIds, setCompLogoIds] = useState<string[]>([]);
  const [compProductImageIds, setCompProductImageIds] = useState<string[]>([]);
  const [compProductName, setCompProductName] = useState('');
  const [compProductPrice, setCompProductPrice] = useState('');
  const [compProductCta, setCompProductCta] = useState('');
  const [compSubmitting, setCompSubmitting] = useState(false);

  // ── Storyboard state ──
  const [storyboardEnabled, setStoryboardEnabled] = useState(false);
  const [storyboardSlides, setStoryboardSlides] = useState<StoryboardSlideUI[]>([]);
  const [compSubtitleStyle, setCompSubtitleStyle] = useState<'pill' | 'minimal' | 'word-by-word' | 'karaoke'>('pill');

  // ── AI Image Generation state ──
  const [imagePrompts, setImagePrompts] = useState<ImagePromptEntry[]>([]);
  const [imgLang, setImgLang] = useState<'es' | 'en'>('es');
  const [imgIncludeText, setImgIncludeText] = useState(false);

  // ── AI Narration Improve state ──
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [improveIntent, setImproveIntent] = useState('');
  const [improving, setImproving] = useState(false);

  // ── AI Script Generator state ──
  const [showScriptGen, setShowScriptGen] = useState(false);
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptIntent, setScriptIntent] = useState('informar');
  const [scriptPlatform, setScriptPlatform] = useState<'reels' | 'tiktok' | 'stories' | 'youtube-shorts'>('reels');
  const [scriptDuration, setScriptDuration] = useState(30);
  const [scriptLang, setScriptLang] = useState<'es' | 'en'>('es');
  const [scriptProductName, setScriptProductName] = useState('');
  const [scriptProductPrice, setScriptProductPrice] = useState('');
  const [scriptProductFeatures, setScriptProductFeatures] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);

  // ── Kie AI state (Option 2) ──
  const [kiePrompt, setKiePrompt] = useState('');
  const [kieDuration, setKieDuration] = useState<5 | 10>(5);
  const [kieAspect, setKieAspect] = useState<AspectRatio>('9:16');
  const [kieSubmitting, setKieSubmitting] = useState(false);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [credRes, voicesRes, jobsRes, presetsRes] = await Promise.all([
        apiFetch<Credits>('/credits/balance').catch(() => null),
        apiFetch<{ data: Voice[] }>('/videos/compositor/voices').catch(() => ({ data: [] })),
        apiFetch<RenderJob[]>('/videos/render').catch(() => []),
        apiFetch<{ data: VideoPreset[] }>('/videos/compositor/presets').catch(() => ({ data: [] })),
      ]);
      if (credRes) setCredits(credRes);
      const voiceList = voicesRes?.data ?? [];
      setVoices(voiceList);
      if (voiceList.length > 0 && !compVoiceId && voiceList[0]) {
        setCompVoiceId(voiceList[0].id);
      }
      setPresets(presetsRes?.data ?? []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
    } catch (e) {
      console.error('Error loading video pipeline data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Sync storyboard slides with selected images ──
  useEffect(() => {
    if (!storyboardEnabled) return;
    setStoryboardSlides(prev => {
      const existingMap = new Map(prev.map(s => [s.mediaId, s]));
      return compImageIds.map((id, i) => existingMap.get(id) ?? {
        mediaId: id,
        role: 'slide' as SlideRole,
        order: i,
        animation: 'auto' as SlideAnimation,
        caption: '',
      });
    });
  }, [compImageIds, storyboardEnabled]);

  // ── AI Image Generation ──
  const addImagePrompt = () => {
    setImagePrompts(prev => [...prev, {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prompt: '',
      status: 'pending',
    }]);
  };

  const updateImagePrompt = (id: string, prompt: string) => {
    setImagePrompts(prev => prev.map(p => p.id === id ? { ...p, prompt } : p));
  };

  const removeImagePrompt = (id: string) => {
    setImagePrompts(prev => prev.filter(p => p.id !== id));
  };

  const generateImage = async (entry: ImagePromptEntry) => {
    if (!entry.prompt.trim()) return;
    setImagePrompts(prev => prev.map(p => p.id === entry.id ? { ...p, status: 'generating' } : p));
    try {
      const res = await apiFetch<{ success: boolean; imageUrl: string; userMediaId: string }>('/videos/compositor/generate-image', {
        method: 'POST',
        body: {
          prompt: entry.prompt,
          language: imgLang,
          includeText: imgIncludeText,
          aspectRatio: compAspect,
        },
      });
      setImagePrompts(prev => prev.map(p =>
        p.id === entry.id ? { ...p, status: 'done', resultUrl: res.imageUrl, userMediaId: res.userMediaId } : p
      ));
      // Auto-select the generated image
      if (res.userMediaId) {
        setCompImageIds(prev => prev.length < 10 ? [...prev, res.userMediaId] : prev);
      }
      loadData(); // refresh credits
    } catch (err: any) {
      console.error('Image generation error:', err);
      setImagePrompts(prev => prev.map(p => p.id === entry.id ? { ...p, status: 'error' } : p));
    }
  };

  const generateAllImages = async () => {
    const pending = imagePrompts.filter(p => p.status === 'pending' && p.prompt.trim());
    for (const entry of pending) {
      await generateImage(entry);
    }
  };

  // ── AI Narration Improve ──
  const improveNarration = async () => {
    if (!compNarration.trim() || !improveIntent) return;
    setImproving(true);
    try {
      const res = await apiFetch<{ improved: string }>('/videos/compositor/improve-text', {
        method: 'POST',
        body: { text: compNarration, intent: improveIntent },
      });
      if (res.improved) {
        setCompNarration(res.improved);
      }
      setShowImprovePanel(false);
      setImproveIntent('');
    } catch (err: any) {
      console.error('Improve narration error:', err);
    } finally {
      setImproving(false);
    }
  };

  // ── Apply Preset ──
  const applyPreset = (preset: VideoPreset) => {
    setCompNarration(preset.narrationPlaceholder);
    setCompMusicStyle(preset.musicStyle as typeof compMusicStyle);
    setCompMusic(true);
    setCompSubtitleStyle(preset.subtitleStyle as 'pill' | 'minimal');
    setStoryboardEnabled(true);
    setImproveIntent(preset.narrationIntent);
  };

  // ── AI Script Generator ──
  const generateFullScript = async () => {
    if (!scriptTopic.trim()) return;
    setGeneratingScript(true);
    try {
      const body: Record<string, unknown> = {
        topic: scriptTopic.trim(),
        intent: scriptIntent,
        targetPlatform: scriptPlatform,
        duration: scriptDuration,
        language: scriptLang,
      };
      if (scriptProductName.trim()) {
        body.productInfo = {
          name: scriptProductName.trim(),
          price: scriptProductPrice.trim() || undefined,
          features: scriptProductFeatures.trim() || undefined,
        };
      }
      const res = await apiFetch<{
        narration: string;
        imagePrompts: string[];
        musicStyle: string;
        subtitleStyle: string;
        preset: string;
      }>('/videos/compositor/generate-script', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Apply narration
      setCompNarration(res.narration);

      // Apply music style
      const validMusic = ['upbeat', 'calm', 'corporate', 'energetic', 'cinematic'];
      if (validMusic.includes(res.musicStyle)) {
        setCompMusicStyle(res.musicStyle as typeof compMusicStyle);
        setCompMusic(true);
      }

      // Apply subtitle style
      const validSubs = ['pill', 'minimal', 'word-by-word', 'karaoke'];
      if (validSubs.includes(res.subtitleStyle)) {
        setCompSubtitleStyle(res.subtitleStyle as typeof compSubtitleStyle);
      }

      // Apply preset intent
      const matchedPreset = presets.find(p => p.id === res.preset);
      if (matchedPreset) {
        setImproveIntent(matchedPreset.narrationIntent);
      }

      // Fill image prompts
      if (res.imagePrompts.length > 0) {
        setImagePrompts(res.imagePrompts.map((prompt, i) => ({
          id: `ai_${Date.now()}_${i}`,
          prompt,
          status: 'pending' as const,
        })));
      }

      setStoryboardEnabled(true);
      setShowScriptGen(false);
    } catch (e: any) {
      console.error('Error generating script:', e);
      alert('Error al generar guión: ' + (e.message || 'Error desconocido'));
    } finally {
      setGeneratingScript(false);
    }
  };

  // ── Storyboard helpers ──
  const updateSlide = (mediaId: string, patch: Partial<StoryboardSlideUI>) => {
    setStoryboardSlides(prev => prev.map(s => s.mediaId === mediaId ? { ...s, ...patch } : s));
  };

  const moveSlide = (idx: number, direction: -1 | 1) => {
    setStoryboardSlides(prev => {
      const arr = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target]!, arr[idx]!];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  };

  // ── Submit Compositor ──
  const submitCompositor = async () => {
    if (!compNarration.trim()) return;
    // Allow submitting with generated image URLs if no library images selected
    const generatedUrls = imagePrompts.filter(p => p.resultUrl).map(p => p.resultUrl!);
    if (!compImageIds.length && !generatedUrls.length) return;

    setCompSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        aspectRatio: compAspect,
        narrationText: compNarration,
        voiceId: compVoiceId,
        voiceSpeed: compVoiceSpeed,
        voiceEngine: compVoiceEngine,
        enableSubtitles: compSubtitles,
        subtitleStyle: compSubtitleStyle,
        enableMusic: compMusic,
        musicStyle: compMusic ? compMusicStyle : undefined,
        mode: compMode,
        logoId: compMode === 'product' ? compLogoIds[0] : undefined,
        productImageId: compMode === 'product' ? compProductImageIds[0] : undefined,
        productName: compMode === 'product' ? compProductName : undefined,
        productPrice: compMode === 'product' ? compProductPrice : undefined,
        productCta: compMode === 'product' ? compProductCta : undefined,
      };

      if (storyboardEnabled && storyboardSlides.length > 0) {
        body.imageSlides = storyboardSlides.map((s, i) => ({
          mediaId: s.mediaId,
          role: s.role,
          order: i,
          durationMs: s.durationMs || undefined,
          animation: s.animation,
          caption: s.caption || undefined,
        }));
      } else if (compImageIds.length) {
        body.imageIds = compImageIds;
      } else {
        body.imageUrls = generatedUrls;
      }

      await apiFetch('/videos/compositor/render', {
        method: 'POST',
        body,
      });
      setCompNarration('');
      setCompImageIds([]);
      setImagePrompts([]);
      loadData();
    } catch (e) {
      console.error('Compositor render error:', e);
    } finally {
      setCompSubmitting(false);
    }
  };

  // ── Submit Kie Reels ──
  const submitKieReels = async () => {
    if (!kiePrompt.trim()) return;
    setKieSubmitting(true);
    try {
      await apiFetch('/videos/kie-reels/render', {
        method: 'POST',
        body: {
          prompt: kiePrompt,
          duration: kieDuration,
          aspectRatio: kieAspect,
        },
      });
      setKiePrompt('');
      loadData();
    } catch (e) {
      console.error('Kie reels render error:', e);
    } finally {
      setKieSubmitting(false);
    }
  };

  // ── Cost calculation ──
  const compositorCost = 3 + (compMusic ? 3 : 0);
  const hasImages = compImageIds.length > 0 || imagePrompts.some(p => p.resultUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Video Pipeline</h1>
        <p className="page-subtitle">Crea videos profesionales con IA — compositor FFmpeg o Kie AI Reels</p>
      </div>

      {/* Credits bar */}
      {credits && (
        <div className="grid grid-cols-3 gap-4 animate-fade-in">
          <div className="glass-card p-4 text-center stat-gradient-cyan">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>{credits.unlimited ? '∞' : credits.balance}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Créditos Disponibles</div>
          </div>
          <div className="glass-card p-4 text-center stat-gradient-purple">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-primary-light)' }}>{credits.totalConsumed}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Consumidos</div>
          </div>
          <div className="glass-card p-4 text-center stat-gradient-blue">
            <div className="text-2xl font-bold" style={{ color: '#60a5fa' }}>{credits.totalPurchased}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Total Adquiridos</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 animate-fade-in-delay-1">
        <button
          onClick={() => setTab('compositor')}
          className={tab === 'compositor' ? 'btn-primary' : 'btn-ghost'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🎬 Compositor Pro
          <span className="chip" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', fontSize: '0.65rem' }}>
            {compositorCost} créd
          </span>
        </button>
        <button
          onClick={() => setTab('kie')}
          className={tab === 'kie' ? 'btn-primary' : 'btn-ghost'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          ⚡ Kie AI Reels
          <span className="chip" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', borderColor: 'rgba(236,72,153,0.3)', fontSize: '0.65rem' }}>
            20 créd
          </span>
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>
      ) : (
        <>
          {/* ═══════════════════════════════════════ */}
          {/* TAB 1 — Compositor Pro                 */}
          {/* ═══════════════════════════════════════ */}
          {tab === 'compositor' && (
            <div className="space-y-4 animate-fade-in">
              {/* AI Script Generator */}
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    ✨ Generador de Guión con IA
                  </h3>
                  <button
                    onClick={() => setShowScriptGen(!showScriptGen)}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    {showScriptGen ? '✕ Cerrar' : '✨ Generar guión completo'}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Ingresá un tema y la IA genera: narración, prompts de imágenes, música y estilo de subtítulos.
                </p>

                {showScriptGen && (
                  <div className="space-y-3 mt-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    {/* Topic */}
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Tema del video</label>
                      <textarea
                        value={scriptTopic}
                        onChange={e => setScriptTopic(e.target.value)}
                        placeholder="Ej: Los 5 beneficios del café para la productividad..."
                        className="input w-full"
                        rows={2}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Platform + Intent + Duration + Language */}
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Plataforma</label>
                        <select
                          value={scriptPlatform}
                          onChange={e => setScriptPlatform(e.target.value as typeof scriptPlatform)}
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        >
                          <option value="reels">📱 Reels</option>
                          <option value="tiktok">🎵 TikTok</option>
                          <option value="stories">📸 Stories</option>
                          <option value="youtube-shorts">▶️ YouTube Shorts</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Intención</label>
                        <select
                          value={scriptIntent}
                          onChange={e => setScriptIntent(e.target.value)}
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        >
                          {NARRATION_INTENTS.map(ni => (
                            <option key={ni.id} value={ni.id}>{ni.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Duración (s)</label>
                        <input
                          type="number"
                          value={scriptDuration}
                          onChange={e => setScriptDuration(Math.max(10, Math.min(60, Number(e.target.value))))}
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                          min={10}
                          max={60}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Idioma</label>
                        <select
                          value={scriptLang}
                          onChange={e => setScriptLang(e.target.value as 'es' | 'en')}
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        >
                          <option value="es">🇪🇸 Español</option>
                          <option value="en">🇺🇸 English</option>
                        </select>
                      </div>
                    </div>

                    {/* Product info (optional) */}
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        🛍️ Info de producto (opcional)
                      </summary>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <input
                          value={scriptProductName}
                          onChange={e => setScriptProductName(e.target.value)}
                          placeholder="Nombre del producto"
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        />
                        <input
                          value={scriptProductPrice}
                          onChange={e => setScriptProductPrice(e.target.value)}
                          placeholder="Precio (ej: $29.99)"
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        />
                        <input
                          value={scriptProductFeatures}
                          onChange={e => setScriptProductFeatures(e.target.value)}
                          placeholder="Features clave"
                          className="input w-full"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </details>

                    {/* Generate button */}
                    <button
                      onClick={generateFullScript}
                      disabled={generatingScript || !scriptTopic.trim()}
                      className="btn-primary w-full"
                      style={{ padding: '0.65rem' }}
                    >
                      {generatingScript ? '🔄 Generando guión...' : '✨ Generar guión completo'}
                    </button>
                  </div>
                )}
              </div>

              {/* Presets */}
              {presets.length > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    🎭 Presets Rápidos
                    <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>1 click para configurar todo</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className="btn-ghost text-left"
                        style={{ padding: '0.6rem 0.75rem' }}
                      >
                        <div className="font-medium text-sm">{p.icon} {p.name}</div>
                        <div className="text-[0.65rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{p.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode selector */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Modo de video</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCompMode('general')}
                    className={compMode === 'general' ? 'btn-primary' : 'btn-ghost'}
                    style={{ flex: 1 }}
                  >
                    🎥 General
                  </button>
                  <button
                    onClick={() => setCompMode('product')}
                    className={compMode === 'product' ? 'btn-primary' : 'btn-ghost'}
                    style={{ flex: 1 }}
                  >
                    🛍️ Producto
                  </button>
                </div>
                {compMode === 'product' && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Modo producto: agrega logo, imagen de producto, precio y CTA al video.
                  </p>
                )}
              </div>

              {/* Images from library */}
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  📷 Imágenes de biblioteca <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(hasta 10)</span>
                </h3>
                <UserMediaPicker
                  selectedIds={compImageIds}
                  onChange={setCompImageIds}
                  max={10}
                />
                {compImageIds.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: '#10b981' }}>{compImageIds.length} imagen(es) seleccionada(s)</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storyboardEnabled}
                        onChange={(e) => setStoryboardEnabled(e.target.checked)}
                        className="accent-purple-500 w-4 h-4"
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>🎬 Storyboard</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Storyboard Panel */}
              {storyboardEnabled && storyboardSlides.length > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    🎬 Storyboard
                    <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>Configura cada slide</span>
                  </h3>
                  <div className="space-y-3">
                    {storyboardSlides.map((slide, idx) => (
                      <div key={slide.mediaId} className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border-subtle)' }}>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0} className="btn-ghost" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                            <button onClick={() => moveSlide(idx, 1)} disabled={idx === storyboardSlides.length - 1} className="btn-ghost" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem', opacity: idx === storyboardSlides.length - 1 ? 0.3 : 1 }}>▼</button>
                          </div>
                          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', minWidth: '1.5rem' }}>{idx + 1}</span>
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>Rol</label>
                              <select value={slide.role} onChange={e => updateSlide(slide.mediaId, { role: e.target.value as SlideRole })} className="input-field" style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}>
                                <option value="slide">📷 Slide</option>
                                <option value="intro">🎬 Intro</option>
                                <option value="outro">🏁 Outro</option>
                                <option value="logo">🏷️ Logo</option>
                                <option value="product">🛍️ Producto</option>
                                <option value="background">🖼️ Fondo</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>Animación</label>
                              <select value={slide.animation} onChange={e => updateSlide(slide.mediaId, { animation: e.target.value as SlideAnimation })} className="input-field" style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}>
                                <option value="auto">🔄 Auto</option>
                                <option value="ken-burns-in">🔍 Zoom In</option>
                                <option value="ken-burns-out">🔎 Zoom Out</option>
                                <option value="pan-left">⬅️ Pan Izq</option>
                                <option value="pan-right">➡️ Pan Der</option>
                                <option value="zoom-pulse">💫 Pulso</option>
                                <option value="none">⏹️ Estático</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>Duración (s)</label>
                              <input type="number" min={1} max={30} step={0.5} value={slide.durationMs ? slide.durationMs / 1000 : ''} placeholder="Auto" onChange={e => updateSlide(slide.mediaId, { durationMs: e.target.value ? Number(e.target.value) * 1000 : undefined })} className="input-field" style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }} />
                            </div>
                            <div>
                              <label className="text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>Caption</label>
                              <input type="text" value={slide.caption} placeholder="Texto overlay..." onChange={e => updateSlide(slide.mediaId, { caption: e.target.value })} className="input-field" style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Image Generation */}
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    🎨 Generar imágenes con IA
                    <span className="chip ml-2" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', borderColor: 'rgba(168,85,247,0.2)', fontSize: '0.6rem' }}>
                      Ideogram V3 — 3 créd c/u
                    </span>
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Genera imágenes personalizadas con IA para usar como slides del video.
                </p>

                {/* Language + text options */}
                <div className="flex gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Idioma texto:</label>
                    <select
                      value={imgLang}
                      onChange={(e) => setImgLang(e.target.value as 'es' | 'en')}
                      className="input-field"
                      style={{ maxWidth: '8rem', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇬🇧 Inglés</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={imgIncludeText}
                      onChange={(e) => setImgIncludeText(e.target.checked)}
                      className="accent-purple-500 w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Incluir texto en la imagen
                    </span>
                  </label>
                </div>

                {/* Prompt entries */}
                <div className="space-y-2">
                  {imagePrompts.map((entry, idx) => (
                    <div key={entry.id} className="flex gap-2 items-start">
                      <span className="text-xs mt-2 font-mono" style={{ color: 'var(--color-text-muted)', minWidth: '1.5rem' }}>
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <textarea
                          value={entry.prompt}
                          onChange={(e) => updateImagePrompt(entry.id, e.target.value)}
                          placeholder="Describe la imagen... Ej: Slide elegante con fondo degradado azul oscuro mostrando estadísticas de crecimiento"
                          className="input-field text-sm"
                          rows={2}
                          disabled={entry.status === 'generating' || entry.status === 'done'}
                          style={entry.status === 'done' ? { borderColor: '#10b981', opacity: 0.8 } : undefined}
                        />
                        {entry.status === 'done' && entry.resultUrl && (
                          <div className="mt-1 flex items-center gap-2">
                            <img src={entry.resultUrl} alt="Generated" className="w-16 h-16 rounded object-cover border border-white/10" />
                            <span className="text-xs" style={{ color: '#10b981' }}>✓ Generada y seleccionada</span>
                          </div>
                        )}
                        {entry.status === 'generating' && (
                          <p className="text-xs mt-1 animate-pulse" style={{ color: '#a855f7' }}>⏳ Generando...</p>
                        )}
                        {entry.status === 'error' && (
                          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Error al generar. Intenta de nuevo.</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {entry.status === 'pending' && (
                          <button
                            onClick={() => generateImage(entry)}
                            disabled={!entry.prompt.trim()}
                            className="btn-ghost text-xs"
                            style={{ padding: '0.25rem 0.5rem', opacity: entry.prompt.trim() ? 1 : 0.4 }}
                          >
                            🎨
                          </button>
                        )}
                        {entry.status !== 'generating' && (
                          <button
                            onClick={() => removeImagePrompt(entry.id)}
                            className="btn-ghost text-xs"
                            style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addImagePrompt}
                    className="btn-ghost text-xs"
                    style={{ padding: '0.4rem 0.75rem' }}
                  >
                    + Agregar prompt
                  </button>
                  {imagePrompts.filter(p => p.status === 'pending' && p.prompt.trim()).length > 1 && (
                    <button
                      onClick={generateAllImages}
                      className="btn-primary text-xs"
                      style={{ padding: '0.4rem 0.75rem' }}
                    >
                      🎨 Generar todas ({imagePrompts.filter(p => p.status === 'pending' && p.prompt.trim()).length})
                    </button>
                  )}
                </div>

                {!hasImages && (
                  <p className="text-xs" style={{ color: '#f59e0b' }}>
                    Selecciona imágenes de tu biblioteca o genera nuevas con IA.
                  </p>
                )}
              </div>

              {/* Product fields (conditional) */}
              {compMode === 'product' && (
                <div className="glass-card p-5 space-y-3">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>🛍️ Datos del Producto</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">Logo</label>
                      <UserMediaPicker
                        selectedIds={compLogoIds}
                        onChange={setCompLogoIds}
                        categoryFilter="LOGO"
                        max={1}
                      />
                    </div>
                    <div>
                      <label className="input-label">Imagen principal</label>
                      <UserMediaPicker
                        selectedIds={compProductImageIds}
                        onChange={setCompProductImageIds}
                        categoryFilter="PRODUCT"
                        max={1}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="input-label">Nombre</label>
                      <input
                        type="text"
                        value={compProductName}
                        onChange={(e) => setCompProductName(e.target.value)}
                        placeholder="Mi Producto"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Precio</label>
                      <input
                        type="text"
                        value={compProductPrice}
                        onChange={(e) => setCompProductPrice(e.target.value)}
                        placeholder="$29.99"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">CTA</label>
                      <input
                        type="text"
                        value={compProductCta}
                        onChange={(e) => setCompProductCta(e.target.value)}
                        placeholder="¡Comprá ahora!"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Narration */}
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>🎙️ Narración</h3>
                  {compNarration.trim() && (
                    <button
                      onClick={() => setShowImprovePanel(!showImprovePanel)}
                      className="btn-ghost text-xs"
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: showImprovePanel ? 'rgba(168,85,247,0.15)' : undefined,
                        borderColor: showImprovePanel ? 'rgba(168,85,247,0.3)' : undefined,
                      }}
                    >
                      ✨ Mejorar con IA
                    </button>
                  )}
                </div>

                <textarea
                  value={compNarration}
                  onChange={(e) => setCompNarration(e.target.value)}
                  placeholder="Texto que se convertirá a voz (TTS). Escribe lo que quieres que diga el video..."
                  className="input-field"
                  rows={4}
                />

                {/* AI Improve Panel */}
                {showImprovePanel && (
                  <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <p className="text-xs font-medium" style={{ color: '#a855f7' }}>¿Con qué intención quieres mejorar el texto?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {NARRATION_INTENTS.map((intent) => (
                        <button
                          key={intent.id}
                          onClick={() => setImproveIntent(intent.id)}
                          className={improveIntent === intent.id ? 'btn-primary' : 'btn-ghost'}
                          style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'left' }}
                        >
                          <div className="font-medium">{intent.label}</div>
                          <div className="text-[0.65rem] mt-0.5 opacity-70">{intent.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={improveNarration}
                        disabled={!improveIntent || improving}
                        className="btn-primary text-xs"
                        style={{ padding: '0.4rem 1rem', opacity: (!improveIntent || improving) ? 0.5 : 1 }}
                      >
                        {improving ? '⏳ Mejorando...' : '✨ Aplicar mejora'}
                      </button>
                      <button
                        onClick={() => { setShowImprovePanel(false); setImproveIntent(''); }}
                        className="btn-ghost text-xs"
                        style={{ padding: '0.4rem 0.75rem' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="input-label">Voz</label>
                    <select
                      value={compVoiceId}
                      onChange={(e) => setCompVoiceId(e.target.value)}
                      className="input-field"
                    >
                      {voices.length === 0 && <option value="">Cargando voces...</option>}
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>{v.label} ({v.gender === 'F' ? '♀' : '♂'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Motor</label>
                    <select
                      value={compVoiceEngine}
                      onChange={(e) => setCompVoiceEngine(e.target.value as 'edge' | 'piper')}
                      className="input-field"
                    >
                      <option value="edge">🔊 Edge TTS</option>
                      <option value="piper">🎙️ Piper (Natural)</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Velocidad</label>
                    <select
                      value={compVoiceSpeed}
                      onChange={(e) => setCompVoiceSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                      className="input-field"
                    >
                      <option value="slow">Lenta</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Rápida</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Formato</label>
                    <select
                      value={compAspect}
                      onChange={(e) => setCompAspect(e.target.value as AspectRatio)}
                      className="input-field"
                    >
                      <option value="9:16">9:16 (Reel/Story)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="1:1">1:1 (Cuadrado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Options: Subtitles + Music */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>⚙️ Opciones</h3>
                <div className="flex gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compSubtitles}
                      onChange={(e) => setCompSubtitles(e.target.checked)}
                      className="accent-purple-500 w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Subtítulos automáticos
                    </span>
                  </label>
                  {compSubtitles && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Estilo:</label>
                      <select
                        value={compSubtitleStyle}
                        onChange={(e) => setCompSubtitleStyle(e.target.value as typeof compSubtitleStyle)}
                        className="input-field"
                        style={{ maxWidth: '10rem', padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                      >
                        <option value="pill">💊 Píldora</option>
                        <option value="minimal">✏️ Minimal</option>
                        <option value="word-by-word">💬 Palabra×Palabra</option>
                        <option value="karaoke">🎤 Karaoke</option>
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compMusic}
                      onChange={(e) => setCompMusic(e.target.checked)}
                      className="accent-purple-500 w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Música de fondo
                      <span className="chip ml-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', fontSize: '0.6rem' }}>
                        +3 créd
                      </span>
                    </span>
                  </label>
                </div>

                {compMusic && (
                  <div>
                    <label className="input-label">Estilo musical</label>
                    <select
                      value={compMusicStyle}
                      onChange={(e) => setCompMusicStyle(e.target.value as typeof compMusicStyle)}
                      className="input-field"
                      style={{ maxWidth: '14rem' }}
                    >
                      <option value="upbeat">🎵 Upbeat / Alegre</option>
                      <option value="calm">🎶 Calm / Relajado</option>
                      <option value="corporate">🏢 Corporate / Profesional</option>
                      <option value="energetic">⚡ Energetic / Dinámico</option>
                      <option value="cinematic">🎬 Cinematic / Épico</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4">
                <button
                  onClick={submitCompositor}
                  disabled={!hasImages || !compNarration.trim() || compSubmitting}
                  className="btn-primary"
                  style={{
                    opacity: (!hasImages || !compNarration.trim() || compSubmitting) ? 0.5 : 1,
                    padding: '0.75rem 2rem',
                    fontSize: '0.95rem',
                  }}
                >
                  {compSubmitting ? '⏳ Renderizando...' : `🎬 Crear Video (${compositorCost} créditos)`}
                </button>
                {compSubmitting && (
                  <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                    Esto puede tardar unos minutos...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* TAB 2 — Kie AI Reels                   */}
          {/* ═══════════════════════════════════════ */}
          {tab === 'kie' && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>⚡ Kie AI — Kling 2.6</h3>
                  <span className="chip" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', borderColor: 'rgba(236,72,153,0.3)' }}>
                    20 créditos por video
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Genera un video/reel completamente con IA a partir de un prompt de texto. Ideal para reels creativos y contenido visual impactante.
                </p>

                <div>
                  <label className="input-label">Prompt</label>
                  <textarea
                    value={kiePrompt}
                    onChange={(e) => setKiePrompt(e.target.value)}
                    placeholder="Describe el video que quieres crear. Ej: Un atardecer en la playa con olas suaves, colores cálidos, movimiento de cámara lento..."
                    className="input-field"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Duración</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setKieDuration(5)}
                        className={kieDuration === 5 ? 'btn-primary' : 'btn-ghost'}
                        style={{ flex: 1 }}
                      >
                        5 segundos
                      </button>
                      <button
                        onClick={() => setKieDuration(10)}
                        className={kieDuration === 10 ? 'btn-primary' : 'btn-ghost'}
                        style={{ flex: 1 }}
                      >
                        10 segundos
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Formato</label>
                    <select
                      value={kieAspect}
                      onChange={(e) => setKieAspect(e.target.value as AspectRatio)}
                      className="input-field"
                    >
                      <option value="9:16">9:16 (Reel/Story)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="1:1">1:1 (Cuadrado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4">
                <button
                  onClick={submitKieReels}
                  disabled={!kiePrompt.trim() || kieSubmitting}
                  className="btn-primary"
                  style={{
                    opacity: (!kiePrompt.trim() || kieSubmitting) ? 0.5 : 1,
                    padding: '0.75rem 2rem',
                    fontSize: '0.95rem',
                  }}
                >
                  {kieSubmitting ? '⏳ Generando...' : '⚡ Generar Reel (20 créditos)'}
                </button>
                {kieSubmitting && (
                  <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                    La IA está generando tu video...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* Render Jobs (shared)                    */}
          {/* ═══════════════════════════════════════ */}
          <div className="glass-card p-5 animate-fade-in-delay-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>📋 Render Jobs</h3>
              <button onClick={loadData} className="btn-ghost text-xs" style={{ padding: '0.35rem 0.75rem' }}>
                🔄 Actualizar
              </button>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 animate-float">🎬</div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay render jobs todavía.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.map((j) => {
                  const ss = statusStyles[j.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
                  return (
                    <div key={j.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <div className="flex items-center gap-2">
                        <span className="chip" style={{
                          background: j.provider === 'COMPOSITOR' ? 'rgba(124,58,237,0.1)' : 'rgba(236,72,153,0.1)',
                          color: j.provider === 'COMPOSITOR' ? 'var(--color-primary-light)' : '#ec4899',
                          borderColor: j.provider === 'COMPOSITOR' ? 'rgba(124,58,237,0.2)' : 'rgba(236,72,153,0.2)',
                        }}>
                          {j.provider === 'COMPOSITOR' ? '🎬 Compositor' : j.provider === 'KIE' ? '⚡ Kie AI' : j.provider}
                        </span>
                        <span className="chip" style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}>
                          {j.status}
                        </span>
                        {j.creditsUsed && (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{j.creditsUsed} créd</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{new Date(j.createdAt).toLocaleString()}</span>
                        {j.outputUrl && (
                          <a href={j.outputUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                            ▶ Ver video
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
