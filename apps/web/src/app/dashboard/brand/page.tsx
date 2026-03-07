import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { updateBrandProfile } from '@/lib/actions';

export default async function BrandPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let profile: any = null;
  try {
    profile = await prisma.brandProfile.findUnique({
      where: { workspaceId: wsId },
    });
  } catch (e) {
    console.error('[BrandPage] DB error:', e);
  }

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Brand Profile</h1>
        <p className="page-subtitle">Define la voz, tono e identidad visual de tu marca.</p>
      </div>

      <form action={updateBrandProfile} className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Voz */}
          <div className="glass-card p-6 animate-fade-in-delay-1">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🎙️</span> Voz de marca
            </h3>
            <textarea
              name="voice"
              rows={3}
              defaultValue={profile?.voice ?? ''}
              placeholder="Ej: Profesional pero cercana, como un mentor experto"
              className="input-field resize-none"
            />
            <h3 className="font-bold text-sm mt-5 mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🎭</span> Tono por defecto
            </h3>
            <input
              name="tone"
              type="text"
              defaultValue={profile?.tone ?? 'didáctico'}
              placeholder="Ej: didáctico, inspirador, directo"
              className="input-field"
            />
          </div>

          {/* CTA y Claims */}
          <div className="glass-card p-6 animate-fade-in-delay-2">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">📢</span> CTA base
            </h3>
            <input
              name="baseCta"
              type="text"
              defaultValue={profile?.baseCta ?? ''}
              placeholder="Ej: Agenda tu consulta gratuita"
              className="input-field"
            />
            <h3 className="font-bold text-sm mt-5 mb-2 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">✅</span> Claims permitidos
            </h3>
            <label className="input-label">Separados por coma</label>
            <input
              name="allowedClaims"
              type="text"
              defaultValue={profile?.allowedClaims?.join(', ') ?? ''}
              placeholder="Ej: Resultados comprobados, Sin químicos"
              className="input-field"
            />
          </div>

          {/* Hashtags */}
          <div className="glass-card p-6 animate-fade-in-delay-2">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">#</span> Hashtags
            </h3>
            <label className="input-label">Separados por coma</label>
            <input
              name="hashtags"
              type="text"
              defaultValue={profile?.hashtags?.join(', ') ?? ''}
              placeholder="Ej: #salud, #bienestar, #vida"
              className="input-field"
            />
          </div>

          {/* Temas prohibidos */}
          <div className="glass-card p-6 animate-fade-in-delay-3">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-lg">🚫</span> Temas prohibidos
            </h3>
            <label className="input-label">Separados por coma</label>
            <input
              name="prohibitedTopics"
              type="text"
              defaultValue={profile?.prohibitedTopics?.join(', ') ?? ''}
              placeholder="Ej: política, religión"
              className="input-field"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          💾 Guardar Brand Profile
        </button>
      </form>
    </div>
  );
}
