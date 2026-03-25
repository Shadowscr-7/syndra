import { prisma } from '@automatismos/db';
import { CampaignList } from './campaign-list';
import { createCampaign } from '@/lib/actions';
import { getSession } from '@/lib/session';
import { ChannelFormatsPicker } from '@/components/ui/channel-formats-picker';

export default async function CampaignsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  const userId = session?.userId ?? '';
  let campaigns: any[] = [];
  let personas: any[] = [];
  let profiles: any[] = [];
  let themes: any[] = [];
  let dbOk = true;
  try {
    [campaigns, personas, profiles, themes] = await Promise.all([
      prisma.campaign.findMany({
        where: { workspaceId: wsId },
        include: {
          contentProfile: { select: { id: true, name: true } },
          userPersona: { select: { id: true, brandName: true } },
          campaignThemes: { include: { theme: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userPersona.findMany({
        where: { userId },
        select: { id: true, brandName: true, isActive: true },
        orderBy: { isActive: 'desc' },
      }),
      prisma.contentProfile.findMany({
        where: { userId },
        select: { id: true, name: true, isDefault: true },
        orderBy: { isDefault: 'desc' },
      }),
      prisma.contentTheme.findMany({
        where: { workspaceId: wsId, isActive: true },
        select: { id: true, name: true },
        orderBy: { priority: 'desc' },
      }),
    ]);
  } catch (e) {
    console.error('[CampaignsPage] DB error:', e);
    dbOk = false;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Campañas</h1>
          <p className="page-subtitle">Gestiona tus campañas y sus objetivos de contenido.</p>
        </div>
      </div>

      <div className="animate-fade-in-delay-1">
        <details>
          <summary className="btn-primary cursor-pointer list-none text-sm w-fit select-none">
            📝 Crear nueva campaña
          </summary>
          <form
            action={createCampaign}
            className="glass-card p-6 mt-4 space-y-4"
          >
            {/* Row 1: Name + Objective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre *</label>
                <input type="text" name="name" required placeholder="ej: Crecimiento Q1 2026" className="input-field" />
              </div>
              <div>
                <label className="input-label">Objetivo</label>
                <select name="objective" className="input-field">
                  <option value="ENGAGEMENT">💬 Engagement</option>
                  <option value="AUTHORITY">👑 Autoridad</option>
                  <option value="TRAFFIC">🚀 Tráfico</option>
                  <option value="LEAD_CAPTURE">🎯 Captura de Leads</option>
                  <option value="SALE">💰 Venta</option>
                  <option value="COMMUNITY">🤝 Comunidad</option>
                </select>
              </div>
            </div>

            {/* Row 2: Persona + Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Persona</label>
                <select name="userPersonaId" className="input-field">
                  <option value="">— Usar persona activa —</option>
                  {personas.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.brandName}{p.isActive ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Perfil de Contenido</label>
                <select name="contentProfileId" className="input-field">
                  <option value="">— Usar perfil default —</option>
                  {profiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.isDefault ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Channels + Formats */}
            <ChannelFormatsPicker />

            {/* Row 4: Themes (multi-select) */}
            <div>
              <label className="input-label">Temas de la campaña</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {themes.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg transition-all hover:bg-white/5" style={{ color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" name="themeIds" value={t.id} className="accent-purple-500" /> {t.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Row 5: Offer + Landing + Operation Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Oferta (opcional)</label>
                <input type="text" name="offer" placeholder="ej: 20% descuento" className="input-field" />
              </div>
              <div>
                <label className="input-label">Landing URL (opcional)</label>
                <input type="url" name="landingUrl" placeholder="https://..." className="input-field" />
              </div>
              <div>
                <label className="input-label">Modo de Operación</label>
                <select name="operationMode" className="input-field">
                  <option value="">🔗 Heredar de Workspace</option>
                  <option value="FULLY_AUTOMATIC">🤖 Automático</option>
                  <option value="APPROVAL_REQUIRED">✅ Aprobación</option>
                  <option value="MANUAL">🖐️ Manual</option>
                </select>
              </div>
            </div>

            {/* Row 6: Dates + KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Fecha inicio *</label>
                <input type="date" name="startDate" required className="input-field" />
              </div>
              <div>
                <label className="input-label">Fecha fin</label>
                <input type="date" name="endDate" className="input-field" />
              </div>
              <div>
                <label className="input-label">KPI Target (opcional)</label>
                <input type="text" name="kpiTarget" placeholder="ej: 10K interacciones" className="input-field" />
              </div>
            </div>

            {/* Music */}
            <div>
              <label className="input-label">🎵 Música de fondo (3 créditos/canción)</label>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Genera música instrumental con IA para Reels, Stories y Shorts</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" name="musicEnabled" value="true" className="accent-purple-500" />
                  Activar música
                </label>
                <select name="musicStyle" className="input-field w-auto text-xs">
                  <option value="upbeat">🎉 Upbeat</option>
                  <option value="calm">🧘 Calm</option>
                  <option value="corporate">💼 Corporate</option>
                  <option value="energetic">⚡ Energetic</option>
                  <option value="cinematic">🎬 Cinematic</option>
                </select>
                <input type="text" name="musicPrompt" placeholder="Prompt musical personalizado..." className="input-field flex-1 text-xs" />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full text-sm">
              ✅ Crear campaña
            </button>
          </form>
        </details>
      </div>

      <div className="animate-fade-in-delay-2">
        <CampaignList
          campaigns={JSON.parse(JSON.stringify(campaigns))}
          personas={JSON.parse(JSON.stringify(personas))}
          profiles={JSON.parse(JSON.stringify(profiles))}
          themes={JSON.parse(JSON.stringify(themes))}
        />
      </div>
    </div>
  );
}
