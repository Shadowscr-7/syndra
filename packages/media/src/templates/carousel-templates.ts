// ============================================================
// Carousel Template System — Definición y validación de plantillas
// ============================================================

import type { CarouselSlide, BrandingConfig } from '../index';

// --- Template types ---

export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  category: 'educational' | 'news' | 'cta' | 'authority' | 'controversial' | 'custom';
  slideCount: { min: number; max: number };
  structure: TemplateSlotDef[];
  defaultBranding: Partial<BrandingConfig>;
}

export interface TemplateSlotDef {
  type: CarouselSlide['type'];
  required: boolean;
  maxTitleLength: number;
  maxBodyLength: number;
  placeholderTitle?: string;
  placeholderBody?: string;
}

// --- Built-in templates ---

export const TEMPLATE_EDUCATIONAL: CarouselTemplate = {
  id: 'tpl_educational',
  name: 'Educativo',
  description: 'Enseña un concepto paso a paso con portada llamativa y CTA de cierre.',
  category: 'educational',
  slideCount: { min: 4, max: 10 },
  structure: [
    { type: 'cover', required: true, maxTitleLength: 60, maxBodyLength: 0, placeholderTitle: 'Título llamativo' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Paso 1' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Paso 2' },
    { type: 'content', required: false, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Paso 3' },
    { type: 'content', required: false, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Paso 4' },
    { type: 'cta', required: true, maxTitleLength: 40, maxBodyLength: 120, placeholderTitle: '¿Quieres saber más?' },
  ],
  defaultBranding: {
    primaryColor: '#6C63FF',
    secondaryColor: '#F4F4FF',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A2E',
  },
};

export const TEMPLATE_NEWS: CarouselTemplate = {
  id: 'tpl_news',
  name: 'Noticias / Tendencias',
  description: 'Presenta una noticia o tendencia con contexto y análisis.',
  category: 'news',
  slideCount: { min: 3, max: 7 },
  structure: [
    { type: 'cover', required: true, maxTitleLength: 80, maxBodyLength: 0, placeholderTitle: '🗞 Noticia del día' },
    { type: 'content', required: true, maxTitleLength: 50, maxBodyLength: 250, placeholderTitle: '¿Qué pasó?' },
    { type: 'content', required: true, maxTitleLength: 50, maxBodyLength: 250, placeholderTitle: '¿Por qué importa?' },
    { type: 'content', required: false, maxTitleLength: 50, maxBodyLength: 250, placeholderTitle: 'Mi análisis' },
    { type: 'cta', required: true, maxTitleLength: 40, maxBodyLength: 120, placeholderTitle: '¿Qué opinas?' },
  ],
  defaultBranding: {
    primaryColor: '#FF6B6B',
    secondaryColor: '#FFF5F5',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A2E',
  },
};

export const TEMPLATE_CTA: CarouselTemplate = {
  id: 'tpl_cta',
  name: 'CTA / Venta suave',
  description: 'Presenta un problema, da valor y cierra con oferta.',
  category: 'cta',
  slideCount: { min: 4, max: 8 },
  structure: [
    { type: 'cover', required: true, maxTitleLength: 60, maxBodyLength: 0, placeholderTitle: '¿Te pasa esto?' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'El problema' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'La solución' },
    { type: 'content', required: false, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Lo que incluye' },
    { type: 'cta', required: true, maxTitleLength: 50, maxBodyLength: 150, placeholderTitle: '🔥 Accede ahora' },
  ],
  defaultBranding: {
    primaryColor: '#E94560',
    secondaryColor: '#FFF0F3',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A2E',
  },
};

export const TEMPLATE_AUTHORITY: CarouselTemplate = {
  id: 'tpl_authority',
  name: 'Autoridad / Case Study',
  description: 'Muestra experiencia, resultados o un caso de éxito.',
  category: 'authority',
  slideCount: { min: 4, max: 8 },
  structure: [
    { type: 'cover', required: true, maxTitleLength: 60, maxBodyLength: 0, placeholderTitle: 'Cómo logré X resultado' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'El contexto' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Lo que hice' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 200, placeholderTitle: 'Los resultados' },
    { type: 'cta', required: true, maxTitleLength: 50, maxBodyLength: 120, placeholderTitle: 'Tú también puedes' },
  ],
  defaultBranding: {
    primaryColor: '#0F3460',
    secondaryColor: '#E8F0FE',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A2E',
  },
};

export const TEMPLATE_CONTROVERSIAL: CarouselTemplate = {
  id: 'tpl_controversial',
  name: 'Polémico / Debate',
  description: 'Abre un debate con opinión fuerte y argumentos.',
  category: 'controversial',
  slideCount: { min: 3, max: 6 },
  structure: [
    { type: 'cover', required: true, maxTitleLength: 70, maxBodyLength: 0, placeholderTitle: 'Opinión impopular:' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 250, placeholderTitle: 'Mi argumento' },
    { type: 'content', required: true, maxTitleLength: 40, maxBodyLength: 250, placeholderTitle: 'La evidencia' },
    { type: 'cta', required: true, maxTitleLength: 50, maxBodyLength: 120, placeholderTitle: '¿Estás de acuerdo?' },
  ],
  defaultBranding: {
    primaryColor: '#FF4D00',
    secondaryColor: '#FFF3ED',
    backgroundColor: '#1A1A2E',
    textColor: '#FFFFFF',
  },
};

/**
 * Todas las plantillas integradas
 */
export const BUILTIN_TEMPLATES: CarouselTemplate[] = [
  TEMPLATE_EDUCATIONAL,
  TEMPLATE_NEWS,
  TEMPLATE_CTA,
  TEMPLATE_AUTHORITY,
  TEMPLATE_CONTROVERSIAL,
];

/**
 * Busca una plantilla por ID
 */
export function getTemplateById(id: string): CarouselTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Busca la plantilla más adecuada según categoría
 */
export function getTemplateForCategory(category: CarouselTemplate['category']): CarouselTemplate {
  return BUILTIN_TEMPLATES.find((t) => t.category === category) ?? TEMPLATE_EDUCATIONAL;
}

/**
 * Valida que los slides cumplan con la estructura de la plantilla
 */
export function validateSlidesAgainstTemplate(
  slides: CarouselSlide[],
  template: CarouselTemplate,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (slides.length < template.slideCount.min) {
    errors.push(`Mínimo ${template.slideCount.min} slides, tienes ${slides.length}`);
  }
  if (slides.length > template.slideCount.max) {
    errors.push(`Máximo ${template.slideCount.max} slides, tienes ${slides.length}`);
  }

  // Verificar que los slides requeridos estén presentes
  const requiredSlots = template.structure.filter((s) => s.required);
  for (const slot of requiredSlots) {
    const matching = slides.filter((s) => s.type === slot.type);
    if (matching.length === 0) {
      errors.push(`Falta slide requerido de tipo: ${slot.type}`);
    }
  }

  // Verificar longitudes
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const slotDef = template.structure[i];
    if (!slotDef) continue;

    if (slide.title && slide.title.length > slotDef.maxTitleLength) {
      errors.push(`Slide ${i + 1}: título excede ${slotDef.maxTitleLength} caracteres`);
    }
    if (slide.body && slide.body.length > slotDef.maxBodyLength) {
      errors.push(`Slide ${i + 1}: cuerpo excede ${slotDef.maxBodyLength} caracteres`);
    }
  }

  return { valid: errors.length === 0, errors };
}
