// ============================================================
// Prompts para Strategy Engine — ángulo, formato, CTA
// ============================================================

/**
 * Prompt para seleccionar el mejor ángulo y formato dados los insights de research
 */
export function buildStrategyPrompt(params: {
  researchSummary: string;
  brandVoice: string;
  defaultTone: string;
  objective: string;
  availableFormats: string[];
  themeKeywords: string[];
  campaignContext?: string;
  previousAngles?: string[];
  persona?: {
    brandName: string;
    brandDescription: string;
    tone: string[];
    expertise: string[];
    targetAudience: string;
    avoidTopics: string[];
    languageStyle: string;
  };
  contentProfile?: {
    name: string;
    tone: string;
    contentLength: string;
    audience: string;
    language: string;
    hashtags: string[];
    postingGoal: string;
  };
}): string {
  let personaBlock = '';
  if (params.persona) {
    const p = params.persona;
    personaBlock = `

PERSONA IA DE MARCA:
- Marca: ${p.brandName}
- Descripción: ${p.brandDescription}
- Tonos de voz: ${p.tone.join(', ')}
- Áreas de expertise: ${p.expertise.join(', ')}
- Audiencia objetivo: ${p.targetAudience}
- Estilo de lenguaje: ${p.languageStyle}
${p.avoidTopics.length ? `- Temas a EVITAR: ${p.avoidTopics.join(', ')}` : ''}`;
  }

  let profileBlock = '';
  if (params.contentProfile) {
    const cp = params.contentProfile;
    profileBlock = `

PERFIL DE CONTENIDO: ${cp.name}
- Tono del perfil: ${cp.tone}
- Extensión preferida: ${cp.contentLength}
- Audiencia específica: ${cp.audience}
- Idioma: ${cp.language}
- Objetivo de publicación: ${cp.postingGoal}
${cp.hashtags.length ? `- Hashtags preferidos: ${cp.hashtags.join(', ')}` : ''}`;
  }

  return `Eres un estratega de contenido para redes sociales especializado en tech/IA.

CONTEXTO DE MARCA:
- Voz: ${params.brandVoice}
- Tono default: ${params.defaultTone}
- Objetivo actual: ${params.objective}
- Formatos disponibles: ${params.availableFormats.join(', ')}
- Keywords del tema: ${params.themeKeywords.join(', ')}
${params.campaignContext ? `- Campaña activa: ${params.campaignContext}

⚠️ RESTRICCIÓN CRÍTICA: El ángulo y contenido DEBEN estar directamente
relacionados con la campaña activa y sus keywords. NO generes ángulos
sobre temas ajenos a la campaña aunque el research mencione otros temas.
Si el research no aporta datos relevantes para la campaña, genera un
ángulo educativo/informativo sobre las keywords del tema.` : ''}
${personaBlock}${profileBlock}

RESEARCH DEL DÍA:
${params.researchSummary}

${params.previousAngles?.length ? `ÁNGULOS YA USADOS (evitar repetición):
${params.previousAngles.join('\n')}` : ''}

Genera un BRIEF EDITORIAL con:
1. El ángulo más prometedor para engagement — ${params.campaignContext ? 'DEBE estar alineado con la campaña activa y sus keywords' : 'basado en el research del día'}
2. El formato ideal (prioriza los formatos disponibles listados arriba)
3. Un CTA potente alineado al objetivo
4. Un seed prompt para la generación de copy
5. El tono más adecuado para este contenido específico

Responde con JSON:
{
  "angle": "descripción del ángulo elegido",
  "format": "post|carousel|reel|story|avatar_video",
  "cta": "call to action concreto",
  "seedPrompt": "prompt semilla para generar el copy final",
  "tone": "tono elegido para esta pieza",
  "reasoning": "explicación de por qué esta estrategia",
  "references": ["url o título de fuente usada"],
  "estimatedEngagement": "low|medium|high",
  "suggestedHashtags": ["#hashtag1", "#hashtag2"]
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para generar variantes de CTA según objetivo
 */
export function buildCTAVariantsPrompt(params: {
  objective: string;
  tone: string;
  angle: string;
  platform: string;
}): string {
  return `Genera 5 variantes de CTA (Call To Action) para una publicación en ${params.platform}.

Objetivo: ${params.objective}
Tono: ${params.tone}
Ángulo del contenido: ${params.angle}

Responde con JSON:
{
  "variants": [
    {
      "cta": "texto del CTA",
      "style": "directo|sutil|urgente|social_proof|curiosidad",
      "score": 0.85
    }
  ]
}

Responde SOLO con el JSON.`;
}
