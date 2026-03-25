// ============================================================
// Prompts para contenido basado en negocio propio (promociones,
// productos, ofertas, anuncios) — sin depender de RSS externo.
// ============================================================

export interface BusinessBriefInput {
  type: 'PRODUCT' | 'SERVICE' | 'OFFER' | 'ANNOUNCEMENT' | 'TESTIMONIAL' | 'FAQ' | 'SEASONAL' | 'BRAND_STORY';
  title: string;
  content: string;
  productName?: string;
  productPrice?: string;
  productUrl?: string;
  discountText?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface BusinessProfileInput {
  businessName: string;
  businessType: string;
  description: string;
  slogan?: string;
  usp?: string;
  targetMarket?: string;
  products?: string[];
  priceRange?: string;
  websiteUrl?: string;
  promotionStyle?: string;
  contentGoals?: string[];
}

// ─────────────────────────────────────────────────────────────
// 1. Research interno: genera ángulos a partir de briefs propios
// ─────────────────────────────────────────────────────────────
export function buildBusinessResearchPrompt(
  briefs: BusinessBriefInput[],
  profile: BusinessProfileInput,
  campaignObjective?: string,
  options?: {
    preferredFormat?: string;
    batchContext?: string;
  },
): string {
  const briefsText = briefs
    .map(
      (b, i) =>
        `--- BRIEF ${i + 1} (${b.type}) ---
Título: ${b.title}
Contenido: ${b.content}
${b.productName ? `Producto: ${b.productName}` : ''}
${b.productPrice ? `Precio: ${b.productPrice}` : ''}
${b.discountText ? `Descuento: ${b.discountText}` : ''}
${b.validUntil ? `Válido hasta: ${b.validUntil}` : ''}
---`,
    )
    .join('\n\n');

  return `Eres el estratega de contenido de ${profile.businessName}, ${profile.description || `un negocio de ${profile.businessType}`}.
${profile.slogan ? `Slogan: "${profile.slogan}"` : ''}
${profile.usp ? `Propuesta de valor: ${profile.usp}` : ''}
${profile.targetMarket ? `Mercado objetivo: ${profile.targetMarket}` : ''}
${profile.promotionStyle ? `Estilo de promoción: ${profile.promotionStyle}` : ''}
${campaignObjective ? `Objetivo de campaña: ${campaignObjective}` : ''}

A partir de los siguientes briefs internos de negocio, genera ángulos editoriales para redes sociales:

${briefsText}

Para CADA brief genera entre 1 y 3 ángulos. Devuelve un JSON:
{
  "angles": [
    {
      "briefTitle": "título del brief origen",
      "angle": "ángulo editorial concreto",
      "format": "post | carousel | reel | story",
      "reasoning": "por qué funcionaría este ángulo",
      "hooks": ["hook 1", "hook 2"],
      "urgency": "high | medium | low",
      "suggestedVisual": "descripción breve del visual a usar (ej: 'foto del producto con overlay OFERTA')",
      "mediaType": "image | video | carousel_slides | mixed"
    }
  ]
}

REGLAS:
- Adapta el lenguaje al estilo ${profile.promotionStyle || 'profesional'}.
- Si hay descuentos/ofertas, crea sensación de urgencia.
- Destaca el valor diferencial (${profile.usp || 'calidad y servicio'}).
- Sugiere visuales que usen imágenes del producto cuando sea posible.
- Para ofertas con fecha límite, incluye urgencia en los hooks.
- VARÍA los formatos: no todos post, no todos carousel. Mezcla entre post, carousel, reel y story según el tipo de contenido:
  - Educativo/paso a paso → carousel
  - Testimonio/behind the scenes → story o reel
  - Dato impactante/oferta → post
  - Demo/tutorial rápido → reel
${options?.preferredFormat ? `- ⭐ Da PRIORIDAD al formato "${options.preferredFormat}" para al menos uno de los ángulos.` : ''}
${options?.batchContext ? `\nCONTEXTO DEL LOTE SEMANAL:\n${options.batchContext}\n` : ''}

Responde SOLO con el JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 2. Copy promocional: genera copy desde brief de negocio
// ─────────────────────────────────────────────────────────────
export function buildPromotionalCopyPrompt(params: {
  brief: BusinessBriefInput;
  profile: BusinessProfileInput;
  angle: string;
  format: 'post' | 'carousel' | 'reel' | 'story';
  tone: string;
  brandVoice?: string;
  maxCaptionLength?: number;
  hashtagLimit?: number;
}): string {
  const { brief, profile, angle, format, tone, brandVoice, maxCaptionLength, hashtagLimit } = params;

  let productBlock = '';
  if (brief.productName) {
    productBlock = `
PRODUCTO/SERVICIO:
- Nombre: ${brief.productName}
${brief.productPrice ? `- Precio: ${brief.productPrice}` : ''}
${brief.discountText ? `- Descuento: ${brief.discountText}` : ''}
${brief.productUrl ? `- URL: ${brief.productUrl}` : ''}
${brief.validUntil ? `- Válido hasta: ${brief.validUntil}` : ''}`;
  }

  const formatInstructions =
    format === 'carousel'
      ? `
FORMATO: Carousel de Instagram (6-10 slides)
Genera slides con esta estructura:
{
  "slides": [
    { "slideNumber": 1, "heading": "...", "body": "...", "imagePrompt": "..." }
  ]
}
- Slide 1: Hook visual potente (problema o dato impactante)
- Slides intermedios: Beneficios, características, prueba social
- Último slide: CTA claro + precio/oferta si aplica`
      : `
FORMATO: ${format === 'reel' ? 'Reel/Video' : format === 'story' ? 'Story' : 'Post'} de Instagram`;

  return `Eres el copywriter de ${profile.businessName}${profile.businessType ? `, negocio de ${profile.businessType}` : ''}.
${brandVoice ? `Voz de marca: ${brandVoice}` : ''}
${profile.slogan ? `Slogan: "${profile.slogan}"` : ''}
${profile.usp ? `Propuesta de valor: ${profile.usp}` : ''}
${profile.targetMarket ? `Audiencia: ${profile.targetMarket}` : ''}
${productBlock}

BRIEF:
Tipo: ${brief.type}
Título: ${brief.title}
Contenido: ${brief.content}

ÁNGULO EDITORIAL: ${angle}
TONO: ${tone}
${formatInstructions}

Genera un JSON con:
{
  "hook": "frase inicial que captura atención (max 10 palabras)",
  "copy": "texto del post (llamativo, persuasivo)",
  "caption": "caption completo para Instagram (max ${maxCaptionLength || 2200} caracteres)",
  "title": "título interno corto",
  "hashtags": ["#hashtag1", ...] (max ${hashtagLimit || 30}),
  "imagePrompt": "prompt para generar la imagen principal (describe el visual ideal)"${format === 'carousel' ? ',\n  "slides": [{ "slideNumber": 1, "heading": "...", "body": "...", "imagePrompt": "..." }]' : ''}
}

REGLAS:
- Tono ${tone}: ${tone === 'aspiracional' ? 'inspira deseo, exclusividad' : tone === 'cercano' ? 'amigable, como un amigo recomendando' : tone === 'urgente' ? 'crea urgencia, escasez' : tone === 'premium' ? 'elegante, sofisticado' : 'profesional pero accesible'}.
- El hook debe ser IRRESISTIBLE — el usuario debe parar de scrollear.
- Si hay descuento, menciónalo de forma prominente.
- Incluye un CTA claro (comprar, visitar, escribir, etc).
- El imagePrompt debe incorporar el producto y el estilo de la marca.

Responde SOLO con el JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 3. Prompt para generar instrucciones de composición visual
// ─────────────────────────────────────────────────────────────
export function buildVisualCompositionPrompt(params: {
  productName: string;
  productDescription?: string;
  discountText?: string;
  brandColors?: string[];
  promotionStyle?: string;
  format: 'post' | 'carousel' | 'story';
}): string {
  return `Eres un director creativo de una agencia de marketing digital.
Necesitas definir la composición visual para una publicación promocional.

PRODUCTO: ${params.productName}
${params.productDescription ? `Descripción: ${params.productDescription}` : ''}
${params.discountText ? `Oferta: ${params.discountText}` : ''}
${params.brandColors?.length ? `Colores de marca: ${params.brandColors.join(', ')}` : ''}
ESTILO: ${params.promotionStyle || 'moderno y limpio'}
FORMATO: ${params.format}

Genera un JSON con instrucciones de composición:
{
  "template": "product-showcase | offer-banner | minimal-product | price-tag | announcement",
  "overlayText": {
    "headline": "texto principal grande",
    "subtitle": "texto secundario",
    "price": "precio formateado o null",
    "originalPrice": "precio original tachado o null",
    "discount": "texto de descuento (ej: -30%) o null",
    "cta": "texto del botón CTA"
  },
  "branding": {
    "primaryColor": "#hexcolor",
    "secondaryColor": "#hexcolor",
    "accentColor": "#hexcolor"
  },
  "logoPosition": "top-left | top-right | bottom-left | bottom-right | center",
  "mood": "descripción del mood visual en 2-3 palabras"
}

REGLAS:
- Si hay descuento, usa template "offer-banner" o "price-tag"
- Para productos nuevos sin descuento, usa "product-showcase" o "minimal-product"
- Para anuncios, usa "announcement"
- Los colores deben ser atractivos y profesionales
- El headline debe ser corto e impactante (max 5 palabras)

Responde SOLO con el JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 4. Strategy promocional: genera ángulos específicos de venta
// ─────────────────────────────────────────────────────────────
export function buildPromotionalStrategyPrompt(params: {
  researchSummary: string;
  briefType: 'PRODUCT' | 'SERVICE' | 'OFFER' | 'ANNOUNCEMENT' | 'TESTIMONIAL' | 'FAQ' | 'SEASONAL' | 'BRAND_STORY';
  profile: BusinessProfileInput;
  brandVoice?: string;
  targetChannels?: string[];
  campaignObjective?: string;
}): string {
  const { researchSummary, briefType, profile, brandVoice, targetChannels, campaignObjective } = params;

  const typeStrategies: Record<string, string> = {
    PRODUCT: `ENFOQUE PRODUCTO:
- Destaca beneficios y características diferenciales.
- Compara (sin mencionar competencia directamente) — muestra por qué es mejor.
- Genera deseo: muestra el producto en uso, el resultado final.
- Usa storytelling: ¿qué problema resuelve? ¿cómo cambia la vida del cliente?
- CTA: "Comprar ahora", "Descubrí más", "Pedí el tuyo"`,

    SERVICE: `ENFOQUE SERVICIO:
- Muestra el proceso y los resultados concretos.
- Usa testimonios y social proof si están disponibles.
- Explica qué incluye y qué lo diferencia.
- CTA: "Agenda tu cita", "Consultanos", "Reservá tu lugar"`,

    OFFER: `ENFOQUE OFERTA — MÁXIMA URGENCIA:
- El ángulo DEBE ser comercial/promocional, NO informativo.
- Incluye el precio, el descuento y un CTA de compra DIRECTO.
- Crea sensación de escasez: "Últimas unidades", "Solo hoy", "Hasta agotar stock".
- Precio original tachado + precio nuevo prominente.
- Countdown si hay fecha límite.
- CTA: "Comprá ahora", "Aprovechá", "No te lo pierdas"`,

    ANNOUNCEMENT: `ENFOQUE ANUNCIO — NOVEDAD:
- Genera expectativa y exclusividad.
- Usa "Nuevo", "Llegó", "Presentamos", "Descubrí".
- Si es lanzamiento, construye hype previo.
- CTA: "Sé el primero", "Descubrilo", "Conocé más"`,

    TESTIMONIAL: `ENFOQUE TESTIMONIO — SOCIAL PROOF:
- Destaca la transformación del cliente: antes vs después.
- Usa citas directas del cliente (reales o basadas en el brief).
- Incluye datos concretos si los hay (%, tiempo, resultados).
- Genera confianza: "Más de X clientes satisfechos".
- CTA: "Viví la experiencia", "Unite a nuestros clientes"`,

    SEASONAL: `ENFOQUE TEMPORAL — TEMPORADA:
- Conecta el producto/servicio con la temporada actual.
- Crea urgencia temporal: "Solo esta temporada", "Edición limitada".
- Apela a emociones estacionales (fiestas, vacaciones, vuelta al cole, etc).
- CTA: "Aprovechá la temporada", "Pedí ahora"`,

    FAQ: `ENFOQUE EDUCATIVO — FAQ:
- Responde preguntas frecuentes de forma visual y atractiva.
- Posiciona la marca como experta en su sector.
- Cada pregunta debería conectar con un CTA suave.
- CTA: "¿Más dudas? Escribinos", "Consultá sin compromiso"`,

    BRAND_STORY: `ENFOQUE MARCA — STORYTELLING:
- Cuenta la historia del negocio de forma emocional.
- Conecta con los valores de la audiencia.
- Muestra el lado humano: equipo, proceso, pasión.
- CTA: "Conocé nuestra historia", "Formá parte"`,
  };

  const strategy = typeStrategies[briefType] || typeStrategies['PRODUCT'];

  return `Eres el estratega de contenido de ${profile.businessName}${profile.businessType ? `, negocio de ${profile.businessType}` : ''}.
${brandVoice ? `Voz de marca: ${brandVoice}` : ''}
${profile.usp ? `Propuesta de valor: ${profile.usp}` : ''}
${profile.targetMarket ? `Audiencia: ${profile.targetMarket}` : ''}
${campaignObjective ? `Objetivo de campaña: ${campaignObjective}` : ''}
Canales: ${targetChannels?.join(', ') || 'Instagram'}

RESUMEN DE RESEARCH INTERNO:
${researchSummary}

${strategy}

A partir del research y del enfoque, genera una ESTRATEGIA EDITORIAL para las próximas publicaciones.

Devuelve un JSON:
{
  "angle": "ángulo editorial principal",
  "reasoning": "por qué este ángulo funciona para esta audiencia",
  "format": "post | carousel | reel | story",
  "hook": "frase hook que capture atención (max 10 palabras)",
  "seedPrompt": "prompt semilla para el copywriter (1-2 oraciones)",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "imageDirection": "dirección creativa para la imagen (describe el visual ideal)",
  "cta": "call to action principal",
  "schedulingHint": "mejor momento para publicar y por qué",
  "contentPillars": ["pilar 1", "pilar 2"]
}

REGLAS CRÍTICAS:
- Este NO es contenido informativo/educativo genérico — es PROMOCIONAL para un negocio real.
- El ángulo debe VENDER o generar acción concreta, no solo informar.
- El hook debe ser irresistible para la audiencia objetivo.
- Los hashtags deben ser relevantes para el producto/servicio + la industria.
- La dirección visual debe considerar que usaremos imágenes reales del producto/negocio.

Responde SOLO con el JSON.`;
}
