// ============================================================
// Prompts para investigación y análisis de artículos
// ============================================================

/**
 * Prompt que recibe artículos crudos y extrae puntos clave + ángulo sugerido
 */
export function buildResearchExtractionPrompt(articles: {
  title: string;
  content: string;
  source: string;
  url: string;
}[]): string {
  const articlesText = articles
    .map(
      (a, i) =>
        `--- ARTÍCULO ${i + 1} ---
Título: ${a.title}
Fuente: ${a.source}
URL: ${a.url}
Contenido:
${a.content.substring(0, 3000)}
---`,
    )
    .join('\n\n');

  return `Eres un analista de tendencias en tecnología e inteligencia artificial.
Tu tarea es analizar los siguientes artículos y extraer información relevante para crear contenido en redes sociales (Instagram/Facebook) sobre IA y automatización.

${articlesText}

Para CADA artículo, devuelve un JSON con esta estructura:
{
  "articles": [
    {
      "title": "título del artículo",
      "source": "nombre de la fuente",
      "sourceUrl": "url",
      "keyPoints": ["punto clave 1", "punto clave 2", "punto clave 3"],
      "suggestedAngle": "ángulo editorial sugerido para una publicación en redes sociales",
      "relevanceScore": 0.85,
      "trending": true/false
    }
  ]
}

Criterios de relevanceScore (0.0 a 1.0):
- 0.9-1.0: Noticia de impacto global en IA, lanzamiento de producto importante
- 0.7-0.8: Avance técnico relevante, nueva herramienta útil
- 0.5-0.6: Artículo informativo, caso de uso interesante
- 0.3-0.4: Contenido de nicho o que requiere mucho contexto
- 0.0-0.2: Poco relevante o repetido

Responde SOLO con el JSON, sin texto adicional.`;
}

/**
 * Prompt para resumir las top noticias del día en un briefing editorial
 */
export function buildResearchSummaryPrompt(
  topArticles: { title: string; keyPoints: string[]; relevanceScore: number }[],
  brandContext: { voice: string; tone: string; keywords: string[] },
): string {
  const articlesText = topArticles
    .map(
      (a, i) =>
        `${i + 1}. ${a.title} (Score: ${a.relevanceScore})
   Puntos: ${a.keyPoints.join('; ')}`,
    )
    .join('\n');

  return `Eres el estratega editorial de una marca de tecnología e IA.

Voz de marca: ${brandContext.voice}
Tono default: ${brandContext.tone}
Keywords: ${brandContext.keywords.join(', ')}

Artículos más relevantes de hoy:
${articlesText}

Genera un RESUMEN EDITORIAL de máximo 300 palabras que:
1. Identifique el tema dominante del día
2. Sugiera 2-3 ángulos para contenido en redes sociales
3. Recomiende qué formato usar para cada ángulo (post, carousel, reel, story)
4. Identifique oportunidades de engagement

Formato de respuesta JSON:
{
  "dominantTheme": "tema principal",
  "summary": "resumen en 2-3 oraciones",
  "angles": [
    {
      "angle": "descripción del ángulo",
      "format": "post|carousel|reel|story",
      "reasoning": "por qué este formato"
    }
  ],
  "engagementOpportunities": ["oportunidad 1", "oportunidad 2"]
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para evaluar si un artículo pasa el filtro de compliance
 */
export function buildComplianceCheckPrompt(
  content: string,
  prohibitedTopics: string[],
  allowedClaims: string[],
): string {
  return `Analiza el siguiente contenido para redes sociales y verifica compliance:

CONTENIDO:
${content}

TEMAS PROHIBIDOS: ${prohibitedTopics.join(', ') || 'Ninguno especificado'}
CLAIMS PERMITIDOS: ${allowedClaims.join(', ') || 'Ninguno especificado'}

Responde con JSON:
{
  "isCompliant": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["sugerencia para fix 1"],
  "riskLevel": "low|medium|high"
}

Responde SOLO con el JSON.`;
}
