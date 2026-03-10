'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { TemplatePreview } from '@/components/template-preview';

interface ProductMedia {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  productName?: string;
  productSku?: string;
  productPrice?: string;
  productUrl?: string;
  productDescription?: string;
  useInPipeline: boolean;
  isLogo: boolean;
  category: string;
  createdAt: string;
}

export function ProductMediaList() {
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ productName: '', productPrice: '', productDescription: '', useInPipeline: false, isLogo: false });

  const loadMedia = useCallback(async () => {
    try {
      const data = await apiFetch<ProductMedia[]>('/user-media');
      setMedia(data ?? []);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  const handleEdit = (item: ProductMedia) => {
    setEditId(item.id);
    setForm({
      productName: item.productName ?? '',
      productPrice: item.productPrice ?? '',
      productDescription: item.productDescription ?? '',
      useInPipeline: item.useInPipeline,
      isLogo: item.isLogo,
    });
  };

  const handleSave = async () => {
    if (!editId) return;
    try {
      await apiFetch(`/user-media/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setEditId(null);
      await loadMedia();
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const handleTogglePipeline = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/user-media/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ useInPipeline: !current }),
      });
      await loadMedia();
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const handleSetLogo = async (id: string) => {
    try {
      // Unset all logos first
      for (const m of media.filter(m => m.isLogo)) {
        await apiFetch(`/user-media/${m.id}`, {
          method: 'PUT',
          body: JSON.stringify({ isLogo: false }),
        });
      }
      // Set this one as logo
      await apiFetch(`/user-media/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isLogo: true }),
      });
      await loadMedia();
    } catch (e) {
      console.error('Set logo failed:', e);
    }
  };

  if (loading) {
    return <div className="glass-card p-8 text-center text-white/50">Cargando media...</div>;
  }

  const logoItem = media.find(m => m.isLogo);
  const productItems = media.filter(m => !m.isLogo);

  return (
    <div className="space-y-6">
      {/* Current Logo */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏷️ Logo del negocio
        </h2>
        {logoItem ? (
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-purple-500/30 overflow-hidden bg-white/5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoItem.url} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <p className="text-sm text-white">{logoItem.filename}</p>
              <p className="text-xs text-white/40">Se aplica como marca de agua en todas las publicaciones</p>
            </div>
          </div>
        ) : (
          <p className="text-white/40 text-sm">
            No hay logo configurado. Sube una imagen en la Biblioteca de Media y márcala como logo.
          </p>
        )}
      </div>

      {/* Product Images */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📦 Imágenes de productos
        </h2>
        {media.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/50 text-lg mb-2">No hay imágenes subidas</p>
            <p className="text-white/30 text-sm">
              Sube imágenes de tus productos en la{' '}
              <a href="/dashboard/media" className="text-purple-400 hover:text-purple-300 underline">
                Biblioteca de Media
              </a>{' '}
              y luego configúralas aquí para usarlas en publicaciones promocionales.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productItems.map(item => (
              <div key={item.id} className="glass-card overflow-hidden">
                {/* Image Preview */}
                <div className="aspect-square bg-white/5 relative flex items-center justify-center">
                  {item.mimeType?.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.url} alt={item.filename} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-4xl">📄</span>
                  )}
                  {/* Pipeline Badge */}
                  {item.useInPipeline && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-emerald-500/80 text-white">
                      En Pipeline
                    </span>
                  )}
                </div>

                {/* Info / Edit */}
                {editId === item.id ? (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="input-label">Nombre del producto</label>
                      <input
                        className="input-field w-full text-sm"
                        value={form.productName}
                        onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                        placeholder="Nombre del producto"
                      />
                    </div>
                    <div>
                      <label className="input-label">Precio</label>
                      <input
                        className="input-field w-full text-sm"
                        value={form.productPrice}
                        onChange={e => setForm(f => ({ ...f, productPrice: e.target.value }))}
                        placeholder="$99.99"
                      />
                    </div>
                    <div>
                      <label className="input-label">Descripción</label>
                      <textarea
                        className="input-field w-full text-sm h-16 resize-none"
                        value={form.productDescription}
                        onChange={e => setForm(f => ({ ...f, productDescription: e.target.value }))}
                        placeholder="Breve descripción..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input
                          type="checkbox"
                          checked={form.useInPipeline}
                          onChange={e => setForm(f => ({ ...f, useInPipeline: e.target.checked }))}
                          className="rounded"
                        />
                        Usar en pipeline
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input
                          type="checkbox"
                          checked={form.isLogo}
                          onChange={e => setForm(f => ({ ...f, isLogo: e.target.checked }))}
                          className="rounded"
                        />
                        Es logo
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={handleSave}>
                        💾 Guardar
                      </button>
                      <button
                        className="text-xs text-white/50 hover:text-white px-3 py-1.5 border border-white/10 rounded"
                        onClick={() => setEditId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white truncate">
                          {item.productName || item.filename}
                        </p>
                        {item.productPrice && (
                          <p className="text-sm text-emerald-400">{item.productPrice}</p>
                        )}
                        {item.productDescription && (
                          <p className="text-xs text-white/40 mt-1 line-clamp-2">{item.productDescription}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <div className="flex gap-2">
                        <button
                          className={`text-xs px-2 py-1 rounded ${
                            item.useInPipeline
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-white/40 border border-white/10 hover:text-white/70'
                          }`}
                          onClick={() => handleTogglePipeline(item.id, item.useInPipeline)}
                        >
                          {item.useInPipeline ? '✅ Pipeline' : '⬜ Pipeline'}
                        </button>
                        <button
                          className="text-xs text-purple-400 border border-purple-500/30 px-2 py-1 rounded hover:bg-purple-500/10"
                          onClick={() => handleSetLogo(item.id)}
                        >
                          🏷️ Logo
                        </button>
                        {item.mimeType?.startsWith('image/') && (
                          <TemplatePreview
                            productImageUrl={item.url}
                            productName={item.productName}
                            productPrice={item.productPrice}
                            logoUrl={logoItem?.url}
                          />
                        )}
                      </div>
                      <button
                        className="text-xs text-white/40 hover:text-white"
                        onClick={() => handleEdit(item)}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
