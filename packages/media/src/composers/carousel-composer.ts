// ============================================================
// Carousel Composer — Renderiza slides de carrusel a imágenes
// ============================================================
// Usa Satori (JSX → SVG) + resvg-js (SVG → PNG) para generación
// server-side sin navegador.
//
// En Fase 0 se usa un renderer simple basado en SVG strings
// para no añadir dependencias pesadas hasta producción.
// ============================================================

import type { CarouselSlide, BrandingConfig, CarouselRenderer } from '../index';
import type { CarouselTemplate } from '../templates/carousel-templates';

export interface ComposedSlide {
  index: number;
  type: CarouselSlide['type'];
  svgContent: string;
  width: number;
  height: number;
}

/**
 * Genera SVG strings para cada slide del carrusel.
 * En producción se conectará con Satori + resvg para PNG real.
 * En dev retorna SVG data URIs que se pueden previsualizar.
 */
export class SvgCarouselComposer implements CarouselRenderer {
  private readonly width: number;
  private readonly height: number;

  constructor(
    private readonly defaultWidth: number = 1080,
    private readonly defaultHeight: number = 1080,
  ) {
    this.width = defaultWidth;
    this.height = defaultHeight;
  }

  /**
   * Implementación de CarouselRenderer.render()
   * Retorna array de SVG data URIs
   */
  async render(slides: CarouselSlide[], branding: BrandingConfig): Promise<string[]> {
    const composed = this.composeSlides(slides, branding);
    return composed.map((s) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.svgContent)}`);
  }

  /**
   * Compone slides con SVG
   */
  composeSlides(
    slides: CarouselSlide[],
    branding: BrandingConfig,
    _template?: CarouselTemplate,
  ): ComposedSlide[] {
    return slides.map((slide, index) => {
      let svg: string;

      switch (slide.type) {
        case 'cover':
          svg = this.renderCoverSlide(slide, branding, index + 1, slides.length);
          break;
        case 'cta':
          svg = this.renderCtaSlide(slide, branding, index + 1, slides.length);
          break;
        default:
          svg = this.renderContentSlide(slide, branding, index + 1, slides.length);
          break;
      }

      return {
        index,
        type: slide.type,
        svgContent: svg,
        width: this.width,
        height: this.height,
      };
    });
  }

  private renderCoverSlide(
    slide: CarouselSlide,
    branding: BrandingConfig,
    page: number,
    total: number,
  ): string {
    const bg = branding.primaryColor || '#6C63FF';
    const textColor = '#FFFFFF';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.darken(bg, 30)};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" rx="0"/>
  <!-- Decorative circles -->
  <circle cx="900" cy="180" r="120" fill="${textColor}" fill-opacity="0.08"/>
  <circle cx="180" cy="850" r="80" fill="${textColor}" fill-opacity="0.06"/>
  <text x="540" y="440" text-anchor="middle" fill="${textColor}" font-size="52" font-weight="700" font-family="sans-serif">
    ${this.wrapText(this.escapeXml(slide.title ?? ''), 22).map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 64}">${line}</tspan>`).join('')}
  </text>
  ${slide.body ? `<text x="540" y="600" text-anchor="middle" fill="${textColor}" fill-opacity="0.8" font-size="28" font-family="sans-serif">
    ${this.wrapText(this.escapeXml(slide.body), 40).map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 36}">${line}</tspan>`).join('')}
  </text>` : ''}
  <text x="540" y="980" text-anchor="middle" fill="${textColor}" fill-opacity="0.5" font-size="18" font-family="sans-serif">${page}/${total}</text>
</svg>`;
  }

  private renderContentSlide(
    slide: CarouselSlide,
    branding: BrandingConfig,
    page: number,
    total: number,
  ): string {
    const bg = branding.backgroundColor || '#FFFFFF';
    const textColor = branding.textColor || '#1A1A2E';
    const accent = branding.primaryColor || '#6C63FF';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <rect width="100%" height="100%" fill="${bg}" rx="0"/>
  <rect x="0" y="0" width="8" height="100%" fill="${accent}"/>
  <text x="80" y="140" fill="${accent}" font-size="44" font-weight="700" font-family="sans-serif">
    ${this.wrapText(this.escapeXml(slide.title ?? ''), 26).map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 54}">${line}</tspan>`).join('')}
  </text>
  <line x1="80" y1="210" x2="300" y2="210" stroke="${accent}" stroke-width="3" stroke-opacity="0.4"/>
  <text x="80" y="300" fill="${textColor}" font-size="30" font-family="sans-serif" line-height="1.6">
    ${this.wrapText(this.escapeXml(slide.body ?? ''), 38).map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 42}">${line}</tspan>`).join('')}
  </text>
  <text x="540" y="980" text-anchor="middle" fill="${textColor}" fill-opacity="0.35" font-size="18" font-family="sans-serif">${page}/${total}</text>
</svg>`;
  }

  private renderCtaSlide(
    slide: CarouselSlide,
    branding: BrandingConfig,
    page: number,
    total: number,
  ): string {
    const accent = branding.primaryColor || '#6C63FF';
    const bg = branding.secondaryColor || '#F4F4FF';
    const textColor = branding.textColor || '#1A1A2E';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <rect width="100%" height="100%" fill="${bg}" rx="0"/>
  <text x="540" y="380" text-anchor="middle" fill="${textColor}" font-size="44" font-weight="700" font-family="sans-serif">
    ${this.wrapText(this.escapeXml(slide.title ?? ''), 26).map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 54}">${line}</tspan>`).join('')}
  </text>
  ${slide.body ? `<text x="540" y="500" text-anchor="middle" fill="${textColor}" fill-opacity="0.7" font-size="28" font-family="sans-serif">
    ${this.wrapText(this.escapeXml(slide.body), 40).map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 38}">${line}</tspan>`).join('')}
  </text>` : ''}
  <!-- CTA button shape -->
  <rect x="320" y="620" width="440" height="70" rx="35" fill="${accent}"/>
  <text x="540" y="665" text-anchor="middle" fill="#FFFFFF" font-size="26" font-weight="600" font-family="sans-serif">Más info →</text>
  <text x="540" y="980" text-anchor="middle" fill="${textColor}" fill-opacity="0.35" font-size="18" font-family="sans-serif">${page}/${total}</text>
</svg>`;
  }

  // --- Helpers ---

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) lines.push(current.trim());

    return lines.length > 0 ? lines : [''];
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private darken(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * (percent / 100)));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * (percent / 100)));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * (percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
