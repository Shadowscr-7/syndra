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

// ── Stock avatars ──────────────────────────────────────────────

const STOCK_AVATARS = [
  { id: 'Anna_public_3_20240108',   name: 'Anna',   emoji: '👩',  style: 'Profesional · F' },
  { id: 'Wayne_20240711',           name: 'Wayne',  emoji: '👨',  style: 'Casual · M'      },
  { id: 'Monica_public_020240722',  name: 'Monica', emoji: '👩‍💼', style: 'Energético · F'  },
  { id: 'Bryan_public_20240108',    name: 'Bryan',  emoji: '🧑‍💻', style: 'Formal · M'      },
  { id: 'Andrew_public_3_20240108', name: 'Andrew', emoji: '🙋‍♂️', style: 'Amigable · M'    },
  { id: 'Kayla_public_4_20240108',  name: 'Kayla',  emoji: '👩‍🎤', style: 'Joven · F'       },
] as const;

// ── Composite mode labels ─────────────────────────────────────

const COMPOSITE_MODES = [
  { id: 'overlay' as const, label: 'Overlay', icon: '📺', desc: 'Avatar en esquina, escena de fondo completa' },
  { id: 'split'   as const, label: 'Split',   icon: '↔️', desc: 'Avatar izq. / escena der.' },
  { id: 'full'    as const, label: 'Full',    icon: '🖥️', desc: 'Avatar pantalla completa sobre escena' },
];

// ── Steps ─────────────────────────────────────────────────────

type Step = 'idle' | 'generating' | 'review' | 'rendering' | 'done';

// ══════════════════════════════════════════════════════════════
// MakeVideoButton — renders trigger buttons (Reel + Avatar)
// ══════════════════════════════════════════════════════════════

export function MakeVideoButton({ runId, hasContent }: { runId: string; hasContent: boolean }) {
  const [openAvatar, setOpenAvatar] = useState(false);
  const [openReel, setOpenReel]     = useState(false);

  if (!hasContent) return null;

  return (
    <>
      <button
        onClick={() => setOpenReel(true)}
        className="btn-primary text-sm"
        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        🎬 Reel Profesional
      </button>

      <button
        onClick={() => setOpenAvatar(true)}
        className="btn-primary text-sm"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        🤖 Video Avatar
      </button>

      {openReel   && <ReelModal   runId={runId} onClose={() => setOpenReel(false)} />}
      {openAvatar && <MakeVideoModal runId={runId} onClose={() => setOpenAvatar(false)} />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ReelModal — simple voice selector → fire render_remotion_reel
// ══════════════════════════════════════════════════════════════

function ReelModal({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [status, setStatus] = useState<'idle' | 'loading' | 'queued' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleGenerate() {
    setStatus('loading');
    setError('');
    try {
      await apiFetch('/weekly-planner/items/' + runId + '/convert-video', {
        method: 'POST',
        body: { type: 'remotion-reel', voiceGender },
      }).catch(async () => {
        // Fallback: call video endpoint directly with editorialRunId
        await apiFetch('/videos/render-reel', {
          method: 'POST',
          body: { editorialRunId: runId, voiceGender },
        });
      });
      setStatus('queued');
    } catch (err: any) {
      setError(err.message ?? 'Error al encolar el reel');
      setStatus('error');
    }
  }

  const voiceColor = voiceGender === 'female' ? '#ec4899' : '#3b82f6';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '480px', borderRadius: '1rem', overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>🎬 Reel Profesional</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Animaciones Ken Burns · Subtítulos dinámicos · Voz IA argentina · Colores de tu marca
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }} className="space-y-4">
          {status === 'queued' ? (
            <div className="text-center space-y-3 py-4">
              <div style={{ fontSize: '2.5rem' }}>✅</div>
              <p className="font-semibold" style={{ color: '#10b981' }}>¡Reel en cola!</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                El reel se está renderizando en segundo plano. Aparecerá en la sección de aprobaciones cuando esté listo (puede tardar unos minutos).
              </p>
              <button onClick={onClose} className="btn-primary w-full" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>Cerrar</button>
            </div>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Elegí la voz de narración. El reel usará automáticamente tus imágenes, colores de marca y logo.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'female' as const, icon: '👩', name: 'Elena', desc: 'Voz femenina argentina', color: '#ec4899' },
                  { value: 'male'   as const, icon: '👨', name: 'Tomás', desc: 'Voz masculina argentina', color: '#3b82f6' },
                ]).map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setVoiceGender(v.value)}
                    style={{
                      padding: '1rem', borderRadius: '0.75rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      backgroundColor: voiceGender === v.value ? `${v.color}15` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${voiceGender === v.value ? v.color : 'var(--color-border)'}`,
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{v.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: voiceGender === v.value ? v.color : 'var(--color-text)', marginBottom: '0.15rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{v.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '0.625rem', padding: '0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                💡 El reel incluirá: animaciones Ken Burns sobre tus imágenes · subtítulos con efectos dinámicos · voz de <strong style={{ color: voiceColor }}>{voiceGender === 'female' ? 'Elena Neural' : 'Tomás Neural'}</strong> · colores y logo de tu perfil de marca.
              </div>

              {error && (
                <p style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={status === 'loading'}
                className="btn-primary w-full"
                style={{ justifyContent: 'center' }}
              >
                {status === 'loading' ? '⏳ Encolando...' : '🎬 Generar Reel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MakeVideoModal — full flow in a modal overlay
// ══════════════════════════════════════════════════════════════

function MakeVideoModal({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [step, setStep]             = useState<Step>('idle');
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [error, setError]           = useState('');

  // Avatar
  const [avatarId, setAvatarId]     = useState<string>(STOCK_AVATARS[0]!.id);
  const [useCustom, setUseCustom]   = useState(false);
  const [customId, setCustomId]     = useState('');

  // Options
  const [enableMusic, setEnableMusic] = useState(false);

  // Result
  const [result, setResult]         = useState<RenderResult | null>(null);

  // ── Step 1: auto-generate storyboard ──────────────────────

  async function generateStoryboard() {
    setStep('generating');
    setError('');
    try {
      const res = await apiFetch<{ storyboard: Storyboard }>('/videos/avatar-scene/storyboard', {
        method: 'POST',
        body: { editorialRunId: runId, platform: 'reels', durationTarget: 30 },
      });
      setStoryboard(res.storyboard);
      setStep('review');
    } catch (err: any) {
      setError(err.message ?? 'Error al generar el storyboard');
      setStep('idle');
    }
  }

  // ── Storyboard quick-edit helpers ─────────────────────────

  function updateSegment(i: number, patch: Partial<StoryboardSegment>) {
    if (!storyboard) return;
    const segs = storyboard.segments.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    setStoryboard({ ...storyboard, segments: segs, totalDurationSeconds: segs.reduce((a, s) => a + s.durationSeconds, 0) });
  }

  // ── Step 2: render ─────────────────────────────────────────

  async function renderVideo() {
    if (!storyboard) return;
    setStep('rendering');
    setError('');
    const finalAvatarId = useCustom ? customId.trim() : avatarId;
    try {
      const res = await apiFetch<RenderResult>('/videos/avatar-scene/render', {
        method: 'POST',
        body: { avatarId: finalAvatarId, storyboard, enableMusic },
      });
      setResult(res);
      setStep('done');
    } catch (err: any) {
      setError(err.message ?? 'Error al renderizar el video');
      setStep('review');
    }
  }

  // ── Estimated credits ──────────────────────────────────────

  const credits = storyboard
    ? 15 + storyboard.segments.length * 8 + (enableMusic ? 3 : 0)
    : null;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '640px', maxHeight: '90vh',
          borderRadius: '1rem', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>🤖 Hacer Video Avatar</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              La IA convertirá el copy de este run en un video con avatar + escenas cinemáticas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }} className="space-y-4">

          {/* ─── IDLE ──────────────────────────────────────── */}
          {step === 'idle' && (
            <div className="text-center space-y-4 py-4">
              <div style={{ fontSize: '3rem' }}>🎬</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                <p>La IA analizará el copy, la intención y el tono del run para generar un storyboard coordinado:</p>
                <ul className="text-left mt-3 space-y-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <li>• Guión hablado natural (adaptado desde el copy)</li>
                  <li>• Escenas cinemáticas por segmento (Kling AI)</li>
                  <li>• Modo de composición recomendado</li>
                  <li>• Música de fondo sugerida</li>
                </ul>
              </div>
              <button onClick={generateStoryboard} className="btn-primary w-full" style={{ justifyContent: 'center' }}>
                ✨ Generar Storyboard Automático
              </button>
            </div>
          )}

          {/* ─── GENERATING ────────────────────────────────── */}
          {step === 'generating' && (
            <div className="text-center space-y-3 py-8">
              <div className="animate-spin" style={{ fontSize: '2.5rem' }}>⏳</div>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>Analizando el copy...</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                La IA está leyendo el brief, el copy y la intención del run para generar un storyboard coordinado.
              </p>
            </div>
          )}

          {/* ─── REVIEW ────────────────────────────────────── */}
          {step === 'review' && storyboard && (
            <>
              {/* Storyboard summary */}
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}>
                    {storyboard.segments.length} segmentos
                  </span>
                  <span className="chip" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: 'rgba(16,185,129,0.2)' }}>
                    {storyboard.totalDurationSeconds}s
                  </span>
                  <span className="chip" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.2)' }}>
                    🎵 {storyboard.musicStyle}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Mood: {storyboard.overallMood}
                  </span>
                </div>
              </div>

              {/* Composite mode */}
              <div>
                <label className="input-label">Modo de composición</label>
                <div className="flex gap-2">
                  {COMPOSITE_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setStoryboard({ ...storyboard, compositeMode: m.id })}
                      className={storyboard.compositeMode === m.id ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.25rem', gap: '0.2rem', height: 'auto' }}
                    >
                      <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Segments (compact editable) */}
              <div className="space-y-2">
                <label className="input-label">Segmentos del storyboard</label>
                {storyboard.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-primary-light)' }}>
                        {i + 1}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{seg.durationSeconds}s · {seg.transition}</span>
                    </div>
                    <textarea
                      value={seg.text}
                      onChange={(e) => updateSegment(i, { text: e.target.value })}
                      className="input-field"
                      rows={2}
                      style={{ fontSize: '0.8rem' }}
                      placeholder="Texto del avatar..."
                    />
                    <input
                      type="text"
                      value={seg.scenePrompt}
                      onChange={(e) => updateSegment(i, { scenePrompt: e.target.value })}
                      className="input-field"
                      style={{ fontSize: '0.75rem' }}
                      placeholder="Scene prompt (English)..."
                    />
                  </div>
                ))}
              </div>

              {/* Avatar */}
              <div>
                <label className="input-label">Avatar</label>
                {!useCustom ? (
                  <div className="grid grid-cols-3 gap-2">
                    {STOCK_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => setAvatarId(av.id)}
                        className={avatarId === av.id ? 'btn-primary' : 'btn-ghost'}
                        style={{ flexDirection: 'column', alignItems: 'center', padding: '0.6rem 0.25rem', gap: '0.2rem', height: 'auto' }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{av.emoji}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{av.name}</span>
                        <span style={{ fontSize: '0.6rem', opacity: 0.65 }}>{av.style}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="HeyGen avatar ID"
                    className="input-field"
                  />
                )}
                <button
                  onClick={() => { setUseCustom(!useCustom); setCustomId(''); }}
                  className="btn-ghost mt-2"
                  style={{ fontSize: '0.72rem' }}
                >
                  {useCustom ? '← Usar avatar stock' : '+ ID personalizado'}
                </button>
              </div>

              {/* Music toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setEnableMusic(!enableMusic)}
                  style={{
                    width: '2.5rem', height: '1.25rem', borderRadius: '9999px',
                    background: enableMusic ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '0.125rem',
                    left: enableMusic ? '1.25rem' : '0.125rem',
                    width: '1rem', height: '1rem',
                    borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                  }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                  Incluir música ({storyboard.musicStyle})
                </span>
              </label>

              {/* Credit estimate */}
              <div
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Créditos estimados</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    HeyGen 15 + Kling {storyboard.segments.length}×8{enableMusic ? ' + Música 3' : ''}
                  </div>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                  {credits}
                </span>
              </div>
            </>
          )}

          {/* ─── RENDERING ─────────────────────────────────── */}
          {step === 'rendering' && (
            <div className="text-center space-y-3 py-6">
              <div className="animate-spin" style={{ fontSize: '2.5rem' }}>⏳</div>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>Renderizando... (~3-5 min)</p>
              <div
                className="text-left rounded-lg px-4 py-3 space-y-1.5 text-xs"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-muted)' }}
              >
                <p>HeyGen: generando avatar con lip sync (fondo verde)...</p>
                <p>Kling × {storyboard?.segments.length}: generando escenas cinemáticas...</p>
                <p>FFmpeg: compositing chroma key + audio...</p>
                <p>Cloudinary: subiendo resultado...</p>
              </div>
            </div>
          )}

          {/* ─── DONE ──────────────────────────────────────── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                  <p className="font-semibold" style={{ color: '#10b981' }}>Video generado</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {result.durationSeconds}s · {result.segmentCount} segmentos
                  </p>
                </div>
              </div>

              {result.videoUrl && (
                <video
                  src={result.videoUrl}
                  controls
                  playsInline
                  style={{ width: '100%', maxHeight: '50vh', borderRadius: '0.5rem', background: '#000' }}
                />
              )}

              <div className="flex gap-2">
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                >
                  ▶ Ver en pantalla completa
                </a>
                <a
                  href="/dashboard/video-pipeline"
                  className="btn-ghost"
                  style={{ textDecoration: 'none' }}
                >
                  Ver pipeline
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {step === 'review' && (
            <>
              <button onClick={() => setStep('idle')} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                ← Regenerar
              </button>
              <button
                onClick={renderVideo}
                disabled={useCustom && !customId.trim()}
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                🎬 Renderizar Video
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="btn-ghost w-full" style={{ justifyContent: 'center' }}>
              Cerrar
            </button>
          )}
          {(step === 'idle' || step === 'generating' || step === 'rendering') && (
            <button onClick={onClose} className="btn-ghost w-full" style={{ justifyContent: 'center' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
