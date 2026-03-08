import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { updateWorkspaceSettings, saveApiCredential, disconnectCredential, testCloudinaryConnection } from '@/lib/actions';
import { MetaConnect } from './meta-connect';
import { CloudinaryConnect } from './cloudinary-connect';
import { OperationModeSelector } from './operation-mode';
import { LearningConfigSection } from './learning-config';
import { PlaybookResetSection } from './playbook-reset';

export default async function SettingsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let workspace: any = null;
  let credentials: any[] = [];
  try {
    [workspace, credentials] = await Promise.all([
      prisma.workspace.findFirst({ where: { id: wsId } }),
      prisma.apiCredential.findMany({
        where: { workspaceId: wsId },
        select: { provider: true, isActive: true, lastUsedAt: true, scopes: true, encryptedKey: true },
      }),
    ]);
  } catch (e) {
    console.error('[SettingsPage] DB error:', e);
  }

  const getCredential = (provider: string) =>
    credentials.find((c) => c.provider === provider);

  // Decode Meta account info from base64 payload
  const metaCred = getCredential('META');
  let metaAccountInfo: { igUsername?: string; fbPageName?: string; connectedAt?: string; connectedVia?: string } | null = null;
  if (metaCred?.encryptedKey) {
    try {
      const decoded = JSON.parse(Buffer.from(metaCred.encryptedKey, 'base64').toString('utf-8'));
      metaAccountInfo = {
        igUsername: decoded.igUsername,
        fbPageName: decoded.fbPageName,
        connectedAt: decoded.connectedAt,
        connectedVia: decoded.connectedVia,
      };
    } catch {}
  }

  // Decode Cloudinary account info
  const cloudCred = getCredential('CLOUDINARY');
  let cloudinaryInfo: { cloudName?: string } | null = null;
  if (cloudCred?.encryptedKey) {
    try {
      const decoded = JSON.parse(Buffer.from(cloudCred.encryptedKey, 'base64').toString('utf-8'));
      cloudinaryInfo = { cloudName: decoded.cloudName };
    } catch {}
  }

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Configuración general del workspace, integraciones y credenciales.</p>
      </div>

      {/* ── Workspace Settings ── */}
      <form action={updateWorkspaceSettings} className="max-w-3xl">
        <div className="glass-card p-6 animate-fade-in-delay-1">
          <h3 className="section-title">📋 Workspace</h3>
          <div className="space-y-5">
            <div>
              <label className="input-label">Nombre</label>
              <input
                name="name"
                type="text"
                defaultValue={workspace?.name ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Zona horaria</label>
              <select
                name="timezone"
                defaultValue={workspace?.timezone ?? 'America/Mexico_City'}
                className="input-field"
              >
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Santiago">America/Santiago</option>
                <option value="America/Lima">America/Lima</option>
                <option value="Europe/Madrid">Europe/Madrid</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
              </select>
            </div>
            <div>
              <label className="input-label">Canales activos</label>
              <div className="flex gap-4 mt-1">
                {['instagram', 'facebook'].map((ch) => (
                  <label key={ch} className="flex items-center gap-2.5 text-sm cursor-pointer group" style={{ color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      name="activeChannels"
                      value={ch}
                      defaultChecked={workspace?.activeChannels?.includes(ch)}
                      className="w-4 h-4 rounded accent-purple-500"
                    />
                    <span className="group-hover:text-white transition-colors">
                      {ch === 'instagram' ? '📸' : '📘'} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-6">
            💾 Guardar cambios
          </button>
        </div>
      </form>

      {/* ── Operation Mode ── */}
      <div className="max-w-3xl animate-fade-in-delay-1">
        <OperationModeSelector currentMode={workspace?.operationMode ?? 'APPROVAL_REQUIRED'} />
      </div>

      {/* ── Learning Loop Config ── */}
      <div className="max-w-3xl animate-fade-in-delay-1">
        <LearningConfigSection />
      </div>

      {/* ── Meta (Instagram / Facebook) ── */}
      <div className="max-w-3xl animate-fade-in-delay-2">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">📱 Meta (Instagram / Facebook)</h3>
          </div>
          <MetaConnect
            isConnected={!!metaCred?.isActive}
            accountInfo={metaAccountInfo}
            credentialScopes={metaCred?.scopes}
            onDisconnect={async () => {
              'use server';
              await disconnectCredential('META');
            }}
          />
        </div>
      </div>

      {/* ── Cloudinary ── */}
      <div className="max-w-3xl animate-fade-in-delay-2">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">☁️ Cloudinary (CDN de media)</h3>
          </div>
          <CloudinaryConnect
            isConnected={!!cloudCred?.isActive}
            accountInfo={cloudinaryInfo}
            onDisconnect={async () => {
              'use server';
              await disconnectCredential('CLOUDINARY');
            }}
            onSave={async (formData: FormData) => {
              'use server';
              await saveApiCredential(formData);
            }}
            onTest={async (formData: FormData) => {
              'use server';
              return testCloudinaryConnection(formData);
            }}
          />
        </div>
      </div>

      {/* ── Media & AI Status ── */}
      <div className="max-w-3xl animate-fade-in-delay-3">
        <div className="glass-card p-6">
          <h3 className="section-title">🎨 Estado de servicios de media</h3>
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between py-2 px-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>🖼️ Imágenes AI</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pollinations.ai (Flux) — gratis, sin límites</p>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Activo
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>🎠 Carruseles</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>SVG Composer local — sin dependencias externas</p>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Activo
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>🗣️ Voz / TTS</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Edge TTS (Microsoft) — gratis, voces naturales en español</p>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Activo
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>🎬 Video Avatar</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Mock — necesita HEYGEN_API_KEY para video real</p>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <span className="badge-dot" style={{ backgroundColor: '#f59e0b' }} /> Mock
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>🤖 LLM / Contenido</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>OpenAI GPT-4o</p>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Activo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Playbook Reset ── */}
      <div className="max-w-3xl animate-fade-in-delay-3">
        <PlaybookResetSection currentIndustry={workspace?.industry ?? null} />
      </div>

      {/* ── Schedule ── */}
      <div className="max-w-3xl animate-fade-in-delay-3">
        <div className="glass-card p-6">
          <h3 className="section-title">⏰ Horario editorial</h3>
          <div className="flex items-center gap-3 mt-2 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <span className="text-2xl">🕐</span>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              El pipeline se ejecuta diariamente a las <strong style={{ color: 'var(--color-primary)' }}>7:00 AM</strong> (zona horaria del workspace).
              Configurable via cron en el servicio API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
