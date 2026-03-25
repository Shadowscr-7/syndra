// ============================================================
// Business Profile Service — Contexto del negocio por workspace
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import {
  OpenAIAdapter,
  AnthropicAdapter,
  parseLLMJsonResponse,
} from '@automatismos/ai';
import type { LLMAdapter } from '@automatismos/ai';

export interface UpsertBusinessProfileDto {
  businessName?: string;
  businessType?: string;
  description?: string;
  slogan?: string;
  usp?: string;
  targetMarket?: string;
  products?: string[];
  priceRange?: string;
  websiteUrl?: string;
  physicalAddress?: string;
  phoneNumber?: string;
  socialLinks?: Record<string, string>;
  brandColors?: string[];
  logoMediaId?: string;
  promotionStyle?: string;
  contentGoals?: string[];
}

export interface ExtractedWebData {
  profile: Partial<UpsertBusinessProfileDto>;
  briefs: Array<{
    type: string;
    title: string;
    content: string;
    productName?: string;
    productPrice?: string;
    productUrl?: string;
    discountText?: string;
  }>;
}

@Injectable()
export class BusinessProfileService {
  private readonly logger = new Logger(BusinessProfileService.name);
  private fallbackLlm: LLMAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.fallbackLlm = provider === 'anthropic'
      ? new AnthropicAdapter({ apiKey })
      : new OpenAIAdapter({ apiKey });
  }

  private async resolveUserId(workspaceId: string): Promise<string | null> {
    const wsUser = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });
    return wsUser?.userId ?? null;
  }

  private async getLlm(workspaceId: string): Promise<LLMAdapter> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      try {
        const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'LLM');
        if (payload?.apiKey) {
          const provider = (payload as any).provider ?? 'openai';
          return provider === 'anthropic'
            ? new AnthropicAdapter({ apiKey: payload.apiKey })
            : new OpenAIAdapter({ apiKey: payload.apiKey });
        }
      } catch { /* fallback */ }
    }
    return this.fallbackLlm;
  }

  async get(workspaceId: string) {
    return this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
  }

  async upsert(workspaceId: string, data: UpsertBusinessProfileDto) {
    const profile = await this.prisma.businessProfile.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...data,
        socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined,
      },
      update: {
        ...data,
        socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined,
      },
    });

    this.logger.log(`Business profile upserted for workspace ${workspaceId}`);
    return profile;
  }

  async delete(workspaceId: string) {
    const existing = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
    if (!existing) throw new NotFoundException('Business profile not found');

    return this.prisma.businessProfile.delete({
      where: { workspaceId },
    });
  }

  /**
   * Build a context string suitable for injection into AI prompts.
   * Returns industry context + business description for dynamic prompt roles.
   */
  async buildPromptContext(workspaceId: string): Promise<{
    industryContext: string;
    businessContext: string;
    logoUrl?: string;
  }> {
    const [profile, workspace] = await Promise.all([
      this.prisma.businessProfile.findUnique({ where: { workspaceId } }),
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { industry: true, name: true },
      }),
    ]);

    const industry = profile?.businessType || workspace?.industry || 'contenido digital';
    const businessName = profile?.businessName || workspace?.name || '';

    let businessContext = '';
    if (profile) {
      const parts: string[] = [];
      if (profile.businessName) parts.push(`Negocio: ${profile.businessName}`);
      if (profile.description) parts.push(`Descripción: ${profile.description}`);
      if (profile.slogan) parts.push(`Slogan: ${profile.slogan}`);
      if (profile.usp) parts.push(`Propuesta de valor: ${profile.usp}`);
      if (profile.targetMarket) parts.push(`Mercado objetivo: ${profile.targetMarket}`);
      if (profile.products.length > 0) parts.push(`Productos/servicios: ${profile.products.join(', ')}`);
      if (profile.priceRange) parts.push(`Rango de precios: ${profile.priceRange}`);
      businessContext = parts.join('\n');
    }

    // Try to find logo URL
    let logoUrl: string | undefined;
    if (profile?.logoMediaId) {
      const media = await this.prisma.userMedia.findUnique({
        where: { id: profile.logoMediaId },
        select: { url: true },
      });
      logoUrl = media?.url;
    }

    return {
      industryContext: industry,
      businessContext,
      logoUrl,
    };
  }

  // ── Web Extraction ─────────────────────────────────────

  private async getResearchCredential(workspaceId: string): Promise<{ apiKey: string; provider: string } | null> {
    const userId = await this.resolveUserId(workspaceId);
    if (userId) {
      try {
        const { payload } = await this.credentialsService.resolveCredential(workspaceId, userId, 'RESEARCH');
        if (payload?.apiKey) {
          return { apiKey: payload.apiKey, provider: (payload as any).provider ?? 'tavily' };
        }
      } catch { /* no credential */ }
    }
    return null;
  }

  async extractFromWeb(workspaceId: string, urls: string[]): Promise<ExtractedWebData> {
    if (!urls.length || urls.length > 5) {
      throw new BadRequestException('Proporciona entre 1 y 5 URLs');
    }

    this.logger.log(`Extracting business data from ${urls.length} URL(s) for workspace ${workspaceId}`);

    const researchCred = await this.getResearchCredential(workspaceId);
    let pageTexts: string[];
    let extraSearchContent = '';

    if (researchCred?.provider === 'tavily') {
      // ── Tavily: extract URLs + search for more info ──
      this.logger.log('Using Tavily for web extraction');

      // 1a. Extract content from provided URLs via Tavily Extract
      pageTexts = await Promise.all(
        urls.map(url => this.tavilyExtract(researchCred.apiKey, url)),
      );

      // 1b. Also search for the business to discover additional info
      const domain = urls[0] ? this.extractDomain(urls[0]) : null;
      if (domain) {
        const searchResults = await this.tavilySearch(
          researchCred.apiKey,
          `site:${domain} productos servicios contacto about`,
          8,
        );
        if (searchResults.length > 0) {
          extraSearchContent = '\n\n=== Páginas adicionales encontradas por búsqueda ===\n' +
            searchResults.map(r => `[${r.title}] (${r.url})\n${r.content}`).join('\n\n');
        }
      }
    } else if (researchCred?.provider === 'serpapi') {
      // ── SerpAPI: search for the business ──
      this.logger.log('Using SerpAPI for web extraction');

      const domain = urls[0] ? this.extractDomain(urls[0]) : null;
      const searchResults = await this.serpApiSearch(researchCred.apiKey, `site:${domain}`, 10);
      extraSearchContent = searchResults.length > 0
        ? '\n\n=== Resultados de búsqueda ===\n' +
          searchResults.map(r => `[${r.title}] (${r.url})\n${r.snippet}`).join('\n\n')
        : '';

      // Still fetch the URLs directly as SerpAPI doesn't extract page content
      pageTexts = await Promise.all(urls.map(url => this.fetchPageText(url)));
    } else {
      // ── Fallback: direct fetch ──
      this.logger.log('No research credential — using direct fetch');
      pageTexts = await Promise.all(urls.map(url => this.fetchPageText(url)));
    }

    const combinedText = pageTexts
      .map((text, i) => `=== Contenido de ${urls[i]} ===\n${text}`)
      .join('\n\n') + extraSearchContent;

    // Truncate to ~60k chars to fit context windows
    const truncated = combinedText.length > 60000
      ? combinedText.substring(0, 60000) + '\n[... contenido truncado ...]'
      : combinedText;

    // 2. Use LLM to extract structured data
    const llm = await this.getLlm(workspaceId);
    const result = await this.extractWithLLM(llm, truncated, urls);

    this.logger.log(`Extracted profile data + ${result.briefs.length} briefs from web`);
    return result;
  }

  // ── Tavily API ──

  private async tavilyExtract(apiKey: string, url: string): Promise<string> {
    try {
      const res = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, urls: [url] }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        this.logger.warn(`Tavily extract failed for ${url}: ${res.status}`);
        return this.fetchPageText(url); // Fallback
      }

      const data = await res.json() as {
        results?: Array<{ url: string; raw_content?: string }>;
      };

      const content = data.results?.[0]?.raw_content;
      if (content && content.length > 100) {
        return content;
      }
      // If Tavily returned little content, fallback
      return this.fetchPageText(url);
    } catch (err: any) {
      this.logger.warn(`Tavily extract error: ${err.message}`);
      return this.fetchPageText(url);
    }
  }

  private async tavilySearch(
    apiKey: string,
    query: string,
    maxResults: number,
  ): Promise<Array<{ title: string; url: string; content: string }>> {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          include_raw_content: false,
          search_depth: 'advanced',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) return [];

      const data = await res.json() as {
        results?: Array<{ title: string; url: string; content: string }>;
      };

      return data.results ?? [];
    } catch {
      return [];
    }
  }

  // ── SerpAPI ──

  private async serpApiSearch(
    apiKey: string,
    query: string,
    num: number,
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        num: String(num),
        hl: 'es',
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) return [];

      const data = await res.json() as {
        organic_results?: Array<{ title: string; link: string; snippet: string }>;
      };

      return (data.organic_results ?? []).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet ?? '',
      }));
    } catch {
      return [];
    }
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      return null;
    }
  }

  private async fetchPageText(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AutomatismosBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es,en;q=0.5',
        },
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch ${url}: ${response.status}`);
        return `[Error al cargar ${url}: HTTP ${response.status}]`;
      }

      const html = await response.text();
      return this.htmlToText(html);
    } catch (error: any) {
      this.logger.warn(`Error fetching ${url}: ${error.message}`);
      return `[Error al cargar ${url}: ${error.message}]`;
    }
  }

  private htmlToText(html: string): string {
    // Remove script, style, svg, noscript blocks
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' [NAV] ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' [FOOTER] ')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Convert some tags to text markers
    text = text
      .replace(/<h[1-6][^>]*>/gi, '\n## ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n');

    // Extract meta content (useful for descriptions, keywords)
    const metaParts: string[] = [];
    const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
    let metaMatch;
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      const metaName = metaMatch[1];
      const metaContent = metaMatch[2];
      if (metaName && metaContent && (metaName.toLowerCase().includes('description') || metaName.toLowerCase().includes('title') || metaName.toLowerCase().includes('keywords'))) {
        metaParts.push(`[META ${metaName}]: ${metaContent}`);
      }
    }

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
      metaParts.unshift(`[TITLE]: ${titleMatch[1].trim()}`);
    }

    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    // Collapse whitespace
    text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    // Prepend meta info
    if (metaParts.length) {
      text = metaParts.join('\n') + '\n\n' + text;
    }

    return text;
  }

  private async extractWithLLM(llm: LLMAdapter, webContent: string, urls: string[]): Promise<ExtractedWebData> {
    const prompt = `Eres un experto en análisis de negocios. Analiza el contenido de las siguientes páginas web y extrae toda la información relevante sobre el negocio.

CONTENIDO WEB:
${webContent}

URLs analizadas: ${urls.join(', ')}

Extrae la información y devuelve un JSON con esta estructura exacta:
{
  "profile": {
    "businessName": "nombre del negocio (string)",
    "businessType": "tipo de negocio, debe ser uno de: ecommerce, restaurant, fitness, salon, clinic, real_estate, education, consulting, retail, services, technology, food_delivery, fashion, automotive, other",
    "description": "descripción del negocio en 2-3 oraciones (string)",
    "slogan": "slogan si lo encuentras (string o null)",
    "usp": "propuesta única de valor (string o null)",
    "targetMarket": "mercado objetivo inferido (string o null)",
    "products": ["lista de productos o servicios principales encontrados"],
    "priceRange": "rango de precios si lo encuentras (string o null)",
    "websiteUrl": "url principal del sitio (string)",
    "physicalAddress": "dirección física si la encuentras (string o null)",
    "phoneNumber": "teléfono si lo encuentras (string o null)",
    "promotionStyle": "estilo inferido, debe ser uno de: profesional, cercano, premium, divertido, minimalista, urgente, aspiracional, educativo",
    "contentGoals": ["objetivos inferidos del negocio, opciones: Generar ventas, Aumentar seguidores, Generar leads, Educar audiencia, Posicionar marca, Fidelizar clientes, Lanzar productos, Promociones/ofertas"]
  },
  "briefs": [
    {
      "type": "PRODUCT, SERVICE, OFFER, ANNOUNCEMENT, TESTIMONIAL, FAQ, SEASONAL o BRAND_STORY",
      "title": "título del brief",
      "content": "descripción detallada del producto/servicio/oferta",
      "productName": "nombre del producto si aplica (string o null)",
      "productPrice": "precio si lo encuentras (string o null)",
      "productUrl": "url del producto si aplica (string o null)",
      "discountText": "texto de descuento/promoción si aplica (string o null)"
    }
  ]
}

INSTRUCCIONES:
- Analiza TODO el contenido para extraer la mayor cantidad de información posible.
- Los briefs deben incluir productos individuales, servicios, ofertas o promociones encontradas.
- Si hay muchos productos, incluye los más destacados (máximo 15).
- Para businessType, elige la categoría que mejor encaje.
- Para promotionStyle, infiere del tono y estilo del sitio web.
- Para contentGoals, infiere de lo que el negocio parece priorizar.
- Si no encuentras un dato, usa null (no inventes).
- Responde SOLO con el JSON, sin texto adicional.`;

    const raw = await llm.chat([
      { role: 'system', content: 'Eres un asistente experto en análisis de negocios. Siempre respondes con JSON válido.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.2, maxTokens: 4096 });

    const parsed = parseLLMJsonResponse<ExtractedWebData>(raw);

    // Sanitize the result
    if (parsed.profile) {
      // Clean null strings
      for (const [key, value] of Object.entries(parsed.profile)) {
        if (value === null || value === 'null') {
          delete (parsed.profile as any)[key];
        }
      }
    }

    return {
      profile: parsed.profile ?? {},
      briefs: parsed.briefs ?? [],
    };
  }
}
