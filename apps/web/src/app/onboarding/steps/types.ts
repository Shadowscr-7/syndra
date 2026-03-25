// ── Onboarding shared types ──────────────────────────────

export type OnboardingMode = 'business' | 'creator' | null;

export interface ThemeEntry {
  name: string;
  keywords: string;
  audience: string;
  priority: number;
  type: string;
  formats: string[];
}

export interface SourceEntry {
  name: string;
  type: string;
  url: string;
}

export interface MediaEntry {
  file: File;
  category: string;
  preview: string;
}

export interface PersonaData {
  brandName: string;
  brandDescription: string;
  tone: string;
  expertise: string;
  targetAudience: string;
  avoidTopics: string;
  languageStyle: string;
  examplePhrases: string;
  visualStyle: string;
}

export interface ContentProfileData {
  name: string;
  tone: string;
  contentLength: string;
  audience: string;
  language: string;
  hashtags: string;
  postingGoal: string;
}

export interface VisualStyleData {
  name: string;
  style: string;
  colorPalette: string;
  primaryFont: string;
  secondaryFont: string;
  logoUrl: string;
  preferredImageProvider: string;
  customPromptPrefix: string;
}

export interface CampaignEntry {
  name: string;
  objective: string;
  targetChannels: string[];
  channelFormats: Record<string, string[]>;
  startDate: string;
  endDate: string;
  offer: string;
  landingUrl: string;
  kpiTarget: string;
  musicEnabled: boolean;
  musicStyle: string;
  musicPrompt: string;
}

export interface OnboardingState {
  mode: OnboardingMode;
  // Business
  workspaceName: string;
  slug: string;
  industry: string;
  brandName: string;
  brandDescription: string;
  brandVoice: string;
  websiteUrl: string;
  // Creator
  creatorName: string;
  creatorCategory: string;
  // Shared collections
  themes: ThemeEntry[];
  sources: SourceEntry[];
  mediaFiles: MediaEntry[];
  campaigns: CampaignEntry[];
  // Creator-only
  persona: PersonaData;
  contentProfile: ContentProfileData;
  visualStyle: VisualStyleData;
  // Social
  metaConnected: boolean;
  metaInfo: string;
}

export const THEME_TYPES = [
  { value: 'TRENDING', label: '🔥 Trending' },
  { value: 'EVERGREEN', label: '🌲 Evergreen' },
  { value: 'PRODUCT', label: '📦 Producto' },
  { value: 'SERVICE', label: '🔧 Servicio' },
  { value: 'OFFER', label: '🏷️ Oferta' },
  { value: 'SEASONAL', label: '📅 Temporal' },
  { value: 'TESTIMONIAL', label: '💬 Testimonio' },
  { value: 'BEHIND_SCENES', label: '🎬 Behind Scenes' },
  { value: 'EDUCATIONAL', label: '📚 Educativo' },
  { value: 'ANNOUNCEMENT', label: '📢 Anuncio' },
];

export const SOURCE_TYPES = [
  { value: 'RSS', label: 'RSS' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'CHANGELOG', label: 'Changelog' },
  { value: 'CUSTOM', label: 'Custom' },
];

export const CAMPAIGN_OBJECTIVES = [
  { value: 'ENGAGEMENT', label: '💬 Engagement' },
  { value: 'AUTHORITY', label: '👑 Autoridad' },
  { value: 'TRAFFIC', label: '🔗 Tráfico' },
  { value: 'LEAD_CAPTURE', label: '📧 Leads' },
  { value: 'SALE', label: '💰 Ventas' },
  { value: 'COMMUNITY', label: '👥 Comunidad' },
  { value: 'PROMOTION', label: '📣 Promoción' },
  { value: 'PRODUCT_LAUNCH', label: '🚀 Lanzamiento' },
  { value: 'BRAND_AWARENESS', label: '🌟 Branding' },
];

export const CONTENT_FORMATS = [
  'Publicación', 'Carousel', 'Reel', 'Historia',
];

export const ALL_CHANNELS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'threads', label: 'Threads', icon: '🧵' },
  { id: 'twitter', label: 'Twitter', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
  { id: 'discord', label: 'Discord', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💚' },
];

export const VISUAL_STYLES = [
  { value: 'MINIMALIST', label: 'Minimalista', icon: '🖥️' },
  { value: 'FUTURISTIC', label: 'Futurista', icon: '🚀' },
  { value: 'REALISTIC', label: 'Realista', icon: '📷' },
  { value: 'CARTOON', label: 'Cartoon', icon: '🎪' },
  { value: 'ABSTRACT', label: 'Abstracto', icon: '🌊' },
  { value: 'PHOTOGRAPHY', label: 'Fotografía', icon: '📸' },
  { value: 'NEON', label: 'Neón', icon: '💜' },
  { value: 'VINTAGE', label: 'Vintage', icon: '🖼️' },
];

export const MEDIA_CATEGORIES = [
  { value: 'LOGO', label: '🏷️ Logos' },
  { value: 'PRODUCT', label: '📦 Productos' },
  { value: 'BACKGROUND', label: '🖼️ Fondos' },
  { value: 'PERSONAL', label: '👤 Personales' },
  { value: 'BRAND_ELEMENT', label: '✨ Marca' },
  { value: 'OTHER', label: '📁 Otros' },
];

// ── Shared UI helpers ──────────────────────────────
export const inputStyle = {
  backgroundColor: 'var(--color-bg-tertiary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

export const labelStyle = { color: 'var(--color-text)' };
export const mutedStyle = { color: 'var(--color-text-muted)' };
export const secondaryStyle = { color: 'var(--color-text-secondary)' };
