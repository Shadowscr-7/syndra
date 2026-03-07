import { prisma } from '@automatismos/db';
import { CampaignList } from './campaign-list';
import { createCampaign } from '@/lib/actions';
import { getSession } from '@/lib/session';

export default async function CampaignsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let campaigns: any[] = [];
  let dbOk = true;
  try {
    campaigns = await prisma.campaign.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: 'desc' },
    });
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre *</label>
                <input type="text" name="name" required placeholder="ej: Lanzamiento Producto X" className="input-field" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Oferta (opcional)</label>
                <input type="text" name="offer" placeholder="ej: 20% descuento" className="input-field" />
              </div>
              <div>
                <label className="input-label">Landing URL (opcional)</label>
                <input type="url" name="landingUrl" placeholder="https://..." className="input-field" />
              </div>
            </div>
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
            <button type="submit" className="btn-primary w-full text-sm">
              ✅ Crear campaña
            </button>
          </form>
        </details>
      </div>

      <div className="animate-fade-in-delay-2">
        <CampaignList campaigns={JSON.parse(JSON.stringify(campaigns))} />
      </div>
    </div>
  );
}
