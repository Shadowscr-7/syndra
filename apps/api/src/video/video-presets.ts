// ============================================================
// Video Presets — 1-click templates for common video formats
// ============================================================

export interface VideoPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  slideRoles: Array<{ role: string; label: string; suggested?: boolean }>;
  defaultAnimation: string;
  musicStyle: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
  subtitleStyle: 'pill' | 'minimal';
  narrationPlaceholder: string;
  narrationIntent: string;
  slideDurationsMs?: number[];
}

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'product-reel',
    name: 'Reel de Producto',
    description: 'Logo → Problema → Producto → Features → CTA con precio',
    icon: '🛍️',
    slideRoles: [
      { role: 'logo', label: 'Logo de marca', suggested: true },
      { role: 'intro', label: 'El problema / gancho' },
      { role: 'product', label: 'Producto principal', suggested: true },
      { role: 'slide', label: 'Feature 1' },
      { role: 'slide', label: 'Feature 2' },
      { role: 'outro', label: 'CTA + Precio', suggested: true },
    ],
    defaultAnimation: 'ken-burns-in',
    musicStyle: 'upbeat',
    subtitleStyle: 'pill',
    narrationPlaceholder: '¿Cansado de [problema]? Presentamos [producto]... Con [feature 1] y [feature 2]. Disponible por solo [precio]. ¡Link en bio!',
    narrationIntent: 'vender',
    slideDurationsMs: [2000, 3000, 5000, 3000, 3000, 3000],
  },
  {
    id: 'educational',
    name: 'Story Educativa',
    description: 'Título → Slides con info → Conclusión → CTA',
    icon: '📚',
    slideRoles: [
      { role: 'intro', label: 'Título / pregunta' },
      { role: 'slide', label: 'Dato 1' },
      { role: 'slide', label: 'Dato 2' },
      { role: 'slide', label: 'Dato 3' },
      { role: 'slide', label: 'Conclusión' },
      { role: 'outro', label: 'CTA seguir/guardar' },
    ],
    defaultAnimation: 'auto',
    musicStyle: 'calm',
    subtitleStyle: 'minimal',
    narrationPlaceholder: '¿Sabías que [dato sorprendente]? Hoy te explico [tema]. Primero... Segundo... Tercero... En resumen: [conclusión]. Sígueme para más contenido.',
    narrationIntent: 'educar',
    slideDurationsMs: [3000, 4000, 4000, 4000, 3000, 2000],
  },
  {
    id: 'hook-content',
    name: 'Hook + Desarrollo',
    description: 'Gancho fuerte → Desarrollo → CTA',
    icon: '🎣',
    slideRoles: [
      { role: 'intro', label: 'Hook / gancho fuerte' },
      { role: 'slide', label: 'Desarrollo 1' },
      { role: 'slide', label: 'Desarrollo 2' },
      { role: 'slide', label: 'Desarrollo 3' },
      { role: 'outro', label: 'CTA' },
    ],
    defaultAnimation: 'zoom-pulse',
    musicStyle: 'energetic',
    subtitleStyle: 'pill',
    narrationPlaceholder: '¡Esto va a cambiar tu forma de [tema]! Lo primero que necesitas saber es... Además... Y lo más importante... Comenta [acción] si te sirvió.',
    narrationIntent: 'entretener',
    slideDurationsMs: [3000, 4000, 4000, 4000, 3000],
  },
  {
    id: 'before-after',
    name: 'Before / After',
    description: 'Antes → Transición → Después → CTA',
    icon: '🔄',
    slideRoles: [
      { role: 'intro', label: 'ANTES' },
      { role: 'slide', label: 'Transición / Proceso' },
      { role: 'slide', label: 'DESPUÉS', suggested: true },
      { role: 'outro', label: 'CTA' },
    ],
    defaultAnimation: 'pan-right',
    musicStyle: 'cinematic',
    subtitleStyle: 'pill',
    narrationPlaceholder: 'Mira cómo estaba antes... Después de [proceso/producto]... ¡Resultado increíble! ¿Querés el mismo cambio? Link en bio.',
    narrationIntent: 'vender',
    slideDurationsMs: [4000, 3000, 5000, 3000],
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Quote visual → Producto → Rating → CTA',
    icon: '⭐',
    slideRoles: [
      { role: 'intro', label: 'Quote / Testimonio' },
      { role: 'product', label: 'Producto' },
      { role: 'slide', label: 'Rating / Resultado' },
      { role: 'outro', label: 'CTA link en bio' },
    ],
    defaultAnimation: 'ken-burns-out',
    musicStyle: 'calm',
    subtitleStyle: 'minimal',
    narrationPlaceholder: '"[Testimonio del cliente]" — [Nombre]. Conocé [producto] que logró estos resultados. ★★★★★ [cantidad] clientes satisfechos. Link en bio.',
    narrationIntent: 'vender',
    slideDurationsMs: [5000, 4000, 3000, 3000],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Intro emocional → Desarrollo → Clímax → Resolución → CTA',
    icon: '📖',
    slideRoles: [
      { role: 'intro', label: 'Intro emocional' },
      { role: 'slide', label: 'Desarrollo' },
      { role: 'slide', label: 'Clímax' },
      { role: 'slide', label: 'Resolución' },
      { role: 'outro', label: 'CTA / Reflexión' },
    ],
    defaultAnimation: 'auto',
    musicStyle: 'cinematic',
    subtitleStyle: 'pill',
    narrationPlaceholder: 'Todo empezó cuando... En ese momento... Fue entonces que [clímax]... Hoy [resolución]. Si te identificaste, compartí este video.',
    narrationIntent: 'storytelling',
    slideDurationsMs: [4000, 4000, 4000, 3000, 3000],
  },
];

export function getPresetById(id: string): VideoPreset | undefined {
  return VIDEO_PRESETS.find(p => p.id === id);
}
