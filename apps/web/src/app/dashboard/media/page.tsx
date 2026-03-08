'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ──

interface MediaFile {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  category: string;
  folderId?: string;
  metadata: any;
  createdAt: string;
}

interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  _count?: { files: number; children: number };
  createdAt: string;
}

interface StorageInfo {
  usedBytes: number;
  maxBytes: number;
  usedMb: number;
  maxMb: number;
}

const CATEGORIES = [
  { value: '', label: 'Todas', icon: '📁' },
  { value: 'LOGO', label: 'Logos', icon: '🏷️' },
  { value: 'PRODUCT', label: 'Productos', icon: '📦' },
  { value: 'BACKGROUND', label: 'Fondos', icon: '🖼️' },
  { value: 'PERSONAL', label: 'Personales', icon: '👤' },
  { value: 'OTHER', label: 'Otros', icon: '📎' },
];

// ── Page ──

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Raíz' }]);
  const [filterCategory, setFilterCategory] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Fetch ──

  const fetchAll = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (currentFolder) qs.set('folderId', currentFolder);
      if (filterCategory) qs.set('category', filterCategory);
      qs.set('limit', '50');

      const [filesRes, foldersRes, storageRes] = await Promise.all([
        fetch(`/api/user-media?${qs.toString()}`),
        fetch(`/api/media-folders?${currentFolder ? `parentId=${currentFolder}` : ''}`),
        fetch('/api/user-media/storage'),
      ]);

      const filesData = await filesRes.json();
      const foldersData = await foldersRes.json();
      const storageData = await storageRes.json();

      setFiles(filesData.data?.items ?? filesData.data ?? []);
      setTotalCount(filesData.data?.total ?? 0);
      setFolders(foldersData.data ?? []);
      setStorage(storageData.data ?? storageData);
    } catch {
      toast('err', 'Error al cargar medios');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, filterCategory]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Navigate folder ──

  const navigateToFolder = (folder: MediaFolder) => {
    setCurrentFolder(folder.id);
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateBreadcrumb = (index: number) => {
    const crumb = breadcrumb[index];
    setCurrentFolder(crumb?.id ?? null);
    setBreadcrumb(breadcrumb.slice(0, index + 1));
  };

  // ── Create folder ──

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const res = await fetch('/api/media-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim(), parentId: currentFolder || undefined }),
      });
      if (!res.ok) throw new Error('Error al crear carpeta');
      toast('ok', 'Carpeta creada');
      setFolderName('');
      setShowFolderForm(false);
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Delete folder ──

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('¿Eliminar esta carpeta y su contenido?')) return;
    try {
      const res = await fetch(`/api/media-folders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast('ok', 'Carpeta eliminada');
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Upload file (URL-based, not raw upload) ──

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const form = new FormData(e.currentTarget);
    try {
      const body = {
        filename: form.get('filename') as string,
        url: form.get('url') as string,
        thumbnailUrl: (form.get('thumbnailUrl') as string) || undefined,
        mimeType: (form.get('mimeType') as string) || 'image/jpeg',
        sizeBytes: Number(form.get('sizeBytes')) || 0,
        category: (form.get('category') as string) || 'OTHER',
        tags: (form.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
        folderId: currentFolder || undefined,
      };
      const res = await fetch('/api/user-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir');
      toast('ok', 'Archivo añadido');
      setShowUpload(false);
      await fetchAll();
    } catch (err: any) {
      toast('err', err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Update file ──

  const handleUpdateFile = async (id: string, data: Partial<MediaFile>) => {
    try {
      const res = await fetch(`/api/user-media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast('ok', 'Archivo actualizado');
      setEditingFile(null);
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Delete file ──

  const handleDeleteFile = async (id: string) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      const res = await fetch(`/api/user-media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Archivo eliminado');
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const storagePercent = storage ? Math.min(100, (storage.usedBytes / Math.max(storage.maxBytes, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-fade-in ${
          toastMsg.type === 'ok' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>{toastMsg.text}</div>
      )}

      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 className="page-title">📂 Repositorio de Media</h1>
        <p className="page-subtitle">Sube y organiza tus imágenes, logos y fondos para el contenido generado por IA.</p>
      </div>

      {/* Storage Bar */}
      {storage && (
        <div className="glass-card p-4 animate-fade-in-delay-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              💾 Almacenamiento: {storage.usedMb.toFixed(1)} MB / {storage.maxMb} MB
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{storagePercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${storagePercent}%`,
                background: storagePercent > 90
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : storagePercent > 70
                    ? 'linear-gradient(90deg, #eab308, #f97316)'
                    : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              }}
            />
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-in-delay-1">
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">➕ Añadir archivo</button>
        <button onClick={() => setShowFolderForm(true)} className="btn-ghost text-sm">📁 Nueva carpeta</button>

        <div className="flex-1" />

        {/* Category filter */}
        <div className="flex gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: filterCategory === c.value ? 'rgba(124,58,237,0.15)' : 'rgba(100,116,139,0.1)',
                color: filterCategory === c.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: filterCategory === c.value ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <button
              onClick={() => navigateBreadcrumb(i)}
              className="hover:underline"
              style={{ color: i === breadcrumb.length - 1 ? 'var(--color-text)' : 'var(--color-text-muted)' }}
            >
              {crumb.name}
            </button>
          </span>
        ))}
        <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>({totalCount} archivos)</span>
      </div>

      {/* Folder Form */}
      {showFolderForm && (
        <div className="glass-card p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder="Nombre de la carpeta"
              className="input-field text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
            <button onClick={handleCreateFolder} className="btn-primary text-sm">Crear</button>
            <button onClick={() => { setShowFolderForm(false); setFolderName(''); }} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>📎 Añadir archivo por URL</h3>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="input-label">Nombre del archivo *</label>
              <input name="filename" required className="input-field text-sm" placeholder="mi-logo.png" />
            </div>
            <div>
              <label className="input-label">URL del archivo *</label>
              <input name="url" required type="url" className="input-field text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="input-label">URL thumbnail</label>
              <input name="thumbnailUrl" className="input-field text-sm" placeholder="https://... (opcional)" />
            </div>
            <div>
              <label className="input-label">Tipo MIME</label>
              <input name="mimeType" defaultValue="image/jpeg" className="input-field text-sm" />
            </div>
            <div>
              <label className="input-label">Tamaño (bytes)</label>
              <input name="sizeBytes" type="number" defaultValue="0" className="input-field text-sm" />
            </div>
            <div>
              <label className="input-label">Categoría</label>
              <select name="category" className="input-field text-sm">
                {CATEGORIES.filter(c => c.value).map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Tags (separados por coma)</label>
              <input name="tags" className="input-field text-sm" placeholder="logo, marca, principal" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={uploading} className="btn-primary text-sm">
                {uploading ? '⏳ Añadiendo...' : '💾 Añadir'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="glass-card p-3 cursor-pointer hover:scale-[1.02] transition-all group"
                  onClick={() => navigateToFolder(folder)}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-1">📁</div>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{folder.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {folder._count?.files ?? 0} archivos
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded"
                    style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Files Grid */}
          {files.length === 0 && folders.length === 0 ? (
            <div className="glass-card p-12 text-center animate-fade-in">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No hay archivos aquí</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Añadí archivos por URL o creá una carpeta para empezar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {files.map(file => (
                <div key={file.id} className="glass-card overflow-hidden group relative">
                  {/* Thumbnail */}
                  <div
                    className="aspect-square bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${file.thumbnailUrl || file.url})`,
                      backgroundColor: 'rgba(124,58,237,0.05)',
                    }}
                  >
                    {!file.thumbnailUrl && !file.url && (
                      <div className="flex items-center justify-center h-full text-2xl">📎</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{file.filename}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatSize(file.sizeBytes)}</span>
                      <span className="chip text-xs" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                        {CATEGORIES.find(c => c.value === file.category)?.icon || '📎'} {file.category}
                      </span>
                    </div>
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)', fontSize: '0.6rem' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                    <button
                      onClick={() => setEditingFile(file)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: 'var(--color-primary)' }}
                    >✏️</button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <EditFileModal
          file={editingFile}
          onSave={(data) => handleUpdateFile(editingFile.id, data)}
          onClose={() => setEditingFile(null)}
        />
      )}
    </div>
  );
}

// ── Edit File Modal ──

function EditFileModal({
  file,
  onSave,
  onClose,
}: {
  file: MediaFile;
  onSave: (data: Partial<MediaFile>) => void;
  onClose: () => void;
}) {
  const [tags, setTags] = useState(file.tags.join(', '));
  const [category, setCategory] = useState(file.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-card p-6 w-full max-w-md animate-fade-in">
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>✏️ Editar — {file.filename}</h3>

        <div className="space-y-3">
          <div>
            <label className="input-label">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-sm">
              {CATEGORIES.filter(c => c.value).map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Tags (separados por coma)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="input-field text-sm"
              placeholder="logo, marca, principal"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave({
              category,
              tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            })}
            className="btn-primary text-sm"
          >
            💾 Guardar
          </button>
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
