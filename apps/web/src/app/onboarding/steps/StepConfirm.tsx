'use client';

import type { OnboardingState, ThemeEntry, SourceEntry, CampaignEntry } from './types';
import { THEME_TYPES, CAMPAIGN_OBJECTIVES } from './types';

interface Props {
  state: OnboardingState;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg space-y-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{title}</h3>
      {children}
    </div>
  );
}

export default function StepConfirm({ state }: Props) {
  const isBusiness = state.mode === 'business';

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>✅ Resumen de configuración</h3>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Revisá que todo esté correcto antes de guardar.
        </p>
      </div>

      {/* Base info */}
      <Section title={isBusiness ? '🏢 Negocio' : '🎨 Creador'}>
        <Row label="Tipo" value={isBusiness ? 'Empresa / Negocio' : 'Creador de contenido'} />
        {isBusiness ? (
          <>
            <Row label="Negocio" value={state.workspaceName || '-'} />
            <Row label="Industria" value={state.industry || '-'} />
            <Row label="Marca" value={state.brandName || '(pendiente)'} />
            <Row label="Tono" value={state.brandVoice} />
            <Row label="Sitio web" value={state.websiteUrl || '(no configurado)'} />
          </>
        ) : (
          <>
            <Row label="Nombre" value={state.creatorName || '-'} />
            <Row label="Categoría" value={state.creatorCategory || '-'} />
          </>
        )}
      </Section>

      {/* Creator-only sections */}
      {!isBusiness && state.persona.brandName && (
        <Section title="🎭 AI Persona">
          <Row label="Nombre" value={state.persona.brandName} />
          <Row label="Tonos" value={state.persona.tone || '-'} />
          <Row label="Expertise" value={state.persona.expertise || '-'} />
          <Row label="Audiencia" value={state.persona.targetAudience || '-'} />
        </Section>
      )}

      {!isBusiness && state.contentProfile.name && (
        <Section title="📄 Perfil de Contenido">
          <Row label="Perfil" value={state.contentProfile.name} />
          <Row label="Tono" value={state.contentProfile.tone} />
          <Row label="Extensión" value={state.contentProfile.contentLength} />
          <Row label="Idioma" value={state.contentProfile.language} />
        </Section>
      )}

      {!isBusiness && state.visualStyle.name && (
        <Section title="🎨 Estilo Visual">
          <Row label="Estilo" value={state.visualStyle.name} />
          <Row label="Artístico" value={state.visualStyle.style} />
          <Row label="Colores" value={state.visualStyle.colorPalette || '-'} />
          <Row label="Proveedor" value={state.visualStyle.preferredImageProvider} />
        </Section>
      )}

      {/* Shared sections */}
      {state.themes.length > 0 && (
        <Section title={`📋 Temas (${state.themes.length})`}>
          {state.themes.map((t: ThemeEntry, i: number) => (
            <Row key={i} label={t.name} value={`${THEME_TYPES.find((tt) => tt.value === t.type)?.label || t.type} · ${t.priority}/10`} />
          ))}
        </Section>
      )}

      {state.sources.length > 0 && (
        <Section title={`🔍 Fuentes (${state.sources.length})`}>
          {state.sources.map((s: SourceEntry, i: number) => (
            <Row key={i} label={s.name} value={`${s.type} · ${s.url}`} />
          ))}
        </Section>
      )}

      {state.mediaFiles.length > 0 && (
        <Section title={`📁 Media (${state.mediaFiles.length} archivos)`}>
          <Row label="Archivos" value={state.mediaFiles.map((f) => f.file.name).join(', ')} />
        </Section>
      )}

      {state.campaigns.length > 0 && (
        <Section title={`🎯 Campañas (${state.campaigns.length})`}>
          {state.campaigns.map((c: CampaignEntry, i: number) => (
            <Row key={i} label={c.name} value={`${CAMPAIGN_OBJECTIVES.find((o) => o.value === c.objective)?.label} · ${c.targetChannels.join(', ')}`} />
          ))}
        </Section>
      )}

      <Section title="🔗 Redes Sociales">
        <Row label="Instagram/Facebook" value={state.metaConnected ? `✅ ${state.metaInfo}` : '⏳ Pendiente'} />
      </Section>
    </div>
  );
}
