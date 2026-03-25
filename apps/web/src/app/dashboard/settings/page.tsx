import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { updateWorkspaceSettings } from '@/lib/actions';
import { OperationModeSelector } from './operation-mode';
import { LearningConfigSection } from './learning-config';

const TIMEZONES = [
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
  { value: 'America/Argentina/Buenos_Aires', label: '(UTC-03:00) Buenos Aires, Argentina' },
  { value: 'America/Montevideo', label: '(UTC-03:00) Montevideo, Uruguay' },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) São Paulo, Brasil' },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores, Portugal' },
  { value: 'Atlantic/Cape_Verde', label: '(UTC-01:00) Cabo Verde' },
  { value: 'UTC', label: '(UTC+00:00) UTC' },
  { value: 'Europe/London', label: '(UTC+00:00) Londres, Reino Unido' },
  { value: 'Europe/Dublin', label: '(UTC+00:00) Dublín, Irlanda' },
  { value: 'Europe/Lisbon', label: '(UTC+00:00) Lisboa, Portugal' },
  { value: 'Africa/Casablanca', label: '(UTC+00:00) Casablanca, Marruecos' },
  { value: 'Europe/Madrid', label: '(UTC+01:00) Madrid, España' },
  { value: 'Europe/Paris', label: '(UTC+01:00) París, Francia' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Berlín, Alemania' },
  { value: 'Europe/Rome', label: '(UTC+01:00) Roma, Italia' },
  { value: 'Europe/Amsterdam', label: '(UTC+01:00) Ámsterdam, Países Bajos' },
  { value: 'Europe/Brussels', label: '(UTC+01:00) Bruselas, Bélgica' },
  { value: 'Europe/Zurich', label: '(UTC+01:00) Zúrich, Suiza' },
  { value: 'Europe/Vienna', label: '(UTC+01:00) Viena, Austria' },
  { value: 'Europe/Warsaw', label: '(UTC+01:00) Varsovia, Polonia' },
  { value: 'Europe/Stockholm', label: '(UTC+01:00) Estocolmo, Suecia' },
  { value: 'Europe/Copenhagen', label: '(UTC+01:00) Copenhague, Dinamarca' },
  { value: 'Europe/Prague', label: '(UTC+01:00) Praga, Chequia' },
  { value: 'Africa/Lagos', label: '(UTC+01:00) Lagos, Nigeria' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Atenas, Grecia' },
  { value: 'Europe/Bucharest', label: '(UTC+02:00) Bucarest, Rumania' },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki, Finlandia' },
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
  { value: 'Asia/Kabul', label: '(UTC+04:30) Kabul, Afganistán' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi, Pakistán' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) India (Mumbai, Delhi)' },
  { value: 'Asia/Kathmandu', label: '(UTC+05:45) Katmandú, Nepal' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Daca, Bangladesh' },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok, Tailandia' },
  { value: 'Asia/Jakarta', label: '(UTC+07:00) Yakarta, Indonesia' },
  { value: 'Asia/Ho_Chi_Minh', label: '(UTC+07:00) Ho Chi Minh, Vietnam' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Shanghái, China' },
  { value: 'Asia/Hong_Kong', label: '(UTC+08:00) Hong Kong' },
  { value: 'Asia/Taipei', label: '(UTC+08:00) Taipéi, Taiwán' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapur' },
  { value: 'Asia/Manila', label: '(UTC+08:00) Manila, Filipinas' },
  { value: 'Australia/Perth', label: '(UTC+08:00) Perth, Australia' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokio, Japón' },
  { value: 'Asia/Seoul', label: '(UTC+09:00) Seúl, Corea del Sur' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sídney, Australia' },
  { value: 'Australia/Melbourne', label: '(UTC+10:00) Melbourne, Australia' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, Nueva Zelanda' },
  { value: 'Pacific/Fiji', label: '(UTC+12:00) Fiyi' },
];

export default async function SettingsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let workspace: any = null;
  try {
    workspace = await prisma.workspace.findFirst({ where: { id: wsId } });
  } catch (e) {
    console.error('[SettingsPage] DB error:', e);
  }

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Configuración general del workspace, integraciones y credenciales.</p>
      </div>

      {/* ── Workspace Settings ── */}
      <form action={updateWorkspaceSettings} className="max-w-3xl">
        <div className="glass-card p-6 animate-fade-in-delay-1">
          <h3 className="section-title">📋 Workspace</h3>
          <div className="space-y-5">
            <div>
              <label className="input-label">Nombre</label>
              <input
                name="name"
                type="text"
                defaultValue={workspace?.name ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Zona horaria</label>
              <select
                name="timezone"
                defaultValue={workspace?.timezone ?? 'America/Mexico_City'}
                className="input-field"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Canales activos</label>
              <div className="flex flex-wrap gap-4 mt-1">
                {[
                  { key: 'instagram', icon: '📸' }, { key: 'facebook', icon: '📘' }, { key: 'threads', icon: '🧵' },
                  { key: 'twitter', icon: '🐦' }, { key: 'linkedin', icon: '💼' }, { key: 'tiktok', icon: '🎵' },
                  { key: 'youtube', icon: '▶️' }, { key: 'pinterest', icon: '📌' }, { key: 'discord', icon: '💬' },
                  { key: 'whatsapp', icon: '💬' }, { key: 'meta_ads', icon: '📢' }, { key: 'google_ads', icon: '📊' },
                  { key: 'mercadolibre', icon: '🛒' },
                ].map((ch) => (
                  <label key={ch.key} className="flex items-center gap-2.5 text-sm cursor-pointer group" style={{ color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      name="activeChannels"
                      value={ch.key}
                      defaultChecked={workspace?.activeChannels?.includes(ch.key)}
                      className="w-4 h-4 rounded accent-purple-500"
                    />
                    <span className="group-hover:text-white transition-colors">
                      {ch.icon} {ch.key.charAt(0).toUpperCase() + ch.key.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-6">
            💾 Guardar cambios
          </button>
        </div>
      </form>

      {/* ── Operation Mode ── */}
      <div className="max-w-3xl animate-fade-in-delay-1">
        <OperationModeSelector currentMode={workspace?.operationMode ?? 'APPROVAL_REQUIRED'} />
      </div>

      {/* ── Learning Loop Config ── */}
      <div className="max-w-3xl animate-fade-in-delay-1">
        <LearningConfigSection />
      </div>


    </div>
  );
}
