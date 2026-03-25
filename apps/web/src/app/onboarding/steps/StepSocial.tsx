'use client';

import { mutedStyle } from './types';

interface Props {
  metaConnected: boolean;
  metaInfo: string;
  onConnect: () => void;
}

export default function StepSocial({ metaConnected, metaInfo, onConnect }: Props) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>🔗 Redes Sociales</h3>
        <p className="text-xs" style={mutedStyle}>
          Conectá tus redes sociales para publicar contenido automáticamente. Podés hacerlo después desde Credenciales.
        </p>
      </div>

      {/* Meta/Instagram OAuth Card */}
      <div
        className="p-5 rounded-xl border transition-all"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: metaConnected ? '#22c55e' : 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                Meta (Instagram / Facebook)
              </h3>
              <p className="text-xs" style={mutedStyle}>
                {metaConnected
                  ? `✅ Conectado: ${metaInfo}`
                  : 'Conectá tu cuenta de Facebook para publicar en Instagram y Facebook'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={metaConnected}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: metaConnected ? '#22c55e' : '#1877f2',
              color: 'white',
              opacity: metaConnected ? 0.8 : 1,
            }}
          >
            {metaConnected ? '✓ Conectado' : '🔵 Conectar con Facebook'}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <p className="text-xs" style={mutedStyle}>
          💡 Al conectar, se abrirá una ventana de Facebook/Instagram donde autorizarás a Syndra
          a publicar en tu página. Se obtendrá un token de larga duración (60 días).
          Se descubren automáticamente tus páginas de Facebook y cuentas de Instagram Business.
        </p>
      </div>
    </div>
  );
}
