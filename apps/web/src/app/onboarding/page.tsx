'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingState, OnboardingMode } from './steps/types';
import StepMode from './steps/StepMode';
import StepBusiness from './steps/StepBusiness';
import StepBrand from './steps/StepBrand';
import StepWebsite from './steps/StepWebsite';
import StepCreatorProfile from './steps/StepCreatorProfile';
import StepPersona from './steps/StepPersona';
import StepContentProfile from './steps/StepContentProfile';
import StepVisualStyle from './steps/StepVisualStyle';
import StepThemes from './steps/StepThemes';
import StepSources from './steps/StepSources';
import StepMedia from './steps/StepMedia';
import StepCampaigns from './steps/StepCampaigns';
import StepSocial from './steps/StepSocial';
import StepConfirm from './steps/StepConfirm';

// ── Types ──────────────────────────────────────────────
interface Industry {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

const FALLBACK_INDUSTRIES: Industry[] = [
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
  { id: 'restaurant', name: 'Restaurante', icon: '🍽️' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'realestate', name: 'Inmobiliaria', icon: '🏠' },
  { id: 'tech', name: 'Tecnología', icon: '💻' },
  { id: 'beauty', name: 'Belleza', icon: '💄' },
  { id: 'generic', name: 'Otro', icon: '🏢' },
];

// Business:  Mode → Negocio → Marca → Web → Temas → Fuentes → Media → Campañas → Redes → Confirmar
const BUSINESS_STEPS = ['Tipo', 'Negocio', 'Marca', 'Sitio web', 'Temas', 'Fuentes', 'Media', 'Campañas', 'Redes', 'Confirmar'];
// Creator:   Mode → Perfil → Persona → Perfil Cont. → Estilo Visual → Temas → Fuentes → Media → Campañas → Redes → Confirmar
const CREATOR_STEPS = ['Tipo', 'Perfil', 'AI Persona', 'Perfil contenido', 'Estilo visual', 'Temas', 'Fuentes', 'Media', 'Campañas', 'Redes', 'Confirmar'];

// ── Initial State ──────────────────────────────────────
const INITIAL_STATE: OnboardingState = {
  mode: null,
  workspaceName: '', slug: '', industry: '',
  brandName: '', brandDescription: '', brandVoice: 'Profesional', websiteUrl: '',
  creatorName: '', creatorCategory: '',
  themes: [], sources: [], mediaFiles: [], campaigns: [],
  persona: { brandName: '', brandDescription: '', tone: '', expertise: '', targetAudience: '', avoidTopics: '', languageStyle: '', examplePhrases: '', visualStyle: '' },
  contentProfile: { name: '', tone: 'didáctico', contentLength: 'MEDIUM', audience: '', language: 'es', hashtags: '', postingGoal: '' },
  visualStyle: { name: '', style: 'MINIMALIST', colorPalette: '', primaryFont: '', secondaryFont: '', logoUrl: '', preferredImageProvider: 'huggingface', customPromptPrefix: '' },
  metaConnected: false, metaInfo: '',
};

// ── Helpers ────────────────────────────────────────────
function getStepIndex(mode: OnboardingMode, stepName: string): number {
  const steps = mode === 'creator' ? CREATOR_STEPS : BUSINESS_STEPS;
  return steps.indexOf(stepName);
}

// ── Main Page ──────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>(FALLBACK_INDUSTRIES);

  useEffect(() => {
    fetch('/api/onboarding/industries', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json.data) ? json.data : [];
        if (list.length > 0) {
          setIndustries(
            list.map((item: { slug?: string; id?: string; name: string; icon: string; description?: string }) => ({
              id: item.slug ?? item.id ?? item.name,
              name: item.name,
              icon: item.icon,
              description: item.description,
            })),
          );
        }
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  // Listen for Meta OAuth popup completion
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'meta-oauth-complete') {
        setState((s) => ({ ...s, metaConnected: true, metaInfo: e.data.instagramUsername || e.data.pageName || 'Conectado' }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateField = useCallback((field: string, value: string) => {
    setState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'workspaceName' || field === 'creatorName') {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  }, []);

  const steps = state.mode === 'creator' ? CREATOR_STEPS : BUSINESS_STEPS;

  const canProceed = (): boolean => {
    if (step === 0) return state.mode !== null;
    const stepName = steps[step];
    switch (stepName) {
      case 'Negocio': return !!state.workspaceName && !!state.industry;
      case 'Perfil': return !!state.creatorName && !!state.creatorCategory;
      case 'AI Persona': return !!state.persona.brandName;
      case 'Perfil contenido': return !!state.contentProfile.name;
      case 'Estilo visual': return !!state.visualStyle.name;
      default: return true;
    }
  };

  const isLastStep = step === steps.length - 1;

  const handleConnectMeta = useCallback(() => {
    const w = 600, h = 700;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;
    window.open('/api/auth/meta?from=onboarding&popup=1', 'meta-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  }, []);

  const handleWebExtracted = useCallback((profile: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      brandName: prev.brandName || profile.businessName || '',
      brandDescription: prev.brandDescription || profile.description || '',
      workspaceName: prev.workspaceName || profile.businessName || '',
      industry: prev.industry || profile.businessType || prev.industry,
    }));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const isBusiness = state.mode === 'business';

      // 1. Complete onboarding (workspace + brand + plan)
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceName: isBusiness ? state.workspaceName : state.creatorName,
          slug: state.slug,
          industry: isBusiness ? state.industry : state.creatorCategory,
          brandName: isBusiness ? state.brandName : state.persona.brandName,
          brandDescription: isBusiness ? state.brandDescription : state.persona.brandDescription,
          brandVoice: state.brandVoice,
          websiteUrl: state.websiteUrl,
          mode: state.mode,
        }),
      });

      // 2. Create content themes
      for (const theme of state.themes) {
        await fetch('/api/onboarding/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entity: 'theme',
            data: {
              name: theme.name,
              keywords: theme.keywords.split(',').map((k) => k.trim()).filter(Boolean),
              audience: theme.audience,
              priority: theme.priority,
              type: theme.type,
              preferredFormats: theme.formats,
            },
          }),
        });
      }

      // 3. Create research sources
      for (const source of state.sources) {
        await fetch('/api/onboarding/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entity: 'source',
            data: { name: source.name, type: source.type, url: source.url },
          }),
        });
      }

      // 4. Upload media files
      for (const media of state.mediaFiles) {
        const formData = new FormData();
        formData.append('file', media.file);
        formData.append('category', media.category);
        await fetch('/api/user-media/file', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      }

      // 5. Creator-only: persona, content profile, visual style
      if (!isBusiness) {
        if (state.persona.brandName) {
          await fetch('/api/personas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              brandName: state.persona.brandName,
              brandDescription: state.persona.brandDescription,
              tone: state.persona.tone.split(',').map((s) => s.trim()).filter(Boolean),
              expertise: state.persona.expertise.split(',').map((s) => s.trim()).filter(Boolean),
              targetAudience: state.persona.targetAudience,
              avoidTopics: state.persona.avoidTopics.split(',').map((s) => s.trim()).filter(Boolean),
              languageStyle: state.persona.languageStyle,
              examplePhrases: state.persona.examplePhrases.split(',').map((s) => s.trim()).filter(Boolean),
              visualStyle: state.persona.visualStyle,
            }),
          });
        }

        if (state.contentProfile.name) {
          await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: state.contentProfile.name,
              tone: state.contentProfile.tone,
              contentLength: state.contentProfile.contentLength,
              audience: state.contentProfile.audience,
              language: state.contentProfile.language,
              hashtags: state.contentProfile.hashtags.split(',').map((s) => s.trim()).filter(Boolean),
              postingGoal: state.contentProfile.postingGoal,
              isDefault: true,
            }),
          });
        }

        if (state.visualStyle.name) {
          await fetch('/api/visual-styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: state.visualStyle.name,
              style: state.visualStyle.style,
              colorPalette: state.visualStyle.colorPalette.split(',').map((s) => s.trim()).filter(Boolean),
              primaryFont: state.visualStyle.primaryFont || null,
              secondaryFont: state.visualStyle.secondaryFont || null,
              logoUrl: state.visualStyle.logoUrl || null,
              preferredImageProvider: state.visualStyle.preferredImageProvider,
              customPromptPrefix: state.visualStyle.customPromptPrefix || null,
            }),
          });
        }
      }

      // 6. Create campaigns
      for (const campaign of state.campaigns) {
        await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: campaign.name,
            objective: campaign.objective,
            targetChannels: campaign.targetChannels,
            channelFormats: campaign.channelFormats,
            startDate: campaign.startDate,
            endDate: campaign.endDate || null,
            offer: campaign.offer || null,
            landingUrl: campaign.landingUrl || null,
            kpiTarget: campaign.kpiTarget || null,
            musicEnabled: campaign.musicEnabled,
            musicStyle: campaign.musicStyle,
            musicPrompt: campaign.musicPrompt || null,
          }),
        });
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Resolve which component to render per step ─────────
  const renderStep = () => {
    if (step === 0) {
      return <StepMode mode={state.mode} onSelect={(m) => setState((s) => ({ ...s, mode: m }))} />;
    }

    const stepName = steps[step];

    switch (stepName) {
      // Business-only
      case 'Negocio':
        return <StepBusiness workspaceName={state.workspaceName} slug={state.slug} industry={state.industry} industries={industries} onChange={updateField} />;
      case 'Marca':
        return <StepBrand brandName={state.brandName} brandDescription={state.brandDescription} brandVoice={state.brandVoice} onChange={updateField} />;
      case 'Sitio web':
        return <StepWebsite websiteUrl={state.websiteUrl} onChange={updateField} onExtracted={handleWebExtracted} />;

      // Creator-only
      case 'Perfil':
        return <StepCreatorProfile creatorName={state.creatorName} slug={state.slug} creatorCategory={state.creatorCategory} onChange={updateField} />;
      case 'AI Persona':
        return <StepPersona persona={state.persona} onChange={(p) => setState((s) => ({ ...s, persona: p }))} />;
      case 'Perfil contenido':
        return <StepContentProfile profile={state.contentProfile} onChange={(p) => setState((s) => ({ ...s, contentProfile: p }))} />;
      case 'Estilo visual':
        return <StepVisualStyle style={state.visualStyle} onChange={(v) => setState((s) => ({ ...s, visualStyle: v }))} />;

      // Shared
      case 'Temas':
        return <StepThemes themes={state.themes} onChange={(t) => setState((s) => ({ ...s, themes: t }))} />;
      case 'Fuentes':
        return <StepSources sources={state.sources} onChange={(src) => setState((s) => ({ ...s, sources: src }))} />;
      case 'Media':
        return <StepMedia files={state.mediaFiles} onChange={(f) => setState((s) => ({ ...s, mediaFiles: f }))} />;
      case 'Campañas':
        return <StepCampaigns campaigns={state.campaigns} onChange={(c) => setState((s) => ({ ...s, campaigns: c }))} />;
      case 'Redes':
        return <StepSocial metaConnected={state.metaConnected} metaInfo={state.metaInfo} onConnect={handleConnectMeta} />;
      case 'Confirmar':
        return <StepConfirm state={state} />;

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl border p-8 space-y-8 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            🚀 Configurar tu workspace
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Paso {step + 1} de {steps.length}: {steps[step]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i <= step ? 'var(--color-primary)' : 'var(--color-bg-tertiary)' }}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[320px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: step === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Atrás
          </button>

          {!isLastStep ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: canProceed() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                color: canProceed() ? 'white' : 'var(--color-text-muted)',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '⏳ Guardando...' : '🚀 Completar configuración'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
