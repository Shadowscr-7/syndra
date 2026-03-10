// ============================================================
// Image Composer — Composición de imágenes con logo, overlays y texto
// Genera SVG compositions que combinan: fondo IA + producto del usuario + logo + texto promo
// ============================================================

export interface ComposeImageOptions {
  /** Width of the output */
  width?: number;
  /** Height of the output */
  height?: number;
  /** Background image URL (AI-generated or user upload) */
  backgroundUrl?: string;
  /** Background color fallback */
  backgroundColor?: string;
  /** Background gradient (CSS-style) */
  backgroundGradient?: string;
  /** Product image URL to overlay in center/right */
  productImageUrl?: string;
  /** Logo URL to overlay as watermark */
  logoUrl?: string;
  /** Position of the logo watermark */
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Size of the logo (percentage of width) */
  logoSize?: number;
  /** Overlay text elements */
  overlayText?: {
    headline?: string;
    subtitle?: string;
    price?: string;
    originalPrice?: string; // For strikethrough
    discount?: string; // "30% OFF"
    cta?: string;
  };
  /** Template preset */
  template?: CompositionTemplate;
  /** Brand colors */
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    font?: string;
  };
}

export type CompositionTemplate =
  | 'product-showcase'
  | 'offer-banner'
  | 'logo-watermark'
  | 'testimonial-card'
  | 'announcement'
  | 'minimal-product'
  | 'price-tag'
  | 'carousel-product'
  | 'before-after';

export interface ComposedImage {
  svgContent: string;
  svgDataUri: string;
  width: number;
  height: number;
  template: string;
}

/**
 * SVG-based image composer that creates promotional content from business assets.
 * Outputs SVG data URIs (can be rasterized server-side with Sharp if needed).
 */
export class ImageComposer {
  private readonly defaultWidth = 1080;
  private readonly defaultHeight = 1080;

  /**
   * Compose a promotional image from business assets + text overlays.
   */
  compose(options: ComposeImageOptions): ComposedImage {
    const width = options.width ?? this.defaultWidth;
    const height = options.height ?? this.defaultHeight;
    const template = options.template ?? 'product-showcase';
    const branding = {
      primaryColor: options.branding?.primaryColor ?? '#7C3AED',
      secondaryColor: options.branding?.secondaryColor ?? '#06B6D4',
      accentColor: options.branding?.accentColor ?? '#F59E0B',
      textColor: options.branding?.textColor ?? '#FFFFFF',
      font: options.branding?.font ?? 'Inter, Arial, sans-serif',
    };

    let svg: string;

    switch (template) {
      case 'offer-banner':
        svg = this.renderOfferBanner(width, height, options, branding);
        break;
      case 'logo-watermark':
        svg = this.renderLogoWatermark(width, height, options, branding);
        break;
      case 'testimonial-card':
        svg = this.renderTestimonialCard(width, height, options, branding);
        break;
      case 'announcement':
        svg = this.renderAnnouncement(width, height, options, branding);
        break;
      case 'minimal-product':
        svg = this.renderMinimalProduct(width, height, options, branding);
        break;
      case 'price-tag':
        svg = this.renderPriceTag(width, height, options, branding);
        break;
      case 'carousel-product':
        svg = this.renderCarouselProduct(width, height, options, branding);
        break;
      case 'before-after':
        svg = this.renderBeforeAfter(width, height, options, branding);
        break;
      case 'product-showcase':
      default:
        svg = this.renderProductShowcase(width, height, options, branding);
        break;
    }

    const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    return {
      svgContent: svg,
      svgDataUri,
      width,
      height,
      template,
    };
  }

  /**
   * Compose just a logo watermark overlay on any image.
   */
  composeLogoOverlay(
    imageUrl: string,
    logoUrl: string,
    position: ComposeImageOptions['logoPosition'] = 'bottom-right',
    sizePercent = 15,
    width = 1080,
    height = 1080,
  ): ComposedImage {
    return this.compose({
      width,
      height,
      backgroundUrl: imageUrl,
      logoUrl,
      logoPosition: position,
      logoSize: sizePercent,
      template: 'logo-watermark',
    });
  }

  // ═══════════════════════════════════════════════════════
  // Template renderers
  // ═══════════════════════════════════════════════════════

  private renderProductShowcase(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brand.primaryColor}"/>
      <stop offset="100%" stop-color="${this.darken(brand.primaryColor, 40)}"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/></filter>
  </defs>
  ${opts.backgroundUrl
    ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.45)"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg-grad)"/>`}
  ${opts.productImageUrl ? `<image href="${this.escXml(opts.productImageUrl)}" x="${w * 0.55}" y="${h * 0.15}" width="${w * 0.4}" height="${h * 0.55}" preserveAspectRatio="xMidYMid meet" filter="url(#shadow)"/>` : ''}
  ${text.headline ? `<text x="${w * 0.06}" y="${h * 0.2}" font-family="${brand.font}" font-size="${Math.round(w * 0.06)}" font-weight="800" fill="${brand.textColor}">${this.wrapTextSvg(this.escXml(text.headline), 18)}</text>` : ''}
  ${text.subtitle ? `<text x="${w * 0.06}" y="${h * 0.35}" font-family="${brand.font}" font-size="${Math.round(w * 0.032)}" fill="${brand.textColor}" opacity="0.85">${this.wrapTextSvg(this.escXml(text.subtitle), 30)}</text>` : ''}
  ${text.price ? `<text x="${w * 0.06}" y="${h * 0.75}" font-family="${brand.font}" font-size="${Math.round(w * 0.08)}" font-weight="900" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${text.originalPrice ? `<text x="${w * 0.06}" y="${h * 0.82}" font-family="${brand.font}" font-size="${Math.round(w * 0.04)}" fill="${brand.textColor}" opacity="0.5" text-decoration="line-through">${this.escXml(text.originalPrice)}</text>` : ''}
  ${text.discount ? this.renderDiscountBadge(w, h, text.discount, brand) : ''}
  ${text.cta ? this.renderCtaButton(w, h, text.cta, brand) : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, opts.logoPosition ?? 'bottom-right', opts.logoSize ?? 12)}
</svg>`;
  }

  private renderOfferBanner(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="offer-bg" x1="0" y1="0" x2="1" y2="0.5">
      <stop offset="0%" stop-color="${brand.accentColor}"/>
      <stop offset="100%" stop-color="${brand.primaryColor}"/>
    </linearGradient>
  </defs>
  ${opts.backgroundUrl
    ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.55)"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#offer-bg)"/>`}
  ${text.discount ? `<text x="${w / 2}" y="${h * 0.2}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.14)}" font-weight="900" fill="${brand.textColor}" letter-spacing="-2">${this.escXml(text.discount)}</text>` : ''}
  ${text.headline ? `<text x="${w / 2}" y="${h * 0.35}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.05)}" font-weight="700" fill="${brand.textColor}">${this.escXml(text.headline)}</text>` : ''}
  ${opts.productImageUrl ? `<image href="${this.escXml(opts.productImageUrl)}" x="${w * 0.25}" y="${h * 0.38}" width="${w * 0.5}" height="${h * 0.35}" preserveAspectRatio="xMidYMid meet"/>` : ''}
  ${text.price ? `<text x="${w / 2}" y="${h * 0.82}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.09)}" font-weight="900" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${text.originalPrice ? `<text x="${w / 2}" y="${h * 0.88}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.035)}" fill="${brand.textColor}" opacity="0.6" text-decoration="line-through">${this.escXml(text.originalPrice)}</text>` : ''}
  ${text.cta ? this.renderCtaButtonCentered(w, h, text.cta, brand) : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, opts.logoPosition ?? 'top-right', opts.logoSize ?? 10)}
</svg>`;
  }

  private renderLogoWatermark(
    w: number, h: number,
    opts: ComposeImageOptions,
    _brand: ReturnType<typeof this.parseBranding>,
  ): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${opts.backgroundUrl ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="0" y="0" width="${w}" height="${h}" fill="#1a1a2e"/>`}
  ${this.renderLogoSvg(w, h, opts.logoUrl, opts.logoPosition ?? 'bottom-right', opts.logoSize ?? 15)}
</svg>`;
  }

  private renderTestimonialCard(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${this.darken(brand.primaryColor, 50)}"/>
  <text x="${w / 2}" y="${h * 0.12}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.12)}" fill="${brand.primaryColor}" opacity="0.2">❝</text>
  ${text.headline ? `<text x="${w / 2}" y="${h * 0.4}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.04)}" fill="${brand.textColor}" font-style="italic">${this.wrapTextSvg(this.escXml(text.headline), 35)}</text>` : ''}
  ${text.subtitle ? `<text x="${w / 2}" y="${h * 0.65}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.035)}" fill="${brand.accentColor}" font-weight="600">— ${this.escXml(text.subtitle)}</text>` : ''}
  <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.04)}" fill="${brand.accentColor}">★★★★★</text>
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'bottom-right', 12)}
</svg>`;
  }

  private renderAnnouncement(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="ann-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${brand.primaryColor}"/>
      <stop offset="100%" stop-color="${brand.secondaryColor}"/>
    </linearGradient>
  </defs>
  ${opts.backgroundUrl
    ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.5)"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#ann-bg)"/>`}
  <text x="${w / 2}" y="${h * 0.15}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.03)}" fill="${brand.accentColor}" font-weight="700" letter-spacing="6">NUEVO</text>
  ${text.headline ? `<text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.07)}" font-weight="900" fill="${brand.textColor}">${this.wrapTextSvg(this.escXml(text.headline), 16)}</text>` : ''}
  ${text.subtitle ? `<text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.035)}" fill="${brand.textColor}" opacity="0.8">${this.wrapTextSvg(this.escXml(text.subtitle), 35)}</text>` : ''}
  ${text.cta ? this.renderCtaButtonCentered(w, h, text.cta, brand) : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'bottom-right', 12)}
</svg>`;
  }

  private renderMinimalProduct(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${opts.backgroundColor ?? '#FAFAFA'}"/>
  ${opts.productImageUrl ? `<image href="${this.escXml(opts.productImageUrl)}" x="${w * 0.15}" y="${h * 0.08}" width="${w * 0.7}" height="${h * 0.6}" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="${brand.primaryColor}"/>
  ${text.headline ? `<text x="${w / 2}" y="${h * 0.82}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.045)}" font-weight="700" fill="${brand.textColor}">${this.escXml(text.headline)}</text>` : ''}
  ${text.price ? `<text x="${w / 2}" y="${h * 0.92}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.06)}" font-weight="900" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'top-left', 10)}
</svg>`;
  }

  private renderPriceTag(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${opts.backgroundUrl
    ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.3)"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="#1a1a2e"/>`}
  ${opts.productImageUrl ? `<image href="${this.escXml(opts.productImageUrl)}" x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.6}" height="${h * 0.7}" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <rect x="${w * 0.55}" y="${h * 0.6}" width="${w * 0.42}" height="${h * 0.35}" rx="16" fill="${brand.primaryColor}"/>
  ${text.headline ? `<text x="${w * 0.76}" y="${h * 0.7}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.028)}" fill="${brand.textColor}" font-weight="600">${this.escXml(text.headline)}</text>` : ''}
  ${text.price ? `<text x="${w * 0.76}" y="${h * 0.82}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.07)}" font-weight="900" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${text.originalPrice ? `<text x="${w * 0.76}" y="${h * 0.89}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.03)}" fill="${brand.textColor}" opacity="0.5" text-decoration="line-through">${this.escXml(text.originalPrice)}</text>` : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'top-right', 10)}
</svg>`;
  }

  // ═══════════════════════════════════════════════════════
  // Carousel & Before-After templates
  // ═══════════════════════════════════════════════════════

  private renderCarouselProduct(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    // Carousel slide: product photo top, text block bottom
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="carousel-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${brand.primaryColor}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${brand.primaryColor}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="${opts.backgroundColor ?? '#FFFFFF'}"/>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#carousel-bg)"/>
  ${opts.productImageUrl ? `<image href="${this.escXml(opts.productImageUrl)}" x="${w * 0.1}" y="${h * 0.05}" width="${w * 0.8}" height="${h * 0.5}" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" rx="24" fill="${brand.primaryColor}"/>
  <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${brand.primaryColor}"/>
  ${text.headline ? `<text x="${w / 2}" y="${h * 0.7}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.05)}" font-weight="800" fill="${brand.textColor}">${this.wrapTextSvg(this.escXml(text.headline), 22)}</text>` : ''}
  ${text.subtitle ? `<text x="${w / 2}" y="${h * 0.8}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.03)}" fill="${brand.textColor}" opacity="0.85">${this.wrapTextSvg(this.escXml(text.subtitle), 40)}</text>` : ''}
  ${text.price ? `<text x="${w / 2}" y="${h * 0.9}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.065)}" font-weight="900" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${text.cta ? this.renderCtaButtonCentered(w, h, text.cta, brand) : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'top-right', 8)}
  <text x="${w - 40}" y="${h / 2}" font-family="${brand.font}" font-size="${Math.round(w * 0.03)}" fill="${brand.primaryColor}" opacity="0.4">▶</text>
</svg>`;
  }

  private renderBeforeAfter(
    w: number, h: number,
    opts: ComposeImageOptions,
    brand: ReturnType<typeof this.parseBranding>,
  ): string {
    const text = opts.overlayText ?? {};
    // Split-screen: background image on left, product image on right
    const halfW = w / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="left-clip"><rect x="0" y="0" width="${halfW}" height="${h}"/></clipPath>
    <clipPath id="right-clip"><rect x="${halfW}" y="0" width="${halfW}" height="${h}"/></clipPath>
  </defs>
  <!-- Left side: "Before" / Background -->
  <g clip-path="url(#left-clip)">
    ${opts.backgroundUrl
      ? `<image href="${this.escXml(opts.backgroundUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
      : `<rect x="0" y="0" width="${halfW}" height="${h}" fill="${this.darken(brand.primaryColor, 30)}"/>`}
    <rect x="0" y="0" width="${halfW}" height="${h}" fill="rgba(0,0,0,0.2)"/>
  </g>
  <!-- Right side: "After" / Product -->
  <g clip-path="url(#right-clip)">
    ${opts.productImageUrl
      ? `<image href="${this.escXml(opts.productImageUrl)}" x="${halfW}" y="0" width="${halfW}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
      : `<rect x="${halfW}" y="0" width="${halfW}" height="${h}" fill="${brand.primaryColor}"/>`}
  </g>
  <!-- Divider -->
  <line x1="${halfW}" y1="0" x2="${halfW}" y2="${h}" stroke="${brand.textColor}" stroke-width="4"/>
  <circle cx="${halfW}" cy="${h / 2}" r="${w * 0.04}" fill="${brand.textColor}" stroke="${brand.primaryColor}" stroke-width="3"/>
  <text x="${halfW}" y="${h / 2 + 5}" text-anchor="middle" dominant-baseline="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.025)}" font-weight="700" fill="${brand.primaryColor}">VS</text>
  <!-- Labels -->
  <rect x="${w * 0.03}" y="${h * 0.04}" width="${w * 0.18}" height="${h * 0.05}" rx="8" fill="rgba(0,0,0,0.6)"/>
  <text x="${w * 0.12}" y="${h * 0.075}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.022)}" font-weight="700" fill="${brand.textColor}">${this.escXml(text.subtitle || 'ANTES')}</text>
  <rect x="${halfW + w * 0.03}" y="${h * 0.04}" width="${w * 0.18}" height="${h * 0.05}" rx="8" fill="${brand.accentColor}"/>
  <text x="${halfW + w * 0.12}" y="${h * 0.075}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.022)}" font-weight="700" fill="#000">${this.escXml(text.headline || 'DESPUÉS')}</text>
  <!-- Bottom bar -->
  <rect x="0" y="${h * 0.88}" width="${w}" height="${h * 0.12}" fill="${brand.primaryColor}"/>
  ${text.price ? `<text x="${w / 2}" y="${h * 0.95}" text-anchor="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.04)}" font-weight="800" fill="${brand.accentColor}">${this.escXml(text.price)}</text>` : ''}
  ${this.renderLogoSvg(w, h, opts.logoUrl, 'bottom-right', 8)}
</svg>`;
  }

  // ═══════════════════════════════════════════════════════
  // Shared render helpers
  // ═══════════════════════════════════════════════════════

  private renderDiscountBadge(
    w: number, h: number,
    discount: string,
    brand: { accentColor: string; textColor: string; font: string },
  ): string {
    const cx = w * 0.85;
    const cy = h * 0.12;
    const r = w * 0.08;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${brand.accentColor}"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" dominant-baseline="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.03)}" font-weight="900" fill="#000">${this.escXml(discount)}</text>`;
  }

  private renderCtaButton(
    w: number, h: number,
    cta: string,
    brand: { accentColor: string; font: string },
  ): string {
    const btnW = w * 0.4;
    const btnH = h * 0.06;
    const x = w * 0.06;
    const y = h * 0.9;
    return `<rect x="${x}" y="${y}" width="${btnW}" height="${btnH}" rx="${btnH / 2}" fill="${brand.accentColor}"/>
  <text x="${x + btnW / 2}" y="${y + btnH / 2 + 2}" text-anchor="middle" dominant-baseline="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.025)}" font-weight="700" fill="#000">${this.escXml(cta)}</text>`;
  }

  private renderCtaButtonCentered(
    w: number, h: number,
    cta: string,
    brand: { accentColor: string; font: string },
  ): string {
    const btnW = w * 0.5;
    const btnH = h * 0.065;
    const x = (w - btnW) / 2;
    const y = h * 0.9;
    return `<rect x="${x}" y="${y}" width="${btnW}" height="${btnH}" rx="${btnH / 2}" fill="${brand.accentColor}"/>
  <text x="${w / 2}" y="${y + btnH / 2 + 2}" text-anchor="middle" dominant-baseline="middle" font-family="${brand.font}" font-size="${Math.round(w * 0.028)}" font-weight="700" fill="#000">${this.escXml(cta)}</text>`;
  }

  private renderLogoSvg(
    w: number, h: number,
    logoUrl?: string,
    position: ComposeImageOptions['logoPosition'] = 'bottom-right',
    sizePercent = 12,
  ): string {
    if (!logoUrl) return '';

    const size = w * (sizePercent / 100);
    const margin = w * 0.03;

    let x: number, y: number;
    switch (position) {
      case 'top-left':
        x = margin; y = margin; break;
      case 'top-right':
        x = w - size - margin; y = margin; break;
      case 'bottom-left':
        x = margin; y = h - size - margin; break;
      case 'center':
        x = (w - size) / 2; y = (h - size) / 2; break;
      case 'bottom-right':
      default:
        x = w - size - margin; y = h - size - margin; break;
    }

    return `<image href="${this.escXml(logoUrl)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" opacity="0.9"/>`;
  }

  // ═══════════════════════════════════════════════════════
  // Utility methods
  // ═══════════════════════════════════════════════════════

  private parseBranding(brand: ComposeImageOptions['branding']) {
    return {
      primaryColor: brand?.primaryColor ?? '#7C3AED',
      secondaryColor: brand?.secondaryColor ?? '#06B6D4',
      accentColor: brand?.accentColor ?? '#F59E0B',
      textColor: brand?.textColor ?? '#FFFFFF',
      font: brand?.font ?? 'Inter, Arial, sans-serif',
    };
  }

  private escXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private wrapTextSvg(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;

    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) lines.push(current.trim());

    return lines
      .slice(0, 3) // Max 3 lines
      .map((line, i) => `<tspan x="inherit" dy="${i === 0 ? 0 : '1.2em'}">${line}</tspan>`)
      .join('');
  }

  private darken(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
}
