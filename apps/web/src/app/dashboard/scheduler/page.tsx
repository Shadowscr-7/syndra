'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ──

interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  time: string;
  socialAccountIds: string[];
  priority: number;
}

interface Schedule {
  id: string;
  name: string;
  timezone: string;
  isActive: boolean;
  contentProfileId?: string;
  contentProfile?: { id: string; name: string };
  slots: ScheduleSlot[];
  createdAt: string;
}

const DAYS = [
  { value: 'MONDAY', label: 'Lun', full: 'Lunes' },
  { value: 'TUESDAY', label: 'Mar', full: 'Martes' },
  { value: 'WEDNESDAY', label: 'Mié', full: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jue', full: 'Jueves' },
  { value: 'FRIDAY', label: 'Vie', full: 'Viernes' },
  { value: 'SATURDAY', label: 'Sáb', full: 'Sábado' },
  { value: 'SUNDAY', label: 'Dom', full: 'Domingo' },
];

const TIMEZONES = [
  'America/Mexico_City',
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Lima',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
];

const CHANNELS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '🎬' },
  { value: 'twitter', label: 'X/Twitter', icon: '🐦' },
];

// ── Page ──

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showSlotForm, setShowSlotForm] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [schedRes, profRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/profiles'),
      ]);
      const schedData = await schedRes.json();
      const profData = await profRes.json();
      setSchedules(schedData.data ?? []);
      setProfiles((profData.data ?? []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {
      toast('err', 'Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Create schedule ──

  const handleCreate = async (data: any) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear');
      toast('ok', 'Horario creado');
      setShowCreate(false);
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Update schedule ──

  const handleUpdate = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast('ok', 'Horario actualizado');
      setEditingSchedule(null);
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Delete schedule ──

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este horario y todos sus slots?')) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Horario eliminado');
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Toggle active ──

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}/toggle`, { method: 'PUT' });
      if (!res.ok) throw new Error('Error');
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Add slot ──

  const handleAddSlot = async (scheduleId: string, data: any) => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear slot');
      toast('ok', 'Slot añadido');
      setShowSlotForm(null);
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Remove slot ──

  const handleRemoveSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/schedules/slots/${slotId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Slot eliminado');
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    }
  };

  // ── Group slots by day for calendar view ──

  const allSlots = schedules.flatMap(s => s.slots.map(sl => ({ ...sl, scheduleName: s.name, scheduleId: s.id, scheduleActive: s.isActive })));
  const slotsByDay: Record<string, typeof allSlots> = {};
  DAYS.forEach(d => { slotsByDay[d.value] = allSlots.filter(s => s.dayOfWeek === d.value).sort((a, b) => a.time.localeCompare(b.time)); });

  const totalSlots = allSlots.length;
  const activeSchedules = schedules.filter(s => s.isActive).length;

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
        <h1 className="page-title">📅 Scheduler</h1>
        <p className="page-subtitle">Configura tus horarios de publicación. El sistema generará y publicará contenido automáticamente.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{schedules.length}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Horarios</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeSchedules}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Activos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{totalSlots}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Slots / semana</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 animate-fade-in-delay-1">
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">➕ Nuevo horario</button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <ScheduleForm
          profiles={profiles}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* Weekly Calendar View */}
          <div className="glass-card p-5 animate-fade-in-delay-2">
            <h2 className="section-title mb-4">📆 Vista semanal</h2>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(day => (
                <div key={day.value}>
                  <div
                    className="text-center text-xs font-bold py-2 rounded-t-lg"
                    style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}
                  >
                    {day.label}
                  </div>
                  <div className="min-h-[120px] rounded-b-lg p-1.5 space-y-1" style={{ backgroundColor: 'rgba(100,116,139,0.05)', border: '1px solid var(--color-border)' }}>
                    {slotsByDay[day.value]?.map(slot => (
                      <div
                        key={slot.id}
                        className="text-xs p-1.5 rounded-lg group relative cursor-default"
                        style={{
                          backgroundColor: slot.scheduleActive ? 'rgba(124,58,237,0.12)' : 'rgba(100,116,139,0.1)',
                          color: slot.scheduleActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          border: `1px solid ${slot.scheduleActive ? 'rgba(124,58,237,0.2)' : 'transparent'}`,
                        }}
                      >
                        <div className="font-mono font-bold">{slot.time}</div>
                        <div className="text-xs opacity-70 truncate">{slot.scheduleName}</div>
                        {slot.socialAccountIds.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {slot.socialAccountIds.map(ch => (
                              <span key={ch} title={ch}>{CHANNELS.find(c => c.value === ch)?.icon || '📱'}</span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-xs px-1 rounded"
                          style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' }}
                        >✕</button>
                      </div>
                    ))}
                    {(!slotsByDay[day.value] || slotsByDay[day.value]!.length === 0) && (
                      <div className="text-xs text-center py-4 opacity-30">—</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Cards */}
          <h2 className="section-title">📋 Horarios configurados</h2>

          {schedules.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No hay horarios configurados</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Creá un horario para empezar a publicar automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map(sched => (
                <div key={sched.id} className="glass-card p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-2xl opacity-40 pointer-events-none" />
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{sched.name}</h3>
                        {sched.contentProfile && (
                          <span className="chip text-xs">{sched.contentProfile.name}</span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>🌍 {sched.timezone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(sched.id)}
                          className="badge cursor-pointer"
                          style={{
                            backgroundColor: sched.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.15)',
                            color: sched.isActive ? '#10b981' : 'var(--color-text-muted)',
                          }}
                        >
                          <span className="badge-dot" style={{ backgroundColor: sched.isActive ? '#10b981' : '#94a3b8' }} />
                          {sched.isActive ? 'Activo' : 'Pausado'}
                        </button>
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sched.slots.map(slot => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-primary)' }}
                        >
                          <span className="font-bold">{DAYS.find(d => d.value === slot.dayOfWeek)?.label}</span>
                          <span className="font-mono">{slot.time}</span>
                          {slot.socialAccountIds.map(ch => (
                            <span key={ch}>{CHANNELS.find(c => c.value === ch)?.icon || '📱'}</span>
                          ))}
                          <button
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="ml-1 hover:text-red-400"
                          >✕</button>
                        </div>
                      ))}
                      {sched.slots.length === 0 && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin slots configurados</span>
                      )}
                    </div>

                    {/* Slot Form */}
                    {showSlotForm === sched.id && (
                      <SlotForm
                        onSave={(data) => handleAddSlot(sched.id, data)}
                        onCancel={() => setShowSlotForm(null)}
                      />
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={() => setShowSlotForm(showSlotForm === sched.id ? null : sched.id)} className="btn-primary text-xs px-3 py-1.5">
                        ➕ Slot
                      </button>
                      <button
                        onClick={() => setEditingSchedule(sched)}
                        className="btn-ghost text-xs px-3 py-1.5"
                      >✏️ Editar</button>
                      <button
                        onClick={() => handleDelete(sched.id)}
                        className="btn-danger text-xs px-3 py-1.5"
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg">
            <ScheduleForm
              initial={editingSchedule}
              profiles={profiles}
              onSave={(data) => handleUpdate(editingSchedule.id, data)}
              onCancel={() => setEditingSchedule(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Form ──

function ScheduleForm({
  initial,
  profiles,
  onSave,
  onCancel,
}: {
  initial?: Schedule;
  profiles: { id: string; name: string }[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'America/Mexico_City');
  const [contentProfileId, setContentProfileId] = useState(initial?.contentProfileId ?? '');

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>
        {initial ? '✏️ Editar horario' : '➕ Nuevo horario'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="input-label">Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field text-sm" placeholder="Mi horario semanal" />
        </div>
        <div>
          <label className="input-label">Zona horaria</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input-field text-sm">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="input-label">Perfil de contenido (opcional)</label>
          <select value={contentProfileId} onChange={e => setContentProfileId(e.target.value)} className="input-field text-sm">
            <option value="">— Sin perfil —</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave({ name: name || 'Mi horario', timezone, contentProfileId: contentProfileId || undefined })}
          className="btn-primary text-sm"
        >💾 {initial ? 'Guardar' : 'Crear'}</button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// ── Slot Form ──

function SlotForm({
  onSave,
  onCancel,
}: {
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [time, setTime] = useState('09:00');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram']);

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  return (
    <div className="rounded-xl p-4 mb-3 animate-fade-in" style={{ backgroundColor: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="input-label">Día</label>
          <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="input-field text-sm">
            {DAYS.map(d => <option key={d.value} value={d.value}>{d.full}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Hora</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="input-label">Canales</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {CHANNELS.map(ch => (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{
                  backgroundColor: selectedChannels.includes(ch.value) ? 'rgba(124,58,237,0.15)' : 'rgba(100,116,139,0.1)',
                  color: selectedChannels.includes(ch.value) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: `1px solid ${selectedChannels.includes(ch.value) ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                }}
              >
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSave({ dayOfWeek, time, socialAccountIds: selectedChannels })}
          className="btn-primary text-xs"
        >✅ Añadir slot</button>
        <button onClick={onCancel} className="btn-ghost text-xs">Cancelar</button>
      </div>
    </div>
  );
}
