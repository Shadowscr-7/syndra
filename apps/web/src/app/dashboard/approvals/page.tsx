'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──

interface MediaAsset {
  id: string;
  originalUrl?: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  type?: string;
  status?: string;
}

interface ContentVersion {
  hook?: string;
  body?: string;
  caption?: string;
  mediaAssets?: MediaAsset[];
}

interface PlannedItem {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  dayOfWeek: string;
  status: string;
  createdAt: string;
  batch: {
    id: string;
    weekLabel: string;
    config?: {
      name: string;
      approvalMode: string;
      targetChannels: string[];
    };
  };
  editorialRun?: {
    id: string;
    status: string;
    contentBrief?: {
      format?: string;
      angle?: string;
      contentVersions?: ContentVersion[];
    };
  };
}

type ModalType =
  | null
  | { type: 'edit-text'; itemId: string; currentText: string }
  | { type: 'change-tone'; itemId: string }
  | { type: 'change-format'; itemId: string; currentFormat?: string }
  | { type: 'regenerate-image'; itemId: string }
  | { type: 'regenerate-image-pro'; itemId: string }
  | { type: 'replace-image'; itemId: string }
  | { type: 'convert-video'; itemId: string }
  | { type: 'detail'; item: PlannedItem }
  | { type: 'confirm'; title: string; message: string; icon: string; confirmLabel: string; confirmColor: string; onConfirm: () => void };

const DAYS: Record<string, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  GENERATING:       { label: 'Generando...',        color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  GENERATING_MUSIC: { label: 'Generando música...', color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' },
  PENDING_REVIEW:   { label: 'Pendiente',           color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  APPROVED:       { label: 'Aprobado',      color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30' },
  MODIFIED:       { label: 'Modificado',    color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  REJECTED:       { label: 'Rechazado',     color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  PUBLISHING:     { label: 'Publicando...', color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30' },
  PUBLISHED:      { label: 'Publicado',     color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  FAILED:         { label: 'Error',         color: 'text-red-500',    bg: 'bg-red-500/15 border-red-500/30' },
};

const TONES = [
  { value: 'profesional', label: 'Profesional', icon: '👔' },
  { value: 'casual', label: 'Casual', icon: '😊' },
  { value: 'humoristico', label: 'Humorístico', icon: '😄' },
  { value: 'inspirador', label: 'Inspirador', icon: '✨' },
  { value: 'educativo', label: 'Educativo', icon: '📚' },
  { value: 'provocador', label: 'Provocador', icon: '🔥' },
];

const FORMAT_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  POST: { icon: '📷', label: 'Post', color: '#3b82f6' },
  CAROUSEL: { icon: '🎠', label: 'Carousel', color: '#a855f7' },
  REEL: { icon: '🎬', label: 'Reel', color: '#ec4899' },
  STORY: { icon: '📱', label: 'Story', color: '#f59e0b' },
  THREAD: { icon: '🧵', label: 'Thread', color: '#06b6d4' },
};

// ══════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════

export default function ApprovalsPage() {
  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);

  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === 'pending' ? '?status=pending' : '';
      const res = await fetch(`/api/weekly-planner/approvals${qs}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast('err', 'Error al cargar aprobaciones');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Auto-refresh when there are pending video/audio assets
  useEffect(() => {
    const hasPendingMedia = items.some(item => {
      const assets = item.editorialRun?.contentBrief?.contentVersions?.[0]?.mediaAssets ?? [];
      return assets.some((a: any) => (a.type === 'VIDEO' || a.type === 'AVATAR_VIDEO' || a.type === 'AUDIO') && a.status === 'PENDING');
    });
    if (!hasPendingMedia) return;
    const interval = setInterval(fetchItems, 15_000);
    return () => clearInterval(interval);
  }, [items, fetchItems]);

  // ── Action helpers ──

  const doAction = async (itemId: string, action: string, body?: any) => {
    setActionLoading(itemId);
    try {
      const res = await fetch(`/api/weekly-planner/items/${itemId}/${action}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error');
      }
      return await res.json();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      await doAction(itemId, 'approve');
      toast('ok', 'Publicación aprobada');
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleReject = (itemId: string) => {
    setModal({
      type: 'confirm',
      title: '❌ Rechazar publicación',
      message: '¿Estás seguro de que deseas rechazar esta publicación? Esta acción no se puede deshacer.',
      icon: '🗑️',
      confirmLabel: 'Sí, rechazar',
      confirmColor: 'red',
      onConfirm: async () => {
        setModal(null);
        try {
          await doAction(itemId, 'reject');
          toast('ok', 'Publicación rechazada');
          await fetchItems();
        } catch (e: any) { toast('err', e.message); }
      },
    });
  };

  const handleRewrite = async (itemId: string) => {
    try {
      await doAction(itemId, 'rewrite');
      toast('ok', 'Texto regenerado — se creó una nueva versión');
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleEditText = async (itemId: string, feedback: string) => {
    try {
      await doAction(itemId, 'edit-text', { feedback });
      toast('ok', 'Texto corregido');
      setModal(null);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleChangeTone = async (itemId: string, tone: string) => {
    try {
      await doAction(itemId, 'change-tone', { tone });
      toast('ok', `Tono cambiado a "${tone}"`);
      setModal(null);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleRegenerateImage = async (itemId: string, customPrompt?: string) => {
    // Close modal immediately and fire in background
    setModal(null);
    toast('ok', '🖼️ Regenerando imagen... esto puede tardar unos segundos');
    try {
      await doAction(itemId, 'regenerate-image', { customPrompt });
      toast('ok', customPrompt ? 'Imagen regenerada con prompt personalizado' : 'Imagen regenerada');
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
    // Delayed refresh to catch async updates
    setTimeout(() => fetchItems(), 5000);
  };

  const handleRegenerateImagePro = async (itemId: string, customPrompt?: string, model?: string) => {
    setModal(null);
    const modelLabel = model ? (model.includes('/') ? model.split('/').pop() : model) : 'Ideogram V3';
    toast('ok', `⚡ Regeneración Pro (${modelLabel})... puede tardar unos segundos`);
    try {
      const body: Record<string, string> = {};
      if (customPrompt) body.customPrompt = customPrompt;
      if (model) body.model = model;
      await doAction(itemId, 'regenerate-image-pro', body);
      toast('ok', `Imagen Pro regenerada con ${modelLabel}`);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
    setTimeout(() => fetchItems(), 5000);
  };

  const handleChangeFormat = async (itemId: string, format: string) => {
    try {
      await doAction(itemId, 'change-format', { format });
      toast('ok', `Formato cambiado a ${format}`);
      setModal(null);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleReplaceImage = async (itemId: string, imageUrl: string) => {
    try {
      await doAction(itemId, 'replace-image', { imageUrl });
      toast('ok', 'Imagen reemplazada');
      setModal(null);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleConvertVideo = async (itemId: string, videoType?: string, slideCount?: number, voiceGender?: 'female' | 'male') => {
    if (!videoType) {
      setModal({ type: 'convert-video', itemId });
      return;
    }
    try {
      const body: any = { type: videoType };
      if (slideCount) body.slideCount = slideCount;
      if (voiceGender) body.voiceGender = voiceGender;
      await doAction(itemId, 'convert-video', body);
      const toastMessages: Record<string, string> = {
        'slides': `🎞️ Generando video con ${slideCount ?? 1} slides...`,
        'remotion-reel': '🎬 Generando Reel Remotion con voz IA... puede tardar unos minutos',
        'video': '🎬 Video IA en generación...',
        'avatar': '🧑‍💼 Video con avatar en generación...',
      };
      toast('ok', toastMessages[videoType] ?? 'Video en proceso de generación');
      setModal(null);
      await fetchItems();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleRedo = (itemId: string) => {
    setModal({
      type: 'confirm',
      title: '♻️ Rehacer publicación',
      message: '¿Rehacer esta publicación desde cero? Se regenerará todo el contenido (texto, imagen, estrategia).',
      icon: '♻️',
      confirmLabel: 'Sí, rehacer todo',
      confirmColor: 'amber',
      onConfirm: async () => {
        setModal(null);
        try {
          await doAction(itemId, 'redo');
          toast('ok', 'Publicación reenviada para regeneración completa');
          await fetchItems();
        } catch (e: any) { toast('err', e.message); }
      },
    });
  };

  const handleApproveAll = () => {
    const pending = items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'MODIFIED');
    if (pending.length === 0) return;
    setModal({
      type: 'confirm',
      title: '✅ Aprobar todas',
      message: `¿Aprobar las ${pending.length} publicaciones pendientes? Se programarán para su publicación automática.`,
      icon: '✅',
      confirmLabel: `Aprobar ${pending.length} publicaciones`,
      confirmColor: 'green',
      onConfirm: async () => {
        setModal(null);
        setActionLoading('all');
        try {
          for (const item of pending) {
            await doAction(item.id, 'approve');
          }
          toast('ok', `${pending.length} publicaciones aprobadas`);
          await fetchItems();
        } catch (e: any) { toast('err', e.message); }
        finally { setActionLoading(null); }
      },
    });
  };

  const pendingCount = items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'MODIFIED').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-fade-in ${
          toastMsg.type === 'ok' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>{toastMsg.text}</div>
      )}

      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">✅ Aprobaciones</h1>
        <p className="page-subtitle">Revisa, edita y aprueba las publicaciones generadas por el planificador semanal y las corridas editoriales.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pendientes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{items.filter(i => i.status === 'APPROVED' || i.status === 'PUBLISHED').length}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Aprobadas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{items.length}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total</p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between animate-fade-in-delay-1">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(100,116,139,0.1)' }}>
          <button
            onClick={() => setFilter('pending')}
            className="py-2 px-4 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: filter === 'pending' ? 'rgba(249,115,22,0.2)' : 'transparent',
              color: filter === 'pending' ? '#f97316' : 'var(--color-text-muted)',
              border: filter === 'pending' ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
            }}
          >
            🔔 Pendientes
          </button>
          <button
            onClick={() => setFilter('all')}
            className="py-2 px-4 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: filter === 'all' ? 'rgba(124,58,237,0.2)' : 'transparent',
              color: filter === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: filter === 'all' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
            }}
          >
            📋 Todas
          </button>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={actionLoading === 'all'}
            className="btn-primary text-sm"
          >
            {actionLoading === 'all' ? '⏳ Aprobando...' : `✅ Aprobar todas (${pendingCount})`}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in-delay-2">
          <p className="text-4xl mb-3">{filter === 'pending' ? '🎉' : '📭'}</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {filter === 'pending' ? 'No hay publicaciones pendientes de aprobación' : 'No hay publicaciones aún'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {filter === 'pending'
              ? 'Todas las publicaciones están al día. Las nuevas aparecerán aquí cuando se genere contenido.'
              : 'Las publicaciones del planificador semanal y las corridas editoriales aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-delay-2">
          {items.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              loading={actionLoading === item.id}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onRewrite={() => handleRewrite(item.id)}
              onEditText={() => {
                const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
                const text = [version?.hook, version?.body, version?.caption].filter(Boolean).join('\n\n');
                setModal({ type: 'edit-text', itemId: item.id, currentText: text });
              }}
              onChangeTone={() => setModal({ type: 'change-tone', itemId: item.id })}
              onRegenerateImage={() => setModal({ type: 'regenerate-image', itemId: item.id })}
              onRegenerateImagePro={() => setModal({ type: 'regenerate-image-pro', itemId: item.id })}
              onReplaceImage={() => setModal({ type: 'replace-image', itemId: item.id })}
              onChangeFormat={() => setModal({ type: 'change-format', itemId: item.id, currentFormat: item.editorialRun?.contentBrief?.format?.toUpperCase() })}
              onConvertVideo={() => handleConvertVideo(item.id)}
              onRedo={() => handleRedo(item.id)}
              onDetail={() => setModal({ type: 'detail', item })}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal?.type === 'edit-text' && (
        <EditTextModal
          currentText={modal.currentText}
          loading={actionLoading === modal.itemId}
          onSave={(feedback) => handleEditText(modal.itemId, feedback)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'change-tone' && (
        <ChangeToneModal
          loading={actionLoading === modal.itemId}
          onSelect={(tone) => handleChangeTone(modal.itemId, tone)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'regenerate-image' && (
        <RegenerateImageModal
          loading={actionLoading === modal.itemId}
          onGenerate={(prompt) => handleRegenerateImage(modal.itemId, prompt)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'regenerate-image-pro' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>⚡ Regeneración Pro — Elegir modelo</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Seleccioná el modelo de IA para generar la imagen.</p>

            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 text-amber-400">🌟 KIE Premium</p>
              <div className="space-y-2">
                {([
                  { id: 'ideogram/v3-text-to-image', name: 'Ideogram V3', desc: 'El mejor para texto legible dentro de imágenes', credits: 4, recommended: true, badge: '⭐ Recomendado para texto' },
                  { id: 'gpt-image/4o-text-to-image', name: 'OpenAI 4o Image', desc: 'GPT-4o nativo. Excelente texto en imágenes', credits: 5, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'gpt-image/1.5-text-to-image', name: 'GPT Image 1.5', desc: 'OpenAI. Alta calidad fotorrealista, buen manejo de texto', credits: 5, recommended: false, badge: '' },
                  { id: 'google/imagen-4', name: 'Google Imagen 4', desc: 'Fotorrealismo de última generación con texto legible', credits: 5, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'qwen/2.0-text-to-image', name: 'Qwen Image 2.0', desc: 'Alibaba. Mejor calidad, excelente texto y detalles', credits: 3, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'flux-2/pro-text-to-image', name: 'Flux-2 Pro', desc: 'Fotorrealismo de alta gama', credits: 4, recommended: false, badge: '' },
                  { id: 'flux/kontext-text-to-image', name: 'Flux Kontext', desc: 'Black Forest Labs. Contexto visual avanzado', credits: 4, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'google/nano-banana-2', name: 'Nano Banana 2', desc: 'Google. Rápido y económico', credits: 2, recommended: false, badge: '💰 Económico' },
                  { id: 'bytedance/seedream', name: 'Seedream 4.5', desc: 'ByteDance. Buena calidad a menor costo', credits: 3, recommended: false, badge: '' },
                  { id: 'grok-imagine/text-to-image', name: 'Grok Imagine', desc: 'xAI. Estilo cinematográfico y artístico', credits: 4, recommended: false, badge: '' },
                  { id: 'qwen/text-to-image', name: 'Qwen', desc: 'Alibaba. Rápido y accesible', credits: 3, recommended: false, badge: '' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleRegenerateImagePro(modal.itemId, undefined, m.id)}
                    disabled={!!actionLoading}
                    className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                    style={{ background: m.recommended ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)', borderColor: m.recommended ? 'rgba(245, 158, 11, 0.3)' : 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{m.credits} créditos</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</p>
                    {m.badge && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{m.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 text-violet-400">⚡ Replicate</p>
              <div className="space-y-2">
                {([
                  { id: 'replicate/flux-dev', name: 'Flux Dev', desc: 'Open-source de alta calidad', credits: 2 },
                  { id: 'replicate/recraft-v3', name: 'Recraft V3', desc: 'Diseño gráfico y estilos vectoriales', credits: 3 },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleRegenerateImagePro(modal.itemId, undefined, m.id)}
                    disabled={!!actionLoading}
                    className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{m.credits} créditos</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 text-emerald-400">🆓 Estándar</p>
              <button
                onClick={() => handleRegenerateImagePro(modal.itemId, undefined, 'standard')}
                disabled={!!actionLoading}
                className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Estándar (Gratis)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>0 créditos</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Pollinations / HuggingFace FLUX. Sin costo.</p>
              </button>
            </div>
          </div>
        </div>
      )}
      {modal?.type === 'change-format' && (
        <ChangeFormatModal
          currentFormat={modal.currentFormat}
          loading={actionLoading === modal.itemId}
          onSelect={(format) => handleChangeFormat(modal.itemId, format)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'replace-image' && (
        <ReplaceImageModal
          loading={actionLoading === modal.itemId}
          onReplace={(url) => handleReplaceImage(modal.itemId, url)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'convert-video' && (
        <VideoTypeModal
          loading={!!actionLoading}
          onSelect={(videoType, slideCount, voiceGender) => handleConvertVideo(modal.itemId, videoType, slideCount, voiceGender)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'detail' && (
        <DetailModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          icon={modal.icon}
          confirmLabel={modal.confirmLabel}
          confirmColor={modal.confirmColor}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Approval Card
// ══════════════════════════════════════════════════════════

function ApprovalCard({
  item,
  loading,
  onApprove,
  onReject,
  onRewrite,
  onEditText,
  onChangeTone,
  onRegenerateImage,
  onRegenerateImagePro,
  onReplaceImage,
  onChangeFormat,
  onConvertVideo,
  onRedo,
  onDetail,
}: {
  item: PlannedItem;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRewrite: () => void;
  onEditText: () => void;
  onChangeTone: () => void;
  onRegenerateImage: () => void;
  onRegenerateImagePro: () => void;
  onReplaceImage: () => void;
  onChangeFormat: () => void;
  onConvertVideo: () => void;
  onRedo: () => void;
  onDetail: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const st = STATUS_LABELS[item.status] ?? { label: item.status, color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/30' };
  const dayLabel = DAYS[item.dayOfWeek] ?? item.dayOfWeek;
  const dateStr = new Date(item.scheduledDate).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
  const hook = version?.hook;
  const caption = version?.caption;
  const body = version?.body;
  const readyAssets = version?.mediaAssets?.filter((a: any) => a.status === 'READY') ?? [];
  const allImages = readyAssets.filter((a: any) => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
  const mainImage = allImages[0] ?? version?.mediaAssets?.find((a: any) => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
  const mediaUrl = mainImage?.optimizedUrl || mainImage?.originalUrl || mainImage?.thumbnailUrl;
  // Show the LATEST ready video (last in array = most recent)
  const readyVideos = readyAssets.filter((a: any) => a.type === 'VIDEO' || a.type === 'AVATAR_VIDEO');
  const videoAsset = readyVideos.length > 0 ? readyVideos[readyVideos.length - 1] : undefined;
  const videoUrl = videoAsset?.optimizedUrl || videoAsset?.originalUrl;
  // Check if there's a video being generated (PENDING status)
  const pendingVideo = version?.mediaAssets?.find((a: any) => (a.type === 'VIDEO' || a.type === 'AVATAR_VIDEO') && a.status === 'PENDING');
  const isRemotionReel = (pendingVideo?.metadata as any)?.videoType === 'remotion-reel';
  const isPending = item.status === 'PENDING_REVIEW' || item.status === 'MODIFIED';
  const canEdit = isPending;
  const configName = item.batch?.config?.name ?? 'Planificador';
  const channels = item.batch?.config?.targetChannels ?? [];
  const format = item.editorialRun?.contentBrief?.format?.toUpperCase();
  const fmtInfo = format ? FORMAT_ICONS[format] : null;

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 rounded-2xl opacity-40 pointer-events-none" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black/60 border border-violet-500/30">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            <span className="text-sm" style={{ color: 'var(--color-primary)' }}>Procesando...</span>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              📌 {dayLabel} {dateStr}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>⏰ {item.scheduledTime}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
            {fmtInfo && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                backgroundColor: `${fmtInfo.color}15`,
                color: fmtInfo.color,
                border: `1px solid ${fmtInfo.color}40`,
              }}>
                {fmtInfo.icon} {fmtInfo.label}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10" style={{ color: 'var(--color-text-muted)' }}>
              {configName}
            </span>
            {channels.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {channels.join(' • ')}
              </span>
            )}
          </div>

          <button
            onClick={onDetail}
            className="text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            👁️ Ver detalle
          </button>
        </div>

        {/* Content preview */}
        <div className="flex gap-4 mb-4">
          {videoUrl ? (
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
              <video src={videoUrl} className="w-full h-full object-cover" muted playsInline loop
                onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; const img = (e.target as HTMLVideoElement).nextElementSibling as HTMLElement; if (img) img.style.display = 'block'; }}
              />
              {mediaUrl && <img src={mediaUrl} alt="" className="w-full h-full object-cover absolute inset-0" style={{ display: 'none' }} />}
              <span className="absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/70 text-white">🎬</span>
            </div>
          ) : mediaUrl ? (
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
              <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              {allImages.length > 1 && (
                <span className="absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/70 text-white">🎠 {allImages.length}</span>
              )}
            </div>
          ) : null}
          {!videoUrl && !mediaUrl && null}
          {pendingVideo && (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mb-1 ${
              isRemotionReel
                ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              <div className={`animate-spin rounded-full h-3 w-3 border border-t-transparent ${isRemotionReel ? 'border-orange-400' : 'border-amber-400'}`} />
              {isRemotionReel ? '🎬 Reel Remotion renderizando... (puede tardar unos minutos)' : '🎬 Video IA en generación...'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {hook && (
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{hook}</p>
            )}
            {(body || caption) && (
              <p className="text-xs line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
                {body || caption}
              </p>
            )}
            {!hook && !body && !caption && (
              <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                {item.status === 'GENERATING' || item.status === 'GENERATING_MUSIC' ? (item.status === 'GENERATING_MUSIC' ? 'Generando música...' : 'Contenido en generación...') : 'Sin contenido disponible'}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="space-y-2">
            {/* Primary actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={onApprove} disabled={loading} className="px-4 py-2 rounded-xl text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors">
                ✅ Aprobar
              </button>
              <button onClick={onReject} disabled={loading} className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                ❌ Rechazar
              </button>

              <button
                onClick={() => setShowActions(!showActions)}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{
                  backgroundColor: showActions ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  color: showActions ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: showActions ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                ⚡ {showActions ? 'Ocultar acciones' : 'Más acciones'}
              </button>
            </div>

            {/* Extended actions */}
            {showActions && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
                <ActionButton icon="✏️" label="Editar texto" onClick={onEditText} disabled={loading} color="blue" />
                <ActionButton icon="🔄" label="Redactar de nuevo" onClick={onRewrite} disabled={loading} color="cyan" />
                <ActionButton icon="🎭" label="Cambiar tono" onClick={onChangeTone} disabled={loading} color="purple" />
                <ActionButton icon="🖼️" label="Regenerar imagen" onClick={onRegenerateImage} disabled={loading} color="amber" />
                <ActionButton icon="⚡" label="Regeneración Pro" onClick={onRegenerateImagePro} disabled={loading} color="yellow" />
                <ActionButton icon="�" label="Cambiar formato" onClick={onChangeFormat} disabled={loading} color="cyan" />
                <ActionButton icon="�📤" label="Subir imagen" onClick={onReplaceImage} disabled={loading} color="emerald" />
                <ActionButton icon="🎬" label="Convertir a video" onClick={onConvertVideo} disabled={loading} color="pink" />
                <ActionButton icon="♻️" label="Rehacer todo" onClick={onRedo} disabled={loading} color="red" />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>Semana {item.batch?.weekLabel}</span>
          <span>•</span>
          <span>Creado {new Date(item.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </div>
  );
}

// ── Action Button ──

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  blue:    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', text: '#3b82f6' },
  cyan:    { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',  text: '#06b6d4' },
  purple:  { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.25)', text: '#a855f7' },
  amber:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  emerald: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', text: '#10b981' },
  pink:    { bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.25)', text: '#ec4899' },
  red:     { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  text: '#ef4444' },
};

function ActionButton({ icon, label, onClick, disabled, color }: {
  icon: string; label: string; onClick: () => void; disabled: boolean; color: string;
}) {
  const c = colorMap[color] ?? colorMap.blue!;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════
// Modals
// ══════════════════════════════════════════════════════════

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title">{title}</h3>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Edit Text Modal ──

function EditTextModal({ currentText, loading, onSave, onClose }: {
  currentText: string; loading: boolean; onSave: (feedback: string) => void; onClose: () => void;
}) {
  const [feedback, setFeedback] = useState('');

  return (
    <ModalWrapper title="✏️ Editar texto" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="input-label">Texto actual</label>
          <div className="rounded-xl p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {currentText || '(sin texto)'}
          </div>
        </div>
        <div>
          <label className="input-label">Instrucciones de corrección</label>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Describe los cambios que quieres. La IA generará una nueva versión del texto aplicando tus instrucciones.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ej: Hazlo más corto, cambia el CTA a 'Descubrí más', quita los emojis..."
            className="input-field text-sm w-full"
            rows={4}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onSave(feedback)}
            disabled={!feedback.trim() || loading}
            className="btn-primary text-sm flex-1"
          >
            {loading ? '⏳ Corrigiendo...' : '✏️ Aplicar corrección'}
          </button>
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ── Change Tone Modal ──

function ChangeToneModal({ loading, onSelect, onClose }: {
  loading: boolean; onSelect: (tone: string) => void; onClose: () => void;
}) {
  return (
    <ModalWrapper title="🎭 Cambiar tono" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Selecciona el nuevo tono. La IA regenerará el texto manteniendo el mensaje pero adaptando el estilo.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            onClick={() => onSelect(tone.value)}
            disabled={loading}
            className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{tone.icon}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{tone.label}</span>
            </div>
          </button>
        ))}
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 mt-4 py-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--color-primary)' }}>Cambiando tono...</span>
        </div>
      )}
    </ModalWrapper>
  );
}

// ── Change Format Modal ──

const FORMATS = [
  { value: 'POST', icon: '📷', label: 'Post', desc: 'Publicación estática con imagen' },
  { value: 'CAROUSEL', icon: '🎠', label: 'Carousel', desc: 'Varias imágenes deslizables' },
  { value: 'REEL', icon: '🎬', label: 'Reel', desc: 'Video corto vertical' },
  { value: 'STORY', icon: '📱', label: 'Story', desc: 'Contenido efímero 24h' },
  { value: 'THREAD', icon: '🧵', label: 'Thread', desc: 'Hilo de texto largo' },
];

function ChangeFormatModal({ currentFormat, loading, onSelect, onClose }: {
  currentFormat?: string; loading: boolean; onSelect: (format: string) => void; onClose: () => void;
}) {
  return (
    <ModalWrapper title="📰 Cambiar formato" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Selecciona el nuevo formato de publicación.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FORMATS.map((fmt) => {
          const isCurrent = currentFormat === fmt.value;
          return (
            <button
              key={fmt.value}
              onClick={() => onSelect(fmt.value)}
              disabled={loading || isCurrent}
              className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{
                backgroundColor: isCurrent ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isCurrent ? 'rgba(6,182,212,0.4)' : 'var(--color-border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{fmt.icon}</span>
                <span className="text-sm font-medium" style={{ color: isCurrent ? '#06b6d4' : 'var(--color-text)' }}>
                  {fmt.label}
                  {isCurrent && <span className="text-xs ml-1 opacity-60">(actual)</span>}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmt.desc}</p>
            </button>
          );
        })}
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 mt-4 py-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--color-primary)' }}>Cambiando formato...</span>
        </div>
      )}
    </ModalWrapper>
  );
}

// ── Regenerate Image Modal ──

function RegenerateImageModal({ loading, onGenerate, onClose, title, description }: {
  loading: boolean; onGenerate: (prompt?: string) => void; onClose: () => void;
  title?: string; description?: string;
}) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  return (
    <ModalWrapper title={title ?? "🖼️ Regenerar imagen"} onClose={onClose}>
      {description && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUseCustom(false)}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: !useCustom ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${!useCustom ? 'rgba(6,182,212,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔄</span>
              <span className="text-sm font-medium" style={{ color: !useCustom ? '#06b6d4' : 'var(--color-text)' }}>Automático</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Regenerar con el prompt original (nueva variante).
            </p>
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: useCustom ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${useCustom ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎨</span>
              <span className="text-sm font-medium" style={{ color: useCustom ? '#f59e0b' : 'var(--color-text)' }}>Prompt personalizado</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Describe exactamente la imagen que quieres generar.
            </p>
          </button>
        </div>

        {useCustom && (
          <div>
            <label className="input-label">Describe la imagen</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Una foto minimalista de un café con espuma de arte latte, fondo mármol blanco, luz natural suave..."
              className="input-field text-sm w-full"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => onGenerate(useCustom ? customPrompt : undefined)}
            disabled={loading || (useCustom && !customPrompt.trim())}
            className="btn-primary text-sm flex-1"
          >
            {loading ? '⏳ Generando...' : '🖼️ Generar imagen'}
          </button>
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ── Replace Image Modal ──

interface LibraryItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  productName?: string;
  mimeType?: string;
}

function ReplaceImageModal({ loading, onReplace, onClose }: {
  loading: boolean; onReplace: (url: string) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<'upload' | 'library' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (libraryLoaded) return;
    setLibraryLoading(true);
    try {
      const res = await fetch('/api/user-media?limit=50');
      const json = await res.json();
      const items: LibraryItem[] = Array.isArray(json.data)
        ? json.data
        : (json.data?.items ?? json.items ?? []);
      setLibraryItems(items.filter((m: LibraryItem) => m.mimeType?.startsWith('image/')));
    } catch {
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
      setLibraryLoaded(true);
    }
  }, [libraryLoaded]);

  useEffect(() => {
    if (tab === 'library' && !libraryLoaded) loadLibrary();
  }, [tab, libraryLoaded, loadLibrary]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/user-media/file', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al subir');
      const url = json.data?.url || json.data?.thumbnailUrl;
      if (url) setImageUrl(url);
    } catch (err: any) {
      setPreview(null);
      alert(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const effectiveUrl = tab === 'library' ? (selectedLibraryUrl || '') : imageUrl;

  const tabs = [
    { key: 'upload' as const, icon: '📁', label: 'Subir archivo' },
    { key: 'library' as const, icon: '🖼️', label: 'Mis imágenes' },
    { key: 'url' as const, icon: '🔗', label: 'Pegar URL' },
  ];

  return (
    <ModalWrapper title="📤 Reemplazar imagen" onClose={onClose}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(100,116,139,0.1)' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: tab === t.key ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: tab === t.key ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Upload */}
        {tab === 'upload' && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-violet-500/50"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              {preview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={preview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click para cambiar</span>
                </div>
              ) : uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Subiendo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📁</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Click para seleccionar imagen</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG, WebP — máx. 50MB</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab: Library */}
        {tab === 'library' && (
          <div className="rounded-xl p-3 max-h-64 overflow-y-auto" style={{ border: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            {libraryLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cargando biblioteca...</span>
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No hay imágenes en tu biblioteca. Sube imágenes desde la sección de medios.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {libraryItems.map((item) => {
                  const isSelected = selectedLibraryUrl === (item.url || item.thumbnailUrl);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedLibraryUrl(item.url || item.thumbnailUrl || '')}
                      className="relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-[1.03]"
                      style={{
                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                        boxShadow: isSelected ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
                      }}
                    >
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.productName || item.fileName || ''}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.3)' }}>
                          <span className="text-white text-xl font-bold">✓</span>
                        </div>
                      )}
                      {item.productName && (
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 truncate" style={{ backgroundColor: 'rgba(0,0,0,0.6)', fontSize: '9px', color: 'white' }}>
                          {item.productName}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: URL */}
        {tab === 'url' && (
          <div>
            <label className="input-label">Pega la URL de la imagen</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="input-field text-sm w-full"
            />
            {imageUrl && (
              <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <img src={imageUrl} alt="Preview" className="w-full max-h-40 object-contain" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => onReplace(effectiveUrl)}
            disabled={!effectiveUrl.trim() || loading || uploading}
            className="btn-primary text-sm flex-1"
          >
            {loading ? '⏳ Reemplazando...' : '📤 Usar esta imagen'}
          </button>
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ── Detail Modal ──

function DetailModal({ item, onClose }: { item: PlannedItem; onClose: () => void }) {
  const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
  const st = STATUS_LABELS[item.status] ?? { label: item.status, color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/30' };
  const dayLabel = DAYS[item.dayOfWeek] ?? item.dayOfWeek;
  const dateStr = new Date(item.scheduledDate).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const format = item.editorialRun?.contentBrief?.format?.toUpperCase();
  const fmtInfo = format ? FORMAT_ICONS[format] : null;

  return (
    <ModalWrapper title="👁️ Detalle de publicación" onClose={onClose}>
      <div className="space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
          {fmtInfo && (
            <span className="text-xs px-2 py-1 rounded-full" style={{
              backgroundColor: `${fmtInfo.color}15`,
              color: fmtInfo.color,
              border: `1px solid ${fmtInfo.color}40`,
            }}>
              {fmtInfo.icon} {fmtInfo.label}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10" style={{ color: 'var(--color-text-muted)' }}>
            {dayLabel} — {dateStr}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10" style={{ color: 'var(--color-text-muted)' }}>
            ⏰ {item.scheduledTime}
          </span>
        </div>

        {/* Media (Video or Image) */}
        {(() => {
          const readyMedia = version?.mediaAssets?.filter((a: any) => a.status === 'READY') ?? [];
          const readyVids = readyMedia.filter((a: any) => a.type === 'VIDEO' || a.type === 'AVATAR_VIDEO');
          const vidAsset = readyVids.length > 0 ? readyVids[readyVids.length - 1] : undefined;
          const vidUrl = vidAsset?.optimizedUrl || vidAsset?.originalUrl;
          const allImgs = readyMedia.filter((a: any) => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
          const imgUrl = allImgs[0]?.optimizedUrl || allImgs[0]?.originalUrl;

          if (vidUrl) {
            return (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <video src={vidUrl} controls className="w-full max-h-64 object-contain" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                  onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; const next = (e.target as HTMLVideoElement).nextElementSibling as HTMLElement; if (next) next.style.display = 'block'; }}
                />
                {imgUrl && <img src={imgUrl} alt="" className="w-full max-h-64 object-contain" style={{ display: 'none', backgroundColor: 'rgba(0,0,0,0.3)' }} />}
              </div>
            );
          }
          if (allImgs.length > 1) {
            return (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImgs.map((a: any, idx: number) => (
                  <img key={a.id} src={a.optimizedUrl || a.originalUrl || ''}
                    alt={`Slide ${idx + 1}`}
                    className="w-48 h-48 rounded-xl object-cover flex-shrink-0"
                    style={{ border: '1px solid var(--color-border)' }}
                  />
                ))}
              </div>
            );
          }
          return imgUrl ? (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <img src={imgUrl} alt="" className="w-full max-h-64 object-contain" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
            </div>
          ) : null;
        })()}

        {/* Text */}
        {version?.hook && (
          <div>
            <label className="input-label">Hook</label>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{version.hook}</p>
          </div>
        )}
        {version?.body && (
          <div>
            <label className="input-label">Cuerpo</label>
            <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{version.body}</p>
          </div>
        )}
        {version?.caption && (
          <div>
            <label className="input-label">Caption</label>
            <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{version.caption}</p>
          </div>
        )}

        {/* Info */}
        <div className="pt-3 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <p>Semana: {item.batch?.weekLabel}</p>
          <p>Planificador: {item.batch?.config?.name ?? '—'}</p>
          <p>Formato: {fmtInfo ? `${fmtInfo.icon} ${fmtInfo.label}` : '—'}</p>
          <p>Canales: {item.batch?.config?.targetChannels?.join(', ') ?? '—'}</p>
          <p>Creado: {new Date(item.createdAt).toLocaleString('es')}</p>
        </div>

        <button onClick={onClose} className="btn-ghost text-sm w-full">Cerrar</button>
      </div>
    </ModalWrapper>
  );
}

// ── Confirm Modal ──

const confirmColorMap: Record<string, { bg: string; border: string; hoverBg: string; text: string }> = {
  red:    { bg: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.4)',   hoverBg: 'rgba(239,68,68,0.3)',   text: '#ef4444' },
  green:  { bg: 'rgba(34,197,94,0.2)',   border: 'rgba(34,197,94,0.4)',   hoverBg: 'rgba(34,197,94,0.3)',   text: '#22c55e' },
  amber:  { bg: 'rgba(245,158,11,0.2)',  border: 'rgba(245,158,11,0.4)',  hoverBg: 'rgba(245,158,11,0.3)',  text: '#f59e0b' },
  purple: { bg: 'rgba(168,85,247,0.2)',  border: 'rgba(168,85,247,0.4)',  hoverBg: 'rgba(168,85,247,0.3)',  text: '#a855f7' },
};

function ConfirmModal({ title, message, icon, confirmLabel, confirmColor, onConfirm, onClose }: {
  title: string; message: string; icon: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onClose: () => void;
}) {
  const c = confirmColorMap[confirmColor] ?? confirmColorMap.red!;

  return (
    <ModalWrapper title={title} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center py-2">
          <span className="text-5xl mb-4">{icon}</span>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
            }}
          >
            {confirmLabel}
          </button>
          <button onClick={onClose} className="btn-ghost text-sm flex-1">
            Cancelar
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ── Video Type Selector Modal ──

type VideoStep = 'type' | 'slideCount' | 'remotion-voice';

interface VideoTypeOption {
  type: string;
  icon: string;
  label: string;
  description: string;
  credits: number;
  color: string;
  disabled?: boolean;
  badge?: string;
}

const VIDEO_TYPE_OPTIONS: VideoTypeOption[] = [
  {
    type: 'remotion-reel',
    icon: '🎬',
    label: 'Reel Profesional (sin avatar)',
    description: 'Reel animado con Ken Burns, subtítulos dinámicos, voz IA argentina y colores de tu marca. Gratis.',
    credits: 0,
    color: '#f97316',
    badge: '⭐ Recomendado',
  },
  {
    type: 'slides',
    icon: '🎞️',
    label: 'Video con Slides',
    description: 'Slideshow simple con tus imágenes + narración de voz. Renderizado local con FFmpeg.',
    credits: 0,
    color: '#06b6d4',
  },
  {
    type: 'video',
    icon: '🤖',
    label: 'Video IA (Kling)',
    description: 'Video generado por IA desde el contenido. Escenas cinemáticas generadas por Kling 2.6.',
    credits: 15,
    color: '#8b5cf6',
  },
  {
    type: 'avatar',
    icon: '🧑‍💼',
    label: 'Con Avatar (próximamente)',
    description: 'Avatar parlante con narración de voz IA. Perfecto para explicaciones y tutoriales.',
    credits: 25,
    color: '#f59e0b',
    disabled: true,
  },
];

function VideoTypeModal({ loading, onSelect, onClose }: {
  loading: boolean; onSelect: (type: string, slideCount?: number, voiceGender?: 'female' | 'male') => void; onClose: () => void;
}) {
  const [step, setStep] = useState<VideoStep>('type');
  const [slideCount, setSlideCount] = useState(3);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');

  // ── Step: Remotion voice selection ──
  if (step === 'remotion-voice') {
    return (
      <ModalWrapper title="🎙️ Voz para el Reel" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Elegí la voz de narración para el reel. Ambas voces son argentinas (Microsoft Edge TTS).
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'female' as const, icon: '👩', name: 'Elena', desc: 'Voz femenina argentina · Elena Neural', color: '#ec4899' },
              { value: 'male' as const, icon: '👨', name: 'Tomás', desc: 'Voz masculina argentina · Tomás Neural', color: '#3b82f6' },
            ]).map((v) => (
              <button
                key={v.value}
                onClick={() => setVoiceGender(v.value)}
                className="p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: voiceGender === v.value ? `${v.color}15` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${voiceGender === v.value ? v.color : 'var(--color-border)'}`,
                }}
              >
                <div className="text-2xl mb-2">{v.icon}</div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: voiceGender === v.value ? v.color : 'var(--color-text)' }}>{v.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{v.desc}</div>
              </button>
            ))}
          </div>
          <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: 'var(--color-text-muted)' }}>
            💡 El reel usará automáticamente tus colores de marca, logo y fotos de productos de tu biblioteca.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('type')} className="btn-ghost text-sm flex-1">← Volver</button>
            <button
              disabled={loading}
              onClick={() => onSelect('remotion-reel', undefined, voiceGender)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(249,115,22,0.2)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              🎬 Generar Reel con voz de {voiceGender === 'female' ? 'Elena' : 'Tomás'}
            </button>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // ── Step: Slide count (for slides type) ──
  if (step === 'slideCount') {
    return (
      <ModalWrapper title="🎞️ Cantidad de Slides" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ¿Cuántas imágenes querés en el video? Si tu publicación tiene menos, se generarán automáticamente las que falten.
          </p>
          <div className="flex items-center justify-center gap-3">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSlideCount(n)}
                className="w-14 h-14 rounded-xl text-lg font-bold transition-all"
                style={{
                  backgroundColor: slideCount === n ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.03)',
                  border: slideCount === n ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                  color: slideCount === n ? '#06b6d4' : 'var(--color-text-muted)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {slideCount} slides × ~3s = ~{slideCount * 3}s de video
          </p>
          <div className="flex gap-2">
            <button onClick={() => setStep('type')} className="btn-ghost text-sm flex-1">
              ← Volver
            </button>
            <button
              disabled={loading}
              onClick={() => onSelect('slides', slideCount)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(6,182,212,0.2)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
            >
              🎞️ Generar video con {slideCount} slides
            </button>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // ── Step: Type selection ──
  return (
    <ModalWrapper title="🎬 Convertir a Video" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Elegí el tipo de video que querés generar:
        </p>
        {VIDEO_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            disabled={loading || opt.disabled}
            onClick={() => {
              if (opt.disabled) return;
              if (opt.type === 'slides') setStep('slideCount');
              else if (opt.type === 'remotion-reel') setStep('remotion-voice');
              else onSelect(opt.type);
            }}
            className="w-full text-left p-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              backgroundColor: opt.type === 'remotion-reel' ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${opt.color}33`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                  <div className="flex items-center gap-2">
                    {opt.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40` }}>
                        {opt.badge}
                      </span>
                    )}
                    {opt.disabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        🚧 Próximamente
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${opt.color}22`, color: opt.color, border: `1px solid ${opt.color}44` }}>
                      {opt.credits === 0 ? '✨ Gratis' : `${opt.credits} créditos`}
                    </span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.description}</p>
              </div>
            </div>
          </button>
        ))}
        <button onClick={onClose} className="btn-ghost text-sm w-full mt-2">
          Cancelar
        </button>
      </div>
    </ModalWrapper>
  );
}
