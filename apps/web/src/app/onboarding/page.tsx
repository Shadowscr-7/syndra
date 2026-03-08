'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

const STEPS = [
  'Negocio',
  'Marca',
  'Canales',
  'Confirmar',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>(FALLBACK_INDUSTRIES);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${base}/api/onboarding/industries`, { credentials: 'include' })
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

  const [data, setData] = useState({
    workspaceName: '',
    slug: '',
    industry: '',
    brandName: '',
    brandDescription: '',
    brandVoice: 'Profesional',
    instagramToken: '',
    facebookToken: '',
    facebookPageId: '',
  });

  const updateField = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (field === 'workspaceName') {
      setData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      }));
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.workspaceName && data.industry;
      case 1:
        return true; // optional
      case 2:
        return true; // optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${baseUrl}/api/onboarding/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border p-8 space-y-8"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            🚀 Configurar tu workspace
          </h1>
          <p
            className="mt-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-colors"
              style={{
                backgroundColor:
                  i <= step
                    ? 'var(--color-primary)'
                    : 'var(--color-bg-tertiary)',
              }}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Nombre del negocio *
                </label>
                <input
                  type="text"
                  value={data.workspaceName}
                  onChange={(e) =>
                    updateField('workspaceName', e.target.value)
                  }
                  placeholder="Mi Empresa"
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {data.slug && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    URL: syndra.app/{data.slug}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: 'var(--color-text)' }}
                >
                  Industria *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {industries.map((ind) => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => updateField('industry', ind.id)}
                      className="flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors"
                      style={{
                        backgroundColor:
                          data.industry === ind.id
                            ? 'var(--color-primary)'
                            : 'var(--color-bg-tertiary)',
                        borderColor:
                          data.industry === ind.id
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                        color:
                          data.industry === ind.id
                            ? 'white'
                            : 'var(--color-text)',
                      }}
                    >
                      <span className="text-lg">{ind.icon}</span>
                      {ind.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Nombre de marca
                </label>
                <input
                  type="text"
                  value={data.brandName}
                  onChange={(e) =>
                    updateField('brandName', e.target.value)
                  }
                  placeholder="Nombre visible de tu marca"
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Descripción
                </label>
                <textarea
                  value={data.brandDescription}
                  onChange={(e) =>
                    updateField('brandDescription', e.target.value)
                  }
                  placeholder="¿A qué se dedica tu marca?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border text-sm resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Tono de voz
                </label>
                <select
                  value={data.brandVoice}
                  onChange={(e) =>
                    updateField('brandVoice', e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option>Profesional</option>
                  <option>Casual</option>
                  <option>Divertido</option>
                  <option>Inspiracional</option>
                  <option>Educativo</option>
                  <option>Motivacional</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Conecta tus redes sociales. Puedes hacerlo más tarde desde Configuración.
              </p>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Instagram / Meta Token
                </label>
                <input
                  type="password"
                  value={data.instagramToken}
                  onChange={(e) =>
                    updateField('instagramToken', e.target.value)
                  }
                  placeholder="Token de acceso Meta Graph API"
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Facebook Page ID (opcional)
                </label>
                <input
                  type="text"
                  value={data.facebookPageId}
                  onChange={(e) =>
                    updateField('facebookPageId', e.target.value)
                  }
                  placeholder="ID de tu página de Facebook"
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  💡 Necesitas un token de la Meta Graph API con permisos de
                  pages_manage_posts e instagram_content_publish.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Resumen de configuración
              </h2>

              <div
                className="space-y-3 p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <SummaryRow
                  label="Negocio"
                  value={data.workspaceName}
                />
                <SummaryRow
                  label="Industria"
                  value={
                    industries.find((i) => i.id === data.industry)
                      ?.name || '-'
                  }
                />
                <SummaryRow
                  label="Marca"
                  value={data.brandName || '(pendiente)'}
                />
                <SummaryRow
                  label="Tono"
                  value={data.brandVoice}
                />
                <SummaryRow
                  label="Instagram"
                  value={data.instagramToken ? '✅ Conectado' : '⏳ Pendiente'}
                />
              </div>

              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Se crearán automáticamente temas de contenido basados en tu
                industria. Podrás personalizarlos después.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color:
                step === 0
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text)',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Atrás
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: canProceed()
                  ? 'var(--color-primary)'
                  : 'var(--color-bg-tertiary)',
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
              style={{
                backgroundColor: 'var(--color-primary)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Configurando...' : '🚀 Completar configuración'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  );
}
