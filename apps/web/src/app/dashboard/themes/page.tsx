import { prisma } from '@automatismos/db';
import { ThemeList } from './theme-list';
import { createTheme } from '@/lib/actions';
import { getSession } from '@/lib/session';

export default async function ThemesPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let themes: any[] = [];
  let dbOk = true;
  try {
    themes = await prisma.contentTheme.findMany({
      where: { workspaceId: wsId },
      orderBy: { priority: 'desc' },
    });
  } catch (e) {
    console.error('[ThemesPage] DB error:', e);
    dbOk = false;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Temas de Contenido</h1>
          <p className="page-subtitle">Configura las temáticas para tu línea editorial.</p>
        </div>
      </div>

      {/* Inline creation form */}
      <div className="animate-fade-in-delay-1">
        <details>
          <summary className="btn-primary cursor-pointer list-none text-sm w-fit select-none">
            📝 Crear nuevo tema
          </summary>
          <form
            action={createTheme}
            className="glass-card p-6 mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre *</label>
                <input type="text" name="name" required placeholder="ej: Marketing Digital" className="input-field" />
              </div>
              <div>
                <label className="input-label">Audiencia</label>
                <input type="text" name="audience" placeholder="ej: Emprendedores 25-40" className="input-field" />
              </div>
            </div>
            <div>
              <label className="input-label">Keywords (separadas por coma)</label>
              <input type="text" name="keywords" placeholder="ej: SEO, redes sociales, branding" className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Tipo</label>
                <select name="type" className="input-field">
                  <option value="EVERGREEN">🌱 Evergreen</option>
                  <option value="TRENDING">🔥 Trending</option>
                </select>
              </div>
              <div>
                <label className="input-label">Prioridad (1-10)</label>
                <input type="number" name="priority" defaultValue={5} min={1} max={10} className="input-field" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full text-sm">
              ✅ Crear tema
            </button>
          </form>
        </details>
      </div>

      <div className="animate-fade-in-delay-2">
        <ThemeList themes={JSON.parse(JSON.stringify(themes))} />
      </div>
    </div>
  );
}
