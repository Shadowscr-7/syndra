// ============================================================
// Prompts para Content Engine — generación de copy
// ============================================================

/**
 * Helper: Build persona + profile context blocks for content prompts
 */
function buildPersonaContext(persona?: {
  brandName: string;
  brandDescription: string;
  tone: string[];
  expertise: string[];
  targetAudience: string;
  avoidTopics: string[];
  languageStyle: string;
  examplePhrases: string[];
}): string {
  if (!persona) return '';
  return `

PERSONA IA DE MARCA:
- Marca: ${persona.brandName}
- Descripción: ${persona.brandDescription}
- Tonos: ${persona.tone.join(', ')}
- Expertise: ${persona.expertise.join(', ')}
- Audiencia: ${persona.targetAudience}
- Estilo: ${persona.languageStyle}
${persona.examplePhrases.length ? `- Frases ejemplo: "${persona.examplePhrases.join('", "')}"` : ''}
${persona.avoidTopics.length ? `- NO mencionar: ${persona.avoidTopics.join(', ')}` : ''}`;
}

function buildProfileContext(profile?: {
  name: string;
  tone: string;
  contentLength: string;
  audience: string;
  language: string;
  hashtags: string[];
  postingGoal: string;
}): string {
  if (!profile) return '';
  return `

PERFIL DE CONTENIDO: ${profile.name}
- Tono del perfil: ${profile.tone}
- Extensión: ${profile.contentLength}
- Audiencia: ${profile.audience}
- Idioma: ${profile.language}
- Objetivo: ${profile.postingGoal}
${profile.hashtags.length ? `- Incluir hashtags: ${profile.hashtags.join(', ')}` : ''}`;
}

/**
 * Prompt principal para generar copy de un post
 */
export function buildPostCopyPrompt(params: {
  angle: string;
  tone: string;
  cta: string;
  seedPrompt: string;
  brandVoice: string;
  references: string[];
  maxCaptionLength: number;
  hashtagLimit: number;
  persona?: Parameters<typeof buildPersonaContext>[0];
  contentProfile?: Parameters<typeof buildProfileContext>[0];
  industryContext?: string;
  businessContext?: string;
}): string {
  const industry = params.industryContext || 'contenido digital';
  return `Eres un copywriter experto en redes sociales de ${industry}.
${params.businessContext ? `\nCONTEXTO DEL NEGOCIO:\n${params.businessContext}\n` : ''}

BRIEF:
- Ángulo: ${params.angle}
- Tono: ${params.tone}
- CTA: ${params.cta}
- Voz de marca: ${params.brandVoice}
- Seed: ${params.seedPrompt}
${buildPersonaContext(params.persona)}${buildProfileContext(params.contentProfile)}

FUENTES DE REFERENCIA:
${params.references.map((r, i) => `${i + 1}. ${r}`).join('\n')}

RESTRICCIONES:
- Caption máximo: ${params.maxCaptionLength} caracteres
- Máximo ${params.hashtagLimit} hashtags
- NO uses emojis excesivos (máximo 3-4 por post)
- El hook debe capturar atención en las primeras 2 líneas
- Incluye saltos de línea estratégicos para legibilidad

Genera el contenido con esta estructura JSON:
{
  "hook": "primera línea que engancha (máx 150 chars)",
  "copy": "cuerpo del post con formato y saltos de línea",
  "caption": "caption completo listo para publicar incluyendo hook + copy + CTA",
  "title": "título corto para uso interno (máx 80 chars)",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "imagePrompt": "prompt para generar la imagen que acompaña este post",
  "estimatedReadTime": "X min"
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para generar copy de un carousel (múltiples slides)
 */
export function buildCarouselCopyPrompt(params: {
  angle: string;
  tone: string;
  cta: string;
  seedPrompt: string;
  brandVoice: string;
  references: string[];
  slideCount: number;
  persona?: Parameters<typeof buildPersonaContext>[0];
  contentProfile?: Parameters<typeof buildProfileContext>[0];
  industryContext?: string;
  businessContext?: string;
}): string {
  const industry = params.industryContext || 'contenido digital';
  return `Eres un copywriter experto en carousels de Instagram sobre ${industry}.
${params.businessContext ? `\nCONTEXTO DEL NEGOCIO:\n${params.businessContext}\n` : ''}

BRIEF:
- Ángulo: ${params.angle}
- Tono: ${params.tone}
- CTA: ${params.cta}
- Voz de marca: ${params.brandVoice}
- Seed: ${params.seedPrompt}
- Número de slides: ${params.slideCount}
${buildPersonaContext(params.persona)}${buildProfileContext(params.contentProfile)}

FUENTES:
${params.references.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ESTRUCTURA DEL CAROUSEL:
1. Slide 1 → Cover: Headline impactante que genere curiosidad
2. Slides 2-${params.slideCount - 1} → Contenido: Un punto clave por slide, conciso
3. Slide ${params.slideCount} → CTA: Resumen + llamada a la acción

Genera con esta estructura JSON:
{
  "hook": "headline del cover slide",
  "slides": [
    {
      "slideNumber": 1,
      "heading": "título del slide",
      "body": "texto del slide (máx 100 palabras)",
      "imagePrompt": "prompt para imagen de fondo de este slide"
    }
  ],
  "caption": "caption para la publicación (incluye contexto y CTA)",
  "title": "título interno",
  "hashtags": ["#hashtag1"],
  "copy": "texto completo unificado de todos los slides"
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para generar variante con tono diferente
 */
export function buildToneVariantPrompt(params: {
  originalCopy: string;
  newTone: string;
  brandVoice: string;
}): string {
  return `Reescribe el siguiente copy de red social manteniendo el mensaje pero cambiando al tono "${params.newTone}".

Voz de marca: ${params.brandVoice}

COPY ORIGINAL:
${params.originalCopy}

Genera con esta estructura JSON:
{
  "hook": "nuevo hook",
  "copy": "nuevo copy completo",
  "caption": "nuevo caption",
  "title": "nuevo título",
  "hashtags": ["#hashtag1"]
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para corregir texto basándose en feedback humano
 */
export function buildCorrectionPrompt(params: {
  originalCopy: string;
  feedback: string;
  tone: string;
  brandVoice: string;
}): string {
  return `Corrige el siguiente copy de red social basándote en el feedback del editor humano.

COPY ORIGINAL:
${params.originalCopy}

FEEDBACK DEL EDITOR:
${params.feedback}

Tono: ${params.tone}
Voz de marca: ${params.brandVoice}

Aplica las correcciones manteniendo la esencia del mensaje. Genera con JSON:
{
  "hook": "hook corregido",
  "copy": "copy corregido",
  "caption": "caption corregido",
  "title": "título corregido",
  "hashtags": ["#hashtags"]
}

Responde SOLO con el JSON.`;
}
