import { getSession } from '@/lib/session';
import { ProductMediaList } from './products-list';

export default async function ProductsPage() {
  const session = await getSession();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Productos & Media</h1>
          <p className="page-subtitle">
            Gestiona las imágenes de tus productos. Marca cuáles usar en el pipeline
            de generación y cuál es tu logo para aplicarlo como marca de agua.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-delay-1">
        <ProductMediaList />
      </div>
    </div>
  );
}
