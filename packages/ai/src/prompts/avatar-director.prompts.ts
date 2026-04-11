// ============================================================
// Avatar Director Prompts — AI storyboard generation for Avatar Scene Engine
// ============================================================

export interface AvatarDirectorContext {
  // Content source
  topic?: string;
  copy?: string;          // Full copy text from editorial run
  intent?: string;        // "vender" | "educar" | "generar expectativa" | "informar" etc.

  // Audience & persona
  industry?: string;
  personaName?: string;
  personaTone?: string;   // "profesional" | "casual" | "inspirador" | "técnico"

  // Output preferences
  platform: 'reels' | 'tiktok' | 'stories' | 'youtube-shorts';
  language?: string;      // Default: "es"
  durationTarget?: number; // Target duration in seconds (default: 30)
  segmentCount?: number;  // Desired number of segments (default: auto 3-5)
}

/**
 * Generates the system prompt for the AI Director.
 */
export function buildAvatarDirectorSystemPrompt(): string {
  return `Eres un director creativo especializado en videos cortos para redes sociales.
Tu trabajo es convertir un copy o tema en un storyboard estructurado para un video con avatar IA.

El video combina:
- Un avatar IA hablando (lip sync, pantalla completa o en esquina)
- Escenas cinemáticas generadas por IA como fondo (Kling AI)
- Música de fondo coordinada

REGLAS CRÍTICAS:
1. Cada segmento del guión DEBE estar visualmente coordinado con su escena — si el avatar habla de un problema, la escena muestra ese problema; si habla de la solución, la escena muestra la solución.
2. Los prompts de escena SIEMPRE en inglés (mejor calidad en Kling AI).
3. El guión del avatar en el idioma solicitado (español por defecto).
4. El arco narrativo debe tener progresión visual: tensión → alivio, oscuro → luminoso, caótico → ordenado (según el intento).
5. El texto de cada segmento debe sonar natural hablado en voz alta — sin puntos, sin bullets, fluido.
6. La duración estimada: ~150 palabras por minuto de habla normal.
7. El compositeMode debe elegirse según el contenido: "overlay" para noticias/educativo, "full" para storytelling/emocional, "split" para demos/comparaciones.

FORMATO DE RESPUESTA: JSON puro, sin markdown, sin explicaciones fuera del JSON.`;
}

/**
 * Builds the user prompt for storyboard generation from free topic.
 */
export function buildAvatarDirectorFromTopicPrompt(ctx: AvatarDirectorContext): string {
  const lang = ctx.language ?? 'español';
  const platform = ctx.platform;
  const durationTarget = ctx.durationTarget ?? 30;
  const segmentCount = ctx.segmentCount ?? Math.max(3, Math.min(5, Math.round(durationTarget / 8)));

  return `Crea un storyboard para un video avatar con estas características:

TEMA: ${ctx.topic ?? 'No especificado'}
INTENCIÓN: ${ctx.intent ?? 'informar y generar interés'}
INDUSTRIA: ${ctx.industry ?? 'general'}
PLATAFORMA: ${platform}
IDIOMA DEL GUIÓN: ${lang}
DURACIÓN OBJETIVO: ${durationTarget} segundos
NÚMERO DE SEGMENTOS: ${segmentCount}
${ctx.personaTone ? `TONO DEL AVATAR: ${ctx.personaTone}` : ''}

Responde ÚNICAMENTE con este JSON (sin markdown):
{
  "compositeMode": "overlay" | "split" | "full",
  "overallMood": "descripción breve del mood general",
  "musicStyle": "upbeat" | "calm" | "corporate" | "energetic" | "cinematic",
  "segments": [
    {
      "order": 0,
      "text": "Texto que dice el avatar (en ${lang}, natural para hablar)",
      "durationSeconds": número,
      "scenePrompt": "Cinematic scene description in English, detailed, specific lighting and mood",
      "transition": "cut" | "dissolve" | "fade"
    }
  ]
}`;
}

/**
 * Builds the user prompt for storyboard generation from existing copy.
 */
export function buildAvatarDirectorFromCopyPrompt(ctx: AvatarDirectorContext): string {
  const lang = ctx.language ?? 'español';
  const platform = ctx.platform;
  const durationTarget = ctx.durationTarget ?? 30;
  const segmentCount = ctx.segmentCount ?? Math.max(3, Math.min(5, Math.round(durationTarget / 8)));

  return `Tengo el siguiente copy escrito para una publicación de ${platform}.
Conviértelo en un storyboard para video avatar, adaptando el copy a guión hablado natural.

COPY ORIGINAL:
---
${ctx.copy}
---

INTENCIÓN: ${ctx.intent ?? 'la misma que el copy'}
INDUSTRIA: ${ctx.industry ?? 'la del copy'}
PLATAFORMA: ${platform}
IDIOMA DEL GUIÓN: ${lang}
DURACIÓN OBJETIVO: ${durationTarget} segundos
NÚMERO DE SEGMENTOS: ${segmentCount}
${ctx.personaTone ? `TONO DEL AVATAR: ${ctx.personaTone}` : ''}

El guión debe:
- Adaptarse al formato hablado (no leer el copy literalmente, sino interpretarlo)
- Mantener los puntos clave, el CTA y el tono original
- Sonar natural en voz alta

Responde ÚNICAMENTE con este JSON (sin markdown):
{
  "compositeMode": "overlay" | "split" | "full",
  "overallMood": "descripción breve del mood general",
  "musicStyle": "upbeat" | "calm" | "corporate" | "energetic" | "cinematic",
  "segments": [
    {
      "order": 0,
      "text": "Texto que dice el avatar (en ${lang}, natural para hablar)",
      "durationSeconds": número,
      "scenePrompt": "Cinematic scene description in English, detailed, specific lighting and mood",
      "transition": "cut" | "dissolve" | "fade"
    }
  ]
}`;
}
