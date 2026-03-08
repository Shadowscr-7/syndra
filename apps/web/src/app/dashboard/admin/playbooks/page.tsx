'use client';

import { useEffect, useState, useCallback } from 'react';

interface Playbook {
  id: string;
  slug?: string;
  name: string;
  icon: string;
  description?: string | null;
  themes?: string[];
  tones?: string[];
  hashtags?: string[];
  formats?: string[];
  audiences?: string[];
  scheduleHint?: string | null;
  isActive?: boolean;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchPlaybooks = useCallback(async () => {
    try {
      const res = await fetch(`${base}/api/onboarding/playbooks`, { credentials: 'include' });
      if (!res.ok) {
        // Fallback to public endpoint
        const res2 = await fetch(`${base}/api/onboarding/industries`, { credentials: 'include' });
        const json2 = await res2.json();
        setPlaybooks(Array.isArray(json2.data) ? json2.data : []);
        return;
      }
      const json = await res.json();
      setPlaybooks(Array.isArray(json.data) ? json.data : []);
    } catch {
      setPlaybooks([]);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { fetchPlaybooks(); }, [fetchPlaybooks]);

  const seedPlaybooks = async () => {
    setSeeding(true);
    setMsg(null);
    try {
      const res = await fetch(`${base}/api/onboarding/seed-playbooks`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Seed failed');
      setMsg({ type: 'ok', text: 'Playbooks creados/actualizados correctamente.' });
      await fetchPlaybooks();
    } catch {
      setMsg({ type: 'err', text: 'Error al ejecutar seed.' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">📚 Industry Playbooks</h1>
          <p className="page-subtitle">
            Plantillas de configuración por industria — se aplican durante el onboarding
          </p>
        </div>
        <button
          onClick={seedPlaybooks}
          disabled={seeding}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {seeding ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              Seedeando…
            </>
          ) : (
            <>🌱 Seed Playbooks</>
          )}
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div
          className="glass-card px-4 py-3 text-sm animate-fade-in"
          style={{
            borderColor: msg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
            color: msg.type === 'ok' ? '#10b981' : '#ef4444',
          }}
        >
          {msg.type === 'ok' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : playbooks.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <span className="text-5xl animate-float inline-block mb-4">📭</span>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Sin playbooks</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Haz clic en <strong>Seed Playbooks</strong> para crear las 8 plantillas por industria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-delay-1">
          {playbooks.map((pb) => {
            const isOpen = expanded === pb.id;
            return (
              <div
                key={pb.id}
                className="glass-card transition-all cursor-pointer"
                style={{
                  opacity: pb.isActive !== false ? 1 : 0.5,
                  borderColor: isOpen ? 'rgba(124,58,237,0.3)' : undefined,
                }}
                onClick={() => setExpanded(isOpen ? null : pb.id)}
              >
                {/* Card Header */}
                <div className="p-5 flex items-start gap-3">
                  <span className="text-2xl">{pb.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                        {pb.name}
                      </h3>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: pb.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: pb.isActive !== false ? '#10b981' : '#ef4444',
                        }}
                      >
                        {pb.isActive !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {pb.description || (pb.slug ? `Slug: ${pb.slug}` : pb.name)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-primary-light)' }}>
                        {toArray(pb.themes).length} temas
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4' }}>
                        {toArray(pb.tones).length} tonos
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                        {toArray(pb.formats).length} formatos
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                        {toArray(pb.hashtags).length} hashtags
                      </span>
                    </div>
                  </div>
                  <span className="text-xs transition-transform" style={{ color: 'var(--color-text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                    ▼
                  </span>
                </div>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="pt-3">
                      <DetailSection label="Temas" items={pb.themes} color="#7c3aed" />
                      <DetailSection label="Tonos" items={pb.tones} color="#06b6d4" />
                      <DetailSection label="Formatos" items={pb.formats} color="#f59e0b" />
                      <DetailSection label="Audiencias" items={pb.audiences} color="#10b981" />
                      <DetailSection label="Hashtags" items={pb.hashtags} color="#ec4899" />
                      {pb.scheduleHint && (
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Horario sugerido</span>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{pb.scheduleHint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch { /* ignore */ }
  }
  return [];
}

function DetailSection({ label, items, color }: { label: string; items: unknown; color: string }) {
  const arr = toArray(items);
  if (arr.length === 0) return null;
  return (
    <div className="mt-2">
      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {arr.map((item) => (
          <span
            key={item}
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: `${color}10`, color, border: `1px solid ${color}20` }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
