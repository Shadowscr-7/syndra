'use client';

import { useRef } from 'react';
import type { MediaEntry } from './types';
import { MEDIA_CATEGORIES, mutedStyle } from './types';

interface Props {
  files: MediaEntry[];
  onChange: (files: MediaEntry[]) => void;
}

export default function StepMedia({ files, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: MediaEntry[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i]!;
      if (f.size > 50 * 1024 * 1024) continue; // 50MB limit
      newFiles.push({
        file: f,
        category: guessCategory(f.name),
        preview: URL.createObjectURL(f),
      });
    }
    onChange([...files, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    URL.revokeObjectURL(files[idx]!.preview);
    onChange(files.filter((_, i) => i !== idx));
  };

  const updateCategory = (idx: number, category: string) => {
    const updated = [...files];
    updated[idx] = { ...updated[idx]!, category };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>📁 Repositorio de Media</h3>
        <p className="text-xs" style={mutedStyle}>
          Sube imágenes como logo, productos o fondos. Opcional — podés hacerlo después desde Biblioteca.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFiles}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full py-3 rounded-lg text-sm font-medium border border-dashed transition-colors"
        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
      >
        + Añadir archivos
      </button>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((f, i) => (
            <div
              key={i}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}
                >
                  ✕
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs truncate mb-1" style={{ color: 'var(--color-text)' }}>{f.file.name}</p>
                <select
                  value={f.category}
                  onChange={(e) => updateCategory(i, e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded border"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {MEDIA_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function guessCategory(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('logo')) return 'LOGO';
  if (lower.includes('product') || lower.includes('producto')) return 'PRODUCT';
  if (lower.includes('bg') || lower.includes('fondo') || lower.includes('background')) return 'BACKGROUND';
  return 'OTHER';
}
