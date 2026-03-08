// ============================================================
// Prompts para AI Content Strategist — planes semanales/mensuales
// ============================================================

export interface StrategyPlanInput {
  // Analytics recientes
  analytics: {
    totalPosts: number;
    avgEngagement: number;
    avgReach: number;
    topFormat: string;
    topTone: string;
    topHour: string;
    topDay: string;
    bestPost?: { angle: string; engagement: number; format: string };
    worstPost?: { angle: string; engagement: number; format: string };
  };
  // Learning profile (del Content Intelligence Loop)
  learningInsights?: {
    dimension: string;
    topPerformers: { value: string; score: number; trend: string }[];
  }[];
  // Campañas activas
  activeCampaigns: { name: string; objective: string; themes: string[] }[];
  // Fuentes de research
  recentResearch: { title: string; keyPoints: string[]; relevanceScore: number }[];
  // Tendencias detectadas
  detectedTrends: { topic: string; score: number; suggestedAngle?: string }[];
  // Contexto del workspace
  workspace: {
    industry?: string;
    objectives: string[];
    activeChannels: string[];
    brandVoice: string;
    brandTone: string;
  };
  // Plan del usuario
  planLimits: {
    maxPostsPerWeek: number;
  };
  // Periodo
  periodType: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
}

/**
 * Prompt master para generar un plan estratégico completo
 */
export function buildStrategyPlanPrompt(input: StrategyPlanInput): string {
  const campaignBlock = input.activeCampaigns.length > 0
    ? `\nCAMPAÑAS ACTIVAS:\n${input.activeCampaigns.map(c => `- ${c.name} (${c.objective}): temas [${c.themes.join(', ')}]`).join('\n')}`
    : '\nSin campañas activas — plan orgánico general.';

  const researchBlock = input.recentResearch.length > 0
    ? `\nRESEARCH RECIENTE (top artículos):\n${input.recentResearch.slice(0, 8).map(r => `- ${r.title} (relevancia: ${r.relevanceScore.toFixed(2)})\n  ${r.keyPoints.slice(0, 2).join('; ')}`).join('\n')}`
    : '';

  const trendsBlock = input.detectedTrends.length > 0
    ? `\nTENDENCIAS DETECTADAS:\n${input.detectedTrends.slice(0, 5).map(t => `- ${t.topic} (score: ${t.score.toFixed(2)})${t.suggestedAngle ? ` → Ángulo: ${t.suggestedAngle}` : ''}`).join('\n')}`
    : '';

  const learningBlock = input.learningInsights && input.learningInsights.length > 0
    ? `\nDATOS DE APRENDIZAJE:\n${input.learningInsights.map(i => {
        const tops = i.topPerformers.map(p => `${p.value} (${p.score.toFixed(0)}, ${p.trend})`).join(', ');
        return `- ${i.dimension}: mejores → ${tops}`;
      }).join('\n')}`
    : '';

  return `Eres un estratega de contenido digital senior. Tu trabajo es crear planes de contenido ${input.periodType === 'WEEKLY' ? 'semanales' : 'mensuales'} altamente accionables.

PERIODO: ${input.startDate} a ${input.endDate}

CONTEXTO DEL NEGOCIO:
- Industria: ${input.workspace.industry ?? 'general'}
- Objetivos: ${input.workspace.objectives.join(', ') || 'engagement y autoridad'}
- Canales activos: ${input.workspace.activeChannels.join(', ')}
- Voz de marca: ${input.workspace.brandVoice || 'profesional'}
- Tono base: ${input.workspace.brandTone}
- Límite de posts por semana: ${input.planLimits.maxPostsPerWeek}

RENDIMIENTO RECIENTE:
- Posts analizados: ${input.analytics.totalPosts}
- Engagement promedio: ${(input.analytics.avgEngagement * 100).toFixed(2)}%
- Reach promedio: ${input.analytics.avgReach}
- Mejor formato: ${input.analytics.topFormat}
- Mejor tono: ${input.analytics.topTone}
- Mejor hora: ${input.analytics.topHour}
- Mejor día: ${input.analytics.topDay}
${input.analytics.bestPost ? `- Mejor post: "${input.analytics.bestPost.angle}" (${input.analytics.bestPost.format}, ${(input.analytics.bestPost.engagement * 100).toFixed(2)}% eng)` : ''}
${input.analytics.worstPost ? `- Peor post: "${input.analytics.worstPost.angle}" (${input.analytics.worstPost.format}, ${(input.analytics.worstPost.engagement * 100).toFixed(2)}% eng)` : ''}
${campaignBlock}${researchBlock}${trendsBlock}${learningBlock}

GENERA un plan estratégico completo con:

1. **Resumen ejecutivo** (2-3 frases sobre la dirección estratégica)
2. **Mix de temas** recomendado con porcentajes
3. **Mix de formatos** recomendado con porcentajes
4. **Mix de tonos** recomendado
5. **Ventanas de publicación** (días + horas óptimas)
6. **CTAs principales** (3-5)
7. **Recomendaciones específicas** rankeadas por prioridad e impacto esperado
8. **Objetivo de posts** para el periodo

Cada recomendación debe tener:
- Tipo (POST_COUNT | FORMAT | TONE | HOUR | THEME | CTA | TREND | CAMPAIGN)
- Título corto
- Descripción detallada con razonamiento
- Score de prioridad (0-1)
- Score de confianza (0-1)
- Acción recomendada concreta

Responde con JSON:
{
  "summary": "resumen ejecutivo del plan",
  "weeklyPostTarget": ${input.planLimits.maxPostsPerWeek},
  "themeMix": [{"theme": "nombre", "percentage": 30, "reasoning": "por qué"}],
  "formatMix": [{"format": "carousel|post|reel|story", "percentage": 40, "reasoning": "por qué"}],
  "toneMix": [{"tone": "nombre", "percentage": 50, "reasoning": "por qué"}],
  "postingWindows": [{"day": "lunes", "hours": ["10:00", "19:00"], "reasoning": "por qué"}],
  "recommendedCTAs": ["cta1", "cta2", "cta3"],
  "recommendations": [
    {
      "type": "THEME",
      "title": "título corto",
      "description": "razonamiento detallado",
      "priorityScore": 0.95,
      "confidenceScore": 0.8,
      "recommendedAction": "acción concreta"
    }
  ]
}

Responde SOLO con el JSON.`;
}

/**
 * Prompt para generar runs editoriales a partir de un plan estratégico
 */
export function buildRunsFromPlanPrompt(params: {
  planSummary: string;
  themeMix: Array<{ theme: string; percentage: number }>;
  formatMix: Array<{ format: string; percentage: number }>;
  toneMix: Array<{ tone: string; percentage: number }>;
  postCount: number;
  channels: string[];
  brandVoice: string;
}): string {
  return `Basándote en este plan estratégico, genera exactamente ${params.postCount} briefs editoriales concretos.

PLAN:
${params.planSummary}

MIX DE TEMAS: ${JSON.stringify(params.themeMix)}
MIX DE FORMATOS: ${JSON.stringify(params.formatMix)}
MIX DE TONOS: ${JSON.stringify(params.toneMix)}
CANALES: ${params.channels.join(', ')}
VOZ DE MARCA: ${params.brandVoice}

Genera ${params.postCount} briefs que respeten los porcentajes del mix.

Responde con JSON:
{
  "briefs": [
    {
      "angle": "ángulo editorial concreto",
      "format": "post|carousel|reel|story",
      "tone": "tono específico",
      "cta": "CTA concreto",
      "suggestedDay": "lunes|martes|...",
      "suggestedHour": "19:00",
      "themeTag": "nombre del tema",
      "priority": 5
    }
  ]
}

Responde SOLO con el JSON.`;
}
