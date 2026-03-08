// ============================================================
// Prompts para Trend Detection — clustering semántico + scoring
// ============================================================

export interface TrendDetectionInput {
  articles: {
    title: string;
    source: string;
    sourceUrl: string;
    excerpt?: string;
    publishedAt?: string;
  }[];
  workspace: {
    industry?: string;
    objectives: string[];
    brandVoice: string;
    brandTone: string;
    themeKeywords: string[];
  };
  existingTrends: {
    topic: string;
    createdAt: string;
    status: string;
  }[];
}

/**
 * Prompt para clusterizar artículos y detectar tendencias emergentes
 */
export function buildTrendDetectionPrompt(input: TrendDetectionInput): string {
  const articlesBlock = input.articles.map((a, i) =>
    `[${i + 1}] "${a.title}" — ${a.source}${a.publishedAt ? ` (${a.publishedAt})` : ''}${a.excerpt ? `\n    ${a.excerpt.substring(0, 200)}` : ''}`
  ).join('\n');

  const existingBlock = input.existingTrends.length > 0
    ? `\nTENDENCIAS YA REGISTRADAS (evitar duplicados):\n${input.existingTrends.map(t => `- "${t.topic}" (${t.status}, ${t.createdAt})`).join('\n')}`
    : '';

  return `Eres un analista de tendencias de contenido digital. Analiza estos artículos recientes e identifica TENDENCIAS EMERGENTES relevantes para esta marca.

CONTEXTO DE LA MARCA:
- Industria: ${input.workspace.industry ?? 'general'}
- Objetivos: ${input.workspace.objectives.join(', ') || 'engagement y autoridad'}
- Voz de marca: ${input.workspace.brandVoice || 'profesional'}
- Tono: ${input.workspace.brandTone}
- Keywords de interés: ${input.workspace.themeKeywords.join(', ') || 'tecnología, IA, innovación'}
${existingBlock}

ARTÍCULOS RECIENTES:
${articlesBlock}

INSTRUCCIONES:
1. **Agrupa** artículos por tema/narrativa similar (clustering semántico)
2. **Identifica** temas que aparecen más de una vez (momentum)
3. **Evalúa** cada cluster como potencial tendencia
4. **Ignora** temas que ya están registrados como tendencias activas
5. **Prioriza** temas relevantes para la industria y keywords de la marca

Para cada tendencia detectada, calcula:
- **noveltyScore** (0-1): ¿Es un tema nuevo/emergente o ya saturado?
- **momentumScore** (0-1): ¿Cuánta tracción tiene? (más artículos = más momentum)
- **brandFitScore** (0-1): ¿Qué tan alineado está con la marca y su industria?
- **engagementPotentialScore** (0-1): ¿Qué tan probable es que genere engagement en redes?
- **urgencyScore** (0-1): ¿Hay ventana de oportunidad limitada?

Solo reporta tendencias con finalScore >= 0.4 (promedio ponderado).

Responde con JSON:
{
  "trends": [
    {
      "themeLabel": "etiqueta corta (2-5 palabras)",
      "normalizedTopic": "tema_normalizado_snake_case",
      "headline": "titular que resume la tendencia",
      "excerpt": "Resumen de 2-3 oraciones explicando la tendencia y su relevancia",
      "suggestedAngle": "ángulo de contenido sugerido para aprovechar esta tendencia",
      "sourceArticleIndices": [1, 3, 5],
      "noveltyScore": 0.8,
      "momentumScore": 0.7,
      "brandFitScore": 0.9,
      "engagementPotentialScore": 0.85,
      "urgencyScore": 0.6,
      "recommendedWindowHours": 24
    }
  ]
}

Responde SOLO con el JSON. Si no hay tendencias relevantes, responde: {"trends": []}`;
}

/**
 * Prompt para enriquecer una tendencia con ángulo de contenido concreto
 */
export function buildTrendEnrichmentPrompt(params: {
  trend: {
    themeLabel: string;
    headline: string;
    excerpt: string;
  };
  brandVoice: string;
  brandTone: string;
  objectives: string[];
  availableFormats: string[];
}): string {
  return `Dada esta tendencia detectada, genera un ángulo de contenido concreto y accionable.

TENDENCIA:
- Tema: ${params.trend.themeLabel}
- Titular: ${params.trend.headline}
- Contexto: ${params.trend.excerpt}

MARCA:
- Voz: ${params.brandVoice}
- Tono: ${params.brandTone}
- Objetivos: ${params.objectives.join(', ')}
- Formatos disponibles: ${params.availableFormats.join(', ')}

Genera:
1. Un ángulo editorial concreto para redes sociales
2. El formato ideal para este contenido
3. Un hook potente (primera línea del post)
4. Un CTA alineado a la tendencia

Responde con JSON:
{
  "angle": "ángulo editorial concreto",
  "format": "post|carousel|reel|story",
  "hook": "primera línea impactante",
  "cta": "call to action",
  "reasoning": "por qué este ángulo funciona para esta tendencia",
  "urgencyNote": "nota sobre la ventana de oportunidad"
}

Responde SOLO con el JSON.`;
}
