import { getSession } from '@/lib/session';
import { BusinessBriefsList } from './briefs-list';

export default async function BriefsPage() {
  const session = await getSession();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Briefs de Negocio</h1>
          <p className="page-subtitle">
            Crea briefs de tus productos, ofertas y anuncios. El pipeline los usa para generar
            contenido promocional con tus imágenes y el contexto de tu negocio.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-delay-1">
        <BusinessBriefsList />
      </div>
    </div>
  );
}
