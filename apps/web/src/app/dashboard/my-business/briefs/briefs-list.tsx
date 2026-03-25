'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { UserMediaPicker } from '@/components/media-picker';

interface BusinessBrief {
  id: string;
  type: string;
  title: string;
  content: string;
  productName?: string;
  productPrice?: string;
  productUrl?: string;
  discountText?: string;
  validFrom?: string;
  validUntil?: string;
  mediaIds?: string[];
  isActive: boolean;
  priority: number;
  usageCount: number;
}

const BRIEF_TYPES = [
  { value: 'PRODUCT', label: '📦 Producto', color: 'purple' },
  { value: 'SERVICE', label: '🔧 Servicio', color: 'blue' },
  { value: 'OFFER', label: '🏷️ Oferta', color: 'red' },
  { value: 'ANNOUNCEMENT', label: '📢 Anuncio', color: 'amber' },
  { value: 'TESTIMONIAL', label: '⭐ Testimonio', color: 'emerald' },
  { value: 'FAQ', label: '❓ FAQ', color: 'cyan' },
  { value: 'SEASONAL', label: '🎄 Temporal', color: 'pink' },
  { value: 'BRAND_STORY', label: '📖 Historia', color: 'indigo' },
];

const emptyBrief: Omit<BusinessBrief, 'id' | 'isActive' | 'priority' | 'usageCount'> = {
  type: 'PRODUCT',
  title: '',
  content: '',
  productName: '',
  productPrice: '',
  productUrl: '',
  discountText: '',
  mediaIds: [],
};

export function BusinessBriefsList() {
  const [briefs, setBriefs] = useState<BusinessBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBrief);
  const [saving, setSaving] = useState(false);

  const loadBriefs = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/business-briefs');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setBriefs(list);
    } catch {
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await apiFetch(`/business-briefs/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/business-briefs', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyBrief);
      await loadBriefs();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brief: BusinessBrief) => {
    setEditId(brief.id);
    setForm({
      type: brief.type,
      title: brief.title,
      content: brief.content,
      productName: brief.productName,
      productPrice: brief.productPrice,
      productUrl: brief.productUrl,
      discountText: brief.discountText,
      validFrom: brief.validFrom,
      validUntil: brief.validUntil,
      mediaIds: brief.mediaIds ?? [],
    });
    setShowForm(true);
  };

  const handleToggle = async (id: string) => {
    try {
      await apiFetch(`/business-briefs/${id}/toggle`, { method: 'PATCH' });
      await loadBriefs();
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este brief?')) return;
    try {
      await apiFetch(`/business-briefs/${id}`, { method: 'DELETE' });
      await loadBriefs();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const typeInfo = (type: string) => BRIEF_TYPES.find(t => t.value === type) ?? BRIEF_TYPES[0]!;
  const showProductFields = ['PRODUCT', 'SERVICE', 'OFFER', 'SEASONAL'].includes(form.type);

  if (loading) {
    return <div className="glass-card p-8 text-center text-white/50">Cargando briefs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {showForm ? (
        <div className="glass-card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {editId ? '✏️ Editar brief' : '➕ Nuevo brief'}
            </h2>
            <button
              className="text-white/50 hover:text-white"
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyBrief); }}
            >✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Tipo *</label>
              <select
                className="input-field w-full"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {BRIEF_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Título *</label>
              <input
                className="input-field w-full"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Lanzamiento colección verano"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Contenido / Descripción *</label>
            <textarea
              className="input-field w-full h-24 resize-none"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Describe el producto, oferta, o mensaje que quieres comunicar..."
            />
          </div>

          {showProductFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre del producto</label>
                <input
                  className="input-field w-full"
                  value={form.productName ?? ''}
                  onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                  placeholder="Ej: Zapatillas Pro Runner"
                />
              </div>
              <div>
                <label className="input-label">Precio</label>
                <input
                  className="input-field w-full"
                  value={form.productPrice ?? ''}
                  onChange={e => setForm(f => ({ ...f, productPrice: e.target.value }))}
                  placeholder="Ej: $99.99"
                />
              </div>
              <div>
                <label className="input-label">URL del producto</label>
                <input
                  className="input-field w-full"
                  value={form.productUrl ?? ''}
                  onChange={e => setForm(f => ({ ...f, productUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="input-label">Texto de descuento</label>
                <input
                  className="input-field w-full"
                  value={form.discountText ?? ''}
                  onChange={e => setForm(f => ({ ...f, discountText: e.target.value }))}
                  placeholder="Ej: -30% OFF, 2x1, Envío gratis"
                />
              </div>
            </div>
          )}

          {(form.type === 'OFFER' || form.type === 'SEASONAL') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Válido desde</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={form.validFrom ?? ''}
                  onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">Válido hasta</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={form.validUntil ?? ''}
                  onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Media picker — select product/promotion images from library */}
          <div>
            <label className="input-label">Imágenes del producto</label>
            <UserMediaPicker
              selectedIds={form.mediaIds ?? []}
              onChange={(ids) => setForm(f => ({ ...f, mediaIds: ids }))}
              categoryFilter="PRODUCT"
              max={5}
            />
          </div>

          <div className="flex gap-3">
            <button
              className="btn-primary px-6"
              onClick={handleSave}
              disabled={saving || !form.title || !form.content}
            >
              {saving ? '⏳ Guardando...' : editId ? '💾 Actualizar' : '➕ Crear brief'}
            </button>
            <button
              className="px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 rounded-lg"
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyBrief); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          ➕ Crear nuevo brief
        </button>
      )}

      {/* Briefs Grid */}
      {briefs.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-white/50 text-lg mb-2">No hay briefs creados</p>
          <p className="text-white/30 text-sm">
            Crea briefs de tus productos, ofertas o anuncios para que el pipeline
            genere contenido promocional de tu negocio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {briefs.map(brief => {
            const info = typeInfo(brief.type);
            return (
              <div
                key={brief.id}
                className={`glass-card p-4 space-y-3 ${!brief.isActive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium bg-${info.color}-500/20 text-${info.color}-300 border border-${info.color}-500/30`}
                    >
                      {info.label}
                    </span>
                    {brief.discountText && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                        {brief.discountText}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 text-white/30 hover:text-white/70 text-sm"
                      onClick={() => handleToggle(brief.id)}
                      title={brief.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {brief.isActive ? '🟢' : '🔴'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white text-sm">{brief.title}</h3>
                  <p className="text-white/50 text-xs mt-1 line-clamp-2">{brief.content}</p>
                </div>

                {brief.productName && (
                  <div className="text-xs text-white/40">
                    {brief.productName}
                    {brief.productPrice && <span className="text-emerald-400 ml-2">{brief.productPrice}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs text-white/30">
                    Usado {brief.usageCount}x
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-purple-400 hover:text-purple-300"
                      onClick={() => handleEdit(brief)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(brief.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
