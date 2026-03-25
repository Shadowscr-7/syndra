'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBackgroundTasks } from '@/lib/background-tasks-context';

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

interface WeeklyPlanConfig {
  id: string;
  name: string;
  isActive: boolean;
  contentMode: string;
  approvalMode: string;
  plannerRunDays: string[];
  plannerRunTime: string;
  publishDays: string[];
  publishTime: string;
  targetChannels: string[];
  timezone: string;
  musicEnabled?: boolean;
  musicStyle?: string;
  musicPrompt?: string;
  campaignId?: string;
  campaign?: { id: string; name: string; targetChannels: string[]; musicEnabled?: boolean; musicStyle?: string; musicPrompt?: string };
}

interface CostEstimate {
  totalItems: number;
  musicEnabled: boolean;
  musicStyle: string | null;
  musicCostPerItem: number;
  musicCost: number;
  totalCost: number;
  currentBalance: number;
  isUnlimited: boolean;
  canAfford: boolean;
  canAffordPartial: boolean;
  affordableItems: number;
}

interface MediaAsset {
  id: string;
  type: string;
  originalUrl?: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  provider?: string;
  status: string;
}

interface PlannedItem {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  dayOfWeek: string;
  status: string;
  editorialRun?: {
    id: string;
    status: string;
    errorMessage?: string;
    contentBrief?: {
      format?: string;
      angle?: string;
      contentVersions?: { hook?: string; body?: string; caption?: string; mediaAssets?: MediaAsset[] }[];
    };
  };
}

interface WeeklyBatch {
  id: string;
  weekLabel: string;
  status: string;
  totalItems: number;
  approvedItems: number;
  createdAt: string;
  config?: { name: string };
  items: PlannedItem[];
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

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Pacific/Midway', label: '(UTC-11:00) Midway, Samoa' },
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Honolulu, Hawái' },
  { value: 'America/Anchorage', label: '(UTC-09:00) Anchorage, Alaska' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Los Ángeles, Tijuana' },
  { value: 'America/Vancouver', label: '(UTC-08:00) Vancouver, Canadá' },
  { value: 'America/Denver', label: '(UTC-07:00) Denver, Phoenix' },
  { value: 'America/Chihuahua', label: '(UTC-07:00) Chihuahua, Mazatlán' },
  { value: 'America/Chicago', label: '(UTC-06:00) Chicago, Dallas' },
  { value: 'America/Mexico_City', label: '(UTC-06:00) Ciudad de México' },
  { value: 'America/Guatemala', label: '(UTC-06:00) Guatemala, San Salvador' },
  { value: 'America/Costa_Rica', label: '(UTC-06:00) Costa Rica' },
  { value: 'America/Tegucigalpa', label: '(UTC-06:00) Tegucigalpa, Honduras' },
  { value: 'America/Managua', label: '(UTC-06:00) Managua, Nicaragua' },
  { value: 'America/New_York', label: '(UTC-05:00) Nueva York, Miami' },
  { value: 'America/Toronto', label: '(UTC-05:00) Toronto, Canadá' },
  { value: 'America/Bogota', label: '(UTC-05:00) Bogotá, Colombia' },
  { value: 'America/Lima', label: '(UTC-05:00) Lima, Perú' },
  { value: 'America/Guayaquil', label: '(UTC-05:00) Quito, Ecuador' },
  { value: 'America/Panama', label: '(UTC-05:00) Panamá' },
  { value: 'America/Havana', label: '(UTC-05:00) La Habana, Cuba' },
  { value: 'America/Jamaica', label: '(UTC-05:00) Kingston, Jamaica' },
  { value: 'America/Caracas', label: '(UTC-04:00) Caracas, Venezuela' },
  { value: 'America/La_Paz', label: '(UTC-04:00) La Paz, Bolivia' },
  { value: 'America/Santo_Domingo', label: '(UTC-04:00) Santo Domingo, Rep. Dom.' },
  { value: 'America/Puerto_Rico', label: '(UTC-04:00) Puerto Rico' },
  { value: 'America/Santiago', label: '(UTC-04:00) Santiago, Chile' },
  { value: 'America/Asuncion', label: '(UTC-04:00) Asunción, Paraguay' },
  { value: 'America/Guyana', label: '(UTC-04:00) Georgetown, Guyana' },
  { value: 'America/Argentina/Buenos_Aires', label: '(UTC-03:00) Buenos Aires, Argentina' },
  { value: 'America/Montevideo', label: '(UTC-03:00) Montevideo, Uruguay' },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) São Paulo, Brasil' },
  { value: 'America/Recife', label: '(UTC-03:00) Recife, Brasil' },
  { value: 'America/Paramaribo', label: '(UTC-03:00) Paramaribo, Surinam' },
  { value: 'Atlantic/South_Georgia', label: '(UTC-02:00) Georgia del Sur' },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores, Portugal' },
  { value: 'Atlantic/Cape_Verde', label: '(UTC-01:00) Cabo Verde' },
  { value: 'UTC', label: '(UTC+00:00) UTC' },
  { value: 'Europe/London', label: '(UTC+00:00) Londres, Reino Unido' },
  { value: 'Europe/Dublin', label: '(UTC+00:00) Dublín, Irlanda' },
  { value: 'Europe/Lisbon', label: '(UTC+00:00) Lisboa, Portugal' },
  { value: 'Africa/Casablanca', label: '(UTC+00:00) Casablanca, Marruecos' },
  { value: 'Africa/Accra', label: '(UTC+00:00) Accra, Ghana' },
  { value: 'Europe/Madrid', label: '(UTC+01:00) Madrid, España' },
  { value: 'Europe/Barcelona', label: '(UTC+01:00) Barcelona, España' },
  { value: 'Europe/Paris', label: '(UTC+01:00) París, Francia' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Berlín, Alemania' },
  { value: 'Europe/Rome', label: '(UTC+01:00) Roma, Italia' },
  { value: 'Europe/Amsterdam', label: '(UTC+01:00) Ámsterdam, Países Bajos' },
  { value: 'Europe/Brussels', label: '(UTC+01:00) Bruselas, Bélgica' },
  { value: 'Europe/Zurich', label: '(UTC+01:00) Zúrich, Suiza' },
  { value: 'Europe/Vienna', label: '(UTC+01:00) Viena, Austria' },
  { value: 'Europe/Warsaw', label: '(UTC+01:00) Varsovia, Polonia' },
  { value: 'Europe/Stockholm', label: '(UTC+01:00) Estocolmo, Suecia' },
  { value: 'Europe/Oslo', label: '(UTC+01:00) Oslo, Noruega' },
  { value: 'Europe/Copenhagen', label: '(UTC+01:00) Copenhague, Dinamarca' },
  { value: 'Europe/Prague', label: '(UTC+01:00) Praga, Chequia' },
  { value: 'Africa/Lagos', label: '(UTC+01:00) Lagos, Nigeria' },
  { value: 'Africa/Algiers', label: '(UTC+01:00) Argel, Argelia' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Atenas, Grecia' },
  { value: 'Europe/Bucharest', label: '(UTC+02:00) Bucarest, Rumania' },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki, Finlandia' },
  { value: 'Europe/Kiev', label: '(UTC+02:00) Kiev, Ucrania' },
  { value: 'Europe/Istanbul', label: '(UTC+03:00) Estambul, Turquía' },
  { value: 'Africa/Cairo', label: '(UTC+02:00) El Cairo, Egipto' },
  { value: 'Africa/Johannesburg', label: '(UTC+02:00) Johannesburgo, Sudáfrica' },
  { value: 'Asia/Jerusalem', label: '(UTC+02:00) Jerusalén, Israel' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscú, Rusia' },
  { value: 'Asia/Riyadh', label: '(UTC+03:00) Riad, Arabia Saudita' },
  { value: 'Asia/Baghdad', label: '(UTC+03:00) Bagdad, Irak' },
  { value: 'Africa/Nairobi', label: '(UTC+03:00) Nairobi, Kenia' },
  { value: 'Asia/Tehran', label: '(UTC+03:30) Teherán, Irán' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubái, EAU' },
  { value: 'Asia/Baku', label: '(UTC+04:00) Bakú, Azerbaiyán' },
  { value: 'Asia/Kabul', label: '(UTC+04:30) Kabul, Afganistán' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi, Pakistán' },
  { value: 'Asia/Tashkent', label: '(UTC+05:00) Taskent, Uzbekistán' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) India (Mumbai, Delhi)' },
  { value: 'Asia/Colombo', label: '(UTC+05:30) Colombo, Sri Lanka' },
  { value: 'Asia/Kathmandu', label: '(UTC+05:45) Katmandú, Nepal' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Daca, Bangladesh' },
  { value: 'Asia/Almaty', label: '(UTC+06:00) Almaty, Kazajistán' },
  { value: 'Asia/Rangoon', label: '(UTC+06:30) Rangún, Myanmar' },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok, Tailandia' },
  { value: 'Asia/Jakarta', label: '(UTC+07:00) Yakarta, Indonesia' },
  { value: 'Asia/Ho_Chi_Minh', label: '(UTC+07:00) Ho Chi Minh, Vietnam' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Shanghái, China' },
  { value: 'Asia/Hong_Kong', label: '(UTC+08:00) Hong Kong' },
  { value: 'Asia/Taipei', label: '(UTC+08:00) Taipéi, Taiwán' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapur' },
  { value: 'Asia/Kuala_Lumpur', label: '(UTC+08:00) Kuala Lumpur, Malasia' },
  { value: 'Australia/Perth', label: '(UTC+08:00) Perth, Australia' },
  { value: 'Asia/Manila', label: '(UTC+08:00) Manila, Filipinas' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokio, Japón' },
  { value: 'Asia/Seoul', label: '(UTC+09:00) Seúl, Corea del Sur' },
  { value: 'Australia/Adelaide', label: '(UTC+09:30) Adelaida, Australia' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sídney, Australia' },
  { value: 'Australia/Melbourne', label: '(UTC+10:00) Melbourne, Australia' },
  { value: 'Australia/Brisbane', label: '(UTC+10:00) Brisbane, Australia' },
  { value: 'Pacific/Guam', label: '(UTC+10:00) Guam' },
  { value: 'Pacific/Noumea', label: '(UTC+11:00) Numea, Nueva Caledonia' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, Nueva Zelanda' },
  { value: 'Pacific/Fiji', label: '(UTC+12:00) Fiyi' },
  { value: 'Pacific/Tongatapu', label: '(UTC+13:00) Tonga' },
];

const CHANNELS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '🎬' },
  { value: 'twitter', label: 'X/Twitter', icon: '🐦' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  GENERATING: { label: 'Generando...', color: 'text-yellow-400' },
  GENERATING_MUSIC: { label: 'Generando música...', color: 'text-violet-400' },
  PENDING_REVIEW: { label: 'Pendiente', color: 'text-orange-400' },
  PARTIALLY_APPROVED: { label: 'Parcial', color: 'text-blue-400' },
  FULLY_APPROVED: { label: 'Aprobado', color: 'text-green-400' },
  PUBLISHED: { label: 'Publicado', color: 'text-emerald-400' },
  CANCELLED: { label: 'Rechazado', color: 'text-red-400' },
  APPROVED: { label: 'Aprobado', color: 'text-green-400' },
  MODIFIED: { label: 'Modificado', color: 'text-purple-400' },
  REJECTED: { label: 'Rechazado', color: 'text-red-400' },
  PUBLISHING: { label: 'Publicando...', color: 'text-cyan-400' },
  FAILED: { label: 'Error', color: 'text-red-500' },
};

type Tab = 'schedules' | 'planner';

// ══════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════

export default function SchedulerPage() {
  const [tab, setTab] = useState<Tab>('schedules');
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const toast = (type: 'ok' | 'err', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
        <p className="page-subtitle">Configura publicaciones diarias o planifica toda la semana con pre-aprobación.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl animate-fade-in" style={{ backgroundColor: 'rgba(100,116,139,0.1)' }}>
        <button
          onClick={() => setTab('schedules')}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: tab === 'schedules' ? 'rgba(124,58,237,0.2)' : 'transparent',
            color: tab === 'schedules' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            border: tab === 'schedules' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
          }}
        >
          ⏰ Horarios diarios
        </button>
        <button
          onClick={() => setTab('planner')}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: tab === 'planner' ? 'rgba(124,58,237,0.2)' : 'transparent',
            color: tab === 'planner' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            border: tab === 'planner' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
          }}
        >
          🗓️ Planificador semanal
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">PRO</span>
        </button>
      </div>

      {/* Tab content */}
      {tab === 'schedules' ? (
        <SchedulesTab toast={toast} />
      ) : (
        <PlannerTab toast={toast} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 1: Horarios diarios (existing scheduler)
// ══════════════════════════════════════════════════════════

function SchedulesTab({ toast }: { toast: (type: 'ok' | 'err', text: string) => void }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showSlotForm, setShowSlotForm] = useState<string | null>(null);

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
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    } catch (e: any) { toast('err', e.message); }
  };

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
    } catch (e: any) { toast('err', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este horario y todos sus slots?')) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Horario eliminado');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}/toggle`, { method: 'PUT' });
      if (!res.ok) throw new Error('Error');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

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
    } catch (e: any) { toast('err', e.message); }
  };

  const handleRemoveSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/schedules/slots/${slotId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Slot eliminado');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const allSlots = schedules.flatMap(s => s.slots.map(sl => ({ ...sl, scheduleName: s.name, scheduleId: s.id, scheduleActive: s.isActive })));
  const slotsByDay: Record<string, typeof allSlots> = {};
  DAYS.forEach(d => { slotsByDay[d.value] = allSlots.filter(s => s.dayOfWeek === d.value).sort((a, b) => a.time.localeCompare(b.time)); });

  const totalSlots = allSlots.length;
  const activeSchedules = schedules.filter(s => s.isActive).length;

  return (
    <>
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
                  <div className="text-center text-xs font-bold py-2 rounded-t-lg" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}>
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{sched.name}</h3>
                        {sched.contentProfile && <span className="chip text-xs">{sched.contentProfile.name}</span>}
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
                          <button onClick={() => handleRemoveSlot(slot.id)} className="ml-1 hover:text-red-400">✕</button>
                        </div>
                      ))}
                      {sched.slots.length === 0 && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin slots configurados</span>
                      )}
                    </div>

                    {showSlotForm === sched.id && (
                      <SlotForm
                        onSave={(data) => handleAddSlot(sched.id, data)}
                        onCancel={() => setShowSlotForm(null)}
                      />
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setShowSlotForm(showSlotForm === sched.id ? null : sched.id)} className="btn-primary text-xs px-3 py-1.5">➕ Slot</button>
                      <button onClick={() => setEditingSchedule(sched)} className="btn-ghost text-xs px-3 py-1.5">✏️ Editar</button>
                      <button onClick={() => handleDelete(sched.id)} className="btn-danger text-xs px-3 py-1.5">🗑️</button>
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
    </>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 2: Planificador semanal (weekly planner, Pro)
// ══════════════════════════════════════════════════════════

function PlannerTab({ toast }: { toast: (type: 'ok' | 'err', text: string) => void }) {
  const { addTask, runningCount } = useBackgroundTasks();
  const [configs, setConfigs] = useState<WeeklyPlanConfig[]>([]);
  const [batches, setBatches] = useState<WeeklyBatch[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; targetChannels: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WeeklyPlanConfig | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [proBlocked, setProBlocked] = useState(false);
  const [costEstimate, setCostEstimate] = useState<{ configId: string; data: CostEstimate } | null>(null);
  const [selectedItem, setSelectedItem] = useState<PlannedItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [imagePromptDraft, setImagePromptDraft] = useState('');
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [modelSelectorItemId, setModelSelectorItemId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cfgRes, batchRes, campRes] = await Promise.all([
        fetch('/api/weekly-planner/configs'),
        fetch('/api/weekly-planner/batches'),
        fetch('/api/campaigns'),
      ]);
      if (cfgRes.status === 403 || batchRes.status === 403) {
        setProBlocked(true);
        return;
      }
      const cfgData = await cfgRes.json();
      const batchData = await batchRes.json();
      setConfigs(cfgData.data ?? []);
      setBatches(batchData.data ?? []);
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.data ?? []);
      }
    } catch {
      toast('err', 'Error al cargar planificador');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-poll every 5s while any batch is GENERATING or background tasks are running
  useEffect(() => {
    const hasGenerating = batches.some((b) => b.status === 'GENERATING');
    if (!hasGenerating && runningCount === 0) return;
    const interval = setInterval(fetchAll, 5_000);
    return () => clearInterval(interval);
  }, [batches, fetchAll, runningCount]);

  const handleCreateConfig = async (data: any) => {
    try {
      const res = await fetch('/api/weekly-planner/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error');
      toast('ok', 'Planificador creado');
      setShowCreate(false);
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleUpdateConfig = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/weekly-planner/configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast('ok', 'Configuración actualizada');
      setEditingConfig(null);
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración?')) return;
    try {
      await fetch(`/api/weekly-planner/configs/${id}`, { method: 'DELETE' });
      toast('ok', 'Eliminado');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleToggleConfig = async (config: WeeklyPlanConfig) => {
    await handleUpdateConfig(config.id, { isActive: !config.isActive });
  };

  const handleGenerate = async (configId: string) => {
    // First check if music is enabled and estimate costs
    try {
      const estRes = await fetch(`/api/weekly-planner/configs/${configId}/estimate-cost`);
      if (estRes.ok) {
        const { data } = await estRes.json();
        if (data.musicEnabled && data.totalCost > 0 && !data.isUnlimited) {
          setCostEstimate({ configId, data });
          return; // Wait for user confirmation
        }
      }
    } catch { /* proceed without estimate */ }
    await executeGenerate(configId);
  };

  const executeGenerate = async (configId: string, skipMusic?: boolean) => {
    setCostEstimate(null);
    setGenerating(configId);
    try {
      const res = await fetch(`/api/weekly-planner/batches/generate/${configId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipMusic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al generar');
      toast('ok', skipMusic
        ? 'Lote generado sin música — el contenido se está creando'
        : 'Lote generado — el contenido se está creando');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
    finally { setGenerating(null); }
  };

  const handleApproveAll = async (batchId: string) => {
    try {
      const res = await fetch(`/api/weekly-planner/batches/${batchId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Error');
      toast('ok', 'Todas las publicaciones aprobadas');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleApproveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/weekly-planner/items/${itemId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Error');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleRejectItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/weekly-planner/items/${itemId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Error');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  const handleCancelBatch = async (batchId: string) => {
    if (!confirm('¿Detener la generación? Los items pendientes se marcarán como rechazados.')) return;
    try {
      const res = await fetch(`/api/weekly-planner/batches/${batchId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al detener');
      toast('ok', 'Generación detenida');
      await fetchAll();
    } catch (e: any) { toast('err', e.message); }
  };

  // ── Item-level actions ──
  const doItemAction = async (itemId: string, action: string, opts?: { method?: string; body?: any; successMsg?: string; closeModal?: boolean }) => {
    setActionLoading(action);
    if (opts?.closeModal) {
      setSelectedItem(null);
      setEditingCaption(false);
      setShowImagePrompt(false);
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch(`/api/weekly-planner/items/${itemId}/${action}`, {
        method: opts?.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name === 'AbortError') return null;
        throw err;
      });
      clearTimeout(timeoutId);

      if (res && !res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message || `Error en ${action}`); }
      toast('ok', res ? (opts?.successMsg ?? 'Acción completada') : 'Procesando en segundo plano...');
    } catch (e: any) { toast('err', e.message); }
    finally {
      setActionLoading(null);
      await fetchAll();
      setTimeout(() => fetchAll(), 3000);
      setTimeout(() => fetchAll(), 8000);
    }
  };

  const handleRedoItem = (itemId: string) => {
    if (!confirm('¿Regenerar todo el contenido desde cero?')) return;
    doItemAction(itemId, 'redo', { successMsg: 'Regenerando contenido...', closeModal: true });
  };

  const handleRewriteText = (itemId: string) => {
    doItemAction(itemId, 'rewrite', { successMsg: 'Reescribiendo texto...', closeModal: true });
  };

  const handleRegenerateImage = (itemId: string, customPrompt?: string) => {
    doItemAction(itemId, 'regenerate-image', {
      body: customPrompt ? { customPrompt } : undefined,
      successMsg: 'Regenerando imagen...',
      closeModal: true,
    });
  };

  const handleRegenerateImagePro = async (itemId: string, customPrompt?: string, model?: string) => {
    setActionLoading('regenerate-image-pro');
    setModelSelectorItemId(null);
    try {
      const payload: Record<string, string> = {};
      if (customPrompt) payload.customPrompt = customPrompt;
      if (model) payload.model = model;
      const res = await fetch(`/api/weekly-planner/items/${itemId}/regenerate-image-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Error en regeneración Pro');
      }
      const { data } = await res.json();
      if (data?.taskId) {
        const modelLabel = model ? (model.includes('/') ? model.split('/').pop() : model) : 'Ideogram V3';
        addTask(data.taskId, 'image-pro', `Regeneración Pro (${modelLabel})`);
        toast('ok', '⚡ Regeneración Pro en segundo plano...');
      }
      setSelectedItem(null);
    } catch (e: any) { toast('err', e.message); }
    finally { setActionLoading(null); }
  };

  const handleGenerateMusic = async (itemId: string, style?: string, prompt?: string) => {
    setMusicGenerating(true);
    try {
      const res = await fetch(`/api/weekly-planner/items/${itemId}/generate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, prompt }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Error al generar música');
      }
      const { data } = await res.json();
      if (data?.taskId) {
        addTask(data.taskId, 'music', `Música: ${style ?? 'upbeat'}`);
        toast('ok', '🎵 Generando música en segundo plano...');
      }
      await fetchAll();
    } catch (e: any) {
      toast('err', e.message);
    } finally {
      setMusicGenerating(false);
    }
  };

  const handleEditText = (itemId: string, feedback: string) => {
    doItemAction(itemId, 'edit-text', {
      body: { feedback },
      successMsg: 'Actualizando texto...',
      closeModal: true,
    });
  };

  // Refresh selectedItem when batches change
  useEffect(() => {
    if (!selectedItem) return;
    const fresh = batches.flatMap(b => b.items).find(i => i.id === selectedItem.id);
    if (fresh) {
      // Always update to get latest data (new images, status changes)
      setSelectedItem({ ...fresh });
    }
  }, [batches]);

  // ── Pro gate ──
  if (proBlocked) {
    return (
      <div className="glass-card p-10 text-center animate-fade-in-delay-1">
        <p className="text-5xl mb-4">🔒</p>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Función exclusiva del plan Pro</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          El planificador semanal genera contenido para toda la semana y te permite pre-aprobar todo de una vez desde Telegram o el panel.
        </p>
        <a href="/dashboard/plans" className="btn-primary text-sm inline-block">Actualizar plan →</a>
      </div>
    );
  }

  const activeConfigs = configs.filter((c) => c.isActive).length;
  const pendingBatches = batches.filter((b) => b.status === 'PENDING_REVIEW' || b.status === 'PARTIALLY_APPROVED').length;
  const totalItems = batches.reduce((sum, b) => sum + b.totalItems, 0);

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in-delay-1">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{configs.length}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Planificadores</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeConfigs}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Activos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{pendingBatches}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Lotes pendientes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{totalItems}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Publicaciones totales</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 animate-fade-in-delay-1">
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">➕ Nuevo planificador</button>
      </div>

      {showCreate && (
        <PlannerConfigForm campaigns={campaigns} onSave={handleCreateConfig} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* Config cards */}
          {configs.length === 0 && !showCreate && (
            <div className="glass-card p-8 text-center animate-fade-in-delay-2">
              <p className="text-lg mb-2">🗓️ Sin planificadores configurados</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Crea un planificador para generar contenido automáticamente cada semana.
              </p>
            </div>
          )}

          {configs.map((config) => (
            <div key={config.id} className="glass-card p-5 animate-fade-in-delay-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="section-title">{config.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    config.isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {config.isActive ? 'Activo' : 'Pausado'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    config.contentMode === 'business'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {config.contentMode === 'business' ? '🏢 Empresa' : '📰 Editorial'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    config.approvalMode === 'telegram'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {config.approvalMode === 'telegram' ? '📲 Telegram' : '🖥️ Panel'}
                  </span>
                  {config.musicEnabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      🎵 {config.musicStyle ?? 'upbeat'}
                    </span>
                  )}
                  {config.campaign && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      🎯 {config.campaign.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerate(config.id)}
                    disabled={generating === config.id}
                    className="btn-primary text-xs"
                  >
                    {generating === config.id ? '⏳ Generando...' : '🚀 Generar ahora'}
                  </button>
                  <button onClick={() => handleToggleConfig(config)} className="btn-ghost text-xs">
                    {config.isActive ? '⏸ Pausar' : '▶ Activar'}
                  </button>
                  <button onClick={() => setEditingConfig(config)} className="btn-ghost text-xs">✏️ Editar</button>
                  <button onClick={() => handleDeleteConfig(config.id)} className="btn-ghost text-xs text-red-400">🗑️</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                <div>
                  <span className="font-medium">Genera:</span>{' '}
                  {config.plannerRunDays.map(d => DAYS.find(dd => dd.value === d)?.label).join(', ')} a las {config.plannerRunTime}
                </div>
                <div>
                  <span className="font-medium">Publica:</span>{' '}
                  {config.publishDays.map(d => DAYS.find(dd => dd.value === d)?.label).join(', ')} a las {config.publishTime}
                </div>
                <div>
                  <span className="font-medium">Canales:</span>{' '}
                  {(config.campaign?.targetChannels ?? config.targetChannels).map(c => CHANNELS.find(ch => ch.value === c)?.icon ?? c).join(' ')}
                  {config.campaign && <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>(campaña)</span>}
                </div>
                <div>
                  <span className="font-medium">Zona:</span> {config.timezone}
                </div>
              </div>

              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <div
                    key={d.value}
                    className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${
                      config.publishDays.includes(d.value)
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Edit config modal */}
          {editingConfig && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-lg">
                <PlannerConfigForm
                  initial={editingConfig}
                  campaigns={campaigns}
                  onSave={(data) => handleUpdateConfig(editingConfig.id, data)}
                  onCancel={() => setEditingConfig(null)}
                />
              </div>
            </div>
          )}

          {/* Cost confirmation dialog */}
          {costEstimate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCostEstimate(null)}>
              <div className="w-full max-w-md glass-card p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                  💎 Créditos necesarios
                </h3>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Publicaciones a generar</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{costEstimate.data.totalItems}</span>
                  </div>
                  {costEstimate.data.musicEnabled && (
                    <>
                      <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <span>🎵 Música ({costEstimate.data.musicStyle ?? 'upbeat'})</span>
                        <span className="font-medium" style={{ color: '#c084fc' }}>
                          {costEstimate.data.musicCostPerItem} créditos por publicación
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Solo se genera música para formatos con audio (Reels, Stories). Posts y carruseles no consumen créditos de música.
                      </div>
                    </>
                  )}
                  <div className="h-px" style={{ background: 'var(--color-border)' }} />
                  {costEstimate.data.musicEnabled && (
                    <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>Costo máximo estimado</span>
                      <span className="font-medium">{costEstimate.data.totalCost} créditos</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Tu saldo actual</span>
                    <span className="font-medium" style={{ color: costEstimate.data.canAfford ? '#34d399' : '#f87171' }}>
                      {costEstimate.data.currentBalance} créditos
                    </span>
                  </div>

                  {!costEstimate.data.canAfford && (
                    <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      ⚠️ No tenés créditos suficientes para generar música en todas las publicaciones.
                      {costEstimate.data.canAffordPartial && (
                        <span> Podés generar las publicaciones y la música se generará solo para las que alcancen los créditos ({costEstimate.data.affordableItems} de {costEstimate.data.totalItems}).</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {costEstimate.data.canAfford && (
                    <button
                      onClick={() => executeGenerate(costEstimate.configId)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                    >
                      ✅ Generar con música ({costEstimate.data.totalCost} créditos)
                    </button>
                  )}
                  {!costEstimate.data.canAfford && costEstimate.data.canAffordPartial && (
                    <button
                      onClick={() => executeGenerate(costEstimate.configId)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                    >
                      ⚡ Generar ({costEstimate.data.affordableItems} con música)
                    </button>
                  )}
                  <button
                    onClick={() => executeGenerate(costEstimate.configId, true)}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}
                  >
                    🚀 Generar sin música
                  </button>
                  <button
                    onClick={() => setCostEstimate(null)}
                    className="px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Batches */}
          {batches.length > 0 && (
            <div className="space-y-4 animate-fade-in-delay-2">
              <h2 className="section-title">📦 Lotes generados</h2>

              {batches.map((batch) => {
                const st = STATUS_LABELS[batch.status] ?? { label: batch.status, color: 'text-gray-400' };
                const isExpanded = expandedBatch === batch.id;
                const isGenerating = batch.status === 'GENERATING';
                const doneItems = batch.items.filter(i => 
                  (i.status !== 'GENERATING' && i.status !== 'GENERATING_MUSIC') || 
                  i.editorialRun?.status === 'REVIEW' || 
                  i.editorialRun?.status === 'FAILED'
                ).length;
                const totalItems = batch.totalItems || batch.items.length;
                const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

                return (
                  <div key={batch.id} className="glass-card p-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{isGenerating ? '⏳' : '📅'}</span>
                        <div>
                          <p className="font-medium text-sm">
                            Semana {batch.weekLabel}
                            {batch.config && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>({batch.config.name})</span>}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {isGenerating
                              ? `${doneItems}/${totalItems} completados • ${new Date(batch.createdAt).toLocaleDateString()}`
                              : `${batch.approvedItems}/${batch.totalItems} aprobadas • ${new Date(batch.createdAt).toLocaleDateString()}`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        {isGenerating && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelBatch(batch.id); }}
                            className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                          >
                            ⏹ Detener
                          </button>
                        )}
                        {(batch.status === 'PENDING_REVIEW' || batch.status === 'PARTIALLY_APPROVED') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveAll(batch.id); }}
                            className="btn-primary text-xs"
                          >
                            ✅ Aprobar todo
                          </button>
                        )}
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Progress bar when generating */}
                    {isGenerating && (
                      <div className="mt-3 px-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-yellow-400 font-medium">Generando contenido...</span>
                          <span className="text-xs font-bold text-yellow-300">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${progressPct}%`,
                              background: 'linear-gradient(90deg, #f59e0b, #eab308)',
                              boxShadow: '0 0 8px rgba(245,158,11,0.4)',
                            }}
                          />
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                          {doneItems} de {totalItems} items procesados
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                        {batch.items.map((item) => {
                          const ist = STATUS_LABELS[item.status] ?? { label: item.status, color: 'text-gray-400' };
                          const dayFull = DAYS.find(d => d.value === item.dayOfWeek)?.full ?? item.dayOfWeek;
                          const dateStr = new Date(item.scheduledDate).toLocaleDateString('es', { day: 'numeric', month: 'short' });
                          const hook = item.editorialRun?.contentBrief?.contentVersions?.[0]?.hook;
                          const fmt = item.editorialRun?.contentBrief?.format;
                          const assets = item.editorialRun?.contentBrief?.contentVersions?.[0]?.mediaAssets?.filter(a => a.status === 'READY') ?? [];
                          const mainImage = assets.find(a => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
                          const imageUrl = mainImage?.optimizedUrl || mainImage?.originalUrl;
                          const isItemGenerating = item.status === 'GENERATING' || item.status === 'GENERATING_MUSIC';
                          const FORMAT_ICONS: Record<string, string> = { POST: '📷', CAROUSEL: '🎠', REEL: '🎬', STORY: '📱', THREAD: '🧵' };

                          return (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                              style={{ background: isItemGenerating ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.03)' }}
                              onClick={() => !isItemGenerating && setSelectedItem(item)}
                            >
                              {/* Thumbnail or generating spinner */}
                              <div className="flex-shrink-0 mr-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={hook || 'Imagen generada'}
                                    className="w-14 h-14 rounded-lg object-cover"
                                    style={{ border: '1px solid var(--color-border)' }}
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: isItemGenerating ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }}>
                                    {isItemGenerating ? (
                                      <span className="animate-spin text-lg">⏳</span>
                                    ) : (
                                      <span className="text-lg opacity-30">📄</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{dayFull} {dateStr}</span>
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.scheduledTime}</span>
                                  <span className={`text-xs ${ist.color}`}>{ist.label}</span>
                                  {fmt && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                                      {FORMAT_ICONS[fmt.toUpperCase()] ?? '📄'} {fmt}
                                    </span>
                                  )}
                                </div>
                                {hook && (
                                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{hook}</p>
                                )}
                                {!imageUrl && item.editorialRun?.errorMessage && (
                                  <p className="text-xs mt-1 text-amber-400">⚠️ {item.editorialRun.errorMessage}</p>
                                )}
                              </div>
                              <div className="flex gap-2 ml-3 flex-shrink-0">
                                {(item.status === 'PENDING_REVIEW' || item.status === 'MODIFIED') && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleApproveItem(item.id); }}
                                      className="px-3 py-1 rounded-lg text-xs bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                                      title="Aprobar"
                                    >✅</button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRejectItem(item.id); }}
                                      className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                      title="Rechazar"
                                    >❌</button>
                                  </>
                                )}
                                {!isItemGenerating && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                    className="px-3 py-1 rounded-lg text-xs bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors"
                                    title="Ver detalle"
                                  >👁</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Item Detail Modal ── */}
      {selectedItem && (() => {
        const item = selectedItem;
        const version = item.editorialRun?.contentBrief?.contentVersions?.[0];
        const hook = version?.hook ?? '';
        const body = version?.body ?? version?.caption ?? '';
        const fmt = item.editorialRun?.contentBrief?.format;
        const angle = item.editorialRun?.contentBrief?.angle;
        const assets = version?.mediaAssets?.filter(a => a.status === 'READY') ?? [];
        const mainImage = assets.find(a => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
        const imageUrl = mainImage?.optimizedUrl || mainImage?.originalUrl;
        const allImages = assets.filter(a => a.type === 'IMAGE' || a.type === 'CAROUSEL_SLIDE');
        const audioAsset = assets.find(a => a.type === 'AUDIO');
        const audioUrl = audioAsset?.optimizedUrl || audioAsset?.originalUrl;
        const dayFull = DAYS.find(d => d.value === item.dayOfWeek)?.full ?? item.dayOfWeek;
        const dateStr = new Date(item.scheduledDate).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        const ist = STATUS_LABELS[item.status] ?? { label: item.status, color: 'text-gray-400' };
        const FORMAT_ICONS: Record<string, string> = { POST: '📷', CAROUSEL: '🎠', REEL: '🎬', STORY: '📱', THREAD: '🧵' };
        const canEdit = item.status === 'PENDING_REVIEW' || item.status === 'MODIFIED';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setSelectedItem(null); setEditingCaption(false); setShowImagePrompt(false); }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card p-0 rounded-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <div>
                    <p className="font-semibold text-sm">DETALLE DE PUBLICACIÓN</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {dayFull} {dateStr} • {item.scheduledTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ist.color}`} style={{ background: 'rgba(255,255,255,0.05)' }}>{ist.label}</span>
                  {fmt && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                      {FORMAT_ICONS[fmt.toUpperCase()] ?? '📄'} {fmt}
                    </span>
                  )}
                  <button onClick={() => { setSelectedItem(null); setEditingCaption(false); setShowImagePrompt(false); }}
                    className="text-gray-400 hover:text-white transition-colors text-lg">✕</button>
                </div>
              </div>

              {/* Image */}
              <div className="p-5">
                {allImages.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {allImages.map((asset, idx) => (
                      <img key={asset.id} src={asset.optimizedUrl || asset.originalUrl || ''}
                        alt={`Slide ${idx + 1}`}
                        className="w-48 h-48 rounded-xl object-cover flex-shrink-0"
                        style={{ border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                ) : imageUrl ? (
                  <div className="flex justify-center mb-4">
                    <img src={imageUrl} alt={hook} className="max-w-full max-h-80 rounded-xl object-contain"
                      style={{ border: '1px solid var(--color-border)' }} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-border)' }}>
                    <span className="text-gray-500 text-sm">Sin imagen generada</span>
                  </div>
                )}

                {/* Image actions */}
                {canEdit && (
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => handleRegenerateImage(item.id)}
                      disabled={!!actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'regenerate-image' ? '⏳ Generando...' : '🖼️ Regenerar imagen'}
                    </button>
                    <button
                      onClick={() => { setShowImagePrompt(!showImagePrompt); setImagePromptDraft(''); }}
                      disabled={!!actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                    >
                      ✏️ Imagen con prompt
                    </button>
                    <button
                      onClick={() => setModelSelectorItemId(item.id)}
                      disabled={!!actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                      title="Regeneración Pro — elige el modelo de generación de imagen"
                    >
                      {actionLoading === 'regenerate-image-pro' ? '⏳ Generando...' : '⚡ Regeneración Pro'}
                    </button>
                  </div>
                )}

                {/* Custom image prompt input */}
                {showImagePrompt && (
                  <div className="mb-5 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                      Describí cómo querés la imagen:
                    </label>
                    <textarea
                      value={imagePromptDraft}
                      onChange={e => setImagePromptDraft(e.target.value)}
                      placeholder="Ej: Una foto profesional de un equipo de trabajo colaborando en una oficina moderna..."
                      className="w-full p-2 rounded-lg text-sm bg-black/30 border resize-none"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { handleRegenerateImage(item.id, imagePromptDraft); setShowImagePrompt(false); }}
                        disabled={!imagePromptDraft.trim() || !!actionLoading}
                        className="btn-primary text-xs px-4 disabled:opacity-50"
                      >
                        {actionLoading === 'regenerate-image' ? '⏳...' : '🚀 Generar con este prompt'}
                      </button>
                      <button onClick={() => setShowImagePrompt(false)} className="btn-ghost text-xs">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Music Player */}
                {(audioUrl || canEdit) && (
                  <div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🎵</span>
                      <span className="text-xs font-medium" style={{ color: '#c084fc' }}>Música de fondo</span>
                      {audioAsset?.provider && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-text-muted)' }}>
                          {audioAsset.provider}
                        </span>
                      )}
                    </div>
                    {audioUrl ? (
                      <audio controls className="w-full h-10 mb-2" style={{ borderRadius: '8px' }}>
                        <source src={audioUrl} type="audio/mpeg" />
                        Tu navegador no soporta audio.
                      </audio>
                    ) : (
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        No hay música generada aún para esta publicación.
                      </p>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleGenerateMusic(item.id)}
                        disabled={musicGenerating}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
                      >
                        {musicGenerating ? '⏳ Enviando...' : audioUrl ? '🔄 Regenerar música (3 créditos)' : '🎵 Generar música (3 créditos)'}
                      </button>
                    )}
                  </div>
                )}

                {/* Hook */}
                {hook && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Hook</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{hook}</p>
                  </div>
                )}

                {/* Caption / Body */}
                {body && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Caption</p>
                    {editingCaption ? (
                      <div>
                        <textarea
                          value={captionDraft}
                          onChange={e => setCaptionDraft(e.target.value)}
                          className="w-full p-3 rounded-lg text-sm bg-black/30 border resize-none"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          rows={6}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { handleEditText(item.id, captionDraft); setEditingCaption(false); }}
                            disabled={!!actionLoading}
                            className="btn-primary text-xs px-4 disabled:opacity-50"
                          >
                            {actionLoading === 'edit-text' ? '⏳...' : '💾 Guardar cambios'}
                          </button>
                          <button onClick={() => setEditingCaption(false)} className="btn-ghost text-xs">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                        {body}
                      </div>
                    )}
                  </div>
                )}

                {/* Caption actions */}
                {canEdit && !editingCaption && (
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => { setEditingCaption(true); setCaptionDraft(body); }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                    >
                      ✏️ Editar texto
                    </button>
                    <button
                      onClick={() => handleRewriteText(item.id)}
                      disabled={!!actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'rewrite' ? '⏳ Reescribiendo...' : '🔄 Reescribir texto'}
                    </button>
                  </div>
                )}

                {/* Metadata */}
                {angle && (
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="font-medium">Ángulo:</span> {angle}
                  </p>
                )}

                {/* Error */}
                {item.editorialRun?.errorMessage && (
                  <div className="p-3 rounded-lg mb-4 text-xs text-amber-400" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    ⚠️ {item.editorialRun.errorMessage}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between p-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => handleRedoItem(item.id)}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-lg text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'redo' ? '⏳ Regenerando...' : '🔁 Rehacer todo'}
                </button>
                <div className="flex gap-2">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => { handleRejectItem(item.id); setSelectedItem(null); }}
                        disabled={!!actionLoading}
                        className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        ❌ Rechazar
                      </button>
                      <button
                        onClick={() => { handleApproveItem(item.id); setSelectedItem(null); }}
                        disabled={!!actionLoading}
                        className="px-4 py-2 rounded-lg text-sm bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        ✅ Aprobar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Model Selector Dialog ── */}
      {modelSelectorItemId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModelSelectorItemId(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>⚡ Regeneración Pro — Elegir modelo</h3>
              <button onClick={() => setModelSelectorItemId(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Seleccioná el modelo de IA para generar la imagen. El costo en créditos varía según el modelo.</p>

            {/* KIE Premium */}
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 text-amber-400">🌟 KIE Premium</p>
              <div className="space-y-2">
                {([
                  { id: 'ideogram/v3-text-to-image', name: 'Ideogram V3', desc: 'El mejor para texto legible dentro de imágenes', credits: 4, recommended: true, badge: '⭐ Recomendado para texto' },
                  { id: 'gpt-image/4o-text-to-image', name: 'OpenAI 4o Image', desc: 'GPT-4o nativo. Excelente texto en imágenes', credits: 5, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'gpt-image/1.5-text-to-image', name: 'GPT Image 1.5', desc: 'OpenAI. Alta calidad fotorrealista, buen manejo de texto', credits: 5, recommended: false, badge: '' },
                  { id: 'google/imagen-4', name: 'Google Imagen 4', desc: 'Fotorrealismo de última generación con texto legible', credits: 5, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'qwen/2.0-text-to-image', name: 'Qwen Image 2.0', desc: 'Alibaba. Mejor calidad, excelente texto y detalles', credits: 3, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'flux-2/pro-text-to-image', name: 'Flux-2 Pro', desc: 'Fotorrealismo de alta gama, fotografía y escenas naturales', credits: 4, recommended: false, badge: '' },
                  { id: 'flux/kontext-text-to-image', name: 'Flux Kontext', desc: 'Black Forest Labs. Contexto visual avanzado', credits: 4, recommended: false, badge: '🔥 Nuevo' },
                  { id: 'google/nano-banana-2', name: 'Nano Banana 2', desc: 'Google. Rápido y económico, buena calidad', credits: 2, recommended: false, badge: '💰 Económico' },
                  { id: 'bytedance/seedream', name: 'Seedream 4.5', desc: 'ByteDance. Buena calidad a menor costo', credits: 3, recommended: false, badge: '' },
                  { id: 'grok-imagine/text-to-image', name: 'Grok Imagine', desc: 'xAI. Estilo cinematográfico y artístico', credits: 4, recommended: false, badge: '' },
                  { id: 'qwen/text-to-image', name: 'Qwen', desc: 'Alibaba. Rápido y accesible', credits: 3, recommended: false, badge: '' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleRegenerateImagePro(modelSelectorItemId, undefined, m.id)}
                    disabled={actionLoading === 'regenerate-image-pro'}
                    className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                    style={{
                      background: m.recommended ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)',
                      borderColor: m.recommended ? 'rgba(245, 158, 11, 0.3)' : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{m.credits} créditos</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</p>
                    {m.badge && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{m.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Replicate */}
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 text-violet-400">⚡ Replicate</p>
              <div className="space-y-2">
                {([
                  { id: 'replicate/flux-dev', name: 'Flux Dev', desc: 'Open-source de alta calidad. Buen balance calidad-precio', credits: 2 },
                  { id: 'replicate/recraft-v3', name: 'Recraft V3', desc: 'Especializado en diseño gráfico y estilos vectoriales', credits: 3 },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleRegenerateImagePro(modelSelectorItemId, undefined, m.id)}
                    disabled={actionLoading === 'regenerate-image-pro'}
                    className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{m.credits} créditos</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard (free) */}
            <div>
              <p className="text-xs font-semibold mb-2 text-emerald-400">🆓 Estándar</p>
              <button
                onClick={() => handleRegenerateImagePro(modelSelectorItemId, undefined, 'standard')}
                disabled={actionLoading === 'regenerate-image-pro'}
                className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Estándar (Gratis)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>0 créditos</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Pollinations / HuggingFace FLUX. Sin costo, puede ser más lento.</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// Shared forms
// ══════════════════════════════════════════════════════════

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
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
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
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
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
        <button onClick={() => onSave({ dayOfWeek, time, socialAccountIds: selectedChannels })} className="btn-primary text-xs">✅ Añadir slot</button>
        <button onClick={onCancel} className="btn-ghost text-xs">Cancelar</button>
      </div>
    </div>
  );
}

function PlannerConfigForm({
  initial,
  campaigns,
  onSave,
  onCancel,
}: {
  initial?: WeeklyPlanConfig;
  campaigns?: { id: string; name: string; targetChannels: string[] }[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? 'Planificador semanal');
  const [contentMode, setContentMode] = useState(initial?.contentMode ?? 'editorial');
  const [approvalMode, setApprovalMode] = useState(initial?.approvalMode ?? 'telegram');
  const [plannerRunDays, setPlannerRunDays] = useState<string[]>(initial?.plannerRunDays ?? ['MONDAY']);
  const [plannerRunTime, setPlannerRunTime] = useState(initial?.plannerRunTime ?? '07:00');
  const [publishDays, setPublishDays] = useState<string[]>(initial?.publishDays ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [publishTime, setPublishTime] = useState(initial?.publishTime ?? '10:00');
  const [channels, setChannels] = useState<string[]>(initial?.targetChannels ?? ['instagram']);
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'America/Mexico_City');
  const [musicEnabled, setMusicEnabled] = useState(initial?.musicEnabled ?? false);
  const [musicStyle, setMusicStyle] = useState(initial?.musicStyle ?? 'upbeat');
  const [musicPrompt, setMusicPrompt] = useState(initial?.musicPrompt ?? '');
  const [campaignId, setCampaignId] = useState(initial?.campaignId ?? '');

  const selectedCampaign = campaigns?.find((c) => c.id === campaignId);
  const hasCampaign = !!selectedCampaign;

  const toggleDay = (list: string[], day: string) =>
    list.includes(day) ? list.filter((d) => d !== day) : [...list, day];

  const toggleChannel = (ch: string) =>
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  return (
    <div className="glass-card p-6 space-y-5 max-h-[80vh] overflow-y-auto">
      <h3 className="section-title sticky top-0 z-10 pb-2" style={{ backgroundColor: 'var(--color-bg-card, #1a1a2e)' }}>{initial ? '✏️ Editar planificador' : '➕ Nuevo planificador'}</h3>

      <div>
        <label className="input-label">Nombre</label>
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Campaign selection */}
      {campaigns && campaigns.length > 0 && (
        <div>
          <label className="input-label">Campaña (opcional)</label>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Si vinculas una campaña, se heredan canales, persona, perfil de contenido, temas y música automáticamente.
          </p>
          <select
            className="input-field"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Sin campaña</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {hasCampaign && (
            <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Canales de campaña:</span>
              <div className="flex gap-2">
                {selectedCampaign!.targetChannels.map((ch) => (
                  <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {CHANNELS.find((c) => c.value === ch)?.icon ?? '📡'} {ch}
                  </span>
                ))}
              </div>
              <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>Heredado</span>
            </div>
          )}
        </div>
      )}

      {/* Content Mode */}
      <div>
        <label className="input-label">Modo de contenido</label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Elige de dónde se obtiene la información para generar publicaciones</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setContentMode('editorial')}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: contentMode === 'editorial' ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${contentMode === 'editorial' ? 'rgba(6,182,212,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📰</span>
              <span className="text-sm font-medium" style={{ color: contentMode === 'editorial' ? '#06b6d4' : 'var(--color-text)' }}>Editorial</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Investiga tendencias y noticias externas (RSS, fuentes) para crear contenido relevante del sector.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setContentMode('business')}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: contentMode === 'business' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${contentMode === 'business' ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏢</span>
              <span className="text-sm font-medium" style={{ color: contentMode === 'business' ? '#f59e0b' : 'var(--color-text)' }}>Empresa</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Usa tu perfil de negocio, productos, briefs y recursos internos. Sin investigación externa.
            </p>
          </button>
        </div>
      </div>

      {/* Approval Mode */}
      <div>
        <label className="input-label">Modo de aprobación</label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Cómo se aprueban las publicaciones generadas</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setApprovalMode('telegram')}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: approvalMode === 'telegram' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${approvalMode === 'telegram' ? 'rgba(59,130,246,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📲</span>
              <span className="text-sm font-medium" style={{ color: approvalMode === 'telegram' ? '#3b82f6' : 'var(--color-text)' }}>Enviar por Telegram</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Al generarse las publicaciones, se envían automáticamente a Telegram para revisión y aprobación rápida.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setApprovalMode('panel')}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: approvalMode === 'panel' ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${approvalMode === 'panel' ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🖥️</span>
              <span className="text-sm font-medium" style={{ color: approvalMode === 'panel' ? '#f97316' : 'var(--color-text)' }}>Aprobación por panel</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Las publicaciones quedan pendientes en el panel de Aprobaciones para revisión manual desde la web.
            </p>
          </button>
        </div>
      </div>

      <div>
        <label className="input-label">Días de generación</label>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Qué días se genera el contenido semanal</p>
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => setPlannerRunDays(toggleDay(plannerRunDays, d.value))}
              className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                plannerRunDays.includes(d.value)
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
              style={{ color: plannerRunDays.includes(d.value) ? undefined : 'var(--color-text-muted)' }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">Hora de generación</label>
        <input type="time" className="input-field w-32" value={plannerRunTime} onChange={(e) => setPlannerRunTime(e.target.value)} />
      </div>

      <div>
        <label className="input-label">Días de publicación</label>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Qué días se publicará contenido (1 publicación por día)</p>
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => setPublishDays(toggleDay(publishDays, d.value))}
              className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                publishDays.includes(d.value)
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
              style={{ color: publishDays.includes(d.value) ? undefined : 'var(--color-text-muted)' }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">Hora de publicación</label>
        <input type="time" className="input-field w-32" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
      </div>

      {/* Channels — hidden when campaign is selected (uses campaign's channels) */}
      {!hasCampaign && (
        <div>
          <label className="input-label">Canales</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => toggleChannel(ch.value)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  channels.includes(ch.value)
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}
                style={{ color: channels.includes(ch.value) ? undefined : 'var(--color-text-muted)' }}
              >
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="input-label">Zona horaria</label>
        <select className="input-field" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>

      {/* Music Generation — hidden when campaign is selected (music comes from campaign) */}
      {!hasCampaign && (
      <div>
        <label className="input-label">🎵 Música de fondo</label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Genera música instrumental con IA para Reels, Stories y Shorts (3 créditos por canción)
        </p>
        <button
          type="button"
          onClick={() => setMusicEnabled(!musicEnabled)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all mb-3"
          style={{
            backgroundColor: musicEnabled ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${musicEnabled ? 'rgba(168,85,247,0.4)' : 'var(--color-border)'}`,
            color: musicEnabled ? '#a855f7' : 'var(--color-text-muted)',
          }}
        >
          {musicEnabled ? '🎵 Música activada' : '🔇 Música desactivada'}
        </button>

        {musicEnabled && (
          <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'rgba(168,85,247,0.3)' }}>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Estilo musical</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'upbeat', label: '🎉 Upbeat', desc: 'Pop energético' },
                  { value: 'calm', label: '🧘 Calm', desc: 'Ambiental relajado' },
                  { value: 'corporate', label: '💼 Corporate', desc: 'Empresarial' },
                  { value: 'energetic', label: '⚡ Energetic', desc: 'Electrónica rápida' },
                  { value: 'cinematic', label: '🎬 Cinematic', desc: 'Orquestal épico' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setMusicStyle(s.value)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      backgroundColor: musicStyle === s.value ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${musicStyle === s.value ? 'rgba(168,85,247,0.4)' : 'transparent'}`,
                      color: musicStyle === s.value ? '#c084fc' : 'var(--color-text-muted)',
                    }}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Prompt personalizado (opcional)</label>
              <input
                className="input-field text-xs"
                placeholder="Ej: música tropical alegre para contenido de verano..."
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onSave({ name, contentMode, approvalMode, plannerRunDays, plannerRunTime, publishDays, publishTime, targetChannels: channels, timezone, musicEnabled, musicStyle: musicEnabled ? musicStyle : undefined, musicPrompt: musicEnabled ? musicPrompt : undefined, campaignId: campaignId || undefined })}
          className="btn-primary text-sm"
          disabled={publishDays.length === 0 || plannerRunDays.length === 0 || (!hasCampaign && channels.length === 0)}
        >
          {initial ? 'Guardar cambios' : 'Crear planificador'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancelar</button>
      </div>
    </div>
  );
}
