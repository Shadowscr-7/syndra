'use client';

import { useEffect, useRef } from 'react';
import { usePlan } from '@/lib/plan-context';
import { useToast } from '@/lib/toast-context';

const RESOURCE_LABELS: Record<string, string> = {
  publications: 'publicaciones',
  videos: 'vídeos',
  channels: 'canales',
  sources: 'fuentes de investigación',
  editors: 'editores',
  personas: 'personas IA',
  contentProfiles: 'perfiles de contenido',
  visualStyles: 'estilos visuales',
  storageMb: 'almacenamiento',
  scheduleSlots: 'slots de programación',
  experiments: 'experimentos',
};

/**
 * Invisible component that checks usage on mount and shows
 * warning toasts for resources at ≥80% capacity.
 * Only fires once per session to avoid spamming. 
 */
export function UsageWarningNotifier() {
  const { planInfo, loading } = usePlan();
  const { showToast } = useToast();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (loading || !planInfo?.usage || notifiedRef.current) return;
    notifiedRef.current = true;

    const warnings: { resource: string; percent: number }[] = [];

    for (const [key, entry] of Object.entries(planInfo.usage)) {
      if (!entry || entry.limit <= 0 || entry.limit === -1) continue;
      const percent = Math.round((entry.used / entry.limit) * 100);
      if (percent >= 80) {
        warnings.push({ resource: key, percent });
      }
    }

    // Sort by percent descending — show the most critical first
    warnings.sort((a, b) => b.percent - a.percent);

    // Show max 3 warnings to avoid flooding
    for (const w of warnings.slice(0, 3)) {
      const label = RESOURCE_LABELS[w.resource] ?? w.resource;
      const isLimit = w.percent >= 100;

      showToast({
        type: isLimit ? 'error' : 'warning',
        message: isLimit
          ? `Límite alcanzado: ${label}`
          : `⚠️ ${label} al ${w.percent}%`,
        detail: isLimit
          ? `Has alcanzado el límite máximo de ${label}. Mejora tu plan para continuar.`
          : `Estás cerca del límite de ${label}. Considera mejorar tu plan.`,
        duration: isLimit ? 10000 : 6000,
      });
    }
  }, [loading, planInfo, showToast]);

  return null;
}
