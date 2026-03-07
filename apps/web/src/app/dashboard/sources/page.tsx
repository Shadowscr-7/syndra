import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { createResearchSource, deleteResearchSource } from '@/lib/actions';

export default async function SourcesPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let sources: any[] = [];
  try {
    sources = await prisma.researchSource.findMany({
      where: { workspaceId: wsId },
      orderBy: { name: 'asc' },
    });
  } catch (e) {
    console.error('[SourcesPage] DB error:', e);
  }

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Fuentes de Research</h1>
        <p className="page-subtitle">Feeds RSS, blogs y fuentes para el motor de research diario.</p>
      </div>

      {/* Formulario nueva fuente */}
      <details className="animate-fade-in-delay-1">
        <summary className="btn-primary inline-flex items-center gap-2 cursor-pointer text-sm">
          <span className="text-lg font-light">+</span> Agregar fuente
        </summary>
        <form
          action={createResearchSource}
          className="mt-4 glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="input-label">Nombre</label>
            <input name="name" required placeholder="Mi Blog" className="input-field" />
          </div>
          <div>
            <label className="input-label">Tipo</label>
            <select name="type" className="input-field">
              <option value="RSS">RSS</option>
              <option value="BLOG">Blog</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="SOCIAL">Social</option>
              <option value="CHANGELOG">Changelog</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label className="input-label">URL</label>
            <input name="url" required type="url" placeholder="https://..." className="input-field" />
          </div>
          <button type="submit" className="btn-primary text-sm">
            Crear
          </button>
        </form>
      </details>

      <div className="glass-card p-0 overflow-hidden animate-fade-in-delay-2">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>URL</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl animate-float">📡</span>
                    <p style={{ color: 'var(--color-text-muted)' }}>No hay fuentes configuradas. Agrega una arriba.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sources.map((source) => {
                const deleteWithId = deleteResearchSource.bind(null, source.id);
                return (
                  <tr key={source.id}>
                    <td className="font-medium">{source.name}</td>
                    <td>
                      <span className="chip">{source.type}</span>
                    </td>
                    <td className="truncate max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {source.url}
                    </td>
                    <td>
                      {source.isActive ? (
                        <span className="badge" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                          <span className="badge-dot" style={{ backgroundColor: '#22c55e' }} /> Activa
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Inactiva
                        </span>
                      )}
                    </td>
                    <td>
                      <form action={deleteWithId}>
                        <button type="submit" className="btn-danger text-xs">
                          🗑️ Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
