'use client';

import { useState } from 'react';

const STOCK_AVATARS = [
  { id: 'Anna_public_3_20240108', name: 'Anna', emoji: '👩' },
  { id: 'Wayne_public_20240108', name: 'Wayne', emoji: '👨' },
  { id: 'Monica_public_20240108', name: 'Monica', emoji: '👩‍🦱' },
  { id: 'Bryan_public_20240108', name: 'Bryan', emoji: '👨‍💼' },
  { id: 'Andrew_public_20240108', name: 'Andrew', emoji: '🧑' },
  { id: 'Kayla_public_20240108', name: 'Kayla', emoji: '👩‍🦰' },
];

interface VideoPrefs {
  preferVideoFormat: boolean;
  defaultAvatarId: string;
  enableMusic: boolean;
}

export function VideoPreferencesSection({ currentPrefs }: { currentPrefs?: Partial<VideoPrefs> }) {
  const [prefs, setPrefs] = useState<VideoPrefs>({
    preferVideoFormat: currentPrefs?.preferVideoFormat ?? false,
    defaultAvatarId: currentPrefs?.defaultAvatarId ?? STOCK_AVATARS[0]!.id,
    enableMusic: currentPrefs?.enableMusic ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/workspaces/video-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setToast({ type: 'ok', text: 'Preferencias de video guardadas' });
    } catch (e: any) {
      setToast({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="section-title">🤖 Video Avatar (Telegram)</h3>
      <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
        Cuando el scheduler genera contenido, puedes activar el modo video para que Telegram
        ofrezca directamente el botón <em>Video Avatar</em> en lugar del flujo de imagen estándar.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-xs font-medium ${
            toast.type === 'ok'
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="space-y-5">
        {/* Toggle: preferir video */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={prefs.preferVideoFormat}
              onChange={(e) => setPrefs((p) => ({ ...p, preferVideoFormat: e.target.checked }))}
              className="sr-only"
            />
            <div
              className="w-10 h-5 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: prefs.preferVideoFormat
                  ? 'rgba(124,58,237,0.8)'
                  : 'rgba(255,255,255,0.1)',
              }}
              onClick={() => setPrefs((p) => ({ ...p, preferVideoFormat: !p.preferVideoFormat }))}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: prefs.preferVideoFormat ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Preferir formato video en Telegram
            </span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Muestra el botón <strong>🤖 Video Avatar</strong> como opción principal al revisar contenido.
            </p>
          </div>
        </label>

        {/* Avatar por defecto */}
        <div>
          <label className="input-label mb-2 block">Avatar por defecto</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STOCK_AVATARS.map((av) => {
              const isSelected = prefs.defaultAvatarId === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, defaultAvatarId: av.id }))}
                  className="rounded-xl p-2.5 border transition-all duration-150 text-center"
                  style={{
                    backgroundColor: isSelected ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                    borderColor: isSelected ? 'rgba(124,58,237,0.4)' : 'var(--color-border-subtle)',
                  }}
                >
                  <div className="text-2xl mb-1">{av.emoji}</div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: isSelected ? '#a78bfa' : 'var(--color-text-secondary)' }}
                  >
                    {av.name}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Se usará automáticamente cuando el scheduler genere un video avatar desde Telegram.
          </p>
        </div>

        {/* Toggle: música */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={prefs.enableMusic}
              onChange={(e) => setPrefs((p) => ({ ...p, enableMusic: e.target.checked }))}
              className="sr-only"
            />
            <div
              className="w-10 h-5 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: prefs.enableMusic
                  ? 'rgba(124,58,237,0.8)'
                  : 'rgba(255,255,255,0.1)',
              }}
              onClick={() => setPrefs((p) => ({ ...p, enableMusic: !p.enableMusic }))}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: prefs.enableMusic ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Incluir música de fondo (Kie AI)
            </span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Genera música ambiental instrumental. Consume ~3 créditos adicionales por video.
            </p>
          </div>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary mt-6"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saving ? '⏳ Guardando...' : '💾 Guardar preferencias'}
      </button>
    </div>
  );
}
