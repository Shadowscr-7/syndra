// ============================================================
// Video Templates — Modos de video: noticias, educativo, CTA, motion
// ============================================================

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  mode: VideoMode;
  /** Duración objetivo en segundos */
  targetDuration: number;
  /** Aspect ratio por defecto */
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Bloques de script sugeridos */
  scriptStructure: ScriptBlock[];
  /** Configuración de avatar */
  avatarConfig: {
    showAvatar: boolean;
    position?: 'center' | 'bottom-right' | 'bottom-left';
    size?: 'full' | 'pip'; // picture-in-picture
  };
  /** Estilos de subtítulos */
  subtitleStyle: SubtitleStyle;
  /** Elementos visuales adicionales */
  overlays: OverlayConfig[];
}

export type VideoMode = 'news' | 'educational' | 'cta' | 'hybrid_motion';

export interface ScriptBlock {
  role: 'hook' | 'intro' | 'body' | 'highlight' | 'cta' | 'outro';
  label: string;
  suggestedDuration: number; // seconds
  promptHint: string;
}

export interface SubtitleStyle {
  enabled: boolean;
  position: 'bottom' | 'center' | 'top';
  fontSize: 'small' | 'medium' | 'large';
  style: 'word-by-word' | 'sentence' | 'karaoke';
  backgroundColor?: string;
  textColor?: string;
}

export interface OverlayConfig {
  type: 'lower_third' | 'progress_bar' | 'brand_logo' | 'text_banner' | 'icon';
  position: string;
  timing: { startSec: number; endSec?: number };
  content?: string;
}

// ============================================================
// Built-in Video Templates
// ============================================================

export const VIDEO_TEMPLATE_NEWS: VideoTemplate = {
  id: 'video-news',
  name: 'Flash de Noticias',
  description: 'Video corto informativo estilo news flash — 30-45 seg',
  mode: 'news',
  targetDuration: 35,
  aspectRatio: '9:16',
  scriptStructure: [
    { role: 'hook', label: 'Titular impactante', suggestedDuration: 5, promptHint: 'Una frase corta y llamativa sobre la noticia' },
    { role: 'body', label: 'Contexto clave', suggestedDuration: 15, promptHint: 'Resume los hechos principales en 2-3 oraciones' },
    { role: 'highlight', label: 'Dato clave', suggestedDuration: 8, promptHint: 'El dato más relevante o sorprendente' },
    { role: 'cta', label: 'Cierre + CTA', suggestedDuration: 7, promptHint: 'Invita a seguir para más noticias' },
  ],
  avatarConfig: {
    showAvatar: true,
    position: 'center',
    size: 'full',
  },
  subtitleStyle: {
    enabled: true,
    position: 'bottom',
    fontSize: 'large',
    style: 'word-by-word',
    backgroundColor: '#000000CC',
    textColor: '#FFFFFF',
  },
  overlays: [
    { type: 'lower_third', position: 'bottom', timing: { startSec: 0, endSec: 5 }, content: '🔴 ÚLTIMA HORA' },
    { type: 'brand_logo', position: 'top-right', timing: { startSec: 0 } },
  ],
};

export const VIDEO_TEMPLATE_EDUCATIONAL: VideoTemplate = {
  id: 'video-educational',
  name: 'Clip Educativo',
  description: 'Video didáctico con puntos numerados — 45-60 seg',
  mode: 'educational',
  targetDuration: 50,
  aspectRatio: '9:16',
  scriptStructure: [
    { role: 'hook', label: 'Pregunta o problema', suggestedDuration: 5, promptHint: 'Pregunta que engancha al viewer' },
    { role: 'intro', label: 'Contexto breve', suggestedDuration: 8, promptHint: 'Introduce el tema en 1-2 oraciones' },
    { role: 'body', label: 'Punto 1', suggestedDuration: 10, promptHint: 'Primera enseñanza o consejo' },
    { role: 'body', label: 'Punto 2', suggestedDuration: 10, promptHint: 'Segunda enseñanza o consejo' },
    { role: 'body', label: 'Punto 3', suggestedDuration: 10, promptHint: 'Tercera enseñanza o consejo' },
    { role: 'cta', label: 'Resumen + CTA', suggestedDuration: 7, promptHint: 'Recapitula y pide guardar/compartir' },
  ],
  avatarConfig: {
    showAvatar: true,
    position: 'bottom-right',
    size: 'pip',
  },
  subtitleStyle: {
    enabled: true,
    position: 'center',
    fontSize: 'large',
    style: 'karaoke',
    textColor: '#FFFFFF',
  },
  overlays: [
    { type: 'progress_bar', position: 'top', timing: { startSec: 0 } },
    { type: 'text_banner', position: 'top', timing: { startSec: 5, endSec: 8 }, content: '👇 3 Tips Clave' },
  ],
};

export const VIDEO_TEMPLATE_CTA: VideoTemplate = {
  id: 'video-cta',
  name: 'Video CTA / Venta',
  description: 'Video para conversión con problema-solución-acción — 30-40 seg',
  mode: 'cta',
  targetDuration: 35,
  aspectRatio: '9:16',
  scriptStructure: [
    { role: 'hook', label: 'Dolor / problema', suggestedDuration: 6, promptHint: 'Describe un problema que tu audiencia tiene' },
    { role: 'body', label: 'Agitación', suggestedDuration: 8, promptHint: 'Amplifica la urgencia del problema' },
    { role: 'highlight', label: 'La solución', suggestedDuration: 10, promptHint: 'Presenta tu solución como la respuesta ideal' },
    { role: 'cta', label: 'Llamada a acción', suggestedDuration: 8, promptHint: 'CTA directo: link en bio, DM, etc.' },
  ],
  avatarConfig: {
    showAvatar: true,
    position: 'center',
    size: 'full',
  },
  subtitleStyle: {
    enabled: true,
    position: 'bottom',
    fontSize: 'large',
    style: 'word-by-word',
    textColor: '#FFFFFF',
    backgroundColor: '#6C63FFCC',
  },
  overlays: [
    { type: 'icon', position: 'top-left', timing: { startSec: 0, endSec: 6 }, content: '⚠️' },
    { type: 'text_banner', position: 'bottom', timing: { startSec: 25 }, content: '👆 Link en Bio' },
  ],
};

export const VIDEO_TEMPLATE_HYBRID_MOTION: VideoTemplate = {
  id: 'video-hybrid-motion',
  name: 'Motion Híbrido',
  description: 'Avatar + gráficos animados + texto overlay — 40-60 seg',
  mode: 'hybrid_motion',
  targetDuration: 50,
  aspectRatio: '9:16',
  scriptStructure: [
    { role: 'hook', label: 'Dato impactante', suggestedDuration: 5, promptHint: 'Estadística o dato que llame la atención' },
    { role: 'intro', label: 'Presentación', suggestedDuration: 8, promptHint: 'Del tema y quién eres' },
    { role: 'body', label: 'Explicación (con gráficos)', suggestedDuration: 20, promptHint: 'Contenido principal con apoyo visual' },
    { role: 'highlight', label: 'Momento WOW', suggestedDuration: 8, promptHint: 'La revelación o insight principal' },
    { role: 'cta', label: 'Cierre + CTA', suggestedDuration: 7, promptHint: 'Seguir, compartir o consultar' },
  ],
  avatarConfig: {
    showAvatar: true,
    position: 'bottom-left',
    size: 'pip',
  },
  subtitleStyle: {
    enabled: true,
    position: 'center',
    fontSize: 'medium',
    style: 'sentence',
    textColor: '#FFFFFF',
  },
  overlays: [
    { type: 'brand_logo', position: 'top-right', timing: { startSec: 0 } },
    { type: 'progress_bar', position: 'top', timing: { startSec: 0 } },
  ],
};

// ============================================================
// Helpers
// ============================================================

export const BUILTIN_VIDEO_TEMPLATES: VideoTemplate[] = [
  VIDEO_TEMPLATE_NEWS,
  VIDEO_TEMPLATE_EDUCATIONAL,
  VIDEO_TEMPLATE_CTA,
  VIDEO_TEMPLATE_HYBRID_MOTION,
];

export function getVideoTemplateById(id: string): VideoTemplate | undefined {
  return BUILTIN_VIDEO_TEMPLATES.find((t) => t.id === id);
}

export function getVideoTemplateForMode(mode: VideoMode): VideoTemplate {
  return BUILTIN_VIDEO_TEMPLATES.find((t) => t.mode === mode) ?? VIDEO_TEMPLATE_NEWS;
}

/**
 * Genera la estructura de bloques de script a partir del template
 * y un texto base (genera placeholders si no hay texto).
 */
export function buildScriptFromTemplate(
  template: VideoTemplate,
  content: { hook?: string; copy?: string; cta?: string },
): { blocks: Array<{ text: string; duration: number; role: string }>; totalDuration: number } {
  const blocks: Array<{ text: string; duration: number; role: string }> = [];
  let totalDuration = 0;

  for (const slot of template.scriptStructure) {
    let text = '';

    switch (slot.role) {
      case 'hook':
        text = content.hook ?? `[Hook: ${slot.promptHint}]`;
        break;
      case 'cta':
      case 'outro':
        text = content.cta ?? `[CTA: ${slot.promptHint}]`;
        break;
      default:
        text = content.copy ?? `[${slot.label}: ${slot.promptHint}]`;
        break;
    }

    blocks.push({
      text,
      duration: slot.suggestedDuration,
      role: slot.role,
    });
    totalDuration += slot.suggestedDuration;
  }

  return { blocks, totalDuration };
}

/**
 * Genera un archivo SRT a partir de los bloques de script
 */
export function generateSRT(
  blocks: Array<{ text: string; duration: number }>,
): string {
  const lines: string[] = [];
  let currentTime = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const startTime = currentTime;
    const endTime = currentTime + block.duration;

    lines.push(String(i + 1));
    lines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
    lines.push(block.text);
    lines.push('');

    currentTime = endTime;
  }

  return lines.join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}
