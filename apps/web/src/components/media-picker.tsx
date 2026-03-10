'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

interface UserMediaItem {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  category: string;
  productName?: string;
  thumbnailUrl?: string;
}

interface MediaPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Filter by category, e.g. 'PRODUCT', 'LOGO' */
  categoryFilter?: string;
  max?: number;
}

export function UserMediaPicker({ selectedIds, onChange, categoryFilter, max = 5 }: MediaPickerProps) {
  const [media, setMedia] = useState<UserMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadMedia = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (categoryFilter) params.set('category', categoryFilter);
      const data = await apiFetch<{ items: UserMediaItem[] } | UserMediaItem[]>(
        `/user-media?${params.toString()}`,
      );
      // API may return { items: [...] } or directly an array
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      setMedia(items.filter((m) => m.mimeType?.startsWith('image/')));
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (expanded) loadMedia();
  }, [expanded, loadMedia]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="text-sm text-purple-400 hover:text-purple-300 underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▼ Ocultar biblioteca' : `📷 Seleccionar imágenes (${selectedIds.length})`}
      </button>

      {expanded && (
        <div className="mt-3 border border-white/10 rounded-lg p-3 max-h-52 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-white/40">Cargando imágenes...</p>
          ) : media.length === 0 ? (
            <p className="text-xs text-white/40">
              No hay imágenes en tu biblioteca. Sube imágenes en la sección Productos.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {media.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                      selected
                        ? 'border-purple-500 ring-2 ring-purple-500/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.productName || item.fileName}
                      className="w-full h-full object-cover"
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                        <span className="text-white text-lg">✓</span>
                      </div>
                    )}
                    {item.productName && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white px-1 py-0.5 truncate">
                        {item.productName}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
