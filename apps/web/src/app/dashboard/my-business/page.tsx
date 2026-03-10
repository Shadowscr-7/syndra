import { getSession } from '@/lib/session';
import { BusinessProfileForm } from './business-profile-form';

export default async function MyBusinessPage() {
  const session = await getSession();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Mi Negocio</h1>
          <p className="page-subtitle">
            Configura el perfil de tu negocio. Esta información se usa en toda la generación de contenido
            para crear publicaciones alineadas con tu marca y productos.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-delay-1">
        <BusinessProfileForm />
      </div>
    </div>
  );
}
