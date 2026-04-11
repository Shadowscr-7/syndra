'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

// ── Types ──────────────────────────────────────────────────────

interface StoryboardSegment {
  order: number;
  text: string;
  durationSeconds: number;
  scenePrompt: string;
  transition: 'cut' | 'dissolve' | 'fade';
}

interface Storyboard {
  compositeMode: 'overlay' | 'split' | 'full';
  overallMood: string;
  musicStyle: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
  segments: StoryboardSegment[];
  totalDurationSeconds: number;
}

interface RenderResult {
  jobId: string;
  videoUrl: string;
  durationSeconds: number;
  segmentCount: number;
}

// ── Stock avatars (HeyGen public library) ─────────────────────

const STOCK_AVATARS = [
  { id: 'Anna_public_3_20240108',   name: 'Anna',    style: 'Profesional · Femenino', emoji: '👩' },
  { id: 'Wayne_20240711',           name: 'Wayne',   style: 'Casual · Masculino',     emoji: '👨' },
  { id: 'Monica_public_020240722',  name: 'Monica',  style: 'Energético · Femenino',  emoji: '👩‍💼' },
  { id: 'Bryan_public_20240108',    name: 'Bryan',   style: 'Formal · Masculino',     emoji: '🧑‍💻' },
  { id: 'Andrew_public_3_20240108', name: 'Andrew',  style: 'Amigable · Masculino',   emoji: '🙋‍♂️' },
  { id: 'Kayla_public_4_20240108',  name: 'Kayla',   style: 'Joven · Femenino',       emoji: '👩‍🎤' },
] as const;

// ── Composite modes ────────────────────────────────────────────

const COMPOSITE_MODES = [
  {
    id: 'overlay' as const,
    label: 'Overlay',
    icon: '📺',
    desc: 'Avatar en esquina, escena de fondo completa. Estilo noticiario.',
  },
  {
    id: 'split' as const,
    label: 'Split',
    icon: '↔️',
    desc: 'Avatar a la izquierda, escena a la derecha. Estilo demo.',
  },
  {
    id: 'full' as const,
    label: 'Full Screen',
    icon: '🖥️',
    desc: 'Avatar pantalla completa sobre escena cinemática. Estilo storytelling.',
  },
] as const;

// ── Intents & tones ────────────────────────────────────────────

const INTENTS = [
  { id: 'vender',       label: 'Vender',       icon: '🛒' },
  { id: 'educar',       label: 'Educar',        icon: '📚' },
  { id: 'inspirar',     label: 'Inspirar',      icon: '✨' },
  { id: 'informar',     label: 'Informar',      icon: '📰' },
  { id: 'storytelling', label: 'Storytelling',  icon: '📖' },
  { id: 'entretener',   label: 'Entretener',    icon: '🎭' },
];

const TONES = [
  { id: 'energético',    label: 'Energético'    },
  { id: 'profesional',   label: 'Profesional'   },
  { id: 'emotivo',       label: 'Emotivo'       },
  { id: 'casual',        label: 'Casual'        },
  { id: 'inspiracional', label: 'Inspiracional' },
];

// ── Chip style helpers ─────────────────────────────────────────

const transitionChip: Record<string, { bg: string; color: string; border: string }> = {
  cut:     { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)'  },
  dissolve:{ bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: 'rgba(99,102,241,0.25)'  },
  fade:    { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.25)'  },
};

// ══════════════════════════════════════════════════════════════
// AvatarSceneTab
// ══════════════════════════════════════════════════════════════

export default function AvatarSceneTab() {
  // Source mode
  const [sourceMode, setSourceMode] = useState<'topic' | 'run'>('topic');

  // Topic inputs
  const [topic, setTopic]           = useState('');
  const [intent, setIntent]         = useState('informar');
  const [tone, setTone]             = useState('profesional');
  const [duration, setDuration]     = useState(30);

  // Editorial run input
  const [runId, setRunId]           = useState('');

  // Storyboard state
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState('');

  // Avatar selection
  const [avatarId, setAvatarId]     = useState<string>(STOCK_AVATARS[0]!.id);
  const [customAvatarId, setCustomAvatarId] = useState('');
  const [useCustom, setUseCustom]   = useState(false);

  // Options
  const [enableMusic, setEnableMusic] = useState(false);

  // Render state
  const [rendering, setRendering]   = useState(false);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderError, setRenderError] = useState('');

  // ── Step 1: Generate storyboard ───────────────────────────

  async function handleGenerateStoryboard() {
    setGenerating(true);
    setGenError('');
    setStoryboard(null);
    setRenderResult(null);

    try {
      const body = sourceMode === 'run'
        ? { editorialRunId: runId.trim(), platform: 'reels' as const, durationTarget: duration }
        : { topic: topic.trim(), intent, personaTone: tone, platform: 'reels' as const, durationTarget: duration };

      const res = await apiFetch<{ storyboard: Storyboard }>('/videos/avatar-scene/storyboard', {
        method: 'POST',
        body,
      });

      setStoryboard(res.storyboard);
    } catch (err: any) {
      setGenError(err.message ?? 'Error al generar el storyboard');
    } finally {
      setGenerating(false);
    }
  }

  // ── Storyboard editing ────────────────────────────────────

  function updateSegment(index: number, patch: Partial<StoryboardSegment>) {
    if (!storyboard) return;
    const updated = storyboard.segments.map((s, i) => i === index ? { ...s, ...patch } : s);
    const total = updated.reduce((sum, s) => sum + s.durationSeconds, 0);
    setStoryboard({ ...storyboard, segments: updated, totalDurationSeconds: total });
  }

  function removeSegment(index: number) {
    if (!storyboard || storyboard.segments.length <= 1) return;
    const updated = storyboard.segments
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i }));
    const total = updated.reduce((sum, s) => sum + s.durationSeconds, 0);
    setStoryboard({ ...storyboard, segments: updated, totalDurationSeconds: total });
  }

  function addSegment() {
    if (!storyboard) return;
    const newSeg: StoryboardSegment = {
      order: storyboard.segments.length,
      text: '',
      durationSeconds: 5,
      scenePrompt: '',
      transition: 'dissolve',
    };
    const updated = [...storyboard.segments, newSeg];
    setStoryboard({ ...storyboard, segments: updated, totalDurationSeconds: storyboard.totalDurationSeconds + 5 });
  }

  // ── Step 2: Render ────────────────────────────────────────

  async function handleRender() {
    if (!storyboard) return;
    setRendering(true);
    setRenderError('');
    setRenderResult(null);

    const finalAvatarId = useCustom ? customAvatarId.trim() : avatarId;
    if (!finalAvatarId) {
      setRenderError('Selecciona o ingresa un avatar ID');
      setRendering(false);
      return;
    }

    try {
      const res = await apiFetch<RenderResult>('/videos/avatar-scene/render', {
        method: 'POST',
        body: {
          avatarId: finalAvatarId,
          storyboard: {
            ...storyboard,
            compositeMode: storyboard.compositeMode,
          },
          enableMusic,
        },
      });
      setRenderResult(res);
    } catch (err: any) {
      setRenderError(err.message ?? 'Error al renderizar el video');
    } finally {
      setRendering(false);
    }
  }

  // ── Estimated credits ─────────────────────────────────────

  const estimatedCredits = storyboard
    ? 15 + storyboard.segments.length * 8 + (enableMusic ? 3 : 0)
    : 0;

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── STEP 1: Source ──────────────────────────────────── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
            🤖 Avatar + Escena
          </h3>
          <span className="chip" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-primary-light)', borderColor: 'rgba(124,58,237,0.3)' }}>
            Avatar IA + Escenas Kling
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          La IA genera un storyboard coordinado: el avatar habla mientras el fondo cambia según el contenido de cada segmento.
        </p>

        {/* Source mode selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSourceMode('topic')}
            className={sourceMode === 'topic' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
          >
            Tema libre
          </button>
          <button
            onClick={() => setSourceMode('run')}
            className={sourceMode === 'run' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
          >
            Desde editorial run
          </button>
        </div>

        {sourceMode === 'topic' ? (
          <div className="space-y-3">
            <div>
              <label className="input-label">Tema del video</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Lanzamiento de nuestro nuevo producto X, beneficios y cómo comprarlo"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Intención</label>
                <select
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="input-field"
                >
                  {INTENTS.map((i) => (
                    <option key={i.id} value={i.id}>{i.icon} {i.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Tono del avatar</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="input-field"
                >
                  {TONES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="input-label">ID del Editorial Run</label>
            <input
              type="text"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="clx... (copia el ID del run desde la cola editorial)"
              className="input-field"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              La IA tomará el copy aprobado y lo convertirá en guión hablado para el avatar.
            </p>
          </div>
        )}

        {/* Duration */}
        <div>
          <label className="input-label">Duración objetivo: {duration}s</label>
          <input
            type="range"
            min={15}
            max={60}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>15s</span><span>30s</span><span>45s</span><span>60s</span>
          </div>
        </div>

        <button
          onClick={handleGenerateStoryboard}
          disabled={generating || (sourceMode === 'topic' ? !topic.trim() : !runId.trim())}
          className="btn-primary w-full"
          style={{ justifyContent: 'center' }}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Generando storyboard...
            </span>
          ) : (
            '✨ Generar Storyboard con IA'
          )}
        </button>

        {genError && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
            {genError}
          </p>
        )}
      </div>

      {/* ── STEP 2: Storyboard editor ────────────────────────── */}
      {storyboard && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Storyboard generado</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Mood: {storyboard.overallMood} · {storyboard.totalDurationSeconds}s · {storyboard.segments.length} segmentos
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <span className="chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.25)' }}>
                {storyboard.compositeMode}
              </span>
              <span className="chip" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: 'rgba(16,185,129,0.2)' }}>
                🎵 {storyboard.musicStyle}
              </span>
            </div>
          </div>

          {/* Composite mode selector */}
          <div>
            <label className="input-label">Modo de composición</label>
            <div className="grid grid-cols-3 gap-2">
              {COMPOSITE_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setStoryboard({ ...storyboard, compositeMode: m.id })}
                  className={storyboard.compositeMode === m.id ? 'btn-primary' : 'btn-ghost'}
                  style={{ flexDirection: 'column', alignItems: 'center', padding: '0.6rem', gap: '0.25rem', height: 'auto' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.7, textAlign: 'center', lineHeight: 1.3 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-3">
            {storyboard.segments.map((seg, idx) => (
              <div
                key={idx}
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    Segmento {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="chip" style={transitionChip[seg.transition] ?? transitionChip['dissolve']!}>
                      {seg.transition}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {seg.durationSeconds}s
                    </span>
                    {storyboard.segments.length > 1 && (
                      <button
                        onClick={() => removeSegment(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '0.8rem', padding: '0.1rem 0.25rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Avatar text */}
                <div>
                  <label className="input-label" style={{ fontSize: '0.65rem' }}>Avatar dice</label>
                  <textarea
                    value={seg.text}
                    onChange={(e) => updateSegment(idx, { text: e.target.value })}
                    className="input-field"
                    rows={2}
                    style={{ fontSize: '0.8rem' }}
                    placeholder="Texto que dice el avatar..."
                  />
                </div>

                {/* Scene prompt */}
                <div>
                  <label className="input-label" style={{ fontSize: '0.65rem' }}>Escena de fondo (Kling)</label>
                  <input
                    type="text"
                    value={seg.scenePrompt}
                    onChange={(e) => updateSegment(idx, { scenePrompt: e.target.value })}
                    className="input-field"
                    style={{ fontSize: '0.8rem' }}
                    placeholder="Cinematic scene in English..."
                  />
                </div>

                {/* Duration + transition row */}
                <div className="flex gap-2">
                  <div style={{ flex: 1 }}>
                    <label className="input-label" style={{ fontSize: '0.65rem' }}>Duración (s)</label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={seg.durationSeconds}
                      onChange={(e) => updateSegment(idx, { durationSeconds: Number(e.target.value) })}
                      className="input-field"
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="input-label" style={{ fontSize: '0.65rem' }}>Transición</label>
                    <select
                      value={seg.transition}
                      onChange={(e) => updateSegment(idx, { transition: e.target.value as any })}
                      className="input-field"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <option value="cut">Cut</option>
                      <option value="dissolve">Dissolve</option>
                      <option value="fade">Fade</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addSegment}
              className="btn-ghost w-full"
              style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            >
              + Agregar segmento
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Avatar selector ──────────────────────────── */}
      {storyboard && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Elige el avatar</h3>

          {!useCustom ? (
            <div className="grid grid-cols-3 gap-2">
              {STOCK_AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setAvatarId(av.id)}
                  className={avatarId === av.id ? 'btn-primary' : 'btn-ghost'}
                  style={{ flexDirection: 'column', alignItems: 'center', padding: '0.75rem 0.5rem', gap: '0.3rem', height: 'auto' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{av.emoji}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{av.name}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.7, textAlign: 'center', lineHeight: 1.3 }}>{av.style}</span>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className="input-label">Avatar ID (HeyGen)</label>
              <input
                type="text"
                value={customAvatarId}
                onChange={(e) => setCustomAvatarId(e.target.value)}
                placeholder="Ej: Anna_public_3_20240108"
                className="input-field"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Encuentra el ID en tu cuenta HeyGen bajo "Avatars".
              </p>
            </div>
          )}

          <button
            onClick={() => { setUseCustom(!useCustom); setCustomAvatarId(''); }}
            className="btn-ghost"
            style={{ fontSize: '0.75rem' }}
          >
            {useCustom ? '← Usar avatar stock' : '+ Usar avatar personalizado (HeyGen ID)'}
          </button>
        </div>
      )}

      {/* ── STEP 4: Options + Render ─────────────────────────── */}
      {storyboard && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Opciones y renderizado</h3>

          {/* Music toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setEnableMusic(!enableMusic)}
              style={{
                width: '2.5rem', height: '1.25rem',
                borderRadius: '9999px',
                background: enableMusic ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '0.125rem',
                left: enableMusic ? '1.25rem' : '0.125rem',
                width: '1rem', height: '1rem',
                borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              Incluir música de fondo ({storyboard.musicStyle})
            </span>
            {enableMusic && (
              <span className="chip" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: 'rgba(16,185,129,0.2)', fontSize: '0.65rem' }}>
                +3 créd
              </span>
            )}
          </label>

          {/* Credit estimate */}
          <div
            className="rounded-lg px-4 py-3 flex items-center justify-between"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Créditos estimados</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                HeyGen 15 + Kling {storyboard.segments.length}×8{enableMusic ? ' + Música 3' : ''}
              </div>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
              {estimatedCredits}
            </span>
          </div>

          {/* Render button */}
          <button
            onClick={handleRender}
            disabled={rendering || (useCustom ? !customAvatarId.trim() : !avatarId)}
            className="btn-primary w-full"
            style={{ justifyContent: 'center', fontSize: '0.95rem', padding: '0.75rem' }}
          >
            {rendering ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Renderizando... (~3-5 min)
              </span>
            ) : (
              '🎬 Renderizar Video Avatar'
            )}
          </button>

          {rendering && (
            <div
              className="rounded-lg px-3 py-2 text-xs space-y-1"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-muted)' }}
            >
              <p>Generando en paralelo:</p>
              <p>• HeyGen: avatar con lip sync (fondo verde)...</p>
              <p>• Kling × {storyboard.segments.length}: escenas cinemáticas...</p>
              <p>• FFmpeg: compositing chroma key + audio...</p>
            </div>
          )}

          {renderError && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              {renderError}
            </p>
          )}
        </div>
      )}

      {/* ── Result ───────────────────────────────────────────── */}
      {renderResult && (
        <div
          className="glass-card p-5 space-y-4 animate-fade-in"
          style={{ border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <h3 className="font-semibold" style={{ color: '#10b981' }}>Video generado</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="chip" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: 'rgba(16,185,129,0.2)' }}>
              {renderResult.durationSeconds}s
            </span>
            <span className="chip" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.2)' }}>
              {renderResult.segmentCount} segmentos
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Job: {renderResult.jobId.slice(0, 16)}...
            </span>
          </div>

          {/* Preview */}
          {renderResult.videoUrl && (
            <video
              src={renderResult.videoUrl}
              controls
              playsInline
              style={{
                width: '100%',
                maxHeight: '40vh',
                borderRadius: '0.5rem',
                background: '#000',
              }}
            />
          )}

          <div className="flex gap-2">
            <a
              href={renderResult.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              ▶ Ver en pantalla completa
            </a>
            <button
              onClick={() => {
                setRenderResult(null);
                setStoryboard(null);
                setTopic('');
              }}
              className="btn-ghost"
            >
              Nuevo video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
